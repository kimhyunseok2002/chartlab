/* TradingHyun — mobile.js : 폰 전용 화면
   트레이딩뷰 앱과 같은 흐름 — 관심종목 → 종목 시트(영역 차트·기간) → 전체 차트(아래 알약 막대) → 드로잉 시트.
   차트 엔진·관심종목 데이터·알림은 PC 화면과 같은 것을 쓰고, 화면만 다르게 그린다. */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U, Data = CL.Data, ICON = CL.ICON;
  const h = U.h, sv = CL.svg;
  const TL = () => CL.TOOLS;
  const QH = () => CL.Quotes;

  /* ---------------- 아이콘 ---------------- */
  const MI = {
    dots: sv('o7 14 1.9|o14 14 1.9|o21 14 1.9'),
    vdots: sv('o14 7 1.9|o14 14 1.9|o14 21 1.9'),
    search: sv('c12.5 12.5 7|M17.8 17.8 L23.5 23.5'),
    down: sv('M8 11 L14 17 L20 11'),
    up: sv('M8 17 L14 11 L20 17'),
    right: sv('M11 7.5 L17.5 14 L11 20.5'),
    pencil: sv('M6.5 21.5 L7.6 16.6 L18.4 5.8 L22.2 9.6 L11.4 20.4 Z|M16.2 8 L20 11.8|M5 24.5 H23'),
    favbar: sv('M3.5 15.5 L9 10 L13 14 L19 8|M3.5 21.5 L9 16 L13 20 L19 14|c22.5 5.5 1.6'),
    alarm: sv('M8.5 19V13 A5.5 5.5 0 0 1 19.5 13 V19 L21.5 21 H6.5 Z|M12 23.4 A2 2 0 0 0 16 23.4|M21.5 3.5V9.5|M18.5 6.5H24.5'),
    star: sv('M14 4.5 L16.8 10.3 L23.2 11 L18.4 15.4 L19.8 21.8 L14 18.5 L8.2 21.8 L9.6 15.4 L4.8 11 L11.2 10.3 Z'),
    starOn: sv('f M14 4.5 L16.8 10.3 L23.2 11 L18.4 15.4 L19.8 21.8 L14 18.5 L8.2 21.8 L9.6 15.4 L4.8 11 L11.2 10.3 Z'),
    grip: sv('M6 10H22|M6 14H22|M6 18H22'),
    check: sv('M6 14.5 L11.5 20 L22 8.5'),
    zoomOut: sv('c12 12 7|M17.2 17.2 L24 24|M9 12h6'),
    sort: sv('M9 6V22|M5.5 18.5 L9 22 L12.5 18.5|M19 22V6|M15.5 9.5 L19 6 L22.5 9.5'),
    edit: sv('M5 7H18|M5 13H14|M5 19H10|M14.5 22.5 L15.2 19.2 L21.6 12.8 L24.2 15.4 L17.8 21.8 Z'),
    desktop: sv('M4 6H24V19H4Z|M10 23H18|M14 19V23'),
    reset: sv('M7.5 8.5 A8.5 8.5 0 1 1 5.5 15|M7.5 3.5V8.5H12.5'),
    log: sv('M5 22 C9 22 12 6 23 6|M5 6V22H23'),
    auto: sv('M14 4V24|M10 8 L14 4 L18 8|M10 20 L14 24 L18 20'),
    rename: sv('M4 20 L4.8 16.6 L16 5.4 L19.6 9 L8.4 20.2 Z|M14 7.4 L17.6 11|M13 22H24'),
    moon: sv('f M19 18.5 A8 8 0 1 1 11 5.5 A6.2 6.2 0 0 0 19 18.5 Z'),
  };

  const RANGES = [['1D', '1일', '오늘'], ['1W', '1주', '지난 1주'], ['1M', '1달', '지난 1달'], ['3M', '3달', '지난 3달'], ['YTD', 'YTD', '올해'], ['1Y', '1년', '지난 1년'], ['5Y', '5년', '지난 5년'], ['ALL', '전체', '전체 기간']];
  const IVN = (iv) => ({ '1D': '1일', '3D': '3일', '1W': '1주', '1M': '1달' }[iv] || U.IV_LABEL[iv] || iv);
  const IV_GROUPS = [['분', ['1m', '3m', '5m', '10m', '15m', '30m']], ['시간', ['1h', '2h', '4h', '6h', '8h', '12h']], ['일 이상', ['1D', '3D', '1W', '1M']]];
  const CHART_TYPES = [['candle', '캔들'], ['hollow', '할로우 캔들'], ['ha', '하이킨 아시'], ['bar', '바(OHLC)'], ['line', '라인'], ['area', '영역']];
  const DEF_FAV = ['trendline', 'hline', 'hray', 'fibret', 'vline', 'ray', 'path', 'rect'];
  const GSHORT = { lines: '추세선', fib: '피보나치·간', pattern: '패턴', forecast: '예측·측정', shape: '도형', text: '주석' };
  const CRYPTO = { upbit: 1, binance: 1, binancef: 1 };
  const DAY = 864e5;
  const MINUS = '−';
  const sgn = (v) => (v > 0 ? '+' : v < 0 ? MINUS : '');
  const pct = (v) => (v == null || !isFinite(v) ? '' : sgn(v) + Math.abs(v).toFixed(2) + '%');
  const splitKey = (k) => { const i = k.indexOf(':'); return [k.slice(0, i), k.slice(i + 1)]; };
  const p2 = U.p2;
  const capDec = (v) => { const a = Math.abs(v); return a >= 1000 ? 2 : a >= 1 ? 4 : 8; }; // 표시 소수 자리 상한 (야후 float 잡음 제거)
  const isLight = () => document.body.classList.contains('light');
  const whenOf = (t, rk) => {
    const p = U.parts(t), d = p.M + '월 ' + p.D + '일';
    return rk === '1D' || rk === '1W' || rk === '1M' ? d + ' ' + p2(p.h) + ':' + p2(p.m) : p.Y + '년 ' + d;
  };
  function rr(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ================= 영역 차트 (종목 시트 · 미니 플레이어) ================= */
  class Area {
    constructor(host, o) {
      this.host = host;
      this.o = Object.assign({ axis: false, labels: false, fill: true, fa: 0.34, padT: 16, padB: 10, padL: 0, padR: 10, dot: true, ref: true, lw: 2 }, o || {});
      this.cv = h('canvas', { class: 'ma-cv' });
      host.append(this.cv);
      this.ctx = this.cv.getContext('2d');
      this.pts = []; this.si = -1; this.W = 0; this.H = 0; this.dpr = 1;
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(host);
      if (this.o.onScrub) this.bindScrub();
    }
    resize() {
      const r = this.host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      const W = Math.round(r.width), H = Math.round(r.height);
      if (!W || !H) return;
      this.W = W; this.H = H; this.dpr = dpr;
      this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
      this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
      this._tkK = '';
      this.render();
    }
    set(pts, meta) {
      const max = Math.max(240, (this.W || 400) * 2); // 화면 폭보다 점이 훨씬 많으면 솎음 (마지막 점 유지)
      if (pts.length > max) {
        const k = Math.ceil(pts.length / max), out = [];
        for (let i = 0; i < pts.length; i += k) out.push(pts[i]);
        if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
        pts = out;
      }
      this.pts = pts;
      if (meta) Object.assign(this.o, meta);
      this._tkK = ''; this.si = -1;
      this.render();
    }
    render() {
      const ctx = this.ctx, W = this.W, H = this.H, o = this.o, pts = this.pts, n = pts.length;
      if (!W) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (n < 2) return;
      const axH = o.axis ? 26 : 0, yT = o.padT, yB = H - axH - o.padB, x0 = o.padL, x1 = W - o.padR, bot = H - axH;
      let lo = Infinity, hi = -Infinity;
      for (const p of pts) { if (p.c < lo) lo = p.c; if (p.c > hi) hi = p.c; }
      if (!(hi > lo)) { const d = Math.abs(hi) * 0.002 || 1; lo -= d; hi += d; }
      const X = (i) => x0 + (i / (n - 1)) * (x1 - x0);
      const Y = (v) => yB - ((v - lo) / (hi - lo)) * (yB - yT);
      this.X = X; this.x0 = x0; this.x1 = x1;
      const col = o.col || '#089981', dim = o.dim || '#8e8e93';
      const line = () => { ctx.beginPath(); ctx.moveTo(X(0), Y(pts[0].c)); for (let i = 1; i < n; i++) ctx.lineTo(X(i), Y(pts[i].c)); };
      if (o.fill) {
        line();
        ctx.lineTo(X(n - 1), bot); ctx.lineTo(X(0), bot); ctx.closePath();
        const g = ctx.createLinearGradient(0, yT, 0, bot);
        g.addColorStop(0, U.rgba(col, o.fa)); g.addColorStop(1, U.rgba(col, 0));
        ctx.fillStyle = g; ctx.fill();
      }
      line();
      ctx.strokeStyle = col; ctx.lineWidth = o.lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      const lx = X(n - 1), ly = Y(pts[n - 1].c);
      if (o.ref) { // 현재가 점선
        const y = Math.round(ly) + 0.5;
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = o.dash || 'rgba(160,160,160,.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); ctx.restore();
      }
      if (o.labels) { // 왼쪽 가격 눈금
        const step = U.niceStep(hi - lo, Math.max(2, Math.floor((yB - yT) / 80)));
        const sd = Math.min(8, U.decOf(+step.toPrecision(6)));
        ctx.font = '12px ' + CL.FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        for (let v = Math.ceil(lo / step) * step, k = 0; v <= hi && k < 30; v += step, k++) {
          const y = Y(v);
          if (y < yT + 4 || y > yB - 2) continue;
          const s = U.fmt(v, sd), w = ctx.measureText(s).width;
          ctx.fillStyle = o.lblBg || 'rgba(0,0,0,.55)'; rr(ctx, 10, y - 10, w + 12, 20, 6); ctx.fill();
          ctx.fillStyle = dim; ctx.fillText(s, 16, y + 0.5);
        }
      }
      if (o.axis) {
        ctx.font = '12px ' + CL.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = dim;
        for (const t of this.ticks()) ctx.fillText(t.s, X(t.i), H - axH / 2);
      }
      const dot = (x, y, r1, r2) => {
        ctx.fillStyle = U.rgba(col, 0.28); ctx.beginPath(); ctx.arc(x, y, r2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r1, 0, Math.PI * 2); ctx.fill();
      };
      if (this.si >= 0 && this.si < n) { // 손가락으로 훑는 중
        const sx = Math.round(X(this.si)) + 0.5, sy = Y(pts[this.si].c);
        ctx.strokeStyle = dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, bot); ctx.stroke();
        dot(sx, sy, 5, 10);
      } else if (o.dot) dot(lx, ly, o.lw + 1.6, o.lw + 6);
    }
    ticks() {
      const pts = this.pts, n = pts.length, rk = this.o.rk || '1D';
      const key = n + '|' + this.W + '|' + rk + '|' + (n ? pts[0].t + ':' + pts[n - 1].t : '');
      if (this._tkK === key) return this._tk;
      const per = (t) => { const p = U.parts(t); return rk === '1D' ? Math.floor((p.h * 60 + p.m) / 30) : rk === '1W' || rk === '1M' ? p.D : rk === '5Y' || rk === 'ALL' ? p.Y : p.M; };
      const fmt = (t) => {
        const p = U.parts(t);
        if (rk === '1D') return p2(p.h) + ':' + p2(p.m);
        if (rk === '1W' || rk === '1M') return p.M + '/' + p.D;
        if (rk === '5Y' || rk === 'ALL') return String(p.Y);
        return p.M === 1 ? String(p.Y) : p.M + '월';
      };
      const out = [];
      let lastX = -1e9;
      for (let i = 1; i < n; i++) {
        if (per(pts[i].t) === per(pts[i - 1].t)) continue;
        const x = this.X(i);
        if (x - lastX < 64 || x < 24 || x > this.W - 24) continue;
        out.push({ i, s: fmt(pts[i].t) });
        lastX = x;
      }
      this._tk = out; this._tkK = key;
      return out;
    }
    bindScrub() {
      const cv = this.cv;
      let id = null;
      const at = (e) => {
        const n = this.pts.length;
        if (n < 2 || !this.X) return -1;
        const x = e.clientX - cv.getBoundingClientRect().left;
        return U.clamp(Math.round(((x - this.x0) / (this.x1 - this.x0)) * (n - 1)), 0, n - 1);
      };
      const upd = (e) => { const i = at(e); if (i === this.si) return; this.si = i; this.render(); this.o.onScrub(i >= 0 ? this.pts[i] : null); };
      const end = () => { id = null; if (this.si < 0) return; this.si = -1; this.render(); this.o.onScrub(null); };
      cv.addEventListener('pointerdown', (e) => { id = e.pointerId; try { cv.setPointerCapture(id); } catch (er) {} upd(e); });
      cv.addEventListener('pointermove', (e) => { if (e.pointerId === id || (e.pointerType === 'mouse' && id == null)) upd(e); });
      cv.addEventListener('pointerup', (e) => { if (e.pointerId === id) end(); });
      cv.addEventListener('pointercancel', (e) => { if (e.pointerId === id) end(); });
      cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && id == null) end(); });
    }
  }

  /* ================= 모바일 화면 ================= */
  class Mobile {
    /* 폰이면 모바일 화면. ?ui=m / ?ui=pc 또는 설정 → 화면으로 강제 */
    static want() {
      let q = null;
      try { q = new URLSearchParams(location.search).get('ui'); } catch (e) {}
      if (q === 'm' || q === 'mobile') return true;
      if (q === 'pc' || q === 'desktop') return false;
      const pref = U.load('ui', 'auto');
      if (pref === 'mobile') return true;
      if (pref === 'desktop') return false;
      const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
      return (coarse && Math.min(screen.width, screen.height) <= 600) || window.innerWidth <= 520;
    }

    constructor(app) {
      this.app = app; this.wl = app.wl; this.set = app.set;
      this.stack = []; this._pend = 0; this._skip = 0; this._qpush = 0; this._inflight = false;
      this.rc = {}; this.rq = {}; this.pc = {}; this.dailyTried = {};
      this.rows = new Map(); this.edit = false; this.chartOn = false;
      if (!Array.isArray(this.set.mFav)) this.set.mFav = DEF_FAV.slice();
      if (this.set.mFavBar == null) this.set.mFavBar = true;
      this.buildHome();
      this.buildChart();
      this.patchModal();
      QH().on((keys) => this.onQuotes(keys));
      window.addEventListener('popstate', () => this.onPop());
      document.addEventListener('gesturestart', (e) => e.preventDefault()); // iOS 사파리: 화면 전체 확대 막기 (차트 핀치는 차트가 처리)
      window.addEventListener('resize', () => this.placeFav());
      this.renderList();
      this.refreshChart();
      this.onTool();
      if (this.set.mScreen === 'chart') this.showChart(true);
      setInterval(() => { if (!this.chartOn) this.loadSpark(); }, 60000);
    }
    trackKeys() {
      const k = [];
      if (this.dKey) k.push(this.dKey);
      if (this.app.active) k.push(this.app.active.key);
      return k;
    }

    /* ---------------- 뒤로 가기(안드로이드 뒤로·iOS 스와이프)로 시트·차트 닫기 ---------------- */
    layer(name, close) {
      this.stack.push({ name, close });
      if (this._pend > 0) { this._pend--; return; } // 방금 닫힌 단계의 기록을 그대로 씀
      this.pushHist();
    }
    pushHist() {
      if (this._inflight) { this._qpush++; return; }
      try { history.pushState({ th: 1 }, ''); } catch (e) {}
    }
    unlayer(name) {
      for (let i = this.stack.length - 1; i >= 0; i--) {
        if (this.stack[i].name !== name) continue;
        this.stack.splice(i, 1);
        this._pend++;
        clearTimeout(this._bt);
        this._bt = setTimeout(() => {
          const n = this._pend;
          this._pend = 0;
          if (n > 0) { this._skip++; this._inflight = true; try { history.go(-n); } catch (e) { this._skip--; this._inflight = false; } }
        }, 0);
        return true;
      }
      return false;
    }
    onPop() {
      if (this._skip > 0) {
        this._skip--; this._inflight = false;
        while (this._qpush > 0) { this._qpush--; try { history.pushState({ th: 1 }, ''); } catch (e) {} }
        return;
      }
      if (this.app.pop) this.app.closePop();
      const l = this.stack.pop();
      if (l) l.close(true);
    }
    patchModal() { // 기존 대화상자(검색·지표·설정·알림)도 뒤로 가기로 닫히게
      const app = this.app, orig = app.modal.bind(app);
      app.modal = (title, body, buttons, opt) => {
        const m = orig(title, body, buttons, opt);
        const id = 'dlg' + U.uid(), close0 = m.close;
        let popped = false;
        m.close = (ok) => {
          if (m.closed) return;
          if (!popped) this.unlayer(id);
          close0(ok);
          setTimeout(() => this.afterModal(), 0);
        };
        this.layer(id, () => { popped = true; m.close(false); });
        return m;
      };
    }
    afterModal() {
      if (this.dE) this.renderTab();
      if (this.alS && !this.alS.closed) this.alS.render();
      this.refreshUndo();
    }

    /* ---------------- 아래에서 올라오는 시트 ---------------- */
    sheet(o) {
      const scrim = h('div', { class: 'ms-scrim' + (o.cls ? ' ' + o.cls + '-s' : '') });
      const box = h('section', { class: 'ms ' + (o.cls || '') });
      const grab = h('div', { class: 'ms-grab' }, h('i'));
      const S = { box, closed: false, id: 'sh' + U.uid() };
      const head = o.title != null ? h('div', { class: 'ms-head' }, h('span', { class: 'ms-title', text: o.title }), h('button', { class: 'm-circ sm', html: ICON.close, 'aria-label': '닫기', onclick: () => S.close() })) : null;
      const body = h('div', { class: 'ms-body' });
      if (o.body) body.append(o.body);
      box.append(grab);
      if (head) box.append(head);
      box.append(body);
      S.body = body;
      document.body.append(scrim, box);
      S.close = (fromPop) => {
        if (S.closed) return;
        S.closed = true;
        if (!fromPop) this.unlayer(S.id);
        box.style.transform = '';
        scrim.classList.remove('on'); box.classList.remove('on');
        setTimeout(() => { scrim.remove(); box.remove(); }, 320);
        if (o.onClose) o.onClose();
      };
      this.layer(S.id, () => S.close(true));
      // 바깥(어두운 곳)을 "눌렀다 뗀" 경우만 닫음 — 길게 누르기로 시트가 뜬 뒤 손가락을 뗄 때 생기는 클릭은 무시
      let downOn = false;
      scrim.addEventListener('pointerdown', () => { downOn = true; });
      scrim.addEventListener('click', () => { if (downOn) S.close(); downOn = false; });
      S.scrim = scrim;
      this.dragClose(box, [grab, head, o.dragEl], () => S.close());
      void box.offsetWidth;
      scrim.classList.add('on'); box.classList.add('on');
      return S;
    }
    dragClose(box, els, close) { // 손잡이를 아래로 끌면 닫힘
      let id = null, y0 = 0, dy = 0, t0 = 0;
      const down = (e) => {
        if (e.target.closest('button, input, select, textarea, canvas, a')) return;
        id = e.pointerId; y0 = e.clientY; dy = 0; t0 = performance.now();
        box.style.transition = 'none';
        try { e.currentTarget.setPointerCapture(id); } catch (er) {}
      };
      const move = (e) => { if (e.pointerId !== id) return; dy = Math.max(0, e.clientY - y0); box.style.transform = 'translateY(' + dy + 'px)'; };
      const up = (e) => {
        if (e.pointerId !== id) return;
        id = null;
        box.style.transition = '';
        const v = dy / Math.max(1, performance.now() - t0);
        if (dy > 110 || (dy > 30 && v > 0.6)) close(); else box.style.transform = '';
      };
      for (const el of els) {
        if (!el) continue;
        el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      }
    }
    /* 메뉴 시트: { icon, n, sub, check, more, danger, dis, fn } | '-' | { head } | { node } */
    menuSheet(title, items, onClose) {
      const box = h('div', { class: 'ms-list' });
      let S = null;
      for (const it of items) {
        if (!it) continue;
        if (it === '-') { box.append(h('div', { class: 'ms-sep' })); continue; }
        if (it.head) { box.append(h('div', { class: 'ms-sub', text: it.head })); continue; }
        if (it.node) { box.append(it.node); continue; }
        box.append(h('button', { class: 'ms-item' + (it.danger ? ' danger' : ''), disabled: !!it.dis, onclick: () => { S.close(); if (it.fn) it.fn(); } },
          h('span', { class: 'ms-ic', html: it.icon || '' }), h('span', { class: 'ms-n', text: it.n }),
          it.sub ? h('span', { class: 'ms-r', text: it.sub }) : null,
          it.check != null ? h('span', { class: 'ms-ck', html: it.check ? MI.check : '' }) : null,
          it.more ? h('span', { class: 'ms-chev', html: MI.right }) : null));
      }
      S = this.sheet({ title, body: box, onClose });
      return S;
    }

    /* ================= 홈: 관심종목 ================= */
    buildHome() {
      const home = (this.home = h('section', { class: 'mh' }));
      this.hLeft = h('button', { class: 'm-circ', 'aria-label': '메뉴', onclick: () => (this.edit ? this.setEdit(false) : this.homeMenu()) });
      this.hTitle = h('button', { class: 'mh-title', onclick: () => { if (!this.edit) this.listsSheet(); } });
      const right = h('button', { class: 'm-circ', html: MI.search, 'aria-label': '종목 검색', onclick: () => this.search(false) });
      this.list = h('div', { class: 'mh-list' });
      this.mini = this.buildMini();
      const dock = h('div', { class: 'mh-dock' }, h('button', { class: 'm-circ lg', html: ICON.bell, 'aria-label': '가격 알림', onclick: () => this.alertsSheet() }), this.mini);
      home.append(this.list, h('header', { class: 'mh-head' }, this.hLeft, this.hTitle, right), dock);
      document.body.append(home);
      this.bindList();
      this.setEdit(false, true);
    }
    setEdit(on, silent) {
      if (on && this.wl.list.virtual) { U.toast('깃발 목록은 편집할 수 없습니다', 'warn'); return; }
      this.edit = !!on;
      this.home.classList.toggle('editing', this.edit);
      this.hLeft.innerHTML = this.edit ? '<span>완료</span>' : MI.dots;
      this.hLeft.classList.toggle('txt', this.edit);
      if (!silent) this.renderList();
    }
    onWl() { // 관심종목 데이터가 바뀜 (wl.save)
      if (this._wlRaf) return;
      this._wlRaf = requestAnimationFrame(() => { this._wlRaf = 0; this.renderList(); this.paintDetailHead(); });
    }
    onNames() { this.renderList(); this.paintDetailHead(); this._pillK = ''; this.refreshChart(); }
    renderList() {
      const wl = this.wl, L = wl.list, list = this.list;
      this.hTitle.innerHTML = '';
      this.hTitle.append(h('span', { text: this.edit ? '목록 편집' : L.name }));
      if (!this.edit) this.hTitle.append(h('i', { html: MI.down }));
      const st = list.scrollTop;
      list.innerHTML = '';
      this.rows = new Map();
      const items = this.edit ? L.items.map((it, idx) => ({ it, idx })) : wl.displayItems();
      if (!items.length) list.append(h('div', { class: 'mh-empty', html: L.virtual ? '깃발을 단 종목이 없습니다.<br>종목을 길게 누르면 깃발을 달 수 있어요.' : '종목이 없습니다.<br>오른쪽 위 <b>검색</b>으로 추가하세요.' }));
      let col = false;
      for (const { it, idx } of items) {
        if (it.t === 'sec') { col = !this.edit && !!it.collapsed; list.append(this.secEl(it, idx)); continue; }
        if (col) continue;
        list.append(this.rowEl(it, idx));
      }
      list.scrollTop = st;
      for (const k of this.rows.keys()) this.paintRow(k);
      this.app.trackQuotes();
    }
    secEl(it, idx) {
      return h('div', { class: 'mr-sec' + (it.collapsed && !this.edit ? ' col' : ''), 'data-i': idx },
        this.edit ? h('button', { class: 'mr-del', 'aria-label': '섹션 삭제', onclick: (e) => { e.stopPropagation(); this.wl.remove(idx); } }) : null,
        h('span', { class: 'mr-sec-n', text: it.name }),
        this.edit ? h('span', { class: 'mr-grip', html: MI.grip }) : h('span', { class: 'mr-sec-c', html: MI.down }));
    }
    rowEl(it, idx) {
      const k = it.src + ':' + it.sym, wl = this.wl, nm = wl.nameOf(it.src, it.sym), fl = wl.st.flags[k];
      const R = { px: h('span', { class: 'mr-px' }), chg: h('span', { class: 'mr-chg' }), st: h('div', { class: 'mr-st', html: MI.moon + '<span>장 마감</span>' }) };
      const row = h('div', { class: 'mr-row', 'data-k': k, 'data-i': idx },
        this.edit ? h('button', { class: 'mr-del', 'aria-label': '삭제', onclick: (e) => { e.stopPropagation(); wl.remove(idx); } }) : null,
        fl ? h('i', { class: 'mr-flag', style: { background: CL.FLAGC[fl] } }) : null,
        CL.Logo.el(it.src, it.sym, 40, nm),
        h('div', { class: 'mr-id' },
          h('div', { class: 'mr-t' }, h('b', { text: CL.tickOf(it.src, it.sym) }), it.src === 'stock' ? h('span', { class: 'mr-d', text: 'D', title: '지연 시세' }) : null),
          h('div', { class: 'mr-n', text: nm || CL.exOf(it.src, it.sym) })),
        this.edit ? h('span', { class: 'mr-grip', html: MI.grip }) : h('div', { class: 'mr-q' }, R.px, R.chg, R.st));
      if (!this.rows.has(k)) this.rows.set(k, []);
      this.rows.get(k).push(R);
      return row;
    }
    paintRow(k) {
      const Rs = this.rows.get(k), q = QH().get(k);
      if (!Rs || !q || q.last == null) return;
      const d = this.precOf(k, q.last), set = this.set;
      const col = q.chgP > 0 ? set.up : q.chgP < 0 ? set.dn : '';
      const flash = q.flashAt && Date.now() - q.flashAt < 300 && q.dir;
      const closed = k.startsWith('stock:') && q.mopen === false;
      for (const R of Rs) {
        R.px.textContent = U.fmt(q.last, d);
        R.chg.textContent = q.chgP != null ? (q.chgAbs != null ? sgn(q.chgAbs) + U.fmt(Math.abs(q.chgAbs), d) + '  ' : '') + pct(q.chgP) : '';
        R.chg.style.color = col;
        R.st.classList.toggle('on', closed);
        if (flash) { R.px.classList.remove('fl-up', 'fl-dn'); void R.px.offsetWidth; R.px.classList.add(q.dir > 0 ? 'fl-up' : 'fl-dn'); }
      }
    }
    bindList() {
      const list = this.list;
      let lp = 0, start = null;
      const clearPress = () => list.querySelectorAll('.press').forEach((x) => x.classList.remove('press'));
      const cancel = () => { clearTimeout(lp); lp = 0; start = null; clearPress(); };
      list.addEventListener('pointerdown', (e) => {
        const grip = e.target.closest('.mr-grip');
        if (grip && this.edit) { this.dragRow(e, grip.closest('[data-i]')); return; }
        if (this.edit) return;
        const row = e.target.closest('.mr-row');
        if (!row) return;
        start = { x: e.clientX, y: e.clientY };
        row.classList.add('press');
        clearTimeout(lp);
        lp = setTimeout(() => { // 길게 누르기 → 종목 메뉴
          lp = 0; this._lpFired = true; clearPress();
          try { if (navigator.vibrate) navigator.vibrate(10); } catch (er) {}
          this.ghostGuard(this.rowMenu(row.dataset.k, +row.dataset.i));
        }, 480);
      });
      list.addEventListener('pointermove', (e) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) cancel(); });
      list.addEventListener('pointerup', () => { clearTimeout(lp); lp = 0; start = null; setTimeout(clearPress, 140); });
      list.addEventListener('pointercancel', cancel);
      list.addEventListener('scroll', cancel, { passive: true });
      list.addEventListener('contextmenu', (e) => e.preventDefault());
      list.addEventListener('click', (e) => {
        if (this._lpFired) { this._lpFired = false; return; }
        if (this.edit) return;
        const sec = e.target.closest('.mr-sec'), row = e.target.closest('.mr-row');
        if (sec) {
          const it = this.wl.list.items[+sec.dataset.i];
          if (it && !this.wl.list.virtual) { it.collapsed = !it.collapsed; this.wl.save(); }
          return;
        }
        if (row) this.openDetail(row.dataset.k);
      });
    }
    dragRow(e, el) { // 편집 모드: ≡ 손잡이로 순서 바꾸기
      if (!el) return;
      e.preventDefault();
      const els = Array.from(this.list.querySelectorAll('[data-i]'));
      const rects = els.map((x) => x.getBoundingClientRect());
      const from = els.indexOf(el);
      if (from < 0) return;
      const y0 = e.clientY, hgt = rects[from].height;
      let to = from;
      el.classList.add('drag');
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      const mv = (ev) => {
        const dy = ev.clientY - y0;
        el.style.transform = 'translateY(' + dy + 'px)';
        const cy = rects[from].top + hgt / 2 + dy;
        to = from;
        for (let k = 0; k < from; k++) if (cy < rects[k].top + rects[k].height / 2) { to = k; break; }
        if (to === from) for (let k = els.length - 1; k > from; k--) if (cy > rects[k].top + rects[k].height / 2) { to = k; break; }
        els.forEach((x, k) => {
          if (k === from) return;
          const s = from < to && k > from && k <= to ? -hgt : from > to && k >= to && k < from ? hgt : 0;
          x.style.transform = s ? 'translateY(' + s + 'px)' : '';
        });
      };
      const up = () => {
        el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        els.forEach((x) => { x.style.transform = ''; x.classList.remove('drag'); });
        if (to === from) return;
        const items = this.wl.list.items, fi = +els[from].dataset.i, ti = +els[to].dataset.i;
        const [it] = items.splice(fi, 1);
        items.splice(ti, 0, it);
        this.wl.save();
      };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    }
    /* 길게 누르기로 연 시트: 그 손가락을 뗄 때 생기는 클릭이 시트 안 버튼(예: 삭제)을 누르지 않게 잠시 막음 */
    ghostGuard(S) {
      if (!S) return;
      const els = [S.box, S.scrim].filter(Boolean);
      els.forEach((e) => (e.style.pointerEvents = 'none'));
      let done = false;
      const release = () => {
        if (done) return;
        done = true;
        window.removeEventListener('pointerup', onUp, true); window.removeEventListener('pointercancel', onUp, true);
        setTimeout(() => els.forEach((e) => (e.style.pointerEvents = '')), 350);
      };
      const onUp = () => release();
      window.addEventListener('pointerup', onUp, true); window.addEventListener('pointercancel', onUp, true);
      setTimeout(release, 4000);
    }
    rowMenu(k, idx) {
      const [src, s] = splitKey(k), wl = this.wl, L = wl.list, nm = wl.nameOf(src, s);
      const others = wl.st.lists.filter((l) => l.id !== L.id);
      return this.menuSheet(CL.tickOf(src, s) + (nm ? ' · ' + nm : ''), [
        { icon: ICON.candle, n: '차트 열기', fn: () => this.openChartKey(k) },
        { icon: MI.alarm, n: '가격 알림 추가', fn: () => this.alertFor(k) },
        { node: this.flagRow(k) },
        L.virtual ? null : { icon: MI.up, n: '맨 위로 이동', fn: () => { const [it] = L.items.splice(idx, 1); L.items.unshift(it); wl.save(); } },
        !L.virtual && others.length ? {
          icon: ICON.copy, n: '다른 목록에 복사', more: true,
          fn: () => this.menuSheet('복사할 목록', others.map((l) => ({ icon: ICON.list, n: l.name, fn: () => { if (!l.items.some((x) => x.t === 'sym' && x.src === src && x.sym === s)) { l.items.push({ t: 'sym', src, sym: s }); wl.save(); } U.toast(l.name + '에 추가됨'); } }))),
        } : null,
        { icon: ICON.trash, n: L.virtual ? '깃발 해제' : '목록에서 삭제', danger: true, fn: () => wl.remove(idx) },
      ]);
    }
    flagRow(k) {
      const wl = this.wl, row = h('div', { class: 'ms-flags' }, h('span', { class: 'ms-ic', html: ICON.flag }), h('span', { class: 'ms-flags-l', text: '깃발' }));
      const paint = () => { for (const b of row.querySelectorAll('.ms-flag')) b.classList.toggle('on', wl.st.flags[k] === b.dataset.c); };
      for (const c of Object.keys(CL.FLAGC)) {
        row.append(h('button', {
          class: 'ms-flag', 'data-c': c, style: { background: CL.FLAGC[c] }, 'aria-label': CL.FLAGN[c] + ' 깃발',
          onclick: () => { if (wl.st.flags[k] === c) delete wl.st.flags[k]; else wl.st.flags[k] = c; wl.save(); paint(); },
        }));
      }
      paint();
      return row;
    }
    listsSheet() {
      const wl = this.wl, s = wl.st, items = [{ head: '내 목록' }];
      for (const l of s.lists) items.push({ icon: ICON.list, n: l.name, sub: String(l.items.filter((x) => x.t === 'sym').length), check: s.cur === l.id, fn: () => { s.cur = l.id; wl.save(); } });
      items.push({ head: '깃발 목록' });
      for (const c of Object.keys(CL.FLAGC)) {
        const n = Object.values(s.flags).filter((x) => x === c).length;
        items.push({ icon: '<i class="ms-dot" style="background:' + CL.FLAGC[c] + '"></i>', n: CL.FLAGN[c] + ' 깃발', sub: String(n), check: s.cur === 'flag:' + c, fn: () => { s.cur = 'flag:' + c; wl.save(); } });
      }
      items.push('-', { icon: ICON.plus, n: '새 목록 만들기', fn: () => this.newList() });
      this.menuSheet('관심종목 목록', items);
    }
    newList() {
      const wl = this.wl, s = wl.st;
      wl.ask('새 관심종목 목록', '새 목록', (v) => { const l = { id: U.uid(), name: v, items: [] }; s.lists.push(l); s.cur = l.id; wl.save(); });
    }
    homeMenu() {
      const wl = this.wl, s = wl.st, L = wl.list, app = this.app, so = s.sort;
      const sortName = !so ? '기본 순서' : ({ sym: '이름', last: '현재가', chg: '변동', chgp: '변동%', vol: '거래량' }[so.col] || '') + (so.dir > 0 ? ' ↑' : ' ↓');
      this.menuSheet(L.name, [
        L.virtual ? null : { icon: MI.edit, n: '목록 편집 (순서·삭제)', fn: () => this.setEdit(true) },
        L.virtual ? null : { icon: ICON.sec, n: '섹션 추가', fn: () => wl.ask('섹션 추가', '새 섹션', (name) => { L.items.unshift({ t: 'sec', id: U.uid(), name }); wl.save(); }) },
        { icon: MI.sort, n: '정렬', sub: sortName, more: true, fn: () => this.sortSheet() },
        '-',
        { icon: ICON.plus, n: '새 목록 만들기', fn: () => this.newList() },
        L.virtual ? null : { icon: MI.rename, n: '목록 이름 바꾸기', fn: () => wl.ask('목록 이름', L.name, (v) => { L.name = v; wl.save(); }) },
        !L.virtual && s.lists.length > 1 ? { icon: ICON.trash, n: '이 목록 삭제', danger: true, fn: () => app.confirm('"' + L.name + '" 목록을 삭제할까요?', () => { s.lists = s.lists.filter((x) => x !== L); s.cur = s.lists[0].id; wl.save(); }) } : null,
        '-',
        { icon: ICON.folder, n: '목록 가져오기 (.txt)', fn: () => wl.importList() },
        { icon: ICON.save, n: '목록 내보내기 (.txt)', fn: () => wl.exportList() },
        { icon: ICON.gear, n: '설정', fn: () => app.openSettings() },
        { icon: MI.desktop, n: 'PC 화면으로 보기', fn: () => this.switchUI('desktop') },
      ]);
    }
    sortSheet() {
      const wl = this.wl, s = wl.st, cur = JSON.stringify(s.sort || null);
      const opt = (n, so) => ({ n, check: cur === JSON.stringify(so), fn: () => { s.sort = so; wl.save(); } });
      this.menuSheet('정렬', [
        opt('기본 순서 (직접 정한 순서)', null), opt('변동% 높은 순', { col: 'chgp', dir: -1 }), opt('변동% 낮은 순', { col: 'chgp', dir: 1 }),
        opt('현재가 높은 순', { col: 'last', dir: -1 }), opt('거래량 많은 순', { col: 'vol', dir: -1 }), opt('이름 순', { col: 'sym', dir: 1 }),
      ]);
    }
    switchUI(mode) {
      U.save('ui', mode);
      for (const c of this.app.charts) this.app.saveSlotNow(c);
      location.replace(location.pathname);
    }
    search(inDetail) {
      const wl = this.wl;
      this.app.openSearch(this.app.active, '', {
        title: inDetail ? '종목 바꾸기' : '종목 검색',
        open: (it) => { const k = it.source + ':' + it.symbol; if (inDetail && this.dE) this.setDetail(k); else this.openDetail(k); },
        add: (it) => this.toggleWatch(it.source, it.symbol, String(it.name || '').split(' · ')[0].trim(), true),
        has: (it) => wl.has(it.source, it.symbol),
      });
    }
    toggleWatch(src, s, name, quiet) {
      const wl = this.wl;
      if (wl.has(src, s)) {
        const idx = wl.list.items.findIndex((x) => x.t === 'sym' && x.src === src && x.sym === s);
        if (idx >= 0) wl.remove(idx);
        if (!quiet) U.toast(CL.tickOf(src, s) + ' 관심종목에서 뺌');
        return 'removed';
      }
      const ok = wl.add(src, s, name || wl.nameOf(src, s));
      if (!quiet) U.toast(CL.tickOf(src, s) + ' 관심종목에 추가');
      return ok;
    }

    /* ---------------- 미니 플레이어 (아래 알약: 지금 차트 종목) ---------------- */
    buildMini() {
      this.mLogo = h('span', { class: 'mm-logo' });
      this.mSym = h('b'); this.mPx = h('span', { class: 'mm-px' }); this.mChg = h('span', { class: 'mm-chg' });
      const sp = h('span', { class: 'mm-spark' });
      const el = h('button', { class: 'mh-mini', 'aria-label': '차트 열기', onclick: () => this.showChart() },
        this.mLogo, h('span', { class: 'mm-txt' }, h('span', { class: 'mm-l1' }, this.mSym, h('i', { text: '•' }), this.mPx), this.mChg),
        sp, h('span', { class: 'mm-up', html: MI.up }));
      this.spark = new Area(sp, { fill: true, fa: 0.22, padT: 5, padB: 5, padL: 2, padR: 7, ref: false, dot: true, lw: 1.6 });
      return el;
    }
    paintMini() {
      const c = this.app.active;
      if (!c || !this.mLogo) return;
      const k = c.key, q = QH().get(k) || {}, set = this.set;
      if (this._miniK !== k) {
        this._miniK = k;
        this.mLogo.innerHTML = '';
        this.mLogo.append(CL.Logo.el(c.src, c.sym, 38, c.dispName()));
        this.mSym.textContent = CL.tickOf(c.src, c.sym);
        this.sparkR = null;
        this.spark.set([]);
        this.loadSpark();
      }
      const last = q.last != null ? q.last : c.bars.length ? c.bars[c.bars.length - 1].c : null;
      this.mPx.textContent = last != null ? U.fmt(last, this.precOf(k, last)) : '—';
      this.mChg.textContent = q.chgP != null ? pct(q.chgP) + ' 오늘' : '';
      const col = q.chgP > 0 ? set.up : q.chgP < 0 ? set.dn : '';
      this.mChg.style.color = col;
      const now = Date.now();
      if (this.sparkR && this.sparkR.k === k && now - (this._spT || 0) > 1000) {
        this._spT = now;
        const [src] = splitKey(k);
        this.live(this.sparkR.v, q, src, '1D');
        this.spark.set(this.sparkR.v.pts, { col: col || set.up });
      }
    }
    loadSpark() {
      const c = this.app.active;
      if (!c) return;
      const k = c.key, tok = (this._spTok = (this._spTok || 0) + 1);
      this.rangeData(c.src, c.sym, '1D').then((v) => {
        if (tok !== this._spTok) return;
        this.sparkR = { k, v };
        this._spT = 0;
        this.seedPrec(k, v);
        this.paintMini();
      }).catch(() => {});
    }

    /* ---------------- 기간별 데이터 (종목 시트·미니 플레이어) ---------------- */
    rcFresh(src, sym, rk) {
      const c = this.rc[src + ':' + sym + '|' + rk];
      return c && Date.now() - c.t < (rk === '1D' || rk === '1W' ? 6e4 : 6e5) ? c.v : null;
    }
    rangeData(src, sym, rk) {
      const ck = src + ':' + sym + '|' + rk;
      const f = this.rcFresh(src, sym, rk);
      if (f) return Promise.resolve(f);
      if (this.rq[ck]) return this.rq[ck];
      const p = this.loadRangeData(src, sym, rk).then((v) => { delete this.rq[ck]; this.rc[ck] = { t: Date.now(), v }; return v; }, (e) => { delete this.rq[ck]; throw e; });
      this.rq[ck] = p;
      return p;
    }
    async loadRangeData(src, sym, rk) {
      const now = Date.now();
      const from = { '1W': now - 7 * DAY, '1M': now - 30 * DAY, '3M': now - 91 * DAY, YTD: new Date(new Date().getFullYear(), 0, 1).getTime(), '1Y': now - 365 * DAY, '5Y': now - 1826 * DAY }[rk];
      let bars = [], step = 0, cut = from;
      if (CRYPTO[src]) {
        if (rk === '1D') { // 오늘 일봉 구간 (UTC 0시 = 한국 오전 9시부터)
          const s0 = Math.floor(now / DAY) * DAY, iv = now - s0 < 3 * 36e5 ? '1m' : '5m';
          step = U.IV[iv];
          bars = (await this.cbars(src, sym, iv, s0)).filter((b) => b.t >= s0);
          if (bars.length < 2) { step = U.IV['5m']; bars = (await this.cbars(src, sym, '5m', now - DAY)).filter((b) => b.t >= now - DAY); }
        } else if (rk === '1W') { step = U.IV['30m']; bars = await this.cbars(src, sym, '30m', from); }
        else if (rk === '1M') { step = U.IV['4h']; bars = await this.cbars(src, sym, '4h', from); }
        else if (rk === '5Y' || rk === 'ALL') bars = await this.cbars(src, sym, '1W', rk === 'ALL' ? 0 : from);
        else bars = await Data.daily(src, sym);
      } else if (src === 'stock') {
        const P = Data.get('stock');
        if (rk === '1D') { step = 3e5; bars = await P.chart(sym, '5m', '&range=1d'); }
        else if (rk === '1W') { step = 9e5; bars = await P.chart(sym, '15m', '&range=5d'); cut = null; }
        else if (rk === '1M') { step = 36e5; bars = await P.chart(sym, '1h', '&range=1mo'); cut = null; }
        else if (rk === '5Y') bars = await P.chart(sym, '1W', '&range=5y');
        else if (rk === 'ALL') bars = await P.fetch(sym, '1W');
        else bars = await Data.daily(src, sym);
      } else {
        bars = (await Data.load(src, sym, '1D')).bars;
        if (rk === '1D') bars = bars.slice(-30);
      }
      bars = bars.filter((b) => b && isFinite(b.c));
      let base = bars.length ? bars[0].o : null;
      if (cut != null && bars.length) {
        const k = bars.findIndex((b) => b.t >= cut);
        if (k > 0) { base = bars[k - 1].c; bars = bars.slice(k); }
        else if (k < 0) bars = bars.slice(-2);
      }
      let prec = U.detectPrec(bars);
      if (src === 'stock') { const m = Data.get('stock').meta(sym); if (m && m.prec != null) prec = Math.min(prec, Math.max(0, m.prec)); }
      return { pts: bars.map((b) => ({ t: b.t, c: b.c })), base, step, prec };
    }
    async cbars(src, sym, iv, since) { // 코인 봉: 업비트는 필요한 만큼만 쪽 단위로, 바이낸스는 한 번에
      const P = Data.get(src);
      if (src !== 'upbit') return P.fetch(sym, iv);
      let out = [], to = 0;
      for (let k = 0; k < 4; k++) {
        let u = '/candles/' + P.native[iv] + '?market=' + encodeURIComponent(sym) + '&count=200';
        if (to) u += '&to=' + encodeURIComponent(new Date(to).toISOString().slice(0, 19) + 'Z');
        const b = (await P.get(u)).map(P.parse).reverse();
        if (!b.length) break;
        out = b.concat(out);
        to = b[0].t;
        if (b.length < 200 || to <= since) break;
      }
      const seen = new Set();
      return out.filter((b) => (seen.has(b.t) ? false : (seen.add(b.t), true)));
    }
    live(v, q, src, rk) { // 실시간 시세를 기간 데이터 끝에 반영
      const pts = v && v.pts;
      if (!pts || !pts.length || q.last == null) return;
      const last = pts[pts.length - 1];
      if (rk === '1D' && CRYPTO[src] && v.step) {
        const b = Math.floor(Date.now() / v.step) * v.step;
        if (b > last.t) { pts.push({ t: b, c: q.last }); return; }
      }
      last.c = q.last;
    }
    precOf(k, v) {
      const ch = this.app.charts.find((x) => x.key === k && x.bars.length);
      if (ch) return v != null ? Math.min(ch.prec, capDec(v)) : ch.prec;
      let d = this.pc[k];
      if (v != null && isFinite(v)) {
        const dv = Math.min(U.decOf(+(+v).toPrecision(12)), capDec(v));
        if (d == null || dv > d) d = this.pc[k] = dv;
      }
      return d != null ? d : 2;
    }
    seedPrec(k, v) {
      if (!v || !v.pts.length || v.prec == null) return;
      const d = Math.min(v.prec, capDec(v.pts[v.pts.length - 1].c));
      if (this.pc[k] == null || d > this.pc[k]) this.pc[k] = d;
    }

    /* ================= 종목 시트 (관심종목에서 탭) ================= */
    openDetail(key) {
      if (this.det && !this.det.closed) { this.setDetail(key); return; }
      const E = (this.dE = {});
      E.logo = h('span', { class: 'md-logo' });
      E.name = h('b'); E.sub = h('span'); E.dot = h('i', { class: 'md-dot' });
      E.id = h('button', { class: 'md-id', onclick: () => this.search(true) },
        h('span', { class: 'md-n' }, E.name, h('span', { class: 'md-chev', html: MI.down })), h('span', { class: 'md-s' }, E.sub, E.dot));
      const head = h('div', { class: 'md-head' }, E.logo, E.id, h('button', { class: 'm-circ sm', html: MI.dots, 'aria-label': '더 보기', onclick: () => this.detailMenu() }));
      E.price = h('span', { class: 'md-price' }); E.cur = h('span', { class: 'md-cur' });
      E.chg = h('span', { class: 'md-chg' }); E.when = h('span', { class: 'md-when' });
      E.state = h('div', { class: 'md-state hidden' });
      E.msg = h('div', { class: 'md-msg hidden' });
      E.chart = h('div', { class: 'md-chart' });
      this.area = new Area(E.chart, { axis: true, labels: true, padT: 22, padB: 16, onScrub: (p) => { this.scrubPt = p; this.paintDetail(); } });
      E.chart.append(E.msg,
        h('button', { class: 'md-fab l', html: MI.alarm, 'aria-label': '가격 알림 추가', onclick: () => this.alertFor(this.dKey) }),
        h('button', { class: 'md-fab r', html: ICON.candle, 'aria-label': '차트 열기', onclick: () => this.openChartKey(this.dKey) }));
      E.ranges = h('div', { class: 'md-ranges' });
      for (const [k, n] of RANGES) E.ranges.append(h('button', { class: 'md-rg', 'data-k': k, text: n, onclick: () => { this.dRange = k; this.set.mRange = k; this.app.saveSet(); this.loadRange(); } }));
      E.ranges.append(h('button', { class: 'md-rg ic', html: ICON.full, 'aria-label': '전체 화면 차트', onclick: () => this.openChartKey(this.dKey) }));
      E.tabs = h('div', { class: 'md-tabs' });
      for (const [k, n] of [['ov', '개요'], ['perf', '성과'], ['al', '알림']]) E.tabs.append(h('button', { class: 'md-tab', 'data-k': k, text: n, onclick: () => { this.set.mDetTab = k; this.app.saveSet(); this.renderTab(); } }));
      E.tb = h('div', { class: 'md-tb' });
      const body = h('div', { class: 'md' }, head, h('div', { class: 'md-px' }, E.price, E.cur), h('div', { class: 'md-chgrow' }, E.chg, E.when), E.state,
        E.chart, E.ranges, h('button', { class: 'md-cta', text: '차트 열기', onclick: () => this.openChartKey(this.dKey) }), E.tabs, E.tb);
      this.det = this.sheet({
        cls: 'ms-detail', body, dragEl: head,
        onClose: () => { this.dE = null; this.dKey = null; this.det = null; this.dData = null; this.scrubPt = null; this.app.trackQuotes(); },
      });
      this.setDetail(key);
    }
    setDetail(key) {
      const E = this.dE;
      if (!E) return;
      this.dKey = key; this.scrubPt = null; this.dData = null;
      this.dRange = this.dRange || this.set.mRange || '1D';
      const [src, s] = splitKey(key);
      if (this.det && this.det.body) this.det.body.scrollTop = 0;
      E.logo.innerHTML = '';
      E.logo.append(CL.Logo.el(src, s, 44, this.wl.nameOf(src, s)));
      this.paintDetailHead();
      this.app.trackQuotes();
      this.loadRange();
      this.renderTab();
    }
    paintDetailHead() {
      const E = this.dE, k = this.dKey;
      if (!E || !k) return;
      const [src, s] = splitKey(k), q = QH().get(k) || {}, nm = this.wl.nameOf(src, s);
      E.name.textContent = nm || CL.tickOf(src, s);
      E.sub.textContent = CL.tickOf(src, s) + ' • ' + CL.exOf(src, s, q);
    }
    loadRange() {
      const E = this.dE, k = this.dKey;
      if (!E || !k) return;
      const rk = this.dRange, [src, s] = splitKey(k), tok = (this._rtok = (this._rtok || 0) + 1);
      for (const b of E.ranges.children) b.classList.toggle('on', b.dataset.k === rk);
      this.scrubPt = null;
      if (!this.rcFresh(src, s, rk)) { E.msg.textContent = '불러오는 중…'; E.msg.classList.remove('hidden'); this.area.set([]); }
      this.paintDetail();
      this.rangeData(src, s, rk).then((v) => {
        if (tok !== this._rtok || !this.dE) return;
        this.dData = { k: k + '|' + rk, v };
        this.seedPrec(k, v);
        if (!v.pts.length) { E.msg.textContent = '이 기간의 데이터가 없습니다'; E.msg.classList.remove('hidden'); this.area.set([]); this.paintDetail(); return; }
        E.msg.classList.add('hidden');
        this.drawDetail();
        this.paintDetail();
      }).catch((e) => {
        if (tok !== this._rtok || !this.dE) return;
        E.msg.textContent = e && e.noServer ? '주식 데이터는 서버(start.bat 또는 웹 버전)가 필요합니다' : '불러오지 못했습니다 · ' + ((e && e.message) || '');
        E.msg.classList.remove('hidden');
        this.area.set([]);
      });
    }
    baseOf(v, q, rk) { return rk === '1D' && q.base ? q.base : v && v.base != null ? v.base : v && v.pts.length ? v.pts[0].c : null; }
    drawDetail() {
      const r = this.dData;
      if (!r || !this.dE || r.k !== this.dKey + '|' + this.dRange) return;
      const q = QH().get(this.dKey) || {}, v = r.v, rk = this.dRange, L = isLight();
      const base = this.baseOf(v, q, rk);
      const last = q.last != null ? q.last : v.pts.length ? v.pts[v.pts.length - 1].c : null;
      const up = last == null || base == null || last >= base;
      this.area.set(v.pts, {
        col: up ? this.set.up : this.set.dn, rk, dim: L ? '#6e6e73' : '#8e8e93',
        lblBg: L ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.6)', dash: L ? 'rgba(0,0,0,.3)' : 'rgba(160,160,160,.5)',
      });
    }
    paintDetail() {
      const E = this.dE, k = this.dKey;
      if (!E || !k) return;
      const [src, s] = splitKey(k), q = QH().get(k) || {}, set = this.set, rk = this.dRange;
      const v = this.dData && this.dData.k === k + '|' + rk ? this.dData.v : null;
      const pts = v ? v.pts : null;
      const last = q.last != null ? q.last : pts && pts.length ? pts[pts.length - 1].c : null;
      const d = this.precOf(k, last), sp = this.scrubPt;
      const price = sp ? sp.c : last;
      let chg = null, chgp = null;
      if (!sp && rk === '1D' && q.chgAbs != null) { chg = q.chgAbs; chgp = q.chgP; }
      else {
        const base = v ? this.baseOf(v, q, rk) : rk === '1D' ? q.base : null;
        if (price != null && base) { chg = price - base; chgp = (chg / base) * 100; }
      }
      E.price.textContent = price != null ? U.fmt(price, d) : '—';
      E.cur.textContent = CL.curOf(src, s, q) || '';
      E.chg.textContent = chg != null ? sgn(chg) + U.fmt(Math.abs(chg), d) + ' ' + pct(chgp) : '';
      const col = chg > 0 ? set.up : chg < 0 ? set.dn : '';
      E.chg.style.color = col; E.when.style.color = col;
      E.when.textContent = sp ? whenOf(sp.t, rk) : (RANGES.find((x) => x[0] === rk) || RANGES[0])[2];
      const a = this.app.active;
      const live = CRYPTO[src] && (!!q.live || (a && a.key === k && a.status === 'live'));
      E.dot.className = 'md-dot' + (CRYPTO[src] ? (live ? '' : ' off') : src === 'stock' ? (q.mopen ? ' delay' : ' off') : ' off');
      if (src === 'stock' && q.last != null) {
        E.state.innerHTML = q.mopen ? '<i class="md-sd"></i><span>장중 · 약 15~20분 지연 시세</span>' : MI.moon + '<span>장 마감</span>';
        E.state.className = 'md-state ' + (q.mopen ? 'open' : 'closed');
      } else E.state.className = 'md-state hidden';
    }
    onDetailQuote() {
      const q = QH().get(this.dKey);
      if (!q || !this.dE) return;
      const r = this.dData;
      if (r && r.k === this.dKey + '|' + this.dRange) this.live(r.v, q, splitKey(this.dKey)[0], this.dRange);
      const now = Date.now();
      if (!this.scrubPt && now - (this._dDraw || 0) > 500) { this._dDraw = now; this.drawDetail(); }
      this.paintDetail();
      if (now - (this._tabT || 0) > 2500 && (this.set.mDetTab || 'ov') === 'ov') { this._tabT = now; this.renderTab(); }
    }
    renderTab() {
      const E = this.dE, k = this.dKey;
      if (!E || !k) return;
      const tab = this.set.mDetTab || 'ov';
      for (const b of E.tabs.children) b.classList.toggle('on', b.dataset.k === tab);
      const [src, s] = splitKey(k), q = QH().get(k) || {}, set = this.set, box = E.tb;
      const daily = Data._daily[k] && Data._daily[k].bars;
      const last = q.last != null ? q.last : daily && daily.length ? daily[daily.length - 1].c : null;
      const d = this.precOf(k, last);
      const needDaily = () => {
        if (daily || this.dailyTried[k]) return;
        this.dailyTried[k] = true;
        Data.daily(src, s).then(() => { if (this.dKey === k) this.renderTab(); }).catch(() => {});
      };
      box.innerHTML = '';
      if (tab === 'ov') {
        const rangeRow = (lbl, lo, hi, v) => {
          const row = h('div', { class: 'md-rr' }, h('div', { class: 'md-rl', text: lbl }));
          if (lo == null || hi == null || !(hi > lo) || v == null) { row.append(h('div', { class: 'md-rv', text: '—' })); return row; }
          const p = U.clamp((v - lo) / (hi - lo), 0, 1);
          row.append(h('div', { class: 'md-rb' }, h('span', { text: U.fmt(lo, d) }), h('span', { class: 'md-bar' }, h('i', { style: { width: p * 100 + '%' } }), h('b', { style: { left: p * 100 + '%' } })), h('span', { text: U.fmt(hi, d) })));
          return row;
        };
        let w52h = q.w52h, w52l = q.w52l;
        if ((w52h == null || w52l == null) && daily) {
          const t0 = Date.now() - 365 * DAY;
          for (const b of daily) if (b.t >= t0) { w52h = w52h == null || b.h > w52h ? b.h : w52h; w52l = w52l == null || b.l < w52l ? b.l : w52l; }
        }
        box.append(rangeRow('일간 범위', q.low, q.high, last), rangeRow('52주 범위', w52l, w52h, last));
        const g = h('div', { class: 'md-grid' });
        const cell = (n, v) => g.append(h('div', { class: 'md-cell' }, h('span', { text: n }), h('b', { text: v })));
        const f = (v) => (v != null ? U.fmt(v, d) : '—');
        cell('시가', f(q.open)); cell('전일 종가', f(q.base));
        cell('고가', f(q.high)); cell('저가', f(q.low));
        cell('거래량', q.vol != null ? U.fmtVol(q.vol) : '—'); cell('거래대금', q.qv != null ? U.fmtVol(q.qv) : '—');
        box.append(g);
        if (src === 'stock') box.append(h('div', { class: 'md-note', text: '주식·지수 시세는 야후 파이낸스 기준이라 약 15~20분 늦습니다.' }));
        needDaily();
      } else if (tab === 'perf') {
        if (!daily) { box.append(h('div', { class: 'md-load', text: this.dailyTried[k] ? '데이터를 불러오지 못했습니다' : '불러오는 중…' })); needDaily(); return; }
        const g = h('div', { class: 'md-perf' });
        // 그 시점에 이미 마감된 일봉의 종가 (일봉 시작 시각이 아니라 끝난 시각으로 비교해야 미래 값이 안 섞임)
        const ref = (t) => { let r = null; for (const b of daily) { if (b.t + DAY <= t) r = b.c; else break; } return r; };
        const now = Date.now(), y0 = new Date(new Date().getFullYear(), 0, 1).getTime();
        for (const [n, t] of [['1주', now - 7 * DAY], ['1달', now - 30 * DAY], ['3달', now - 91 * DAY], ['6달', now - 182 * DAY], ['올해', y0 - 1], ['1년', now - 365 * DAY]]) {
          const r = ref(t), v = r && last != null ? ((last - r) / r) * 100 : null;
          const c = v == null ? '' : v >= 0 ? set.up : set.dn;
          g.append(h('div', { class: 'md-pt', style: c ? { background: U.rgba(c, 0.14), color: c } : {} }, h('b', { text: v == null ? '—' : pct(v) }), h('span', { text: n })));
        }
        box.append(g);
      } else {
        const list = this.app.alerts.filter((a) => a.src + ':' + a.sym === k);
        box.append(h('button', { class: 'md-add', html: MI.alarm + '<span>가격 알림 추가</span>', onclick: () => this.alertFor(k) }));
        if (!list.length) box.append(h('div', { class: 'md-load', text: '이 종목의 알림이 없습니다' }));
        for (const a of list.slice().reverse()) box.append(this.alertRow(a, () => this.renderTab()));
        box.append(h('div', { class: 'md-note', text: '알림은 이 페이지가 열려 있을 때 울립니다.' }));
      }
    }
    detailMenu() {
      const k = this.dKey;
      if (!k) return;
      const [src, s] = splitKey(k), inL = this.wl.has(src, s);
      this.menuSheet(CL.tickOf(src, s), [
        { icon: inL ? MI.starOn : MI.star, n: inL ? '관심종목에서 빼기' : '관심종목에 추가', fn: () => this.toggleWatch(src, s) },
        { icon: MI.alarm, n: '가격 알림 추가', fn: () => this.alertFor(k) },
        { icon: ICON.candle, n: '차트 열기', fn: () => this.openChartKey(k) },
        { node: this.flagRow(k) },
      ]);
    }
    alertFor(key) {
      if (!key) return;
      const [src, s] = splitKey(key), q = QH().get(key) || {};
      const ch = this.app.charts.find((x) => x.key === key && x.bars.length);
      if (ch) { this.app.openAlertDialog(ch); return; }
      const r = this.dData && this.dData.k.startsWith(key + '|') ? this.dData.v : null;
      const last = q.last != null ? q.last : r && r.pts.length ? r.pts[r.pts.length - 1].c : null;
      if (last == null) { U.toast('아직 가격을 받지 못했습니다. 잠시 뒤 다시 해 주세요', 'warn'); return; }
      this.app.openAlertDialog({ src, sym: s, prec: this.precOf(key, last), bars: [{ c: last }] });
    }
    alertRow(a, rerender) {
      const app = this.app, cond = { cross: '교차', up: '상향 돌파', down: '하향 돌파' }[a.cond] || '';
      const done = () => { U.save('alerts', app.alerts); app.trackQuotes(); app.charts.forEach((x) => x.invalidate()); rerender(); };
      return h('div', { class: 'ma-row' + (a.fired ? ' fired' : '') },
        CL.Logo.el(a.src, a.sym, 34, this.wl.nameOf(a.src, a.sym)),
        h('div', { class: 'ma-id' },
          h('b', { text: CL.tickOf(a.src, a.sym) + ' · ' + cond + ' ' + app.fmtPx(a.src, a.sym, a.price) }),
          h('small', { text: (a.msg ? a.msg + ' · ' : '') + (a.fired ? '울림 ' + new Date(a.firedAt).toLocaleString() : '대기 중') })),
        a.fired ? h('button', { class: 'ma-b', text: '다시', onclick: () => { a.fired = false; done(); } }) : null,
        h('button', { class: 'ma-b del', html: ICON.trash, 'aria-label': '알림 삭제', onclick: () => { app.alerts.splice(app.alerts.indexOf(a), 1); done(); } }));
    }
    alertsSheet() {
      const app = this.app, box = h('div', { class: 'ma' });
      const S = this.sheet({ title: '가격 알림', body: box, onClose: () => { this.alS = null; } });
      S.render = () => {
        box.innerHTML = '';
        const c = app.active;
        box.append(h('div', { class: 'ma-top' },
          c ? h('button', { class: 'md-add', html: MI.alarm + '<span>' + U.esc(CL.tickOf(c.src, c.sym)) + ' 알림 추가</span>', onclick: () => app.openAlertDialog(c) }) : null,
          app.alerts.some((a) => a.fired) ? h('button', { class: 'ma-clear', text: '울린 알림 지우기', onclick: () => { app.alerts = app.alerts.filter((a) => !a.fired); U.save('alerts', app.alerts); app.charts.forEach((x) => x.invalidate()); S.render(); } }) : null));
        if (!app.alerts.length) box.append(h('div', { class: 'md-load', text: '알림이 없습니다. 종목 시트의 종 버튼이나 차트 ⋯ 메뉴에서 추가하세요.' }));
        for (const a of app.alerts.slice().reverse()) box.append(this.alertRow(a, () => S.render()));
        box.append(h('div', { class: 'md-note', text: '알림은 이 페이지가 열려 있을 때 울립니다.' }));
      };
      S.render();
      this.alS = S;
    }

    /* ================= 전체 차트 ================= */
    buildChart() {
      const app = this.app;
      this.appEl = U.$('#app'); this.center = U.$('#center');
      this.cMin = h('button', { class: 'm-circ mc-min', html: MI.down, 'aria-label': '차트 닫기', onclick: () => this.hideChart() });
      this.favBar = h('div', { class: 'mc-fav' });
      this.undoB = h('button', { class: 'm-circ mc-undo hidden', html: ICON.undo, 'aria-label': '되돌리기', onclick: () => { app.active.undo(); this.refreshUndo(); } });
      this.redoB = h('button', { class: 'm-circ mc-redo hidden', html: ICON.redo, 'aria-label': '다시 실행', onclick: () => { app.active.redo(); this.refreshUndo(); } });
      this.center.append(this.cMin, this.favBar, this.undoB, this.redoB);
      this.cbSym = h('button', { class: 'mc-symb', 'aria-label': '종목 바꾸기', onclick: () => app.openSearch(app.active) });
      this.cbIv = h('button', { class: 'mc-ivb', 'aria-label': '주기 바꾸기', onclick: () => this.ivSheet() });
      this.chip = h('div', { class: 'mc-chip' });
      this.cbL = h('div', { class: 'mc-pill mc-l' }, this.cbSym, this.cbIv, this.chip);
      this.cbFav = h('button', { class: 'mc-b', html: MI.favbar, 'aria-label': '즐겨찾는 드로잉 막대', onclick: () => { this.set.mFavBar = !this.set.mFavBar; app.saveSet(); this.renderFav(); } });
      this.cbar = h('div', { class: 'mc-bar' }, this.cbL,
        h('div', { class: 'mc-pill mc-r' },
          h('button', { class: 'mc-b', html: MI.pencil, 'aria-label': '드로잉', onclick: () => this.drawSheet() }),
          this.cbFav,
          h('button', { class: 'mc-b', html: MI.dots, 'aria-label': '더 보기', onclick: () => this.chartMenu() })));
      this.appEl.append(this.cbar);
    }
    showChart(noAnim) {
      if (this.chartOn) return;
      this.chartOn = true;
      if (noAnim) { this.appEl.style.transition = 'none'; requestAnimationFrame(() => requestAnimationFrame(() => { this.appEl.style.transition = ''; })); }
      document.body.classList.add('m-chart-on');
      this.layer('chart', () => this.hideChart(true));
      this.set.mScreen = 'chart'; this.app.saveSet();
      this.refreshChart(); this.refreshUndo(); this.renderFav();
      this.app.charts.forEach((c) => c.resize());
    }
    hideChart(fromPop) {
      if (!this.chartOn) return;
      this.chartOn = false;
      if (!fromPop) this.unlayer('chart');
      document.body.classList.remove('m-chart-on');
      const app = this.app, c = app.active;
      if (app.tool !== 'cursor') app.setTool('cursor');
      if (c) { if (c.sel) c.select(null); c.mouse.in = false; c.invalidate(); }
      this.set.mScreen = 'home'; app.saveSet();
      this.paintMini();
      if (this.dE && c && this.dKey !== c.key) this.setDetail(c.key); // 차트에서 종목을 바꿨으면 시트도 따라감
    }
    openChartKey(key) {
      if (!key) return;
      const [src, s] = splitKey(key), app = this.app, c = app.active;
      if (c.key !== key) {
        const iv = Data.supports(src, c.iv, s) ? c.iv : '1D';
        c.load(src, s, iv); app.saveSlot(c); app.refreshTop();
      }
      this.showChart();
    }
    refreshChart() {
      const c = this.app.active;
      if (!c || !this.cbSym) return;
      const nm = c.dispName(), k = c.key + '|' + nm;
      if (this._pillK !== k) {
        this._pillK = k;
        this.cbSym.innerHTML = '';
        this.cbSym.append(CL.Logo.el(c.src, c.sym, 34, nm), h('b', { text: CL.tickOf(c.src, c.sym) }));
      }
      this.cbIv.textContent = IVN(c.iv);
      this.paintMini();
    }
    onChartLoaded(c) {
      if (c !== this.app.active) return;
      this.refreshChart(); this.refreshUndo(); this.renderFav();
      this.app.trackQuotes();
    }
    onSelect() { this.renderFav(); this.refreshUndo(); }
    drawingMenu(c, d) { // 선택한 드로잉 막대의 ⋯ (폰에서는 자주 안 쓰는 것을 여기로)
      const app = this.app, t = TL()[d.type];
      if (!t) return;
      this.menuSheet(t.name, [
        t.text ? { icon: ICON.text2, n: '텍스트 편집', fn: () => app.editText(c, d) } : null,
        { icon: ICON.gear, n: '설정 (색·두께·좌표)', fn: () => app.openDrawSettings(c, d) },
        { icon: ICON.clone, n: '복제', fn: () => c.cloneDrawing(d) },
        { icon: ICON.eyeOff, n: '숨기기', fn: () => { d.hidden = true; c.select(null); c.commit(); } },
        { icon: ICON.front, n: '맨 앞으로', fn: () => c.orderDrawing(d, 'front') },
        { icon: ICON.back, n: '맨 뒤로', fn: () => c.orderDrawing(d, 'back') },
        d.type === 'hline' || d.type === 'hray' ? { icon: MI.alarm, n: '이 가격에 알림 추가', fn: () => app.openAlertDialog(c, d.pts[0].p) } : null,
        '-',
        { icon: ICON.trash, n: '삭제', danger: true, fn: () => c.removeDrawing(d) },
      ]);
    }
    refreshUndo() {
      const c = this.app.active;
      if (!this.undoB) return;
      this.undoB.classList.toggle('hidden', !(c && c.undoS.length));
      this.redoB.classList.toggle('hidden', !(c && c.redoS.length));
    }
    onQuotes(keys) {
      const ak = this.app.active && this.app.active.key;
      for (const k of keys) {
        if (this.rows.has(k)) this.paintRow(k);
        if (k === this.dKey) this.onDetailQuote();
        if (k === ak) this.paintMini();
      }
    }
    /* 그리는 중이면 왼쪽 알약이 도구 칩(이름·도움말·완료·끝내기)으로 바뀜 */
    onTool() {
      const app = this.app, t = app.tool, T = TL(), on = t !== 'cursor';
      this.cbL.classList.toggle('tool', on);
      this.chip.innerHTML = '';
      if (on) {
        const def = T[t];
        const name = def ? def.name : { eraser: '지우개', measure: '측정', zoom: '영역 확대' }[t] || t;
        const hint = def ? (def.n === 0 ? '점을 탭해서 잇고 → 완료' : def.free ? '손가락으로 그리기' : def.n === 1 ? '놓을 곳을 탭' : def.n === 2 ? '두 점을 탭하세요' : '점 ' + def.n + '개를 차례로 탭')
          : t === 'eraser' ? '지울 드로잉을 탭' : t === 'measure' ? '끌거나 두 점을 탭' : '확대할 영역을 끌기';
        const c = () => app.active;
        this.chip.append(h('span', { class: 'mc-chip-ic', html: ICON[t] || '' }), h('span', { class: 'mc-chip-t' }, h('b', { text: name }), h('small', { text: hint })));
        if (def && def.n === 0) this.chip.append(h('button', { class: 'mc-chip-ok', text: '완료', onclick: () => { if (c().creating) c().createFinishMulti(); else app.setTool('cursor'); } }));
        this.chip.append(h('button', { class: 'mc-chip-x', html: ICON.close, 'aria-label': '그리기 끝내기', onclick: () => { const cc = c(); if (cc.creating) cc.cancelCreate(); if (cc.measure) { cc.measure = null; cc.invalidate(); } app.setTool('cursor'); } }));
      }
      this.renderFav();
    }
    renderFav() {
      const bar = this.favBar, app = this.app, T = TL(), c = app.active;
      if (!bar) return;
      bar.innerHTML = '';
      this.cbFav.classList.toggle('on', !!this.set.mFavBar);
      const hide = !this.set.mFavBar || !!(c && c.sel);
      bar.classList.toggle('hidden', hide);
      if (hide) return;
      const grip = h('span', { class: 'mf-grip', html: MI.vdots, 'aria-label': '막대 옮기기' });
      bar.append(grip);
      const favs = this.set.mFav.filter((t) => T[t]);
      for (const t of favs) bar.append(h('button', { class: 'mf-b' + (app.tool === t ? ' on' : ''), html: ICON[t] || '', 'aria-label': T[t].name, title: T[t].name, onclick: () => app.setTool(app.tool === t ? 'cursor' : t) }));
      if (!favs.length) bar.append(h('span', { class: 'mf-empty', text: '연필 → 도구의 ☆로 추가' }));
      this.bindFavDrag(grip);
      this.placeFav();
    }
    placeFav() {
      const bar = this.favBar, P = this.set.mFavPos;
      if (!bar || !this.center) return;
      if (!P) { bar.style.left = ''; bar.style.top = ''; bar.style.bottom = ''; return; }
      const C = this.center.getBoundingClientRect();
      if (!C.width) return;
      bar.style.bottom = 'auto';
      bar.style.left = U.clamp(P.fx * C.width, 4, Math.max(4, C.width - bar.offsetWidth - 4)) + 'px';
      bar.style.top = U.clamp(P.fy * C.height, 4, Math.max(4, C.height - bar.offsetHeight - 30)) + 'px';
    }
    bindFavDrag(grip) {
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const bar = this.favBar, C = this.center.getBoundingClientRect(), B = bar.getBoundingClientRect();
        const dx = e.clientX - B.left, dy = e.clientY - B.top;
        try { grip.setPointerCapture(e.pointerId); } catch (er) {}
        const mv = (ev) => {
          const x = U.clamp(ev.clientX - C.left - dx, 4, C.width - B.width - 4), y = U.clamp(ev.clientY - C.top - dy, 4, C.height - B.height - 30);
          bar.style.bottom = 'auto'; bar.style.left = x + 'px'; bar.style.top = y + 'px';
          this.set.mFavPos = { fx: x / C.width, fy: y / C.height };
        };
        const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); this.app.saveSet(); };
        grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
      });
    }
    ivSheet() {
      const app = this.app, c = app.active, body = h('div', { class: 'iv' });
      let S = null;
      for (const [gn, ivs] of IV_GROUPS) {
        body.append(h('div', { class: 'ms-sub', text: gn }));
        const g = h('div', { class: 'iv-grid' });
        for (const iv of ivs) {
          const ok = Data.supports(c.src, iv, c.sym);
          g.append(h('button', { class: 'iv-b' + (c.iv === iv ? ' on' : ''), disabled: !ok, text: IVN(iv), onclick: () => { S.close(); if (c.iv !== iv) app.setIv(iv); } }));
        }
        body.append(g);
      }
      S = this.sheet({ title: '주기', body });
    }
    typeSheet() {
      const app = this.app, c = app.active;
      this.menuSheet('차트 유형', CHART_TYPES.map(([k, n]) => ({ icon: ICON[k], n, check: c.type === k, fn: () => { c.type = k; c._ha = null; c.invalidate(); app.saveSlot(c); app.refreshTop(); } })));
    }
    chartMenu() {
      const app = this.app, c = app.active, inL = this.wl.has(c.src, c.sym);
      const tn = (CHART_TYPES.find((x) => x[0] === c.type) || CHART_TYPES[0])[1];
      this.menuSheet(CL.tickOf(c.src, c.sym) + ' · ' + IVN(c.iv), [
        { icon: ICON.ind, n: '지표', sub: c.inds.length ? c.inds.length + '개' : '', more: true, fn: () => app.openIndicators(c) },
        { icon: ICON[c.type] || ICON.candle, n: '차트 유형', sub: tn, more: true, fn: () => this.typeSheet() },
        { icon: MI.alarm, n: '가격 알림 추가', fn: () => app.openAlertDialog(c) },
        { icon: ICON.replay, n: c.replay ? '리플레이 끝내기' : '바 리플레이', fn: () => app.startReplaySelect(c) },
        { icon: inL ? MI.starOn : MI.star, n: inL ? '관심종목에서 빼기' : '관심종목에 추가', fn: () => this.toggleWatch(c.src, c.sym, c.dispName()) },
        '-',
        { icon: MI.log, n: '로그 스케일', check: !!c.ps.main.log, fn: () => c.toggleLog() },
        { icon: MI.auto, n: '자동 스케일', check: !!c.ps.main.auto, fn: () => c.toggleAuto() },
        { icon: MI.reset, n: '차트 초기화', fn: () => { for (const k in c.ps) c.ps[k].auto = true; c.view.s = 8; c.fit(); c.invalidate(); } },
        '-',
        { icon: ICON.tree, n: '객체 트리 (지표·드로잉 목록)', more: true, fn: () => this.treeSheet() },
        { icon: ICON.camera, n: '스크린샷 저장', fn: () => app.screenshot(c) },
        { icon: ICON.gear, n: '설정', fn: () => app.openSettings() },
        { icon: MI.desktop, n: 'PC 화면으로 보기', fn: () => this.switchUI('desktop') },
      ]);
    }
    treeSheet() {
      const app = this.app, c = app.active, T = TL(), IND = CL.IND, box = h('div', { class: 'mt' });
      const S = this.sheet({ title: '객체 트리', body: box });
      const render = () => {
        box.innerHTML = '';
        box.append(h('div', { class: 'ms-sub', text: '지표 (' + c.inds.length + ')' }));
        if (!c.inds.length) box.append(h('div', { class: 'md-load', text: '지표가 없습니다' }));
        for (const ind of c.inds) {
          box.append(h('div', { class: 'mt-row' }, h('span', { class: 'mt-ic', html: ICON.ind }), h('span', { class: 'mt-n', text: IND[ind.type].label(ind.inp) }),
            h('button', { class: 'mt-b', html: ind.hidden ? ICON.eyeOff : ICON.eye, 'aria-label': '보이기/숨기기', onclick: () => { c.toggleInd(ind); render(); } }),
            h('button', { class: 'mt-b', html: ICON.gear, 'aria-label': '설정', onclick: () => app.openIndSettings(c, ind) }),
            h('button', { class: 'mt-b del', html: ICON.trash, 'aria-label': '삭제', onclick: () => { c.removeInd(ind.id); render(); } })));
        }
        box.append(h('div', { class: 'ms-sub', text: '드로잉 (' + c.drawings.length + ')' }));
        if (!c.drawings.length) box.append(h('div', { class: 'md-load', text: '드로잉이 없습니다' }));
        c.drawings.slice().reverse().forEach((d) => {
          const t = T[d.type];
          if (!t) return;
          box.append(h('div', { class: 'mt-row' + (c.sel === d ? ' on' : '') },
            h('button', { class: 'mt-main', onclick: () => { d.hidden = false; S.close(); c.select(d); c.commit(); } },
              h('span', { class: 'mt-ic', html: ICON[d.type] || '' }), h('span', { class: 'mt-n', text: t.name + (d.s.text ? ' “' + String(d.s.text).slice(0, 12) + '”' : '') })),
            h('button', { class: 'mt-b', html: d.hidden ? ICON.eyeOff : ICON.eye, 'aria-label': '보이기/숨기기', onclick: () => { d.hidden = !d.hidden; if (d.hidden && c.sel === d) c.select(null); c.commit(); c.invalidate(); render(); } }),
            h('button', { class: 'mt-b', html: d.locked ? ICON.lock : ICON.unlock, 'aria-label': '잠금', onclick: () => { d.locked = !d.locked; c.commit(); render(); } }),
            h('button', { class: 'mt-b del', html: ICON.trash, 'aria-label': '삭제', onclick: () => { c.removeDrawing(d); render(); } })));
        });
      };
      render();
    }

    /* ================= 드로잉 시트 (트레이딩뷰 앱처럼: 찾기 + 분류 탭 + 카드) ================= */
    drawSheet() {
      const app = this.app, set = this.set, T = TL();
      let tab = this._dTab || 'tools', q = '';
      const inp = h('input', { class: 'ds-in', type: 'search', placeholder: '찾기', enterkeyhint: 'search', autocomplete: 'off' });
      const tabs = h('div', { class: 'ds-tabs' });
      const body = h('div', { class: 'ds-body' });
      const S = this.sheet({ title: '드로잉', cls: 'ms-draw', body: h('div', { class: 'ds' }, h('label', { class: 'ds-search' }, h('span', { html: MI.search }), inp), tabs, body) });
      const c = () => app.active;
      const pick = (t) => { S.close(); app.setTool(t); };
      const star = (t) => {
        const on = set.mFav.includes(t);
        return h('button', {
          class: 'ds-star' + (on ? ' on' : ''), html: on ? MI.starOn : MI.star, 'aria-label': on ? '즐겨찾기에서 빼기' : '즐겨찾기에 추가',
          onclick: (e) => {
            e.stopPropagation();
            const i = set.mFav.indexOf(t);
            if (i >= 0) set.mFav.splice(i, 1); else set.mFav.push(t);
            app.saveSet(); this.renderFav();
            const now = set.mFav.includes(t), b = e.currentTarget;
            b.classList.toggle('on', now); b.innerHTML = now ? MI.starOn : MI.star;
            U.toast(T[t].name + (now ? ' — 즐겨찾기 막대에 추가' : ' — 즐겨찾기에서 뺌'), '', 1300);
          },
        });
      };
      const toolCard = (t) => h('div', { class: 'ds-card' + (app.tool === t ? ' on' : ''), role: 'button', onclick: () => pick(t) },
        h('span', { class: 'ds-ic', html: ICON[t] || '' }), h('span', { class: 'ds-n', text: T[t].name }), star(t));
      const actCard = (o) => h('div', {
        class: 'ds-card' + (o.fill ? ' fill' : '') + (o.on ? ' on' : '') + (o.more ? ' has-more' : '') + (o.dis ? ' dis' : ''), role: 'button',
        onclick: () => { if (!o.dis) o.fn(); },
      }, h('span', { class: 'ds-ic', html: o.icon || '' }), h('span', { class: 'ds-n', text: o.n }),
      o.more ? h('button', { class: 'ds-more', html: MI.vdots, 'aria-label': '옵션', onclick: (e) => { e.stopPropagation(); o.more(); } }) : null);
      const redraw = () => app.charts.forEach((x) => x.invalidate());
      const actions = () => [
        { icon: ICON.measure, n: '측정', fill: true, on: app.tool === 'measure', fn: () => pick('measure') },
        { icon: ICON.eraser, n: '지우개', fill: true, on: app.tool === 'eraser', fn: () => pick('eraser') },
        { icon: ICON.stay, n: '계속 그리기', on: !!set.stayDraw, fn: () => { set.stayDraw = !set.stayDraw; app.saveSet(); U.toast(set.stayDraw ? '계속 그리기 켬 — 그린 뒤에도 도구가 유지됩니다' : '계속 그리기 끔', '', 1600); render(); } },
        {
          icon: set.hideAll ? ICON.eyeOff : ICON.eye, n: set.hideAll ? '드로잉 보이기' : '드로잉 숨기기', on: !!set.hideAll,
          fn: () => { set.hideAll = !set.hideAll; app.saveSet(); redraw(); render(); },
          more: () => this.menuSheet('숨기기', [
            { icon: ICON.eyeOff, n: '모든 드로잉 숨기기', check: !!set.hideAll, fn: () => { set.hideAll = true; app.saveSet(); redraw(); } },
            { icon: ICON.eye, n: '숨긴 드로잉 모두 보이기', fn: () => { set.hideAll = false; app.saveSet(); const cc = c(); cc.drawings.forEach((d) => (d.hidden = false)); cc.commit(); redraw(); } },
            { icon: ICON.ind, n: '지표 모두 숨기기 / 보이기', fn: () => { const cc = c(), any = cc.inds.some((x) => !x.hidden); cc.inds.forEach((x) => (x.hidden = any)); cc.buildLegend(); cc.commit(); cc.invalidate(); } },
          ], render),
        },
        { icon: set.lockAll ? ICON.lock : ICON.unlock, n: set.lockAll ? '드로잉 잠금 풀기' : '모든 드로잉 잠금', on: !!set.lockAll, fn: () => { set.lockAll = !set.lockAll; app.saveSet(); render(); } },
        {
          icon: ICON.magnet, n: set.magnet === 2 ? '강한 자석' : set.magnet === 1 ? '약한 자석' : '자석 꺼짐', on: !!set.magnet,
          fn: () => { set.magnet = set.magnet ? 0 : 1; app.saveSet(); render(); },
          more: () => this.menuSheet('자석', [
            { icon: ICON.magnet, n: '약한 자석 (가까우면 시·고·저·종에 붙음)', check: set.magnet === 1, fn: () => { set.magnet = 1; app.saveSet(); } },
            { icon: ICON.magnet, n: '강한 자석 (항상 붙음)', check: set.magnet === 2, fn: () => { set.magnet = 2; app.saveSet(); } },
            { icon: ICON.close, n: '자석 끄기', check: !set.magnet, fn: () => { set.magnet = 0; app.saveSet(); } },
          ], render),
        },
        {
          icon: ICON.trash, n: '모든 드로잉 제거', fn: () => app.confirm('이 종목의 드로잉을 모두 지울까요? (되돌리기 가능)', () => c().removeAllDrawings()),
          more: () => this.menuSheet('제거', [
            { icon: ICON.trash, n: '이 종목 드로잉 모두 제거', danger: true, fn: () => app.confirm('이 종목의 드로잉을 모두 지울까요? (되돌리기 가능)', () => c().removeAllDrawings()) },
            { icon: ICON.trash, n: '지표 모두 제거', danger: true, fn: () => app.confirm('이 차트의 지표를 모두 지울까요?', () => { const cc = c(); cc.inds.slice().forEach((x) => cc.removeInd(x.id)); }) },
          ]),
        },
        { icon: ICON.zoom, n: '확대 (영역 선택)', on: app.tool === 'zoom', fn: () => pick('zoom') },
        { icon: MI.zoomOut, n: '축소 (확대 되돌리기)', dis: !(c().zoomHist && c().zoomHist.length), fn: () => { c().zoomBack(); render(); } },
      ];
      const emojiCard = () => actCard({ icon: ICON.emoji, n: '이모지 · 아이콘', fn: () => {
        const g = h('div', { class: 'ds-emo' });
        let E2 = null;
        for (const em of CL.EMOJIS) g.append(h('button', { class: 'ds-emo-b', text: em, onclick: () => { app.emojiPick = em; E2.close(); S.close(); app.setTool('emoji'); } }));
        E2 = this.sheet({ title: '이모지', body: g });
      } });
      const render = () => {
        tabs.querySelectorAll('.ds-tab').forEach((b) => b.classList.toggle('on', !q && b.dataset.k === tab));
        body.innerHTML = '';
        if (q) {
          const ql = q.toLowerCase(), grid = h('div', { class: 'ds-grid' });
          for (const o of actions()) if (o.n.toLowerCase().includes(ql)) grid.append(actCard(o));
          for (const g of CL.TOOLGROUPS) for (const t of g.tools) if (t[0] !== '|' && t[0] !== '@' && T[t] && (T[t].name + ' ' + t).toLowerCase().includes(ql)) grid.append(toolCard(t));
          body.append(grid.children.length ? grid : h('div', { class: 'ds-empty', text: '"' + q + '"에 맞는 도구가 없습니다' }));
          return;
        }
        if (tab === 'tools') { const grid = h('div', { class: 'ds-grid' }); for (const o of actions()) grid.append(actCard(o)); body.append(grid); return; }
        const g = CL.TOOLGROUPS.find((x) => x.id === tab);
        if (!g) return;
        let cur = null;
        for (const t of g.tools) {
          if (t[0] === '|' || !cur) { cur = h('div', { class: 'ds-grid' }); if (t[0] === '|') body.append(h('div', { class: 'ds-sub', text: t.slice(1) })); body.append(cur); if (t[0] === '|') continue; }
          if (t[0] === '@') {
            const k = t.slice(1), IND = CL.IND;
            cur.append(actCard({ icon: ICON[k] || '', n: IND[k].name + ' (지표)', fn: () => { S.close(); app.active.addInd(k); U.toast(IND[k].short + ' 추가됨 · 범례를 탭하면 설정'); } }));
            continue;
          }
          if (T[t]) cur.append(toolCard(t));
        }
        if (tab === 'text' && cur) cur.append(emojiCard());
        body.append(h('div', { class: 'ds-hint', text: '☆를 누르면 차트 아래 즐겨찾기 막대에 들어갑니다' }));
      };
      for (const [k, n] of [['tools', '툴']].concat(CL.TOOLGROUPS.map((g) => [g.id, GSHORT[g.id] || g.name]))) {
        tabs.append(h('button', { class: 'ds-tab', 'data-k': k, text: n, onclick: () => { tab = k; this._dTab = k; q = ''; inp.value = ''; render(); body.scrollTop = 0; } }));
      }
      inp.addEventListener('input', () => { q = inp.value.trim(); render(); });
      render();
      const on = tabs.querySelector('.ds-tab.on');
      if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }

  CL.Mobile = Mobile;
  CL.MobileArea = Area;
})();
