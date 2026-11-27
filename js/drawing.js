/* TradingHyun — drawing.js : 드로잉 프레임워크 (그리기 기록기 Gfx, 적중 판정, 생성·편집 상호작용) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U, DASH = CL.DASH, Chart = CL.Chart;
  const FONT = CL.FONT;
  const TT = () => CL.TOOLS;

  /* ================= 그리기 + 적중영역 기록기 ================= */
  class Gfx {
    constructor(ch) { this.ch = ch; this.ctx = ch.ctx; }
    begin(d, p, C) { this.d = d; this.p = p; this.C = C; this.hits = []; d._hits = this.hits; this.hl = d === this.ch.sel || d === this.ch.hov; }
    _stroke(o) {
      const ctx = this.ctx;
      ctx.strokeStyle = o.c || '#2962ff';
      ctx.lineWidth = o.w || 1;
      ctx.setLineDash(DASH(o.ls || 0, o.w));
      ctx.lineCap = o.cap || (o.ls === 2 ? 'round' : 'butt');
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
    }
    line(x1, y1, x2, y2, o) {
      o = o || {};
      if (![x1, y1, x2, y2].every(isFinite)) return;
      if (o.extL || o.extR) [x1, y1, x2, y2] = U.ext(x1, y1, x2, y2, o.extL, o.extR);
      const ctx = this.ctx;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      this._stroke(o);
      if (o.arrowE) this.arrowHead(x1, y1, x2, y2, o);
      if (o.arrowS) this.arrowHead(x2, y2, x1, y1, o);
      if (o.hit !== false) this.hits.push({ k: 's', a: [x1, y1, x2, y2] });
    }
    hline(y, o) { this.line(0, y, this.ch.plotW, y, o); }
    vline(x, o) { this.line(x, this.p.top, x, this.p.top + this.p.h, o); }
    poly(pts, o) {
      o = o || {};
      if (!pts || pts.length < 2) return;
      for (const q of pts) if (!isFinite(q.x) || !isFinite(q.y)) return;
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (o.close) ctx.closePath();
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (!o.noStroke) this._stroke(o);
      if (o.arrowE && pts.length > 1) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; this.arrowHead(a.x, a.y, b.x, b.y, o); }
      if (o.hit !== false) this.hits.push({ k: 'p', pts: pts.map((q) => ({ x: q.x, y: q.y })), close: !!o.close, fill: !!o.fill && o.hitFill !== false });
    }
    rect(x, y, w, h, o) {
      this.poly([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], Object.assign({ close: true }, o));
    }
    circle(cx, cy, r, o) {
      o = o || {};
      if (!isFinite(cx) || !isFinite(cy) || !isFinite(r)) return;
      const ctx = this.ctx;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (!o.noStroke) this._stroke(o);
      if (o.hit !== false) this.hits.push({ k: 'c', cx, cy, r, fill: !!o.fill });
    }
    ellipse(cx, cy, rx, ry, rot, o) {
      o = o || {};
      if (![cx, cy, rx, ry].every(isFinite)) return;
      const ctx = this.ctx;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, Math.abs(rx)), Math.max(0.1, Math.abs(ry)), rot || 0, 0, Math.PI * 2);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (!o.noStroke) this._stroke(o);
      if (o.hit !== false) this.hits.push({ k: 'e', cx, cy, rx: Math.abs(rx), ry: Math.abs(ry), rot: rot || 0, fill: !!o.fill });
    }
    arc(cx, cy, r, a0, a1, o, ccw) {
      o = o || {};
      if (![cx, cy, r, a0, a1].every(isFinite)) return;
      const ctx = this.ctx;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), a0, a1, !!ccw);
      if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
      if (!o.noStroke) this._stroke(o);
      if (o.hit !== false) {
        const pts = [];
        let span = a1 - a0;
        if (ccw) span = -((a0 - a1 + Math.PI * 4) % (Math.PI * 2) || Math.PI * 2); else span = (span + Math.PI * 4) % (Math.PI * 2) || Math.PI * 2;
        const N = 48;
        for (let k = 0; k <= N; k++) { const a = a0 + (span * k) / N; pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); }
        this.hits.push({ k: 'p', pts, close: false, fill: false });
      }
    }
    curve(pts, o) { this.poly(pts, Object.assign({}, o)); }
    arrowHead(x1, y1, x2, y2, o) {
      const ctx = this.ctx;
      const a = Math.atan2(y2 - y1, x2 - x1), sz = o.ah || Math.max(9, (o.w || 1) * 4);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - sz * Math.cos(a - 0.42), y2 - sz * Math.sin(a - 0.42));
      ctx.lineTo(x2 - sz * Math.cos(a + 0.42), y2 - sz * Math.sin(a + 0.42));
      ctx.closePath();
      ctx.fillStyle = o.c || '#2962ff';
      ctx.fill();
    }
    text(str, x, y, o) {
      o = o || {};
      str = str == null ? '' : String(str);
      if (!str || !isFinite(x) || !isFinite(y)) return null;
      const ctx = this.ctx, sz = o.size || 13;
      ctx.font = (o.italic ? 'italic ' : '') + (o.bold ? '600 ' : '') + sz + 'px ' + FONT;
      const lines = str.split('\n'), lh = Math.round(sz * 1.3);
      let w = 0;
      for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
      const pad = o.pad != null ? o.pad : o.bg || o.bd ? 5 : 0;
      const bw = w + pad * 2, bh = lines.length * lh + pad * 2 - (lh - sz) * 0.3;
      let bx = o.align === 'center' ? x - bw / 2 : o.align === 'right' ? x - bw : x;
      let by = o.base === 'middle' ? y - bh / 2 : o.base === 'bottom' ? y - bh : y;
      if (o.bg || o.bd) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, o.r != null ? o.r : 3); else ctx.rect(bx, by, bw, bh);
        if (o.bg) { ctx.fillStyle = o.bg; ctx.fill(); }
        if (o.bd) { ctx.strokeStyle = o.bd; ctx.lineWidth = 1; ctx.stroke(); }
      }
      ctx.fillStyle = o.c || '#d1d4dc';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      lines.forEach((l, k) => {
        const lw = ctx.measureText(l).width;
        const lx = o.tAlign === 'center' ? bx + pad + (w - lw) / 2 : o.tAlign === 'right' ? bx + pad + w - lw : bx + pad;
        ctx.fillText(l, lx, by + pad + k * lh + (lh - sz) * 0.15);
      });
      const box = { x: bx, y: by, w: bw, h: bh };
      if (o.hit !== false) this.hits.push({ k: 'b', x: bx, y: by, w: bw, h: bh });
      return box;
    }
    ptag(v, color) { this.ch.tags.push({ p: this.p, v, bg: color || '#2962ff', fg: '#fff', prio: 3 }); }
    ttag(t, color) { this.ch.ttags.push({ t, bg: color || '#2962ff' }); }
  }
  CL.Gfx = Gfx;

  function hitShapes(hits, x, y, tol) {
    for (const h of hits) {
      switch (h.k) {
        case 's': if (U.distSeg(x, y, h.a[0], h.a[1], h.a[2], h.a[3]) <= tol) return true; break;
        case 'p': {
          const P = h.pts;
          if (h.fill && h.close && U.pip(x, y, P)) return true;
          for (let i = 1; i < P.length; i++) if (U.distSeg(x, y, P[i - 1].x, P[i - 1].y, P[i].x, P[i].y) <= tol) return true;
          if (h.close && P.length > 2 && U.distSeg(x, y, P[P.length - 1].x, P[P.length - 1].y, P[0].x, P[0].y) <= tol) return true;
          break;
        }
        case 'c': { const d = Math.hypot(x - h.cx, y - h.cy); if (Math.abs(d - h.r) <= tol || (h.fill && d <= h.r)) return true; break; }
        case 'e': {
          const c = Math.cos(-h.rot), s = Math.sin(-h.rot), dx = x - h.cx, dy = y - h.cy;
          const rx = dx * c - dy * s, ry = dx * s + dy * c;
          const q = Math.sqrt((rx / h.rx) ** 2 + (ry / h.ry) ** 2);
          if (Math.abs(q - 1) * Math.min(h.rx, h.ry) <= tol || (h.fill && q <= 1)) return true;
          break;
        }
        case 'b': if (x >= h.x - 2 && x <= h.x + h.w + 2 && y >= h.y - 2 && y <= h.y + h.h + 2) return true; break;
      }
    }
    return false;
  }

  const P = Chart.prototype;

  /* 드로잉 도구용 좌표 컨텍스트 */
  P.dctx = function (p) {
    const ch = this;
    return {
      c: ch, p, bars: ch.bars, iv: ch.iv, prec: ch.prec, W: ch.plotW, top: p.top, h: p.h, s: ch.view.s, th: ch.th, set: ch.app.set,
      x: (i) => ch.i2x(i), y: (v) => ch.v2y(p, v), xt: (t) => ch.i2x(ch.t2i(t)), t2i: (t) => ch.t2i(t), i2t: (i) => ch.i2t(i),
      y2v: (y) => ch.y2v(p, y), x2i: (x) => ch.x2i(x), fp: (v) => ch.fmtP(p, v),
      lo: ch.y2v(p, p.top + p.h), hi: ch.y2v(p, p.top), ivMs: ch.ivMs,
    };
  };
  P.screenPts = function (d, p) {
    const T = TT()[d.type];
    if (T && T.screen) return d.pts.map((q) => ({ x: q.fx * this.plotW, y: p.top + q.fy * p.h }));
    return d.pts.map((q) => ({ x: this.i2x(this.t2i(q.t)), y: this.v2y(p, q.p) }));
  };
  P.screenPt = function (p, x, y) { return { fx: x / this.plotW, fy: (y - p.top) / p.h }; };
  P.ptAt = function (p, x, y, opt) {
    opt = opt || {};
    let i = this.x2i(x);
    if (!opt.free) i = Math.round(i);
    let v = this.y2v(p, y);
    const mag = opt.noMag ? 0 : this.app.magnetLevel(this.mods);
    if (mag && p.main && this.bars.length && !opt.free) {
      const bi = U.clamp(Math.round(i), 0, this.bars.length - 1);
      if (bi === Math.round(i)) {
        const b = this.bars[bi];
        let best = null, bd = Infinity;
        for (const q of [b.o, b.h, b.l, b.c]) { const dd = Math.abs(this.v2y(p, q) - y); if (dd < bd) { bd = dd; best = q; } }
        if (mag === 2 || bd < 24) v = best;
      }
    }
    return { t: this.i2t(i), p: v };
  };

  /* ================= 렌더 ================= */
  P.drawDrawings = function (p) {
    const T = TT();
    const g = this._gfx || (this._gfx = new Gfx(this));
    const C = this.dctx(p);
    const hideAll = this.app.set.hideAll;
    for (const d of this.drawings) {
      const tool = T[d.type];
      if (!tool) continue;
      if (d.hidden || hideAll) { d._hits = null; d._H = null; continue; }
      if (d.pane !== p.key) {
        if (tool.spanAll && this.pmap[d.pane] && d.pts[0]) {
          const x = this.i2x(this.t2i(d.pts[0].t));
          const ctx = this.ctx;
          ctx.beginPath(); ctx.moveTo(x, p.top); ctx.lineTo(x, p.top + p.h);
          ctx.strokeStyle = d.s.c; ctx.lineWidth = d.s.w || 1; ctx.setLineDash(DASH(d.s.ls, d.s.w)); ctx.stroke(); ctx.setLineDash([]);
        }
        continue;
      }
      const Pts = this.screenPts(d, p);
      g.begin(d, p, C);
      try { tool.draw(g, d, Pts, C); } catch (e) { console.error('드로잉 오류', d.type, e); }
      d._H = tool.handles ? tool.handles(d, Pts, C) : Pts;
    }
    if (this.measure && this.measure.p.key === p.key) {
      const m = this.measure;
      const md = { type: 'measure', s: { c: '#2962ff' }, pts: m.pts, temp: true };
      const Pts = this.screenPts(md, p);
      g.begin(md, p, C);
      try { T.measure.draw(g, md, Pts, C); } catch (e) { console.error(e); }
    }
    if (this.drag && this.drag.k === 'zoom' && this.drag.x1 != null && this.drag.p === p) {
      const d = this.drag, ctx = this.ctx;
      ctx.fillStyle = U.rgba('#2962ff', 0.12); ctx.strokeStyle = '#2962ff'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
      ctx.fillRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
      ctx.strokeRect(Math.min(d.x0, d.x1) + 0.5, Math.min(d.y0, d.y1) + 0.5, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
      ctx.setLineDash([]);
    }
    // 핸들
    const show = [];
    if (this.sel && this.sel.pane === p.key && !this.sel.hidden) show.push([this.sel, true]);
    if (this.hov && this.hov !== this.sel && this.hov.pane === p.key && !this.hov.hidden) show.push([this.hov, false]);
    if (this.creating && this.creating.d.pane === p.key && !TT()[this.creating.d.type].free) show.push([this.creating.d, true]);
    const ctx = this.ctx;
    for (const [d, strong] of show) {
      const H = d === (this.creating && this.creating.d) ? this.screenPts(d, p) : d._H;
      if (!H) continue;
      for (const h of H) {
        if (!isFinite(h.x) || !isFinite(h.y)) continue;
        ctx.beginPath(); ctx.arc(h.x, h.y, strong ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = this.th.hFill; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = d.locked ? '#787b86' : this.th.sel; ctx.stroke();
      }
    }
    // 선택 드로잉의 축 강조
    const s = this.sel;
    if (s && s.pane === p.key && !s.hidden && !T[s.type].screen && !T[s.type].noAxis && s.pts.length) {
      const ys = [], ts = [];
      for (const q of s.pts) { if (q.p != null && isFinite(q.p)) ys.push(this.v2y(p, q.p)); if (q.t != null) ts.push(q.t); }
      if (!T[s.type].noPriceAxis && ys.length) {
        this.selBand = { p, y0: Math.min(...ys), y1: Math.max(...ys) };
        const seen = new Set();
        for (const q of s.pts) { const k = this.fmtP(p, q.p); if (seen.has(k)) continue; seen.add(k); this.tags.push({ p, v: q.p, bg: this.th.sel, fg: '#fff', prio: 4 }); }
      }
      if (ts.length && !T[s.type].noTimeAxis) {
        const xs = ts.map((t) => this.i2x(this.t2i(t)));
        this.selTBand = { x0: Math.min(...xs), x1: Math.max(...xs) };
        const seen = new Set();
        for (const t of ts) { if (seen.has(t)) continue; seen.add(t); this.ttags.push({ t, bg: this.th.sel }); }
      }
    }
  };

  /* ================= 적중 판정 ================= */
  P.hitTest = function (x, y) {
    const tol = this._touch ? 14 : 6, htol = this._touch ? 22 : 8; // 손가락은 마우스보다 넉넉하게
    const pick = [this.sel, this.hov].filter((d) => d && d._H && !d.hidden && !this.app.set.hideAll);
    for (const d of pick) {
      for (let k = 0; k < d._H.length; k++) { const h = d._H[k]; if (Math.hypot(h.x - x, h.y - y) <= htol) return { d, handle: k }; }
    }
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      if (!d._hits || d.hidden || this.app.set.hideAll) continue;
      if (hitShapes(d._hits, x, y, tol)) return { d, handle: -1 };
    }
    return null;
  };
  P.select = function (d) {
    this.sel = d || null;
    this.app.onSelect(this, this.sel);
    this.invalidate();
  };

  /* ================= 생성 ================= */
  P.createStart = function (type, x, y, p) {
    const T = TT()[type];
    if (!T) return;
    if (T.mainOnly && !p.main) p = this.pmap.main;
    const d = { id: U.uid(), type, pane: p.key, pts: [], s: this.app.toolStyle(type), locked: false, hidden: false };
    const pt = T.screen ? this.screenPt(p, x, y) : this.ptAt(p, x, y, { free: T.free });
    if (T.n === 1) {
      d.pts = [pt];
      if (T.init) T.init(d, this.dctx(p));
      this.drawings.push(d);
      this.finishCreate(d);
      return;
    }
    d.pts = [pt, Object.assign({}, pt)];
    if (T.free) d.pts = [pt];
    this.drawings.push(d);
    this.creating = { d, p, placed: 1, x0: x, y0: y, moved: false, pressed: true, free: !!T.free };
    this.select(null);
    this.invalidate();
  };
  P.createMove = function (x, y) {
    const c = this.creating, T = TT()[c.d.type];
    const pt = T.screen ? this.screenPt(c.p, x, y) : this.ptAt(c.p, x, y, { free: T.free });
    if (c.free) {
      if (!c.pressed) return;
      const P0 = this.screenPts({ type: c.d.type, pts: [c.d.pts[c.d.pts.length - 1]] }, c.p)[0];
      if (Math.hypot(x - P0.x, y - P0.y) >= 2.5) c.d.pts.push(pt);
      return;
    }
    c.d.pts[c.d.pts.length - 1] = pt;
    if (this.mods.shift && c.d.pts.length >= 2 && !T.screen) c.d.pts[c.d.pts.length - 1].p = c.d.pts[c.d.pts.length - 2].p;
    if (Math.hypot(x - c.x0, y - c.y0) > 6) c.moved = true;
  };
  P.createUp = function (x, y) {
    const c = this.creating;
    if (!c) return;
    if (c.free) {
      this.creating = null;
      if (c.d.pts.length < 2) { this.drawings.splice(this.drawings.indexOf(c.d), 1); this.invalidate(); return; }
      this.finishCreate(c.d);
      return;
    }
    if (c.pressed && c.moved && c.placed === 1) { c.pressed = false; this.createClick(x, y); return; }
    c.pressed = false;
  };
  P.createClick = function (x, y) {
    const c = this.creating, T = TT()[c.d.type];
    const pt = T.screen ? this.screenPt(c.p, x, y) : this.ptAt(c.p, x, y, { free: T.free });
    const pts = c.d.pts;
    if (T.n === 0 && pts.length >= 2) {
      const prev = this.screenPts({ type: c.d.type, pts: [pts[pts.length - 2]] }, c.p)[0];
      if (Math.hypot(prev.x - x, prev.y - y) < 5) { this.createFinishMulti(); return; }
    }
    pts[pts.length - 1] = pt;
    if (this.mods.shift && pts.length >= 2 && !T.screen) pts[pts.length - 1].p = pts[pts.length - 2].p;
    c.placed++;
    if (T.n > 0 && c.placed >= T.n) { this.creating = null; this.finishCreate(c.d); return; }
    pts.push(Object.assign({}, pt));
    c.x0 = x; c.y0 = y; c.moved = false; c.pressed = true;
    this.invalidate();
  };
  P.createFinishMulti = function (cancelIfShort) {
    const c = this.creating;
    if (!c) return;
    const T = TT()[c.d.type];
    this.creating = null;
    if (T.n === 0) {
      c.d.pts.pop();
      if (c.d.pts.length >= (T.min || 2)) { this.finishCreate(c.d); return; }
    }
    this.drawings.splice(this.drawings.indexOf(c.d), 1);
    this.invalidate();
  };
  P.cancelCreate = function () {
    const c = this.creating;
    if (!c) return false;
    const T = TT()[c.d.type];
    if (T.n === 0 && c.d.pts.length > 2) { this.createFinishMulti(); return true; }
    this.creating = null;
    const k = this.drawings.indexOf(c.d);
    if (k >= 0) this.drawings.splice(k, 1);
    this.invalidate();
    return true;
  };
  P.finishCreate = function (d) {
    const T = TT()[d.type];
    const p = this.pmap[d.pane] || this.pmap.main;
    if (T.finish) T.finish(d, this.dctx(p));
    if (this.drawings.indexOf(d) < 0) this.drawings.push(d);
    this.select(d);
    this.commit();
    if (!this.app.set.stayDraw) this.app.setTool('cursor');
    if (T.text && T.askText !== false) setTimeout(() => this.app.editText(this, d, true), 30);
    this.invalidate();
  };

  /* ================= 편집 ================= */
  P.dragHandle = function (x, y) {
    const dr = this.drag, d = dr.d, T = TT()[d.type], p = this.pmap[d.pane];
    if (!p) return;
    const pt = T.screen ? this.screenPt(p, x, y) : this.ptAt(p, x, y, { free: T.free });
    if (this.mods.shift && !T.screen && d.pts.length >= 2) {
      const other = d.pts[dr.handle === 0 ? 1 : 0];
      if (other && other.p != null) pt.p = other.p;
    }
    if (T.onHandle) T.onHandle(d, dr.handle, pt, this.dctx(p), dr.orig);
    else if (dr.handle < d.pts.length) d.pts[dr.handle] = pt;
    dr.moved = true;
  };
  P.dragMove = function (x, y) {
    const dr = this.drag, d = dr.d, T = TT()[d.type], p = this.pmap[d.pane];
    if (!p) return;
    if (T.screen) {
      const dfx = (x - dr.x0) / this.plotW, dfy = (y - dr.y0) / p.h;
      d.pts = dr.orig.map((q) => ({ fx: q.fx + dfx, fy: q.fy + dfy }));
      dr.moved = true;
      return;
    }
    const di = T.free ? (x - dr.x0) / this.view.s : Math.round((x - dr.x0) / this.view.s);
    const dy = y - dr.y0;
    d.pts = dr.orig.map((q) => {
      const o = Object.assign({}, q);
      if (q.t != null) o.t = this.i2t(this.t2i(q.t) + di);
      if (q.p != null) o.p = this.y2v(p, this.v2y(p, q.p) + dy);
      return o;
    });
    if (Math.abs(x - dr.x0) > 1 || Math.abs(dy) > 1) dr.moved = true;
  };
  P.removeDrawing = function (d) {
    const k = this.drawings.indexOf(d);
    if (k < 0) return;
    this.drawings.splice(k, 1);
    if (this.sel === d) this.select(null);
    if (this.hov === d) this.hov = null;
    this.commit();
    this.invalidate();
  };
  P.cloneDrawing = function (d, noCommit) {
    const c = JSON.parse(JSON.stringify(d, (k, v) => (k[0] === '_' ? undefined : v)));
    c.id = U.uid();
    c.locked = false;
    if (!noCommit) {
      const p = this.pmap[d.pane] || this.pmap.main;
      const T = TT()[d.type];
      if (T.screen) c.pts = c.pts.map((q) => ({ fx: q.fx + 0.02, fy: q.fy + 0.03 }));
      else c.pts = c.pts.map((q) => Object.assign({}, q, q.t != null ? { t: this.i2t(this.t2i(q.t) + 3) } : {}, q.p != null ? { p: this.y2v(p, this.v2y(p, q.p) + 14) } : {}));
    }
    this.drawings.push(c);
    if (!noCommit) { this.select(c); this.commit(); }
    return c;
  };
  P.orderDrawing = function (d, dir) {
    const k = this.drawings.indexOf(d);
    if (k < 0) return;
    this.drawings.splice(k, 1);
    if (dir === 'front') this.drawings.push(d); else this.drawings.unshift(d);
    this.commit(); this.invalidate();
  };
  P.removeAllDrawings = function () { this.drawings = []; this.select(null); this.commit(); this.invalidate(); };

  /* ================= 가격 알림 선 ================= */
  P.drawAlerts = function (p) {
    const list = this.app.alertsFor ? this.app.alertsFor(this) : [];
    if (!list.length) return;
    const ctx = this.ctx;
    for (const a of list) {
      const y = Math.round(this.v2y(p, a.price)) + 0.5;
      if (!(y > p.top && y < p.top + p.h)) continue;
      const col = a.fired ? '#787b86' : '#ff9800';
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.plotW, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '11px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = col;
      ctx.fillText('🔔 ' + (a.msg || '알림') + (a.fired ? ' (울림)' : ''), this.plotW - 6, y - 2);
      this.tags.push({ p, v: a.price, bg: col, fg: '#fff', prio: 2 });
    }
  };
})();
