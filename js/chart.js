/* TradingHyun — chart.js : 캔버스 차트 엔진 (패널·스케일·시리즈·지표·축·크로스헤어·입력) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U, IND = CL.IND, Data = CL.Data;
  // 애플 기기에서는 SF, 그 밖에서는 Pretendard(무료 글꼴, index.html에서 불러옴)
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard Variable", Pretendard, "Segoe UI Variable Text", "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", Roboto, sans-serif';
  const font = (sz, w) => (w ? w + ' ' : '') + sz + 'px ' + FONT;
  CL.FONT = FONT;

  const THEMES = { // 애플 시스템 색 기반 (다크 = 검정 카드, 미드나이트 = 짙은 남색, 라이트 = 흰 카드)
    dark: {
      bg: '#000000', grid: 'rgba(255,255,255,0.055)', text: '#a1a1a6', dim: '#8e8e93', axis: 'rgba(84,84,88,0.6)', cross: '#8e8e93',
      crossBg: '#48484a', crossFg: '#ffffff', sep: 'rgba(84,84,88,0.6)', wm: 'rgba(255,255,255,0.05)', hFill: '#000000', sel: '#0a84ff', msg: '#f5f5f7',
    },
    navy: {
      bg: '#0b1220', grid: 'rgba(120,140,180,0.09)', text: '#a3adc2', dim: '#7d879c', axis: 'rgba(100,116,150,0.35)', cross: '#8a94a8',
      crossBg: '#2a3348', crossFg: '#ffffff', sep: 'rgba(100,116,150,0.35)', wm: 'rgba(163,173,194,0.06)', hFill: '#0b1220', sel: '#0a84ff', msg: '#e5e9f2',
    },
    light: {
      bg: '#ffffff', grid: 'rgba(0,0,0,0.05)', text: '#6e6e73', dim: '#86868b', axis: 'rgba(60,60,67,0.18)', cross: '#8e8e93',
      crossBg: '#1d1d1f', crossFg: '#ffffff', sep: 'rgba(60,60,67,0.18)', wm: 'rgba(0,0,0,0.04)', hFill: '#ffffff', sel: '#007aff', msg: '#1d1d1f',
    },
  };
  CL.THEMES = THEMES;
  const DASH = (ls, w) => { const k = Math.max(1, w || 1); return ls === 1 ? [5 * k, 4 * k] : ls === 2 ? [k, 2.5 * k] : ls === 3 ? [1, 3] : []; };
  CL.DASH = DASH;

  class Chart {
    constructor(host, app, slot) {
      this.host = host; this.app = app; this.slot = slot;
      host.classList.add('chart');
      this.cv = U.h('canvas', { class: 'chart-cv' });
      this.lg = U.h('div', { class: 'legends' });
      this.msgEl = U.h('div', { class: 'chart-msg hidden' });
      this.scBox = U.h('div', { class: 'scale-btns' },
        (this.btnAuto = U.h('button', { title: '자동 스케일 (더블클릭: 가격축)', text: '자동', onclick: () => this.toggleAuto() })),
        (this.btnLog = U.h('button', { title: '로그 스케일', text: '로그', onclick: () => this.toggleLog() })));
      host.append(this.cv, this.lg, this.msgEl, this.scBox);
      this.ctx = this.cv.getContext('2d');
      this.full = []; this.bars = [];
      this.src = 'binance'; this.sym = 'BTCUSDT'; this.iv = '1h';
      this.prec = 2; this.tzOff = 0; this.meta = {};
      this.inds = []; this.drawings = [];
      this.view = { s: 8, r: 0 };
      this.ps = { main: { w: 4, auto: true, log: false } };
      this.type = 'candle';
      this.mouse = { x: -1, y: -1, in: false };
      this.sel = null; this.hov = null;
      this.creating = null; this.drag = null; this.measure = null;
      this.undoS = []; this.redoS = []; this._snap = null;
      this.axisW = 64; this.timeH = 26; this._lblW = 50;
      this.W = 0; this.H = 0; this.dpr = 1;
      this.panes = []; this.pmap = {};
      this.status = ''; this.loadToken = 0; this.extT = null;
      this.mods = {};
      this.bindEvents();
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
      this.resize();
      this._clock = setInterval(() => { if (this.bars.length && !this.replay && this.status && this.app.set.countdown) this.invalidate(); }, 1000);
    }
    get th() {
      const s = this.app.set, k = s.theme + '|' + (s.bgColor || '');
      if (k !== this._thK) {
        const base = THEMES[s.theme] || THEMES.dark;
        this._th = s.bgColor ? Object.assign({}, base, { bg: s.bgColor, hFill: s.bgColor }) : base;
        this._thK = k;
      }
      return this._th;
    }
    get ivMs() { return U.IV[this.iv] || 6e4; }
    get key() { return this.src + ':' + this.sym; }
    destroy() { this.stopLive(); clearInterval(this._clock); this._ro.disconnect(); this.host.innerHTML = ''; }

    resize() {
      const r = this.host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.W = Math.max(50, Math.floor(r.width)); this.H = Math.max(50, Math.floor(r.height)); this.dpr = dpr;
      this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
      this.cv.style.width = this.W + 'px'; this.cv.style.height = this.H + 'px';
      this.render();
    }
    invalidate() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); });
    }

    /* ---------------- 좌표 변환 ---------------- */
    i2x(i) { return this.plotW - (this.view.r - i) * this.view.s; }
    x2i(x) { return this.view.r - (this.plotW - x) / this.view.s; }
    t2i(t) {
      const b = this.bars, n = b.length;
      if (!n) return 0;
      if (t <= b[0].t) return (t - b[0].t) / this.ivMs;
      if (t >= b[n - 1].t) return n - 1 + (t - b[n - 1].t) / this.ivMs;
      const lo = U.bsearch(b, t);
      if (b[lo].t === t) return lo;
      return lo + (t - b[lo].t) / (b[lo + 1].t - b[lo].t);
    }
    i2t(i) {
      const b = this.bars, n = b.length;
      if (!n) return 0;
      if (i <= 0) return b[0].t + i * this.ivMs;
      if (i >= n - 1) return b[n - 1].t + (i - (n - 1)) * this.ivMs;
      const lo = Math.floor(i), f = i - lo;
      return f ? b[lo].t + f * (b[lo + 1].t - b[lo].t) : b[lo].t;
    }
    tf(p, v) { return p.log ? Math.log(v) : v; }
    v2y(p, v) { const u = p.log ? (v > 0 ? Math.log(v) : NaN) : v; return p.top + ((p.umax - u) / (p.umax - p.umin)) * p.h; }
    y2v(p, y) { const u = p.umax - ((y - p.top) / p.h) * (p.umax - p.umin); return p.log ? Math.exp(u) : u; }
    paneAt(y) { for (const p of this.panes) if (y >= p.top && y < p.top + p.h) return p; return this.panes[this.panes.length - 1]; }

    /* ---------------- 레이아웃 ---------------- */
    layout() {
      this.axisW = U.clamp(Math.ceil(this._lblW) + 16, 56, 140);
      this.plotW = Math.max(10, this.W - this.axisW);
      this.areaH = Math.max(30, this.H - this.timeH);
      const panes = [{ key: 'main', main: true, ind: null }];
      for (const ind of this.inds) if (IND.paneOf(ind.type, ind.inp) === 'sub') panes.push({ key: ind.id, main: false, ind });
      let tw = 0;
      for (const p of panes) { p.st = this.ps[p.key] || (this.ps[p.key] = { w: p.main ? 4 : 1, auto: true, log: false }); tw += p.st.w; }
      let y = 0;
      for (const p of panes) { const h = (this.areaH * p.st.w) / tw; p.top = Math.round(y); p.h = Math.max(10, Math.round(y + h) - p.top); y += h; }
      this.panes = panes;
      this.pmap = {};
      for (const p of panes) this.pmap[p.key] = p;
    }
    vis() {
      const n = this.bars.length;
      this.vFrom = Math.floor(this.x2i(0)) - 1;
      this.vTo = Math.ceil(this.x2i(this.plotW)) + 1;
      return { from: Math.max(0, this.vFrom), to: Math.min(n - 1, this.vTo) };
    }
    rightMargin() { return this.app.set.rightBars != null ? this.app.set.rightBars : 8; }
    fit() { this.view.r = this.bars.length - 1 + this.rightMargin(); }
    clampView() {
      const n = this.bars.length, vb = this.plotW / this.view.s;
      this.view.r = U.clamp(this.view.r, Math.min(5, n - 1), n - 1 + vb * 0.85);
    }

    /* ---------------- 스케일 ---------------- */
    scaleKeys(def, ind) {
      if (def.scaleKeys) return def.scaleKeys;
      return def.plots.filter((p) => !p.t || p.t === 'line' || p.t === 'hist' || p.t === 'dots').map((p) => p.k);
    }
    scalePane(p, from, to) {
      const st = p.st;
      p.log = p.main && st.log;
      if (!st.auto && st.umin != null && isFinite(st.umin) && isFinite(st.umax) && st.umax > st.umin) { p.umin = st.umin; p.umax = st.umax; return; }
      let lo = Infinity, hi = -Infinity;
      const scan = (a, off) => {
        if (!a) return;
        off = off || 0;
        const i0 = Math.max(0, this.vFrom - off), i1 = Math.min(a.length - 1, this.vTo - off);
        for (let i = i0; i <= i1; i++) { const v = a[i]; if (v === v && v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }
      };
      let volOv = false;
      if (p.main) {
        const b = this.type === 'ha' ? this.haBars() : this.bars;
        const lineT = this.type === 'line' || this.type === 'area';
        for (let i = from; i <= to; i++) {
          const x = b[i];
          const l = lineT ? x.c : x.l, h = lineT ? x.c : x.h;
          if (l < lo) lo = l; if (h > hi) hi = h;
        }
        for (const ind of this.inds) {
          const def = IND[ind.type];
          if (IND.paneOf(ind.type, ind.inp) !== 'main' || ind.hidden) continue;
          if (def.overlayVol) { volOv = true; continue; }
          if (def.noScale || !ind._o) continue;
          for (const k of this.scaleKeys(def, ind)) if (this.indStyle(ind, k).vis !== false) scan(ind._o[k], ind._o._off && ind._o._off[k]);
        }
      } else {
        const ind = p.ind, def = IND[ind.type];
        if (ind._o && !ind.hidden) for (const k of this.scaleKeys(def, ind)) scan(ind._o[k], ind._o._off && ind._o._off[k]);
        if (def.levels) for (const v of def.levels(ind.inp)) { if (v < lo) lo = v; if (v > hi) hi = v; }
        if (def.zero) { if (0 < lo) lo = 0; if (0 > hi) hi = 0; }
      }
      if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
      if (p.log && lo <= 0) p.log = false;
      if (hi - lo < Math.abs(hi) * 1e-9 + 1e-12) { const d = Math.abs(hi) * 0.01 || 1; lo -= d; hi += d; }
      const a = this.tf(p, lo), z = this.tf(p, hi), r = z - a;
      // 위쪽 여백은 범례 높이만큼 확보 (캔들이 범례 글자 밑으로 들어가지 않게)
      const lgH = p.main ? (this._lgMainH || 44) + (this.app.set.hiLo !== false ? 16 : 0) : 22;
      const ft = U.clamp((lgH + 8) / p.h, 0.07, 0.34), fb = p.main ? (volOv ? 0.1 : 0.06) : 0.08;
      const R = r / (1 - ft - fb);
      p.umin = a - R * fb; p.umax = z + R * ft;
    }
    toggleAuto() { const st = this.ps.main; st.auto = !st.auto; if (!st.auto) { const p = this.pmap.main; st.umin = p.umin; st.umax = p.umax; } this.invalidate(); this.app.saveSlot(this); }
    toggleLog() { const st = this.ps.main; st.log = !st.log; st.auto = true; this.invalidate(); this.app.saveSlot(this); }

    /* ---------------- 포맷 ---------------- */
    fmtInd(def, v) {
      if (v == null || v !== v) return '—';
      const f = def.fmt;
      if (f === 'price') return U.fmt(v, this.prec);
      if (f === 'vol') return U.fmtVol(v);
      if (f === 'auto') { const a = Math.abs(v); return U.fmt(v, a >= 100 ? 2 : a >= 1 ? 3 : a === 0 ? 2 : Math.min(8, Math.ceil(-Math.log10(a)) + 3)); }
      return U.fmt(v, f == null ? 2 : f);
    }
    fmtP(p, v) {
      if (!p || p.main) return U.fmt(v, this.prec);
      return this.fmtInd(IND[p.ind.type], v);
    }
    fmtAxis(p, v, step) {
      if (p.main) return U.fmt(v, this.prec);
      const f = IND[p.ind.type].fmt;
      if (f === 'vol') return U.fmtVol(v);
      if (f === 'price') return U.fmt(v, this.prec);
      return U.fmt(v, U.stepDec(step));
    }
    indStyle(ind, k) {
      const def = IND[ind.type];
      const pd = def.plots.find((q) => q.k === k) || {};
      const o = (ind.sty && ind.sty[k]) || {};
      return {
        c: o.c || pd.c || '#0a84ff', w: o.w != null ? o.w : pd.w || 1, a: o.a != null ? o.a : pd.a != null ? pd.a : 1,
        vis: o.vis != null ? o.vis : !pd.hidden, ls: o.ls != null ? o.ls : pd.ls || 0,
      };
    }

    /* ---------------- 하이킨아시 ---------------- */
    haBars() {
      const b = this.bars, n = b.length;
      if (this._ha && this._haSrc === b && this._haN === n && this._haL === b[n - 1]) return this._ha;
      const ha = new Array(n);
      for (let i = 0; i < n; i++) {
        const x = b[i];
        const c = (x.o + x.h + x.l + x.c) / 4;
        const o = i === 0 ? (x.o + x.c) / 2 : (ha[i - 1].o + ha[i - 1].c) / 2;
        ha[i] = { t: x.t, o, c, h: Math.max(x.h, o, c), l: Math.min(x.l, o, c), v: x.v };
      }
      this._ha = ha; this._haSrc = b; this._haN = n; this._haL = b[n - 1];
      return ha;
    }

    /* ---------------- 시간축 눈금 ---------------- */
    timeMarks() {
      const n = this.bars.length;
      if (!n) return [];
      const vf = Math.floor(this.x2i(0)), vt = Math.ceil(this.x2i(this.plotW));
      const key = vf + '|' + vt + '|' + n + '|' + this.view.s + '|' + this.bars[0].t + '|' + this.bars[n - 1].t + '|' + U.tzMode + '|' + this.plotW;
      if (key === this._tmKey) return this._tm;
      const cand = [];
      let step = 1;
      if (vt - vf > 6000) step = Math.ceil((vt - vf) / 6000);
      let prev = U.parts(this.i2t(vf - step));
      for (let i = vf; i <= vt; i += step) {
        const t = this.i2t(i), p = U.parts(t);
        let w;
        if (p.Y !== prev.Y) w = 7;
        else if (p.M !== prev.M) w = 6;
        else if (p.D !== prev.D) w = 5;
        else if (p.h !== prev.h) w = p.h % 12 === 0 ? 4.6 : p.h % 6 === 0 ? 4.4 : p.h % 3 === 0 ? 4.2 : 4;
        else if (p.m !== prev.m) w = p.m % 30 === 0 ? 3.6 : p.m % 15 === 0 ? 3.4 : p.m % 5 === 0 ? 3.2 : 3;
        else w = 1;
        cand.push({ i, t, w, p });
        prev = p;
      }
      const order = cand.slice().sort((a, b) => b.w - a.w || a.i - b.i);
      const xs = [], out = [];
      const gap = 78;
      for (const c of order) {
        const x = this.i2x(c.i);
        if (x < 0 || x > this.plotW) continue;
        let ok = true;
        for (const q of xs) if (Math.abs(q - x) < gap) { ok = false; break; }
        if (ok) { xs.push(x); out.push(c); }
      }
      out.sort((a, b) => a.i - b.i);
      for (const c of out) {
        const p = c.p;
        c.txt = c.w >= 7 ? String(p.Y) : c.w >= 6 ? p.M + '월' : c.w >= 5 ? String(p.D) : U.p2(p.h) + ':' + U.p2(p.m);
      }
      this._tmKey = key; this._tm = out;
      return out;
    }

    /* ---------------- 렌더 ---------------- */
    render() {
      const ctx = this.ctx, th = this.th, set = this.app.set;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = th.bg;
      ctx.fillRect(0, 0, this.W, this.H);
      this.layout();
      this.btnAuto.classList.toggle('on', !!this.ps.main.auto);
      this.btnLog.classList.toggle('on', !!this.ps.main.log);
      this.scBox.style.width = this.axisW + 'px';
      if (!this.bars.length) { this.drawAxesFrame(); this.updateLegend(); return; }
      this.clampView();
      const { from, to } = this.vis();
      this.from = from; this.to = to;
      for (const p of this.panes) this.scalePane(p, from, to);
      this.tags = []; this.ttags = []; this.selBand = null; this.selTBand = null;
      const marks = this.timeMarks();
      for (const p of this.panes) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, p.top, this.plotW, p.h); ctx.clip();
        if (set.grid !== false) this.drawGrid(p, marks);
        if (p.main) {
          if (set.wm !== false) this.drawWatermark(p);
          for (const ind of this.inds) if (!ind.hidden && IND.paneOf(ind.type, ind.inp) === 'main' && (IND[ind.type].overlayVol || ind.type === 'vpvr')) this.drawInd(p, ind);
          this.drawSeries(p);
          for (const ind of this.inds) if (!ind.hidden && IND.paneOf(ind.type, ind.inp) === 'main' && !(IND[ind.type].overlayVol || ind.type === 'vpvr')) this.drawInd(p, ind);
          if (set.hiLo !== false) this.drawHiLo(p);
          this.drawLastLine(p);
          this.drawAlerts && this.drawAlerts(p);
        } else if (!p.ind.hidden) this.drawInd(p, p.ind);
        this.drawDrawings && this.drawDrawings(p);
        ctx.restore();
      }
      // 패널 구분선
      ctx.fillStyle = th.sep;
      for (let k = 1; k < this.panes.length; k++) ctx.fillRect(0, this.panes[k].top - 1, this.W, 1);
      this.drawCrosshair();
      this.drawPriceAxes();
      this.drawTimeAxis(marks);
      this.updateLegend();
    }
    drawAxesFrame() {
      const ctx = this.ctx, th = this.th;
      ctx.fillStyle = th.axis;
      ctx.fillRect(this.plotW, 0, 1, this.areaH);
      ctx.fillRect(0, this.areaH, this.W, 1);
    }
    drawGrid(p, marks) {
      const ctx = this.ctx;
      ctx.strokeStyle = this.th.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const m of marks) { const x = Math.round(this.i2x(m.i)) + 0.5; ctx.moveTo(x, p.top); ctx.lineTo(x, p.top + p.h); }
      const tk = this.priceTicks(p);
      for (const t of tk.list) { const y = Math.round(t.y) + 0.5; ctx.moveTo(0, y); ctx.lineTo(this.plotW, y); }
      ctx.stroke();
    }
    priceTicks(p) {
      const list = [];
      const cnt = Math.max(2, Math.floor(p.h / 38));
      if (p.log) {
        const seen = new Set();
        for (let k = 0; k <= cnt; k++) {
          const y = p.top + (p.h * (k + 0.5)) / (cnt + 1);
          let v = this.y2v(p, y);
          const mag = Math.pow(10, Math.floor(Math.log10(v)) - 1);
          v = Math.round(v / mag) * mag;
          const key = v.toPrecision(6);
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({ v, y: this.v2y(p, v) });
        }
        return { list, step: 0 };
      }
      const lo = this.y2v(p, p.top + p.h), hi = this.y2v(p, p.top);
      const step = U.niceStep(hi - lo, cnt);
      if (!(step > 0)) return { list, step: 1 };
      for (let v = Math.ceil(lo / step) * step, k = 0; v <= hi && k < 200; v += step, k++) {
        const vv = Math.abs(v) < step * 1e-6 ? 0 : v;
        list.push({ v: vv, y: this.v2y(p, vv) });
      }
      return { list, step };
    }
    drawWatermark(p) {
      const ctx = this.ctx;
      const t = (this.meta.name && this.src === 'stock' ? this.sym : this.sym) + ', ' + U.IV_SHORT[this.iv];
      const sz = U.clamp(Math.floor(this.plotW / 12), 18, 64);
      ctx.font = font(sz, 600);
      ctx.fillStyle = this.th.wm; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t, this.plotW / 2, p.top + p.h / 2);
    }
    drawSeries(p) {
      const ctx = this.ctx, set = this.app.set, s = this.view.s;
      const up = set.up, dn = set.dn;
      const b = this.type === 'ha' ? this.haBars() : this.bars;
      const from = this.from, to = this.to;
      const y = (v) => this.v2y(p, v);
      if (this.type === 'line' || this.type === 'area') {
        ctx.beginPath();
        for (let i = from; i <= to; i++) { const X = this.i2x(i), Y = y(b[i].c); i === from ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
        if (this.type === 'area') {
          ctx.save();
          const g = ctx.createLinearGradient(0, p.top, 0, p.top + p.h);
          g.addColorStop(0, U.rgba(set.line, 0.35)); g.addColorStop(1, U.rgba(set.line, 0.02));
          ctx.lineTo(this.i2x(to), p.top + p.h); ctx.lineTo(this.i2x(from), p.top + p.h); ctx.closePath();
          ctx.fillStyle = g; ctx.fill();
          ctx.restore();
          ctx.beginPath();
          for (let i = from; i <= to; i++) { const X = this.i2x(i), Y = y(b[i].c); i === from ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
        }
        ctx.strokeStyle = set.line; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
        return;
      }
      let bw = Math.max(1, Math.round(s * 0.72));
      if (bw > 2 && bw % 2 === 0) bw -= 1;
      const half = Math.floor(bw / 2);
      const wU = new Path2D(), wD = new Path2D(), bU = new Path2D(), bD = new Path2D(), hU = new Path2D();
      const bars = this.type === 'bar';
      const hollow = this.type === 'hollow';
      for (let i = from; i <= to; i++) {
        const x = b[i];
        const X = Math.round(this.i2x(i));
        const isUp = x.c >= x.o;
        const yo = Math.round(y(x.o)), yc = Math.round(y(x.c)), yh = Math.round(y(x.h)), yl = Math.round(y(x.l));
        const W = isUp ? wU : wD;
        if (bars) {
          const tl = Math.max(1, half);
          W.moveTo(X + 0.5, yh); W.lineTo(X + 0.5, yl + 1);
          W.moveTo(X - tl, yo + 0.5); W.lineTo(X + 0.5, yo + 0.5);
          W.moveTo(X + 0.5, yc + 0.5); W.lineTo(X + tl + 1, yc + 0.5);
          continue;
        }
        const top = Math.min(yo, yc), hgt = Math.max(1, Math.abs(yc - yo));
        if (bw <= 2) { W.moveTo(X + 0.5, yh); W.lineTo(X + 0.5, yl + 1); continue; }
        W.moveTo(X + 0.5, yh); W.lineTo(X + 0.5, top);
        W.moveTo(X + 0.5, top + hgt); W.lineTo(X + 0.5, yl + 1);
        if (hollow && isUp) hU.rect(X - half + 0.5, top + 0.5, bw - 1, Math.max(0, hgt - 1));
        else (isUp ? bU : bD).rect(X - half, top, bw, hgt);
      }
      ctx.lineWidth = bars ? Math.max(1, Math.min(3, Math.floor(s / 6))) : 1;
      ctx.strokeStyle = set.wickUp || up; ctx.stroke(wU);
      ctx.strokeStyle = set.wickDn || dn; ctx.stroke(wD);
      ctx.fillStyle = up; ctx.fill(bU);
      ctx.fillStyle = dn; ctx.fill(bD);
      if (hollow) { ctx.lineWidth = 1; ctx.strokeStyle = up; ctx.stroke(hU); }
    }
    drawHiLo(p) {
      const b = this.bars;
      let hi = -Infinity, lo = Infinity, ih = -1, il = -1;
      for (let i = Math.max(this.from, 0); i <= this.to; i++) { if (b[i].h > hi) { hi = b[i].h; ih = i; } if (b[i].l < lo) { lo = b[i].l; il = i; } }
      if (ih < 0) return;
      const ctx = this.ctx;
      ctx.font = font(11); ctx.textBaseline = 'middle';
      const mk = (i, v, isHi) => {
        const x = this.i2x(i), y = this.v2y(p, v) + (isHi ? -8 : 8);
        const right = x < this.plotW * 0.7;
        const txt = (isHi ? '최고 ' : '최저 ') + U.fmt(v, this.prec);
        ctx.fillStyle = this.th.text;
        ctx.strokeStyle = this.th.dim; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (right ? 14 : -14), y); ctx.stroke();
        ctx.textAlign = right ? 'left' : 'right';
        ctx.fillText(txt, x + (right ? 17 : -17), y);
      };
      mk(ih, hi, true); mk(il, lo, false);
    }
    lastBarColor() {
      const b = this.bars, n = b.length, l = b[n - 1];
      return l.c >= l.o ? this.app.set.up : this.app.set.dn;
    }
    drawLastLine(p) {
      const b = this.bars, n = b.length;
      if (!n || this.app.set.lastLine === false) return;
      const l = b[n - 1], y = Math.round(this.v2y(p, l.c)) + 0.5, ctx = this.ctx;
      ctx.strokeStyle = this.lastBarColor(); ctx.lineWidth = 1; ctx.setLineDash([1, 2]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.plotW, y); ctx.stroke(); ctx.setLineDash([]);
      let txt2 = null;
      if (this.status && this.status !== 'error' && this.status !== 'poll' && !this.replay && this.app.set.countdown !== false && this.src !== 'stock' && this.src !== 'csv') {
        const end = l.t + this.ivMs;
        let rem = Math.max(0, end - Date.now());
        if (rem < this.ivMs * 1.05) {
          const s = Math.floor(rem / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
          txt2 = d ? d + '일 ' + U.p2(h) + ':' + U.p2(m) : h ? U.p2(h) + ':' + U.p2(m) + ':' + U.p2(ss) : U.p2(m) + ':' + U.p2(ss);
        }
      }
      this.tags.push({ p, v: l.c, bg: this.lastBarColor(), fg: '#fff', txt2, prio: 5 });
    }

    /* ---------------- 지표 렌더 ---------------- */
    drawInd(p, ind) {
      if (!ind._o) return;
      const def = IND[ind.type];
      const R = this.makeR(p, ind);
      try { def.render(R, ind, ind._o); } catch (e) { console.error('지표 렌더 오류', ind.type, e); }
      if (this.app.set.indLabels !== false && !def.noScale) {
        const o = ind._o;
        for (const pl of def.plots) {
          if (pl.t && pl.t !== 'line' && pl.t !== 'hist') continue;
          const a = o[pl.k];
          const st = this.indStyle(ind, pl.k);
          if (!a || st.vis === false) continue;
          if (def.overlayVol && !ind.inp.sep) continue;
          const off = (o._off && o._off[pl.k]) || 0;
          let i = Math.min(a.length - 1, this.bars.length - 1 - off);
          while (i > 0 && !(a[i] === a[i])) i--;
          if (a[i] === a[i]) this.tags.push({ p, v: a[i], bg: st.c, fg: '#fff', fmt: (v) => this.fmtInd(def, v), prio: 1 });
        }
      }
    }
    makeR(p, ind) {
      const self = this, ctx = this.ctx, def = IND[ind.type];
      const R = {
        chart: this, ctx, pane: p, bars: this.bars, from: this.from, to: this.to, vFrom: this.vFrom, vTo: this.vTo,
        plotW: this.plotW, s: this.view.s,
        x: (i) => self.i2x(i), y: (v) => self.v2y(p, v),
        st: (k) => self.indStyle(ind, k),
        plot(k, a, o) {
          const st = R.st(k);
          if (!a || st.vis === false) return;
          o = o || {};
          const off = o.off != null ? o.off : (ind._o._off && ind._o._off[k]) || 0;
          const pd = def.plots.find((q) => q.k === k);
          if (pd && pd.t === 'dots') R.dots(a, st.c, st.w, off);
          else if (pd && pd.t === 'hist') R.hist(a, st.c, R.y(0));
          else R.line(a, st.c, st.w, { off, y: o.y, brk: o.brk, ls: st.ls });
        },
        line(a, c, w, o) {
          o = o || {};
          const off = o.off || 0, yf = o.y || R.y;
          const i0 = Math.max(0, R.vFrom - off), i1 = Math.min(a.length - 1, R.vTo - off);
          ctx.beginPath();
          let pen = false;
          for (let i = i0; i <= i1; i++) {
            const v = a[i];
            if (v !== v || v == null) { pen = false; continue; }
            if (o.brk && o.brk[i]) pen = false;
            const X = self.i2x(i + off), Y = yf(v);
            if (!pen) { ctx.moveTo(X, Y); pen = true; } else ctx.lineTo(X, Y);
          }
          ctx.strokeStyle = c; ctx.lineWidth = w || 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          ctx.setLineDash(DASH(o.ls, w));
          ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
        },
        hist(a, color, base, yf) {
          yf = yf || R.y;
          let bw = Math.max(1, Math.round(R.s * 0.72));
          if (bw > 2 && bw % 2 === 0) bw -= 1;
          const half = Math.floor(bw / 2), groups = new Map();
          for (let i = R.from; i <= R.to; i++) {
            const v = a[i];
            if (v !== v || v == null) continue;
            const c = typeof color === 'function' ? color(i) : color;
            let g = groups.get(c);
            if (!g) { g = new Path2D(); groups.set(c, g); }
            const X = Math.round(self.i2x(i)) - half, Y = Math.round(yf(v)), B = Math.round(base);
            g.rect(X, Math.min(Y, B), bw, Math.max(1, Math.abs(Y - B)));
          }
          for (const [c, g] of groups) { ctx.fillStyle = c; ctx.fill(g); }
        },
        fill(a, b, color, off, brk) {
          if (!a || !b) return;
          off = off || 0;
          const i0 = Math.max(0, R.vFrom - off), i1 = Math.min(a.length - 1, b.length - 1, R.vTo - off);
          if (typeof color === 'function') {
            const groups = new Map();
            for (let i = i0; i < i1; i++) {
              const a0 = a[i], a1 = a[i + 1], b0 = b[i], b1 = b[i + 1];
              if (a0 !== a0 || a1 !== a1 || b0 !== b0 || b1 !== b1 || (brk && brk[i + 1])) continue;
              const c = color(i);
              let g = groups.get(c);
              if (!g) { g = new Path2D(); groups.set(c, g); }
              const x0 = self.i2x(i + off), x1 = self.i2x(i + 1 + off);
              g.moveTo(x0, R.y(a0)); g.lineTo(x1, R.y(a1)); g.lineTo(x1, R.y(b1)); g.lineTo(x0, R.y(b0)); g.closePath();
            }
            for (const [c, g] of groups) { ctx.fillStyle = c; ctx.fill(g); }
            return;
          }
          ctx.fillStyle = color;
          let run = [];
          const flush = () => {
            if (run.length > 1) {
              ctx.beginPath();
              run.forEach((i, k) => { const X = self.i2x(i + off), Y = R.y(a[i]); k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
              for (let k = run.length - 1; k >= 0; k--) { const i = run[k]; ctx.lineTo(self.i2x(i + off), R.y(b[i])); }
              ctx.closePath(); ctx.fill();
            }
            run = [];
          };
          for (let i = i0; i <= i1; i++) {
            if (brk && brk[i]) flush();
            if (a[i] === a[i] && b[i] === b[i] && a[i] != null && b[i] != null) run.push(i); else flush();
          }
          flush();
        },
        fillSt(a, b, k, o) { const st = R.st(k); if (st.vis === false) return; R.fill(a, b, U.rgba(st.c, st.a), o && o.off, o && o.brk); },
        bandSt(v1, v2, k) {
          const st = R.st(k);
          if (st.vis === false) return;
          const y1 = R.y(v1), y2 = R.y(v2);
          ctx.fillStyle = U.rgba(st.c, st.a);
          ctx.fillRect(0, Math.min(y1, y2), R.plotW, Math.abs(y2 - y1));
        },
        levelSt(vals, k, dash) {
          const st = R.st(k);
          if (st.vis === false) return;
          ctx.strokeStyle = st.c; ctx.lineWidth = st.w || 1;
          ctx.setLineDash(dash || [4, 3]);
          ctx.beginPath();
          for (const v of vals) { const Y = Math.round(R.y(v)) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(R.plotW, Y); }
          ctx.stroke(); ctx.setLineDash([]);
        },
        dots(a, c, w, off) {
          off = off || 0;
          const r = Math.max(1.2, (w || 1) * 1.3);
          ctx.fillStyle = c;
          ctx.beginPath();
          for (let i = Math.max(0, R.vFrom - off); i <= Math.min(a.length - 1, R.vTo - off); i++) {
            const v = a[i];
            if (v !== v || v == null) continue;
            const X = self.i2x(i + off), Y = R.y(v);
            ctx.moveTo(X + r, Y); ctx.arc(X, Y, r, 0, Math.PI * 2);
          }
          ctx.fill();
        },
        divergences(list, bull, bear) {
          ctx.font = font(10, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const d of list) {
            if (d.i1 < R.vFrom || d.i0 > R.vTo) continue;
            const st = d.bull ? bull : bear;
            if (st.vis === false) continue;
            const x0 = self.i2x(d.i0), x1 = self.i2x(d.i1), y0 = R.y(d.v0), y1 = R.y(d.v1);
            ctx.strokeStyle = st.c; ctx.lineWidth = st.w || 1.5;
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            const ly = y1 + (d.bull ? 12 : -12);
            const tw = 26;
            ctx.fillStyle = st.c;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x1 - tw / 2, ly - 7, tw, 14, 3) : ctx.rect(x1 - tw / 2, ly - 7, tw, 14); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillText(d.bull ? '강세' : '약세', x1, ly + 0.5);
          }
        },
        vprofile(vp, x0, W, dir, S) { self.drawVP(p, vp, x0, W, dir, S); },
      };
      return R;
    }
    /* 거래량 프로파일 공용 렌더 (dir: -1 = 오른쪽 기준 왼쪽으로, +1 = 왼쪽 기준 오른쪽으로) */
    drawVP(p, vp, x0, W, dir, S, xr) {
      const ctx = this.ctx;
      const cols = (st) => U.rgba(st.c, st.a);
      for (let r = 0; r < vp.rows; r++) {
        const tot = vp.up[r] + vp.dn[r];
        if (!tot) continue;
        const yA = this.v2y(p, vp.lo + (r + 1) * vp.step), yB = this.v2y(p, vp.lo + r * vp.step);
        const top = Math.min(yA, yB) + 0.5, h = Math.max(1, Math.abs(yB - yA) - 1);
        const len = (tot / vp.max) * W, lu = (vp.up[r] / tot) * len;
        const inVA = r >= vp.vaLo && r <= vp.vaHi;
        ctx.fillStyle = cols(inVA ? S.vup : S.up);
        if (dir < 0) ctx.fillRect(x0 - len, top, lu, h); else ctx.fillRect(x0, top, lu, h);
        ctx.fillStyle = cols(inVA ? S.vdn : S.dn);
        if (dir < 0) ctx.fillRect(x0 - len + lu, top, len - lu, h); else ctx.fillRect(x0 + lu, top, len - lu, h);
      }
      if (S.poc && S.poc.vis !== false) {
        const y = Math.round(this.v2y(p, vp.lo + (vp.poc + 0.5) * vp.step)) + 0.5;
        ctx.strokeStyle = S.poc.c; ctx.lineWidth = S.poc.w || 1;
        ctx.beginPath();
        if (S.pocExt) { ctx.moveTo(0, y); ctx.lineTo(this.plotW, y); }
        else { ctx.moveTo(x0, y); ctx.lineTo(xr != null ? xr : x0 + dir * W, y); }
        ctx.stroke();
      }
    }

    /* ---------------- 크로스헤어 ---------------- */
    crossInfo() {
      const m = this.mouse;
      if (m.in && m.x >= 0 && m.x < this.plotW && m.y >= 0 && m.y < this.areaH) {
        const i = Math.round(this.x2i(m.x));
        const p = this.paneAt(m.y);
        let y = m.y, v = this.y2v(p, m.y);
        if (this.app.magnetLevel(this.mods) && p.main && this.bars.length && !this.drag) {
          const bi = U.clamp(i, 0, this.bars.length - 1);
          if (bi === i) {
            const b = this.bars[bi];
            let best = null, bd = Infinity;
            for (const q of [b.o, b.h, b.l, b.c]) { const d = Math.abs(this.v2y(p, q) - m.y); if (d < bd) { bd = d; best = q; } }
            if (this.app.magnetLevel(this.mods) === 2 || bd < 24) { v = best; y = this.v2y(p, best); }
          }
        }
        return { i, x: this.i2x(i), y, v, p, own: true };
      }
      if (this.extT != null && this.bars.length) {
        const i = Math.round(this.t2i(this.extT));
        return { i, x: this.i2x(i), own: false };
      }
      return null;
    }
    drawCrosshair() {
      const c = this.crossInfo();
      this._cross = c;
      if (!c) return;
      const ctx = this.ctx, th = this.th, cur = this.app.set.cursor || 'cross';
      if (c.x < 0 || c.x > this.plotW) return;
      ctx.strokeStyle = th.cross; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const X = Math.round(c.x) + 0.5;
      if (cur === 'cross' || !c.own) { ctx.moveTo(X, 0); ctx.lineTo(X, this.areaH); }
      if (c.own && cur === 'cross') { const Y = Math.round(c.y) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(this.plotW, Y); }
      ctx.stroke(); ctx.setLineDash([]);
      if (c.own && cur === 'dot') { ctx.fillStyle = th.cross; ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, Math.PI * 2); ctx.fill(); }
    }

    /* ---------------- 가격축 ---------------- */
    drawPriceAxes() {
      const ctx = this.ctx, th = this.th, x0 = this.plotW;
      ctx.fillStyle = th.bg;
      ctx.fillRect(x0, 0, this.axisW, this.areaH);
      ctx.fillStyle = th.axis;
      ctx.fillRect(x0, 0, 1, this.areaH);
      ctx.font = font(11); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      let maxW = 0;
      for (const p of this.panes) {
        const tk = this.priceTicks(p);
        ctx.fillStyle = th.text;
        for (const t of tk.list) {
          if (t.y < p.top + 6 || t.y > p.top + p.h - 6) continue;
          const s = this.fmtAxis(p, t.v, tk.step || t.v / 10);
          const w = ctx.measureText(s).width;
          if (w > maxW) maxW = w;
          ctx.fillText(s, x0 + 8, t.y);
        }
      }
      // 선택된 드로잉 가격 범위 강조
      if (this.selBand && this.selBand.p) {
        const sb = this.selBand;
        ctx.fillStyle = U.rgba(th.sel, 0.18);
        ctx.fillRect(x0 + 1, Math.min(sb.y0, sb.y1), this.axisW, Math.abs(sb.y1 - sb.y0));
      }
      // 라벨 겹침 방지: 패널별로 y 정렬 후 아래로 밀어내기 (현재가 라벨은 제자리 우선)
      const c = this._cross;
      const byPane = new Map();
      for (const t of this.tags) {
        const p = t.p;
        t._y = t.y != null ? t.y : this.v2y(p, t.v);
        if (!(t._y >= p.top - 2 && t._y <= p.top + p.h + 2)) continue;
        t._h = t.txt2 ? 32 : 18;
        (byPane.get(p) || byPane.set(p, []).get(p)).push(t);
      }
      for (const [p, list] of byPane) {
        list.sort((a, b) => a._y - b._y || (b.prio || 0) - (a.prio || 0));
        for (let k = 1; k < list.length; k++) {
          const a = list[k - 1], b = list[k];
          const need = (a.txt2 ? 23 : 9) + (b.txt2 ? 9 : 9);
          if (b._y - a._y < need) b._y = a._y + need;
        }
        const last = list[list.length - 1];
        if (last && last._y > p.top + p.h - 8) {
          const sh = last._y - (p.top + p.h - 8);
          for (const t of list) t._y -= sh;
          for (let k = list.length - 2; k >= 0; k--) { const a = list[k], b = list[k + 1]; const need = (a.txt2 ? 23 : 9) + 9; if (b._y - a._y < need) a._y = b._y - need; }
        }
        list.sort((a, b) => (a.prio || 0) - (b.prio || 0));
        for (const t of list) {
          const s = t.txt || (t.fmt ? t.fmt(t.v) : this.fmtP(p, t.v));
          const w = this.tag(x0, t._y, s, t.bg, t.fg || '#fff', t.txt2);
          if (w > maxW) maxW = w;
        }
      }
      if (c && c.own && c.p) {
        const w = this.tag(x0, c.y, this.fmtP(c.p, c.v), th.crossBg, th.crossFg);
        if (w > maxW) maxW = w;
      }
      if (Math.abs(maxW - this._lblW) > 2 && maxW > 0) { this._lblW = maxW; this.invalidate(); }
    }
    tag(x0, y, s, bg, fg, s2) {
      const ctx = this.ctx;
      ctx.font = font(11);
      const w = ctx.measureText(s).width;
      const h = s2 ? 32 : 18, top = s2 ? y - 9 : y - 9;
      ctx.fillStyle = bg;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0 + 2, top, this.axisW - 4, h, 6); else ctx.rect(x0 + 2, top, this.axisW - 4, h);
      ctx.fill();
      ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(s, x0 + 8, y);
      if (s2) { ctx.font = font(10); ctx.fillText(s2, x0 + 8, y + 14); }
      return w;
    }

    /* ---------------- 시간축 ---------------- */
    drawTimeAxis(marks) {
      const ctx = this.ctx, th = this.th, y0 = this.areaH;
      ctx.fillStyle = th.bg; ctx.fillRect(0, y0, this.W, this.timeH);
      ctx.fillStyle = th.axis; ctx.fillRect(0, y0, this.W, 1);
      if (this.selTBand) {
        const b = this.selTBand;
        ctx.fillStyle = U.rgba(th.sel, 0.18);
        ctx.fillRect(Math.min(b.x0, b.x1), y0 + 1, Math.abs(b.x1 - b.x0), this.timeH);
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const m of marks) {
        const x = this.i2x(m.i);
        ctx.font = font(11, m.w >= 6 ? 600 : 0);
        ctx.fillStyle = th.text;
        ctx.fillText(m.txt, x, y0 + this.timeH / 2 + 1);
      }
      const tl = (x, txt, bg, fg) => {
        ctx.font = font(11);
        const w = ctx.measureText(txt).width + 14;
        const bx = U.clamp(x - w / 2, 0, this.plotW - w);
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, y0 + 3, w, this.timeH - 6, 7) : ctx.rect(bx, y0 + 3, w, this.timeH - 6); ctx.fill();
        ctx.fillStyle = fg; ctx.textAlign = 'center';
        ctx.fillText(txt, bx + w / 2, y0 + this.timeH / 2 + 1);
      };
      for (const t of this.ttags) tl(this.i2x(this.t2i(t.t)), U.fmtDT(t.t, this.iv), t.bg, '#fff');
      const c = this._cross;
      if (c && c.x >= 0 && c.x <= this.plotW) tl(c.x, U.fmtDT(this.i2t(c.i), this.iv), th.crossBg, th.crossFg);
    }

    /* ---------------- 범례 (DOM) ---------------- */
    buildLegend() {
      const lg = this.lg, I = CL.ICON;
      lg.innerHTML = '';
      this._lgKey = '';
      this._lgBox = {};
      const mk = (key) => { const b = U.h('div', { class: 'lg-box' }); lg.append(b); this._lgBox[key] = b; return b; };
      const main = mk('main');
      this._lgTitle = U.h('span', { class: 'lg-title', title: '종목 검색', onclick: () => this.app.openSearch(this) });
      this._lgOHLC = U.h('span', { class: 'lg-ohlc' });
      this._lgStat = U.h('span', { class: 'lg-stat' });
      const mob = !!this.app.mobile;
      const logo = CL.Logo ? CL.Logo.el(this.src, this.sym, mob ? 20 : 18, this.dispName()) : null;
      main.append(U.h('div', { class: 'lg-row lg-sym' }, logo, this._lgTitle, this._lgStat, this._lgOHLC));
      let nMain = 0;
      for (const ind of this.inds) {
        const sub = IND.paneOf(ind.type, ind.inp) === 'sub';
        if (!sub) nMain++;
        const box = sub ? mk(ind.id) : main;
        const def = IND[ind.type];
        const vals = U.h('span', { class: 'lg-vals' });
        // 모바일: 지표 줄을 탭하면 버튼(숨기기·설정·삭제)이 나옴
        const row = U.h('div', { class: 'lg-row lg-ind' + (ind.hidden ? ' off' : ''), onclick: mob ? (e) => { if (!e.target.closest('button')) e.currentTarget.classList.toggle('open'); } : null },
          U.h('span', { class: 'lg-name', text: def.label(ind.inp), ondblclick: () => this.app.openIndSettings(this, ind) }),
          vals,
          U.h('span', { class: 'lg-btns' },
            U.h('button', { title: ind.hidden ? '보이기' : '숨기기', html: ind.hidden ? I.eyeOff : I.eye, onclick: (e) => { e.stopPropagation(); this.toggleInd(ind); } }),
            U.h('button', { title: '설정', html: I.gear, onclick: (e) => { e.stopPropagation(); this.app.openIndSettings(this, ind); } }),
            sub ? U.h('button', { title: '위로', html: I.up, onclick: (e) => { e.stopPropagation(); this.moveInd(ind, -1); } }) : null,
            sub ? U.h('button', { title: '아래로', html: I.down, onclick: (e) => { e.stopPropagation(); this.moveInd(ind, 1); } }) : null,
            U.h('button', { title: '삭제', html: I.close, onclick: (e) => { e.stopPropagation(); this.removeInd(ind.id); } })));
        box.append(row);
        ind._lgVals = vals;
      }
      if (mob && nMain) { // 트레이딩뷰 앱처럼 차트 위 지표는 "∨ 개수" 버튼으로 접기 (처음엔 접힘)
        main.classList.toggle('lg-col', this.app.set.mLgCol !== false);
        main.append(U.h('button', {
          class: 'lg-tog', html: I.down + '<b>' + nMain + '</b>', title: '지표 접기/펼치기',
          onclick: () => {
            this.app.set.mLgCol = this.app.set.mLgCol === false; this.app.saveSet();
            main.classList.toggle('lg-col', this.app.set.mLgCol !== false);
            this._lgMainH = main.offsetHeight; this.invalidate();
          },
        }));
      }
      this.updateLegend();
      const mh = main.offsetHeight;
      if (mh && mh !== this._lgMainH) { this._lgMainH = mh; this.invalidate(); }
    }
    dispName() {
      const n = this.app.names && this.app.names[this.key];
      if (n) return n;
      const w = this.app.wl && this.app.wl.nameOf(this.src, this.sym);
      if (w) return w;
      return this.meta && this.meta.name && this.src === 'stock' ? this.meta.name : '';
    }
    updateLegend() {
      if (!this._lgBox) return;
      for (const p of this.panes) { const b = this._lgBox[p.key]; if (b) { const t = p.top + 4 + 'px'; if (b.style.top !== t) b.style.top = t; } }
      const n = this.bars.length;
      const prov = Data.get(this.src);
      const nm = this.dispName(), tk = CL.tickOf ? CL.tickOf(this.src, this.sym) : this.sym;
      const title = this.app.mobile ? (this.src === 'stock' && nm ? nm : tk)
        : (nm && nm !== this.sym ? nm + ' (' + tk + ')' : tk) + ' · ' + U.IV_LABEL[this.iv] + ' · ' + (prov ? prov.name : this.src);
      if (this._lgTitle.textContent !== title) this._lgTitle.textContent = title;
      const st = this.replay ? '리플레이' : this.status === 'live' || this.status === 'resync' ? '실시간' : this.status === 'poll' ? '지연' : this.status === 'reconnect' ? '재연결…' : '';
      if (this._lgStat.textContent !== st) { this._lgStat.textContent = st; this._lgStat.className = 'lg-stat ' + (this.status || ''); }
      if (!n) { this._lgOHLC.innerHTML = ''; return; }
      let i = n - 1;
      const c = this._cross;
      if (c && c.i >= 0 && c.i < n) i = c.i;
      const b = this.bars[i];
      const key = i + '|' + n + '|' + b.c + '|' + b.h + '|' + b.l + '|' + this.inds.length + '|' + this.prec + '|' + (this.inds.map((x) => x._ver || 0).join());
      if (key === this._lgKey) return;
      this._lgKey = key;
      const set = this.app.set;
      const col = b.c >= b.o ? set.up : set.dn;
      const pc = i > 0 ? this.bars[i - 1].c : b.o;
      const ch = b.c - pc, chp = pc ? (ch / pc) * 100 : 0;
      const f = (v) => U.fmt(v, this.prec);
      // 이름표와 값은 한 덩어리로 (좁은 화면에서 줄이 바뀌어도 "종"과 값이 떨어지지 않게)
      const pair = (n, v) => '<span class="lg-p"><i>' + n + '</i><b style="color:' + col + '">' + f(v) + '</b></span>';
      this._lgOHLC.innerHTML = pair('시', b.o) + pair('고', b.h) + pair('저', b.l) + pair('종', b.c) +
        '<b class="lg-chg" style="color:' + (ch >= 0 ? set.up : set.dn) + '">' + (ch >= 0 ? '+' : '') + f(ch) + ' (' + U.fmtPct(chp) + ')</b>';
      for (const ind of this.inds) {
        if (!ind._lgVals) continue;
        const def = IND[ind.type], o = ind._o || {};
        let html = '';
        if (def.legend) html = def.legend(this, ind, i).map((x) => '<b style="color:' + x.c + '">' + x.v + '</b>').join('');
        else {
          for (const pl of def.plots) {
            if (pl.t && pl.t !== 'line' && pl.t !== 'hist' && pl.t !== 'dots') continue;
            const a = o[pl.k], stl = this.indStyle(ind, pl.k);
            if (!a || stl.vis === false) continue;
            const off = (o._off && o._off[pl.k]) || 0;
            const v = a[i - off];
            html += '<b style="color:' + stl.c + '">' + this.fmtInd(def, v) + '</b>';
          }
        }
        ind._lgVals.innerHTML = html;
      }
    }

    /* ---------------- 지표 관리 ---------------- */
    calcInd(ind) {
      const def = IND[ind.type];
      try { ind._o = def.calc(this.bars, ind.inp, { tz: this.tzOff, iv: this.iv, prec: this.prec }) || {}; }
      catch (e) { console.error('지표 계산 오류', ind.type, e); ind._o = {}; }
      ind._ver = (ind._ver || 0) + 1;
      if (def.alerts) {
        // 새 이벤트만 알림 (불러온 직후·리플레이 중에는 울리지 않음)
        const al = ind._o.alert;
        if (ind.inp.alert && ind._alInit && al && al.key !== ind._alKey && !this.replay) this.app.indAlert(this, ind, al.text);
        if (al) ind._alKey = al.key;
        ind._alInit = true;
      }
    }
    calcAll() { this._ha = null; for (const ind of this.inds) this.calcInd(ind); }
    addInd(type, inp, sty, silent) {
      if (!IND[type]) return null;
      const ind = { id: U.uid(), type, inp: Object.assign(IND.defaults(type), inp || {}), sty: sty || {}, hidden: false };
      this.inds.push(ind);
      this.calcInd(ind);
      if (!silent) { this.buildLegend(); this.commit(); this.invalidate(); }
      return ind;
    }
    removeInd(id) {
      const k = this.inds.findIndex((x) => x.id === id);
      if (k < 0) return;
      this.inds.splice(k, 1);
      delete this.ps[id];
      this.drawings = this.drawings.filter((d) => d.pane !== id);
      if (this.sel && this.sel.pane === id) this.select(null);
      this.buildLegend(); this.commit(); this.invalidate();
    }
    updateInd(ind, inp, sty) {
      const was = IND.paneOf(ind.type, ind.inp);
      if (inp) ind.inp = Object.assign({}, ind.inp, inp);
      if (sty) ind.sty = sty;
      this.calcInd(ind);
      if (was !== IND.paneOf(ind.type, ind.inp)) { delete this.ps[ind.id]; this.drawings = this.drawings.filter((d) => d.pane !== ind.id); }
      this.buildLegend(); this.commit(); this.invalidate();
    }
    toggleInd(ind) { ind.hidden = !ind.hidden; this.buildLegend(); this.commit(); this.invalidate(); }
    moveInd(ind, dir) {
      const subs = this.inds.filter((x) => IND.paneOf(x.type, x.inp) === 'sub');
      const k = subs.indexOf(ind), j = k + dir;
      if (k < 0 || j < 0 || j >= subs.length) return;
      const a = this.inds.indexOf(subs[k]), b = this.inds.indexOf(subs[j]);
      [this.inds[a], this.inds[b]] = [this.inds[b], this.inds[a]];
      this.buildLegend(); this.commit(); this.invalidate();
    }

    /* ---------------- 데이터 ---------------- */
    showMsg(t, err) { this.msgEl.textContent = t; this.msgEl.className = 'chart-msg' + (err ? ' err' : ''); }
    hideMsg() { this.msgEl.className = 'chart-msg hidden'; }
    stopLive() { if (this.unsub) { try { this.unsub(); } catch (e) {} this.unsub = null; } this.status = ''; }
    async load(src, sym, iv) {
      const token = ++this.loadToken;
      this.stopLive();
      if (this.replay) this.app.stopReplay(this, true);
      const changedSym = this.src !== src || this.sym !== sym;
      this.src = src; this.sym = sym; this.iv = iv;
      this.showMsg('불러오는 중…');
      this.select(null);
      this.creating = null; this.drag = null; this.measure = null;
      this.invalidate();
      try {
        const res = await Data.load(src, sym, iv);
        if (token !== this.loadToken) return;
        if (!res.bars.length) throw new Error('데이터가 없습니다');
        this.zoomHist = [];
        const prov = Data.get(src);
        this.meta = prov.meta ? prov.meta(sym) : {};
        this.tzOff = prov.tz(sym) || 0;
        this.full = res.bars; this.bars = this.full; this.baseBars = res.baseBars;
        const dp = U.detectPrec(this.full);
        this.prec = this.meta.prec != null ? Math.min(Math.max(0, this.meta.prec), dp) : dp;
        this.noMore = !prov.more;
        if (changedSym || !this._loadedOnce) this.loadDrawings();
        this._loadedOnce = true;
        for (const x of this.inds) x._alInit = false;
        this.calcAll();
        this.ps.main.auto = true;
        for (const k in this.ps) this.ps[k].auto = true;
        this.fit();
        this.buildLegend();
        this.hideMsg();
        this.startLive();
      } catch (e) {
        if (token !== this.loadToken) return;
        console.warn(e);
        this.full = this.bars = [];
        this.showMsg('불러오기 실패: ' + e.message, true);
        this.buildLegend();
      }
      this.invalidate();
      this.app.onChartLoaded(this);
    }
    startLive() {
      const ctx = { last: this.full[this.full.length - 1], baseBars: this.baseBars };
      const tok = this.loadToken;
      this.unsub = Data.subscribe(this.src, this.sym, this.iv,
        (b) => { if (tok === this.loadToken) this.onLive(b); },
        (st) => { if (tok === this.loadToken) this.onStatus(st); }, ctx);
    }
    onLive(b) {
      const a = this.full;
      if (!a.length || !b || !isFinite(b.c)) return;
      const last = a[a.length - 1];
      if (b.t === last.t) a[a.length - 1] = b;
      else if (b.t > last.t) {
        const atEnd = !this.replay && this.view.r >= a.length - 1 - 0.5;
        a.push(b);
        if (atEnd) this.view.r += 1;
      } else {
        const i = U.bsearch(a, b.t);
        if (i >= 0 && a[i].t === b.t) a[i] = b; else return;
      }
      this.lastTick = Date.now();
      if (!this.replay) {
        if (!this._calcT) this._calcT = setTimeout(() => { this._calcT = 0; this.calcAll(); this.invalidate(); }, 150);
      }
      this.app.onTick(this, b);
    }
    onStatus(st) {
      const prev = this.status;
      this.status = st;
      if (st === 'resync' || (st === 'live' && prev === 'reconnect')) this.resync();
      this.invalidate();
    }
    async resync() {
      try {
        const r = await Data.load(this.src, this.sym, this.iv);
        if (!r.bars.length || !this.full.length) return;
        const first = r.bars[0].t;
        const keep = this.full.filter((b) => b.t < first);
        this.full = keep.concat(r.bars);
        if (!this.replay) this.bars = this.full;
        this.calcAll(); this.invalidate();
      } catch (e) {}
    }
    async loadMore() {
      if (this.loadingMore || this.noMore || this.replay || !this.full.length) return;
      this.loadingMore = true;
      const tok = this.loadToken;
      try {
        const older = await Data.loadBefore(this.src, this.sym, this.iv, this.full[0].t);
        if (tok !== this.loadToken) return;
        const add = older.filter((b) => b.t < this.full[0].t);
        if (!add.length) this.noMore = true;
        else {
          this.full = add.concat(this.full);
          this.bars = this.full;
          this.view.r += add.length;
          if (this.drag && this.drag.k === 'pan') this.drag.r0 += add.length;
          this.calcAll();
        }
      } catch (e) { this.noMore = true; }
      this.loadingMore = false;
      this.invalidate();
    }

    /* ---------------- 상태 저장 ---------------- */
    snap() { return JSON.stringify({ d: this.drawings, i: this.inds }, (k, v) => (k[0] === '_' ? undefined : v)); }
    commit() {
      const s = this.snap();
      if (s === this._snap) return;
      if (this._snap != null) { this.undoS.push(this._snap); if (this.undoS.length > 120) this.undoS.shift(); this.redoS = []; }
      this._snap = s;
      this.saveDrawings();
      this.app.saveSlot(this);
      this.app.onDrawingsChanged(this);
    }
    restoreSnap(s) {
      const o = JSON.parse(s);
      this.drawings = o.d || [];
      const old = {};
      for (const x of this.inds) old[x.id] = x;
      this.inds = (o.i || []).map((x) => { const p = old[x.id]; return p && JSON.stringify([p.inp, p.type]) === JSON.stringify([x.inp, x.type]) ? Object.assign(p, x) : x; });
      for (const x of this.inds) if (!x._o) this.calcInd(x); else this.calcInd(x);
      this.select(null);
      this.buildLegend(); this.saveDrawings(); this.app.saveSlot(this); this.app.onDrawingsChanged(this); this.invalidate();
    }
    undo() { if (!this.undoS.length) return; this.redoS.push(this._snap); this._snap = this.undoS.pop(); this.restoreSnap(this._snap); }
    redo() { if (!this.redoS.length) return; this.undoS.push(this._snap); this._snap = this.redoS.pop(); this.restoreSnap(this._snap); }
    saveDrawings() {
      const list = this.drawings.filter((d) => !d.temp);
      U.save('dw.' + this.key, JSON.parse(JSON.stringify(list, (k, v) => (k[0] === '_' ? undefined : v))));
    }
    loadDrawings() {
      this.drawings = U.load('dw.' + this.key, []) || [];
      this.undoS = []; this.redoS = [];
      this._snap = this.snap();
    }
    reloadDrawings() {
      if (this.drag || this.creating) return;
      const selId = this.sel && this.sel.id;
      this.drawings = U.load('dw.' + this.key, []) || [];
      this.sel = selId ? this.drawings.find((d) => d.id === selId) || null : null;
      this._snap = this.snap();
      this.invalidate();
    }

    /* ---------------- 입력 ---------------- */
    pos(e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    region(x, y) {
      if (y >= this.areaH) return { k: x >= this.plotW ? 'corner' : 'time' };
      const p = this.paneAt(y);
      if (x >= this.plotW) return { k: 'price', p };
      const tol = this._touch ? 8 : 3;
      for (let k = 1; k < this.panes.length; k++) if (Math.abs(y - this.panes[k].top) <= tol) return { k: 'sep', idx: k };
      return { k: 'plot', p };
    }
    bindEvents() {
      const cv = this.cv;
      this.pointers = new Map();
      cv.addEventListener('pointerdown', (e) => this.onDown(e));
      cv.addEventListener('pointermove', (e) => this.onMove(e));
      cv.addEventListener('pointerup', (e) => this.onUp(e));
      cv.addEventListener('pointercancel', (e) => this.onUp(e));
      cv.addEventListener('pointerleave', (e) => {
        if (this.drag || e.pointerType === 'touch') return; // 터치는 손가락을 떼도 십자선 유지
        this.mouse.in = false; this.hov = null;
        this.app.syncCross(this, null);
        this.invalidate();
      });
      cv.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      cv.addEventListener('dblclick', (e) => this.onDbl(e));
      cv.addEventListener('contextmenu', (e) => this.onCtx(e));
    }
    setMods(e) { this.mods = { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey }; }
    onDown(e) {
      this.setMods(e);
      if (e.button === 2) return;
      const { x, y } = this.pos(e);
      const touch = (this._touch = e.pointerType === 'touch');
      this.stopFling();
      this.app.setActive(this);
      this.pointers.set(e.pointerId, { x, y });
      try { this.cv.setPointerCapture(e.pointerId); } catch (er) {}
      if (this.pointers.size >= 2) { // 핀치 줌 (두 손가락: 확대·축소 + 이동)
        clearTimeout(this._lpT);
        if (this.pointers.size > 2) return;
        const d0 = this.drag;
        if (d0 && (d0.k === 'move' || d0.k === 'handle') && d0.moved) this.commit();
        // 손가락 하나로 그리기를 막 시작했는데 두 번째 손가락이 오면 확대·축소하려던 것
        if (touch && this.creating && this.creating.placed === 1 && !this.creating.moved) this.cancelCreate();
        const [a, b] = Array.from(this.pointers.values());
        this.drag = { k: 'pinch', d0: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), s0: this.view.s, i0: this.x2i((a.x + b.x) / 2) };
        if (touch) this.mouse.in = false;
        this.invalidate();
        return;
      }
      if (!touch) this.mouse = { x, y, in: true };
      const rg = this.region(x, y);
      if (this.app.replaySel === this && rg.k === 'plot') { this.app.replayPick(this, Math.round(this.x2i(x))); return; }
      if (rg.k === 'price') {
        const p = rg.p;
        this.drag = { k: 'pscale', p, y0: y, u0: [p.umin, p.umax], moved: false }; // 자동 스케일은 실제로 끌 때 해제
        return;
      }
      if (rg.k === 'time') { this.drag = { k: 'tscale', x0: x, s0: this.view.s, moved: false }; return; }
      if (rg.k === 'sep') {
        const a = this.panes[rg.idx - 1], b = this.panes[rg.idx];
        this.drag = { k: 'sep', a, b, y0: y, ha: a.h, hb: b.h, w: a.st.w + b.st.w };
        return;
      }
      if (rg.k !== 'plot') return;
      const tool = this.app.tool;
      this._tDraw = touch && !!(this.creating || CL.TOOLS[tool] || tool === 'measure' || tool === 'zoom');
      if (this._tDraw) this.mouse = { x, y, in: true }; // 그리는 동안은 손가락 위치에 십자선
      if (this.measure && !this.measure.done && this.drag && this.drag.k === 'measure') { // 탭-탭(클릭-클릭)으로 잰 두 번째 점
        this.measure.pts[1] = this.ptAt(this.measure.p, x, y);
        this.measure.done = true; this.drag = null; this.invalidate();
        return;
      }
      if (this.measure && this.measure.done) { this.measure = null; this.invalidate(); if (tool === 'measure') this.app.setTool('cursor'); return; }
      if (this.creating) { this.createClick(x, y); return; }
      if (CL.TOOLS[tool]) { this.createStart(tool, x, y, rg.p); return; }
      if (tool === 'eraser') { const h = this.hitTest(x, y); if (h) this.removeDrawing(h.d); return; }
      if (tool === 'zoom') { this.drag = { k: 'zoom', x0: x, y0: y, p: rg.p }; return; }
      if (tool === 'measure' || e.shiftKey) {
        const p = rg.p;
        const pt = this.ptAt(p, x, y);
        this.measure = { p, pts: [pt, Object.assign({}, pt)], done: false, x0: x, y0: y };
        this.drag = { k: 'measure' };
        return;
      }
      const h = this.hitTest(x, y);
      if (touch) { this.touchDown(x, y, rg.p, h); return; }
      if (h) {
        this.select(h.d);
        if (!h.d.locked && !this.app.set.lockAll) {
          this.drag = { k: h.handle >= 0 ? 'handle' : 'move', d: h.d, handle: h.handle, x0: x, y0: y, orig: JSON.parse(JSON.stringify(h.d.pts)), moved: false };
          if (e.altKey && h.handle < 0) { const cl = this.cloneDrawing(h.d, true); this.drag.d = cl; this.select(cl); }
        }
        this.invalidate();
        return;
      }
      if (this.sel) this.select(null);
      const p = rg.p;
      this.drag = { k: 'pan', x0: x, y0: y, r0: this.view.r, p, u0: [p.umin, p.umax] };
    }
    /* 터치: 탭 = 십자선 켜기/끄기(드로잉이면 선택), 길게 누르기 = 십자선을 손가락으로 끌기,
       드래그 = 차트 이동(십자선이 켜져 있으면 십자선 이동), 두 손가락 = 확대·축소 */
    touchDown(x, y, p, hit) {
      clearTimeout(this._lpT);
      if (hit && hit.d === this.sel && !hit.d.locked && !this.app.set.lockAll) { // 선택된 드로잉만 끌어서 옮김
        this.drag = { k: hit.handle >= 0 ? 'handle' : 'move', d: hit.d, handle: hit.handle, x0: x, y0: y, orig: JSON.parse(JSON.stringify(hit.d.pts)), moved: false };
        return;
      }
      const tap = { t0: Date.now(), hit: hit ? hit.d : null, moved: false };
      if (this.mouse.in) { this.drag = { k: 'xhair', x0: x, y0: y, mx: this.mouse.x, my: this.mouse.y, tap }; return; }
      this.drag = { k: 'pan', x0: x, y0: y, r0: this.view.r, p, u0: [p.umin, p.umax], tap, hist: [{ x, t: performance.now() }] };
      this._lpT = setTimeout(() => {
        const d = this.drag;
        if (!d || d.k !== 'pan' || d.tap !== tap || tap.moved) return;
        tap.moved = true; // 손을 떼도 탭으로 치지 않음 (십자선 유지)
        this.mouse = { x: d.x0, y: d.y0, in: true };
        this.drag = { k: 'xhair', x0: d.x0, y0: d.y0, mx: d.x0, my: d.y0, tap };
        try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
        this.invalidate();
      }, 420);
    }
    touchTap(x, y, d) {
      const hit = d.tap.hit;
      if (d.k === 'xhair') { this.mouse.in = false; if (hit) this.select(hit); return; }
      if (hit) { this.select(hit); return; }
      if (this.sel) { this.select(null); return; }
      this.mouse = { x, y, in: true };
    }
    fling(hist) {
      const now = performance.now();
      const s = (hist || []).filter((q) => now - q.t < 120);
      if (s.length < 2) return;
      const a = s[0], b = s[s.length - 1];
      if (now - b.t > 60 || b.t - a.t < 8) return; // 멈췄다가 뗐으면 관성 없음
      let v = U.clamp((b.x - a.x) / (b.t - a.t), -6, 6); // px/ms
      if (Math.abs(v) < 0.25) return;
      let last = now;
      const step = (t) => {
        const dt = Math.min(40, t - last);
        last = t;
        this.view.r -= (v * dt) / this.view.s;
        v *= Math.pow(0.9955, dt);
        if (this.from < 40) this.loadMore();
        this.invalidate();
        this._fling = Math.abs(v) > 0.03 ? requestAnimationFrame(step) : 0;
      };
      this._fling = requestAnimationFrame(step);
    }
    stopFling() { if (this._fling) { cancelAnimationFrame(this._fling); this._fling = 0; } }
    /* 영역 확대(돋보기) 되돌리기 */
    zoomBack() {
      const z = this.zoomHist && this.zoomHist.pop();
      if (!z) return false;
      this.view.s = z.s; this.view.r = z.r;
      const st = this.ps[z.k];
      if (st) { st.auto = z.auto; st.umin = z.umin; st.umax = z.umax; }
      this.invalidate();
      return true;
    }
    onMove(e) {
      this.setMods(e);
      const { x, y } = this.pos(e);
      const touch = e.pointerType === 'touch';
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x, y });
      else if (touch) return;
      if (!touch) this.mouse = { x, y, in: true };
      const d = this.drag;
      if (d) {
        switch (d.k) {
          case 'pinch': {
            if (this.pointers.size < 2) break;
            const [a, b] = Array.from(this.pointers.values());
            const dist = Math.max(20, Math.hypot(a.x - b.x, a.y - b.y));
            this.view.s = U.clamp((d.s0 * dist) / d.d0, 0.3, 80);
            this.view.r = d.i0 + (this.plotW - (a.x + b.x) / 2) / this.view.s; // 두 손가락 가운데를 고정 → 같이 움직이면 이동
            if (this.from < 40) this.loadMore();
            break;
          }
          case 'pan': {
            if (d.tap && !d.tap.moved) {
              if (Math.hypot(x - d.x0, y - d.y0) <= (touch ? 7 : 2)) break; // 아직 탭인지 판정 중
              d.tap.moved = true;
              clearTimeout(this._lpT);
              if (touch) { d.x0 = x; d.y0 = y; d.r0 = this.view.r; }
            }
            this.view.r = d.r0 - (x - d.x0) / this.view.s;
            const p = d.p;
            if (p.st.auto && Math.abs(y - d.y0) > (touch ? 70 : 40)) { p.st.auto = false; p.st.umin = p.umin; p.st.umax = p.umax; d.u0 = [p.umin, p.umax]; d.y0 = y; }
            if (!p.st.auto) { const du = ((y - d.y0) / p.h) * (d.u0[1] - d.u0[0]); p.st.umin = d.u0[0] + du; p.st.umax = d.u0[1] + du; }
            if (d.hist) { d.hist.push({ x, t: performance.now() }); if (d.hist.length > 8) d.hist.shift(); }
            if (this.from < 40) this.loadMore();
            break;
          }
          case 'xhair': {
            if (!d.tap.moved && Math.hypot(x - d.x0, y - d.y0) > 7) d.tap.moved = true;
            this.mouse = { x: U.clamp(d.mx + x - d.x0, 0, this.plotW - 1), y: U.clamp(d.my + y - d.y0, 0, this.areaH - 1), in: true };
            break;
          }
          case 'pscale': {
            if (!d.moved) {
              if (Math.abs(y - d.y0) < 3) break;
              d.moved = true;
              d.p.st.auto = false;
            }
            const k = Math.exp((y - d.y0) * 0.006);
            const mid = (d.u0[0] + d.u0[1]) / 2, half = ((d.u0[1] - d.u0[0]) / 2) * k;
            d.p.st.umin = mid - half; d.p.st.umax = mid + half;
            break;
          }
          case 'tscale': if (Math.abs(x - d.x0) > 2) d.moved = true; this.view.s = U.clamp(d.s0 * Math.exp((x - d.x0) * 0.006), 0.3, 80); if (this.from < 40) this.loadMore(); break;
          case 'sep': {
            const tot = d.ha + d.hb;
            const ha = U.clamp(d.ha + (y - d.y0), 30, tot - 30);
            d.a.st.w = (d.w * ha) / tot; d.b.st.w = d.w - d.a.st.w;
            break;
          }
          case 'handle': this.dragHandle(x, y); break;
          case 'move': this.dragMove(x, y); break;
          case 'measure': if (this.measure) this.measure.pts[1] = this.ptAt(this.measure.p, x, y); break;
          case 'zoom': d.x1 = x; d.y1 = y; break;
        }
        this.invalidate();
        this.app.syncCross(this, this.bars.length ? this.i2t(Math.round(this.x2i(x))) : null);
        return;
      }
      if (touch) { // 터치에는 마우스 올리기(호버)가 없음 — 그리는 중일 때만 손가락을 따라감
        if (this.creating) { this.mouse = { x, y, in: true }; this.createMove(x, y); this.invalidate(); }
        return;
      }
      if (this.creating) this.createMove(x, y);
      else if (this.measure && !this.measure.done) this.measure.pts[1] = this.ptAt(this.measure.p, x, y);
      else {
        const rg = this.region(x, y);
        let cur = this.app.tool === 'cursor' ? this.app.cursorCss() : 'crosshair';
        if (rg.k === 'price') cur = 'ns-resize';
        else if (rg.k === 'time') cur = 'ew-resize';
        else if (rg.k === 'sep') cur = 'row-resize';
        else if (rg.k === 'plot' && this.app.tool === 'cursor') {
          const h = this.hitTest(x, y);
          const nh = h ? h.d : null;
          if (nh !== this.hov) this.hov = nh;
          if (h) cur = h.handle >= 0 ? 'move' : h.d.locked ? 'default' : 'pointer';
        } else if (this.app.tool === 'eraser') cur = 'not-allowed';
        if (this.cv.style.cursor !== cur) this.cv.style.cursor = cur;
      }
      if (rgPlot(this, x, y) && this.bars.length) this.app.syncCross(this, this.i2t(Math.round(this.x2i(x))));
      this.invalidate();
    }
    onUp(e) {
      this.setMods(e);
      const { x, y } = this.pos(e);
      const touch = e.pointerType === 'touch', cancel = e.type === 'pointercancel';
      const had = this.pointers.delete(e.pointerId);
      try { this.cv.releasePointerCapture(e.pointerId); } catch (er) {}
      if (touch && !had) return;
      clearTimeout(this._lpT);
      const d = this.drag;
      if (this.creating && !(d && d.k === 'pinch')) this.createUp(x, y);
      if (touch && this._tDraw && !this.creating && !(this.measure && !this.measure.done)) { this._tDraw = false; this.mouse.in = false; } // 다 그렸으면 십자선 끔
      if (!d) { if (touch) this.invalidate(); return; }
      if (d.k === 'pinch') {
        if (this.pointers.size < 2) {
          this.drag = null;
          if (touch && this.pointers.size === 1) { // 남은 손가락으로 계속 이동
            const q = Array.from(this.pointers.values())[0], p = this.pmap.main;
            this.drag = { k: 'pan', x0: q.x, y0: q.y, r0: this.view.r, p, u0: [p.umin, p.umax], tap: { moved: true }, hist: [] };
          }
        }
        return;
      }
      if (this.pointers.size) return;
      this.drag = null;
      if (touch && (d.k === 'pan' || d.k === 'xhair') && d.tap) {
        if (!cancel && !d.tap.moved && Date.now() - d.tap.t0 < 600) this.touchTap(x, y, d);
        else if (!cancel && d.k === 'pan') this.fling(d.hist);
      }
      if (touch && !cancel && (d.k === 'pscale' || d.k === 'tscale') && !d.moved) { // 축 두 번 탭 = 자동 맞춤
        const now = Date.now();
        if (this._axTap && this._axTap.k === d.k && now - this._axTap.t < 350) {
          if (d.k === 'pscale') d.p.st.auto = true; else { this.view.s = 8; this.fit(); }
          this._axTap = null;
        } else this._axTap = { k: d.k, t: now };
      }
      if ((d.k === 'handle' || d.k === 'move') && d.moved) this.commit();
      if (d.k === 'measure' && this.measure) {
        const m = this.measure;
        if (Math.hypot(x - m.x0, y - m.y0) > 6) m.done = true; else this.drag = { k: 'measure' };
        if (m.done && this.app.tool === 'measure') {}
      }
      if (d.k === 'zoom' && d.x1 != null && Math.abs(d.x1 - d.x0) > 8) {
        (this.zoomHist || (this.zoomHist = [])).push({ s: this.view.s, r: this.view.r, k: d.p.key, auto: d.p.st.auto, umin: d.p.st.umin, umax: d.p.st.umax });
        const i0 = this.x2i(Math.min(d.x0, d.x1)), i1 = this.x2i(Math.max(d.x0, d.x1));
        this.view.s = U.clamp(this.plotW / Math.max(1, i1 - i0), 0.3, 80);
        this.view.r = i1;
        if (Math.abs(d.y1 - d.y0) > 8) {
          const p = d.p, a = this.tf(p, this.y2v(p, Math.max(d.y0, d.y1))), b = this.tf(p, this.y2v(p, Math.min(d.y0, d.y1)));
          p.st.auto = false; p.st.umin = a; p.st.umax = b;
        }
        this.app.setTool('cursor');
      }
      if (d.k === 'sep' || d.k === 'pscale') this.app.saveSlot(this);
      this.invalidate();
    }
    onWheel(e) {
      e.preventDefault();
      if (!this.bars.length) return;
      const { x, y } = this.pos(e);
      const rg = this.region(x, y);
      const dm = e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 300 : 1;
      const dy = e.deltaY * dm, dx = e.deltaX * dm;
      if (rg.k === 'price') {
        const p = rg.p;
        p.st.auto = false;
        const k = Math.exp(dy * 0.0015);
        const mid = (p.umin + p.umax) / 2, half = ((p.umax - p.umin) / 2) * k;
        p.st.umin = mid - half; p.st.umax = mid + half;
        this.invalidate();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) || (e.shiftKey && !e.ctrlKey)) {
        this.view.r += (dx || dy) / this.view.s;
      } else {
        const k = Math.exp(-dy * 0.0016);
        const s1 = U.clamp(this.view.s * k, 0.3, 80);
        const ax = rg.k === 'plot' && this.app.set.zoomAnchor !== 'right' ? x : this.plotW;
        const ia = this.x2i(ax);
        this.view.s = s1;
        this.view.r = ia + (this.plotW - ax) / s1;
      }
      if (this.from < 40) this.loadMore();
      this.invalidate();
    }
    onDbl(e) {
      const { x, y } = this.pos(e);
      const rg = this.region(x, y);
      if (rg.k === 'price') { rg.p.st.auto = true; this.invalidate(); return; }
      if (rg.k === 'time') { this.view.s = 8; this.fit(); this.invalidate(); return; }
      if (this.creating) { this.createFinishMulti(); return; }
      if (rg.k === 'plot') {
        const h = this.hitTest(x, y);
        if (h) { const T = CL.TOOLS[h.d.type]; if (T && T.text) this.app.editText(this, h.d); else this.app.openDrawSettings(this, h.d); }
      }
    }
    onCtx(e) {
      e.preventDefault();
      if (this._touch) return; // 터치에서 길게 누르기는 십자선
      const { x, y } = this.pos(e);
      if (this.creating) { this.createFinishMulti(true); return; }
      const rg = this.region(x, y);
      const h = rg.k === 'plot' ? this.hitTest(x, y) : null;
      if (h) this.select(h.d);
      const p = rg.p || this.pmap.main;
      this.app.ctxMenu(this, e, { drawing: h ? h.d : null, pane: p, price: p ? this.y2v(p, y) : null, time: this.bars.length ? this.i2t(Math.round(this.x2i(x))) : null, region: rg.k });
      this.invalidate();
    }

    /* ---------------- 스크린샷 ---------------- */
    snapshot() {
      this.render();
      const c = document.createElement('canvas');
      c.width = this.cv.width; c.height = this.cv.height;
      const g = c.getContext('2d');
      g.drawImage(this.cv, 0, 0);
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.textBaseline = 'top'; g.textAlign = 'left';
      for (const key in this._lgBox) {
        const box = this._lgBox[key];
        const p = this.pmap[key];
        if (!p) continue;
        let yy = p.top + 6;
        for (const row of box.querySelectorAll('.lg-row')) {
          let xx = 8;
          g.font = font(12, row.classList.contains('lg-sym') ? 600 : 0);
          for (const el of row.querySelectorAll('.lg-title, .lg-name, .lg-ohlc i, .lg-ohlc b, .lg-vals b')) {
            const t = el.textContent;
            if (!t) continue;
            g.fillStyle = el.style.color || this.th.text;
            g.fillText(t, xx, yy);
            xx += g.measureText(t).width + 6;
          }
          yy += 18;
        }
      }
      return c.toDataURL('image/png');
    }
  }
  function rgPlot(ch, x, y) { return x >= 0 && x < ch.plotW && y >= 0 && y < ch.areaH; }

  CL.Chart = Chart;
})();
