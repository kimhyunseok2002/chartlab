/* TradingHyun — tools.js : 드로잉 도구 정의 (선·피치포크·피보나치·간·패턴·엘리엇·사이클·예측/측정·도형·주석) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U, TA = CL.TA;
  const T = (CL.TOOLS = {});

  /* ---------- 벡터/스타일 헬퍼 ---------- */
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  const len = (a) => Math.hypot(a.x, a.y);
  const unit = (a) => { const l = len(a); return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l }; };
  const far = (a, dir) => add(a, mul(unit(dir), 30000));
  const lst = (d, o) => Object.assign({ c: d.s.c, w: d.s.w, ls: d.s.ls }, o || {});
  const fillOf = (d, c) => (d.s.fill ? U.rgba(d.s.fc || c || d.s.c, d.s.fa != null ? d.s.fa : 0.2) : null);
  const fl = (v) => { const s = (+v).toFixed(3); return s.replace(/\.?0+$/, ''); };
  const L = (arr) => arr.map((x) => ({ v: x[0], c: x[1], on: x[2] !== false }));
  const ray = (g, a, dir, o) => { const f = far(a, dir); g.line(a.x, a.y, f.x, f.y, o); };
  const txtSt = (d, o) => Object.assign({ c: d.s.tc || d.s.c, size: d.s.fs || 13, bold: d.s.bold, italic: d.s.italic }, o || {});
  function textRot(g, str, x, y, ang, o) {
    const ctx = g.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const b = g.text(str, 0, 0, Object.assign({}, o, { hit: false }));
    ctx.restore();
    if (b) g.hits.push({ k: 'c', cx: x, cy: y, r: Math.max(6, Math.min(b.w, b.h) / 2), fill: true });
  }
  function lineText(g, d, a, b) {
    if (!d.s.text) return;
    let ang = Math.atan2(b.y - a.y, b.x - a.x);
    let A = a, B = b;
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) { ang += Math.PI; A = b; B = a; }
    const pos = d.s.tpos || 'center';
    const p = pos === 'left' ? A : pos === 'right' ? B : mid(A, B);
    textRot(g, d.s.text, p.x, p.y, ang, txtSt(d, { align: pos === 'left' ? 'left' : pos === 'right' ? 'right' : 'center', base: 'bottom', pad: 3 }));
  }
  function isPeak(P, i) {
    const y = P[i].y;
    const ys = [];
    if (i > 0) ys.push(P[i - 1].y);
    if (i < P.length - 1) ys.push(P[i + 1].y);
    if (!ys.length) return true;
    return y <= Math.min(...ys);
  }
  function ptLabel(g, d, P, i, txt, o) {
    if (!txt || !P[i]) return;
    const up = isPeak(P, i);
    g.text(txt, P[i].x, P[i].y + (up ? -7 : 7), Object.assign({ align: 'center', base: up ? 'bottom' : 'top', c: '#fff', bg: d.s.c, size: 12, bold: true, pad: 3, hit: false }, o));
  }
  function ratioLine(g, A, B, txt, d) {
    if (!A || !B) return;
    g.line(A.x, A.y, B.x, B.y, { c: d.s.c, w: 1, ls: 1 });
    if (txt) { const m = mid(A, B); g.text(txt, m.x, m.y, { align: 'center', base: 'middle', c: '#fff', bg: U.rgba(d.s.c, 0.85), size: 11, pad: 3, hit: false }); }
  }
  const rt = (a, b, c, e) => { const x = Math.abs(b - a), y = Math.abs(e - c); return x ? fl(y / x) : '—'; };
  function statsText(d, C, i0, i1) {
    const p0 = d.pts[i0 || 0], p1 = d.pts[i1 || 1];
    const dp = p1.p - p0.p, pct = p0.p ? (dp / Math.abs(p0.p)) * 100 : 0;
    const bars = Math.round(C.t2i(p1.t) - C.t2i(p0.t));
    return (dp >= 0 ? '+' : '') + C.fp(dp) + ' (' + U.fmtPct(pct) + ')\n' + bars + '봉, ' + U.fmtDur(p1.t - p0.t);
  }
  function lvlLabel(g, d, l, price, x, y, C, side) {
    if (!d.s.labels) return;
    const t = fl(l.v) + (d.s.prices ? ' (' + C.fp(price) + ')' : '');
    g.text(t, x, y, { align: side === 'right' ? 'left' : 'right', base: 'middle', c: l.c, size: 11, hit: false });
  }
  function annulus(g, cx, cy, r1, r2, color, a0, a1) {
    const ctx = g.ctx;
    ctx.beginPath();
    if (a0 == null) { ctx.arc(cx, cy, Math.max(0, r2), 0, Math.PI * 2); ctx.arc(cx, cy, Math.max(0, r1), 0, Math.PI * 2, true); }
    else { ctx.arc(cx, cy, Math.max(0, r2), a0, a1); ctx.arc(cx, cy, Math.max(0, r1), a1, a0, true); ctx.closePath(); }
    ctx.fillStyle = color; ctx.fill();
  }
  function smoothPath(g, pts, o) {
    if (pts.length < 2) return;
    const ctx = g.ctx;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) { const m = mid(pts[i], pts[i + 1]); ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y); }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    if (o.fill) { ctx.closePath(); ctx.fillStyle = o.fill; ctx.fill(); }
    ctx.strokeStyle = o.c; ctx.lineWidth = o.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.setLineDash(CL.DASH(o.ls || 0, o.w)); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    g.hits.push({ k: 'p', pts: pts.map((q) => ({ x: q.x, y: q.y })), close: !!o.fill, fill: !!o.fill });
  }
  const bez2 = (a, c, b, t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  const bez3 = (a, c1, c2, b, t) => {
    const u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y };
  };

  /* ---------- 설정창 필드 사양 ---------- */
  const F = {
    line: { k: 'line' }, fill: { k: 'fill' }, ext: { k: 'ext' }, text: { k: 'text' }, textOnly: { k: 'textOnly' }, levels: { k: 'levels' },
    bool: (k, n) => ({ k, n, t: 'bool' }), num: (k, n, o) => Object.assign({ k, n, t: 'num' }, o || {}),
    sel: (k, n, o) => ({ k, n, t: 'sel', o }), color: (k, n) => ({ k, n, t: 'color' }), str: (k, n) => ({ k, n, t: 'str' }),
  };
  F.tpos = F.sel('tpos', '텍스트 위치', [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']]);
  F.lbl = [F.bool('labels', '레벨 라벨'), F.bool('prices', '가격 표시')];
  CL.F = F;

  /* 기본 스타일 */
  const D = (o) => Object.assign({ c: '#2962ff', w: 2, ls: 0, text: '', tc: null, fs: 13, bold: false, italic: false }, o);
  const FIB_COLORS = { 0: '#787b86', 0.236: '#f23645', 0.382: '#ff9800', 0.5: '#4caf50', 0.618: '#089981', 0.786: '#00bcd4', 1: '#787b86', 1.272: '#81c784', 1.414: '#f23645', 1.618: '#2962ff', 2: '#9c27b0', 2.618: '#f23645', 3.618: '#9c27b0', 4.236: '#e91e63' };
  const fibL = (vals, off) => vals.map((v) => ({ v, c: FIB_COLORS[v] || '#787b86', on: !(off || []).includes(v) }));
  const FORK_L = L([[0.25, '#ffb74d', false], [0.382, '#81c784', false], [0.5, '#4caf50'], [0.618, '#009688', false], [0.75, '#64b5f6', false], [1, '#2962ff'], [1.5, '#9575cd', false], [1.75, '#ba68c8', false], [2, '#e91e63', false]]);

  /* ===================== 선 ===================== */
  T.trendline = {
    name: '추세선', n: 2, key: 'Alt+T',
    defaults: D({ extL: false, extR: false, tpos: 'center', stats: false }),
    ui: [F.line, F.ext, F.text, F.tpos, F.bool('stats', '통계 표시')],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P;
      g.line(a.x, a.y, b.x, b.y, lst(d, { extL: d.s.extL, extR: d.s.extR }));
      lineText(g, d, a, b);
      if (d.s.stats && d.pts.length > 1) g.text(statsText(d, C), b.x + 8, b.y, { base: 'middle', c: '#fff', bg: U.rgba(d.s.c, 0.85), size: 11, pad: 5 });
    },
  };
  T.ray = Object.assign({}, T.trendline, {
    name: '레이(반직선)', key: '', defaults: D({ extR: true, extL: false, tpos: 'center' }), ui: [F.line, F.text, F.tpos],
    draw(g, d, P, C) { if (P.length < 2) return; g.line(P[0].x, P[0].y, P[1].x, P[1].y, lst(d, { extR: true })); lineText(g, d, P[0], P[1]); },
  });
  T.infoline = {
    name: '정보선', n: 2, defaults: D({ tpos: 'center' }), ui: [F.line, F.text, F.tpos],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P;
      g.line(a.x, a.y, b.x, b.y, lst(d));
      lineText(g, d, a, b);
      const ang = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
      g.text(statsText(d, C) + '\n∠ ' + ang.toFixed(1) + '°', b.x + 8, b.y + 8, { c: '#fff', bg: 'rgba(38,38,38,0.94)', size: 11, pad: 6 });
    },
  };
  T.extended = Object.assign({}, T.trendline, {
    name: '확장선', key: '', defaults: D({ tpos: 'center' }), ui: [F.line, F.text, F.tpos],
    draw(g, d, P) { if (P.length < 2) return; g.line(P[0].x, P[0].y, P[1].x, P[1].y, lst(d, { extL: true, extR: true })); lineText(g, d, P[0], P[1]); },
  });
  T.trendangle = {
    name: '추세 각도', n: 2, defaults: D({ extR: false }), ui: [F.line, F.bool('extR', '오른쪽 연장')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      g.line(a.x, a.y, b.x, b.y, lst(d, { extR: d.s.extR }));
      const L0 = Math.max(40, Math.abs(b.x - a.x) * 0.6), dir = b.x >= a.x ? 1 : -1;
      g.line(a.x, a.y, a.x + L0 * dir, a.y, { c: d.s.c, w: 1, ls: 1, hit: false });
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const base = dir > 0 ? 0 : Math.PI;
      const r = Math.min(30, L0 * 0.6);
      const ctx = g.ctx;
      ctx.beginPath(); ctx.arc(a.x, a.y, r, Math.min(base, ang), Math.max(base, ang)); ctx.strokeStyle = d.s.c; ctx.lineWidth = 1; ctx.stroke();
      const deg = (-ang * 180) / Math.PI;
      const shown = dir > 0 ? deg : (deg > 0 ? 180 - deg : -180 - deg);
      g.text(shown.toFixed(1) + '°', a.x + (r + 6) * dir, a.y + (b.y < a.y ? -12 : 12), { align: dir > 0 ? 'left' : 'right', base: 'middle', c: d.s.c, size: 12, hit: false });
    },
  };
  T.hline = {
    name: '수평선', n: 1, key: 'Alt+H', noTimeAxis: true,
    defaults: D({ w: 1, showPrice: true, tpos: 'right', tc: null }), ui: [F.line, F.bool('showPrice', '가격 라벨'), F.text, F.tpos],
    draw(g, d, P, C) {
      const y = P[0].y;
      g.hline(y, lst(d));
      if (d.s.showPrice) g.ptag(d.pts[0].p, d.s.c);
      if (d.s.text) {
        const pos = d.s.tpos || 'right';
        g.text(d.s.text, pos === 'left' ? 6 : pos === 'center' ? C.W / 2 : C.W - 6, y - 3, txtSt(d, { align: pos === 'left' ? 'left' : pos === 'center' ? 'center' : 'right', base: 'bottom' }));
      }
    },
    handles: (d, P, C) => [{ x: U.clamp(P[0].x, 30, C.W - 30), y: P[0].y }],
  };
  T.hray = {
    name: '수평 레이', n: 1, key: 'Alt+J', defaults: D({ w: 1, showPrice: true }), ui: [F.line, F.bool('showPrice', '가격 라벨'), F.text],
    draw(g, d, P) {
      const [a] = P;
      g.line(a.x, a.y, a.x + 30000, a.y, lst(d));
      if (d.s.showPrice) g.ptag(d.pts[0].p, d.s.c);
      if (d.s.text) g.text(d.s.text, a.x + 4, a.y - 3, txtSt(d, { base: 'bottom' }));
    },
  };
  T.vline = {
    name: '수직선', n: 1, key: 'Alt+V', spanAll: true, noPriceAxis: true,
    defaults: D({ w: 1, showTime: true }), ui: [F.line, F.bool('showTime', '시간 라벨'), F.text],
    draw(g, d, P, C) {
      const x = P[0].x;
      g.vline(x, lst(d));
      if (d.s.showTime) g.ttag(d.pts[0].t, d.s.c);
      if (d.s.text) textRot(g, d.s.text, x - 4, C.top + 10, -Math.PI / 2, txtSt(d, { align: 'right', base: 'bottom' }));
    },
    handles: (d, P, C) => [{ x: P[0].x, y: C.top + C.h / 2 }],
  };
  T.crossline = {
    name: '십자선', n: 1, key: 'Alt+C', spanAll: true, defaults: D({ w: 1 }), ui: [F.line],
    draw(g, d, P) { g.hline(P[0].y, lst(d)); g.vline(P[0].x, lst(d)); g.ptag(d.pts[0].p, d.s.c); g.ttag(d.pts[0].t, d.s.c); },
  };
  T.channel = {
    name: '평행 채널', n: 3, defaults: D({ w: 1, fill: true, fc: '#2962ff', fa: 0.12, mid: true, extL: false, extR: false }),
    ui: [F.line, F.fill, F.ext, F.bool('mid', '가운데 선')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, o = lst(d, { extL: d.s.extL, extR: d.s.extR });
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, o); return; }
      const c = P[2], dx = b.x - a.x;
      const off = Math.abs(dx) < 1e-6 ? c.y - a.y : c.y - (a.y + ((b.y - a.y) * (c.x - a.x)) / dx);
      const a2 = { x: a.x, y: a.y + off }, b2 = { x: b.x, y: b.y + off };
      const e1 = U.ext(a.x, a.y, b.x, b.y, d.s.extL, d.s.extR), e2 = U.ext(a2.x, a2.y, b2.x, b2.y, d.s.extL, d.s.extR);
      if (d.s.fill) g.poly([{ x: e1[0], y: e1[1] }, { x: e1[2], y: e1[3] }, { x: e2[2], y: e2[3] }, { x: e2[0], y: e2[1] }], { close: true, fill: fillOf(d), noStroke: true });
      g.line(a.x, a.y, b.x, b.y, o); g.line(a2.x, a2.y, b2.x, b2.y, o);
      if (d.s.mid) { const m1 = mid(a, a2), m2 = mid(b, b2); g.line(m1.x, m1.y, m2.x, m2.y, Object.assign({}, o, { w: 1, ls: 1 })); }
    },
  };
  T.regression = {
    name: '회귀 추세', n: 2, mainOnly: true, defaults: D({ w: 1, c: '#2962ff', c2: '#f23645', dev: 2, fill: true, fc: '#2962ff', fa: 0.08, extR: false, src: 'close' }),
    ui: [F.line, F.color('c2', '중앙선 색'), F.num('dev', '표준편차 배수', { step: 0.1 }), F.fill, F.bool('extR', '오른쪽 연장'), F.sel('src', '소스', [['close', '종가'], ['hl2', '(고+저)/2'], ['hlc3', '(고+저+종)/3']])],
    calc(d, C) {
      const b = C.bars, n = b.length;
      const i0 = Math.round(C.t2i(d.pts[0].t)), i1 = Math.round(C.t2i(d.pts[1].t));
      const lo = Math.max(0, Math.min(i0, i1)), hi = Math.min(n - 1, Math.max(i0, i1));
      if (hi - lo < 1) return null;
      const val = (x) => (d.s.src === 'hl2' ? (x.h + x.l) / 2 : d.s.src === 'hlc3' ? (x.h + x.l + x.c) / 3 : x.c);
      let N = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = lo; i <= hi; i++) { const x = i - lo, y = val(b[i]); N++; sx += x; sy += y; sxx += x * x; sxy += x * y; }
      const den = N * sxx - sx * sx;
      const k = den ? (N * sxy - sx * sy) / den : 0, c0 = (sy - k * sx) / N;
      let ss = 0;
      for (let i = lo; i <= hi; i++) { const r = val(b[i]) - (c0 + k * (i - lo)); ss += r * r; }
      return { lo, hi, k, c0, sd: Math.sqrt(ss / N) };
    },
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const r = this.calc(d, C);
      d._reg = r;
      if (!r) { g.line(P[0].x, P[0].y, P[1].x, P[1].y, lst(d, { ls: 1 })); return; }
      const f = (i, m) => r.c0 + r.k * (i - r.lo) + m * r.sd * d.s.dev;
      const xa = C.x(r.lo), xb = C.x(r.hi);
      const seg = (m) => { let x2 = xb, y2 = C.y(f(r.hi, m)); const y1 = C.y(f(r.lo, m)); if (d.s.extR) { const e = U.ext(xa, y1, x2, y2, false, true); x2 = e[2]; y2 = e[3]; } return [xa, y1, x2, y2]; };
      const u = seg(1), m0 = seg(0), l = seg(-1);
      if (d.s.fill) g.poly([{ x: u[0], y: u[1] }, { x: u[2], y: u[3] }, { x: l[2], y: l[3] }, { x: l[0], y: l[1] }], { close: true, fill: fillOf(d), noStroke: true });
      g.line(u[0], u[1], u[2], u[3], lst(d)); g.line(l[0], l[1], l[2], l[3], lst(d));
      g.line(m0[0], m0[1], m0[2], m0[3], { c: d.s.c2, w: d.s.w, ls: 1 });
    },
    handles(d, P, C) {
      const r = d._reg;
      if (!r) return P;
      const i0 = Math.round(C.t2i(d.pts[0].t)), i1 = Math.round(C.t2i(d.pts[1].t));
      const at = (i) => { const ii = U.clamp(i, r.lo, r.hi); return { x: C.x(i), y: C.y(r.c0 + r.k * (ii - r.lo)) }; };
      return [at(i0), at(i1)];
    },
  };
  T.flattop = {
    name: '평평한 상단/하단', n: 3, defaults: D({ w: 1, fill: true, fc: '#2962ff', fa: 0.12, extL: false, extR: false }), ui: [F.line, F.fill, F.ext],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const y = P[2].y;
      const e1 = U.ext(a.x, a.y, b.x, b.y, d.s.extL, d.s.extR), e2 = U.ext(a.x, y, b.x, y, d.s.extL, d.s.extR);
      if (d.s.fill) g.poly([{ x: e1[0], y: e1[1] }, { x: e1[2], y: e1[3] }, { x: e2[2], y: e2[3] }, { x: e2[0], y: e2[1] }], { close: true, fill: fillOf(d), noStroke: true });
      g.line(e1[0], e1[1], e1[2], e1[3], lst(d)); g.line(e2[0], e2[1], e2[2], e2[3], lst(d));
    },
    handles: (d, P) => (P.length < 3 ? P : [P[0], P[1], { x: P[0].x + (P[1].x - P[0].x) / 2, y: P[2].y }]),
    onHandle(d, k, pt) { if (k === 2) d.pts[2] = { t: d.pts[2].t, p: pt.p }; else d.pts[k] = pt; },
  };
  T.disjoint = {
    name: '분리 채널', n: 3, defaults: D({ w: 1, fill: true, fc: '#2962ff', fa: 0.12 }), ui: [F.line, F.fill],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      g.line(a.x, a.y, b.x, b.y, lst(d));
      if (P.length < 3) return;
      const c = P[2], c2 = { x: c.x + (b.x - a.x), y: c.y - (b.y - a.y) };
      if (d.s.fill) g.poly([a, b, c2, c], { close: true, fill: fillOf(d), noStroke: true });
      g.line(c.x, c.y, c2.x, c2.y, lst(d));
    },
  };

  /* ===================== 피치포크 ===================== */
  function forkDraw(variant) {
    return function (g, d, P) {
      if (P.length < 2) return;
      const [p1, p2] = P;
      if (P.length < 3) { g.line(p1.x, p1.y, p2.x, p2.y, lst(d)); return; }
      const p3 = P[2], M = mid(p2, p3);
      let O = p1;
      if (variant === 'schiff') O = { x: p1.x, y: (p1.y + p2.y) / 2 };
      else if (variant === 'mod') O = mid(p1, p2);
      const dir = sub(M, O);
      if (len(dir) < 1e-6) return;
      const lv = (d.s.levels || []).filter((l) => l.on).sort((a, b) => a.v - b.v);
      const at = (side, v) => add(M, mul(sub(side, M), v));
      if (d.s.fill) {
        let prevA = M, prevB = M;
        for (const l of lv) {
          const A = at(p2, l.v), B = at(p3, l.v), col = U.rgba(l.c, d.s.fa != null ? d.s.fa : 0.1);
          g.poly([prevA, far(prevA, dir), far(A, dir), A], { close: true, fill: col, noStroke: true, hit: false });
          g.poly([prevB, far(prevB, dir), far(B, dir), B], { close: true, fill: col, noStroke: true, hit: false });
          prevA = A; prevB = B;
        }
      }
      g.line(O.x, O.y, M.x, M.y, lst(d, { extR: true }));
      for (const l of lv) {
        const A = at(p2, l.v), B = at(p3, l.v), o = { c: l.c, w: d.s.w, ls: d.s.ls };
        ray(g, A, dir, o); ray(g, B, dir, o);
      }
      g.line(p2.x, p2.y, p3.x, p3.y, lst(d));
      if (O !== p1) g.line(p1.x, p1.y, O.x, O.y, lst(d, { ls: 1, w: 1 }));
    };
  }
  const forkBase = { n: 3, defaults: D({ c: '#f23645', w: 1, fill: true, fa: 0.1, levels: FORK_L }), ui: [F.line, F.fill, F.levels] };
  T.pitchfork = Object.assign({}, forkBase, { name: '앤드류 피치포크', draw: forkDraw('andrews') });
  T.schiff = Object.assign({}, forkBase, { name: '쉬프 피치포크', draw: forkDraw('schiff') });
  T.modschiff = Object.assign({}, forkBase, { name: '수정 쉬프 피치포크', draw: forkDraw('mod') });

  /* ===================== 피보나치 ===================== */
  const fibUI = [F.line, F.ext, F.levels, F.fill].concat(F.lbl, [F.sel('lpos', '라벨 위치', [['left', '왼쪽'], ['right', '오른쪽']]), F.bool('rev', '반전'), F.bool('trend', '추세선 표시')]);
  T.fibret = {
    name: '피보나치 되돌림', n: 2, key: 'Alt+F',
    defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.1, labels: true, prices: true, lpos: 'left', rev: false, trend: true, extL: false, extR: false, levels: fibL([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618, 4.236], [3.618, 4.236]) }),
    ui: fibUI,
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P, p0 = d.pts[0].p, p1 = d.pts[1].p;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      const X0 = d.s.extL ? -10 : x0, X1 = d.s.extR ? C.W + 10 : x1;
      const pr = (v) => (d.s.rev ? p0 + (p1 - p0) * v : p1 + (p0 - p1) * v);
      if (d.s.fill) for (let k = 0; k < lv.length - 1; k++) { const y1 = C.y(pr(lv[k].v)), y2 = C.y(pr(lv[k + 1].v)); g.rect(X0, y1, X1 - X0, y2 - y1, { fill: U.rgba(lv[k + 1].c, d.s.fa), noStroke: true, hit: false }); }
      const side = d.s.lpos === 'right' ? 'right' : 'left';
      for (const l of lv) {
        const price = pr(l.v), y = C.y(price);
        g.line(X0, y, X1, y, { c: l.c, w: d.s.w, ls: d.s.ls });
        const lx = side === 'right' ? X1 + 4 : X0 - 4;
        lvlLabel(g, d, l, price, side === 'left' && lx < 60 ? X0 + 60 : lx, y, C, side);
      }
      if (d.s.trend) g.line(a.x, a.y, b.x, b.y, { c: d.s.c, w: 1, ls: 1 });
    },
  };
  T.fibext = {
    name: '추세 기반 피보나치 확장', n: 3,
    defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.1, labels: true, prices: true, lpos: 'left', trend: true, extL: false, extR: false, levels: fibL([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236], [1.272, 1.414, 2, 3.618, 4.236]) }),
    ui: [F.line, F.ext, F.levels, F.fill].concat(F.lbl, [F.sel('lpos', '라벨 위치', [['left', '왼쪽'], ['right', '오른쪽']]), F.bool('trend', '추세선 표시')]),
    draw(g, d, P, C) {
      if (P.length < 2) return;
      if (d.s.trend) g.poly(P, { c: d.s.c, w: 1, ls: 1 });
      if (P.length < 3) return;
      const [a, b, c] = P, p0 = d.pts[0].p, p1 = d.pts[1].p, p2 = d.pts[2].p;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      const wdt = Math.max(40, Math.abs(b.x - a.x));
      const X0 = d.s.extL ? -10 : c.x, X1 = d.s.extR ? C.W + 10 : c.x + wdt;
      const pr = (v) => p2 + (p1 - p0) * v;
      if (d.s.fill) for (let k = 0; k < lv.length - 1; k++) { const y1 = C.y(pr(lv[k].v)), y2 = C.y(pr(lv[k + 1].v)); g.rect(X0, y1, X1 - X0, y2 - y1, { fill: U.rgba(lv[k + 1].c, d.s.fa), noStroke: true, hit: false }); }
      const side = d.s.lpos === 'right' ? 'right' : 'left';
      for (const l of lv) { const price = pr(l.v), y = C.y(price); g.line(X0, y, X1, y, { c: l.c, w: d.s.w, ls: d.s.ls }); lvlLabel(g, d, l, price, side === 'right' ? X1 + 4 : X0 - 4, y, C, side); }
    },
  };
  T.fibchannel = {
    name: '피보나치 채널', n: 3,
    defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.1, labels: true, extL: false, extR: false, levels: fibL([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618, 4.236], [3.618, 4.236]) }),
    ui: [F.line, F.ext, F.levels, F.fill, F.bool('labels', '레벨 라벨')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const c = P[2], dx = b.x - a.x;
      const off = Math.abs(dx) < 1e-6 ? c.y - a.y : c.y - (a.y + ((b.y - a.y) * (c.x - a.x)) / dx);
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      const segs = lv.map((l) => U.ext(a.x, a.y + off * l.v, b.x, b.y + off * l.v, d.s.extL, d.s.extR));
      if (d.s.fill) for (let k = 0; k < segs.length - 1; k++) {
        const s1 = segs[k], s2 = segs[k + 1];
        g.poly([{ x: s1[0], y: s1[1] }, { x: s1[2], y: s1[3] }, { x: s2[2], y: s2[3] }, { x: s2[0], y: s2[1] }], { close: true, fill: U.rgba(lv[k + 1].c, d.s.fa), noStroke: true, hit: false });
      }
      lv.forEach((l, k) => {
        const s = segs[k];
        g.line(s[0], s[1], s[2], s[3], { c: l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) g.text(fl(l.v), Math.min(a.x, b.x) - 4, (a.x < b.x ? a.y : b.y) + off * l.v, { align: 'right', base: 'middle', c: l.c, size: 11, hit: false });
      });
    },
  };
  T.fibtime = {
    name: '피보나치 시간대', n: 2, noPriceAxis: true,
    defaults: D({ w: 1, labels: true, levels: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233].map((v, i) => ({ v, c: ['#787b86', '#2962ff', '#2962ff', '#4caf50', '#4caf50', '#089981', '#ff9800', '#f23645', '#9c27b0', '#2962ff', '#4caf50', '#ff9800', '#f23645'][i], on: true })) }),
    ui: [F.line, F.levels, F.bool('labels', '레벨 라벨')],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const i0 = C.t2i(d.pts[0].t), di = C.t2i(d.pts[1].t) - i0;
      if (Math.abs(di) < 0.5) { g.vline(P[0].x, lst(d)); return; }
      for (const l of d.s.levels) {
        if (!l.on) continue;
        const x = C.x(i0 + di * l.v);
        if (x < -50 || x > C.W + 50) continue;
        g.line(x, C.top, x, C.top + C.h, { c: l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) g.text(String(l.v), x + 3, C.top + C.h - 4, { base: 'bottom', c: l.c, size: 11, hit: false });
      }
      g.line(P[0].x, P[0].y, P[1].x, P[1].y, { c: d.s.c, w: 1, ls: 1, hit: false });
    },
  };
  T.fibfan = {
    name: '피보나치 속도저항 팬', n: 2,
    defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.06, labels: true, grid: true, levels: fibL([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1]).map((l) => Object.assign(l, { c: { 0: '#787b86', 0.25: '#f23645', 0.382: '#ff9800', 0.5: '#4caf50', 0.618: '#089981', 0.75: '#2962ff', 1: '#787b86' }[l.v] })) }),
    ui: [F.line, F.levels, F.fill, F.bool('labels', '레벨 라벨'), F.bool('grid', '격자')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      const pP = (v) => ({ x: b.x, y: b.y + (a.y - b.y) * v }), pT = (v) => ({ x: b.x + (a.x - b.x) * v, y: b.y });
      if (d.s.grid) for (const l of lv) {
        const q = pP(l.v), r = pT(l.v);
        g.line(a.x, q.y, b.x, q.y, { c: U.rgba(l.c, 0.5), w: 1, hit: false });
        g.line(r.x, a.y, r.x, b.y, { c: U.rgba(l.c, 0.5), w: 1, hit: false });
      }
      if (d.s.fill) for (let k = 0; k < lv.length - 1; k++) {
        const q1 = pP(lv[k].v), q2 = pP(lv[k + 1].v);
        g.poly([a, far(a, sub(q1, a)), far(a, sub(q2, a))], { close: true, fill: U.rgba(lv[k + 1].c, d.s.fa), noStroke: true, hit: false });
      }
      for (const l of lv) {
        const q = pP(l.v), r = pT(l.v);
        ray(g, a, sub(q, a), { c: l.c, w: d.s.w, ls: d.s.ls });
        if (l.v > 0 && l.v < 1) ray(g, a, sub(r, a), { c: l.c, w: d.s.w, ls: 1 });
        if (d.s.labels) g.text(fl(l.v), b.x + 4, q.y, { base: 'middle', c: l.c, size: 11, hit: false });
      }
    },
  };
  T.fibtrendtime = {
    name: '추세 기반 피보나치 시간', n: 3, noPriceAxis: true,
    defaults: D({ c: '#787b86', w: 1, labels: true, levels: fibL([0, 0.382, 0.5, 0.618, 1, 1.382, 1.618, 2, 2.382, 2.618, 3, 3.618, 4.236], [2.382, 3, 3.618, 4.236]).map((l, i) => Object.assign(l, { c: ['#787b86', '#f23645', '#ff9800', '#4caf50', '#089981', '#00bcd4', '#2962ff', '#9c27b0', '#e91e63', '#f23645', '#ff9800', '#4caf50', '#2962ff'][i] })) }),
    ui: [F.line, F.levels, F.bool('labels', '레벨 라벨')],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      g.poly(P, { c: d.s.c, w: 1, ls: 1 });
      if (P.length < 3) return;
      const di = C.t2i(d.pts[1].t) - C.t2i(d.pts[0].t), i2 = C.t2i(d.pts[2].t);
      for (const l of d.s.levels) {
        if (!l.on) continue;
        const x = C.x(i2 + di * l.v);
        if (x < -50 || x > C.W + 50) continue;
        g.line(x, C.top, x, C.top + C.h, { c: l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) g.text(fl(l.v), x + 3, C.top + C.h - 4, { base: 'bottom', c: l.c, size: 11, hit: false });
      }
    },
  };
  const ringL = fibL([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618, 4.236], [3.618, 4.236]);
  T.fibcircles = {
    name: '피보나치 원', n: 2, defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.08, labels: true, levels: ringL }),
    ui: [F.line, F.levels, F.fill, F.bool('labels', '레벨 라벨')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, R = len(sub(b, a));
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      if (d.s.fill) { let r0 = 0; for (const l of lv) { annulus(g, a.x, a.y, r0, R * l.v, U.rgba(l.c, d.s.fa)); r0 = R * l.v; } }
      for (const l of lv) { g.circle(a.x, a.y, R * l.v, { c: l.c, w: d.s.w, ls: d.s.ls }); if (d.s.labels) g.text(fl(l.v), a.x + 3, a.y - R * l.v - 2, { base: 'bottom', c: l.c, size: 11, hit: false }); }
      g.line(a.x, a.y, b.x, b.y, { c: d.s.c, w: 1, ls: 1 });
    },
  };
  T.fibspiral = {
    name: '피보나치 나선', n: 2, defaults: D({ c: '#f23645', w: 1.5, ccw: false }), ui: [F.line, F.bool('ccw', '반시계 방향')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, rb = len(sub(b, a));
      if (rb < 1) return;
      const thb = Math.atan2(b.y - a.y, b.x - a.x), phi = (1 + Math.sqrt(5)) / 2, k = Math.log(phi) / (Math.PI / 2), sgn = d.s.ccw ? -1 : 1;
      const pts = [];
      for (let j = -600; j <= 300; j++) {
        const th = (j / 100) * Math.PI;
        const r = rb * Math.exp(k * th);
        if (r < 0.3 || r > 8000) continue;
        const ang = thb + sgn * th;
        pts.push({ x: a.x + r * Math.cos(ang), y: a.y + r * Math.sin(ang) });
      }
      g.poly(pts, lst(d));
      g.line(a.x, a.y, b.x, b.y, { c: d.s.c, w: 1, ls: 1 });
    },
  };
  T.fibarcs = {
    name: '피보나치 속도저항 호', n: 2, defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.08, full: false, labels: true, levels: fibL([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618], [1.618, 2.618]) }),
    ui: [F.line, F.levels, F.fill, F.bool('full', '전체 원'), F.bool('labels', '레벨 라벨')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, R = len(sub(a, b));
      const upper = a.y < b.y;
      const a0 = d.s.full ? 0 : upper ? Math.PI : 0, a1 = d.s.full ? Math.PI * 2 : upper ? Math.PI * 2 : Math.PI;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      if (d.s.fill) { let r0 = 0; for (const l of lv) { annulus(g, b.x, b.y, r0, R * l.v, U.rgba(l.c, d.s.fa), d.s.full ? null : a0, d.s.full ? null : a1); r0 = R * l.v; } }
      for (const l of lv) {
        g.arc(b.x, b.y, R * l.v, a0, a1, { c: l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) g.text(fl(l.v), b.x + 3, b.y + (upper ? -R * l.v - 2 : R * l.v + 2), { base: upper ? 'bottom' : 'top', c: l.c, size: 11, hit: false });
      }
      g.line(a.x, a.y, b.x, b.y, { c: d.s.c, w: 1, ls: 1 });
    },
  };
  T.fibwedge = {
    name: '피보나치 쐐기', n: 3, defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.1, labels: true, levels: fibL([0.236, 0.382, 0.5, 0.618, 0.786, 1]) }),
    ui: [F.line, F.levels, F.fill, F.bool('labels', '레벨 라벨')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, R = len(sub(b, a));
      g.line(a.x, a.y, b.x, b.y, lst(d));
      if (P.length < 3) return;
      const c = P[2];
      const t1 = Math.atan2(b.y - a.y, b.x - a.x), t2 = Math.atan2(c.y - a.y, c.x - a.x);
      let dt = t2 - t1;
      while (dt > Math.PI) dt -= Math.PI * 2;
      while (dt < -Math.PI) dt += Math.PI * 2;
      const e = { x: a.x + R * Math.cos(t2), y: a.y + R * Math.sin(t2) };
      g.line(a.x, a.y, e.x, e.y, lst(d));
      const s0 = dt >= 0 ? t1 : t2, s1 = dt >= 0 ? t1 + dt : t1;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      if (d.s.fill) { let r0 = 0; for (const l of lv) { annulus(g, a.x, a.y, r0, R * l.v, U.rgba(l.c, d.s.fa), s0, s1); r0 = R * l.v; } }
      for (const l of lv) {
        g.arc(a.x, a.y, R * l.v, s0, s1, { c: l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) { const m = (s0 + s1) / 2; g.text(fl(l.v), a.x + R * l.v * Math.cos(m), a.y + R * l.v * Math.sin(m), { align: 'center', base: 'middle', c: l.c, size: 10, hit: false }); }
      }
    },
  };
  T.pitchfan = {
    name: '피치팬', n: 3, defaults: D({ c: '#f23645', w: 1, fill: true, fa: 0.1, levels: FORK_L }), ui: [F.line, F.fill, F.levels],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [o, p2] = P;
      if (P.length < 3) { g.line(o.x, o.y, p2.x, p2.y, lst(d)); return; }
      const p3 = P[2], M = mid(p2, p3);
      const lv = (d.s.levels || []).filter((l) => l.on).sort((a, b) => a.v - b.v);
      const at = (s, v) => add(M, mul(sub(s, M), v));
      if (d.s.fill) {
        let pa = M, pb = M;
        for (const l of lv) {
          const A = at(p2, l.v), B = at(p3, l.v), col = U.rgba(l.c, d.s.fa);
          g.poly([o, far(o, sub(pa, o)), far(o, sub(A, o))], { close: true, fill: col, noStroke: true, hit: false });
          g.poly([o, far(o, sub(pb, o)), far(o, sub(B, o))], { close: true, fill: col, noStroke: true, hit: false });
          pa = A; pb = B;
        }
      }
      ray(g, o, sub(M, o), lst(d));
      for (const l of lv) { ray(g, o, sub(at(p2, l.v), o), { c: l.c, w: d.s.w, ls: d.s.ls }); ray(g, o, sub(at(p3, l.v), o), { c: l.c, w: d.s.w, ls: d.s.ls }); }
      g.line(p2.x, p2.y, p3.x, p3.y, lst(d));
    },
  };

  /* ===================== 간(Gann) ===================== */
  const GANN_L = L([[0, '#787b86'], [0.25, '#ff9800'], [0.382, '#4caf50'], [0.5, '#089981'], [0.618, '#00bcd4'], [0.75, '#2962ff'], [1, '#787b86']]);
  T.gannbox = {
    name: '간 박스', n: 2, defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.08, labels: true, diag: true, levels: GANN_L }),
    ui: [F.line, F.levels, F.fill, F.bool('labels', '레벨 라벨'), F.bool('diag', '대각선')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      if (d.s.fill) for (let k = 0; k < lv.length - 1; k++) {
        const y1 = a.y + (b.y - a.y) * lv[k].v, y2 = a.y + (b.y - a.y) * lv[k + 1].v;
        g.rect(Math.min(a.x, b.x), y1, Math.abs(b.x - a.x), y2 - y1, { fill: U.rgba(lv[k + 1].c, d.s.fa), noStroke: true, hit: false });
      }
      for (const l of lv) {
        const y = a.y + (b.y - a.y) * l.v, x = a.x + (b.x - a.x) * l.v;
        g.line(a.x, y, b.x, y, { c: l.c, w: d.s.w, ls: d.s.ls });
        g.line(x, a.y, x, b.y, { c: l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) {
          g.text(fl(l.v), Math.min(a.x, b.x) - 4, y, { align: 'right', base: 'middle', c: l.c, size: 10, hit: false });
          g.text(fl(l.v), x, Math.min(a.y, b.y) - 3, { align: 'center', base: 'bottom', c: l.c, size: 10, hit: false });
        }
      }
      if (d.s.diag) { g.line(a.x, a.y, b.x, b.y, { c: d.s.c, w: 1, ls: 1, hit: false }); g.line(a.x, b.y, b.x, a.y, { c: d.s.c, w: 1, ls: 1, hit: false }); }
    },
  };
  T.gannsquare = {
    name: '간 스퀘어', n: 2, defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.06, levels: L([[0, '#787b86'], [0.25, '#ff9800'], [0.5, '#4caf50'], [0.75, '#2962ff'], [1, '#787b86']]) }),
    ui: [F.line, F.levels, F.fill],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, dx = b.x - a.x, dy = b.y - a.y;
      const lv = d.s.levels.filter((l) => l.on).sort((x, y) => x.v - y.v);
      g.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(dx), Math.abs(dy), { c: d.s.c, w: d.s.w, fill: d.s.fill ? U.rgba(d.s.c, d.s.fa) : null });
      for (const l of lv) {
        g.line(a.x + dx * l.v, a.y, a.x + dx * l.v, b.y, { c: U.rgba(l.c, 0.7), w: 1, hit: false });
        g.line(a.x, a.y + dy * l.v, b.x, a.y + dy * l.v, { c: U.rgba(l.c, 0.7), w: 1, hit: false });
        if (l.v > 0) {
          g.line(a.x, a.y, b.x, a.y + dy * l.v, { c: l.c, w: d.s.w, ls: d.s.ls, hit: false });
          g.line(a.x, a.y, a.x + dx * l.v, b.y, { c: l.c, w: d.s.w, ls: d.s.ls, hit: false });
          const ctx = g.ctx;
          ctx.beginPath();
          ctx.ellipse(a.x, a.y, Math.abs(dx * l.v), Math.abs(dy * l.v), 0, dx >= 0 ? (dy >= 0 ? 0 : -Math.PI / 2) : dy >= 0 ? Math.PI / 2 : Math.PI, dx >= 0 ? (dy >= 0 ? Math.PI / 2 : 0) : dy >= 0 ? Math.PI : (Math.PI * 3) / 2);
          ctx.strokeStyle = U.rgba(l.c, 0.8); ctx.lineWidth = 1; ctx.stroke();
        }
      }
    },
  };
  const GFAN = [[8, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [1, 8]];
  T.gannfan = {
    name: '간 팬', n: 2, defaults: D({ c: '#787b86', w: 1, fill: true, fa: 0.06, labels: true, levels: GFAN.map((r, i) => ({ v: i, c: ['#f23645', '#ff9800', '#ffeb3b', '#4caf50', '#089981', '#00bcd4', '#2962ff', '#673ab7', '#e91e63'][i], on: true })) }),
    ui: [F.line, F.fill, F.bool('labels', '각도 라벨')],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, v = sub(b, a);
      const rays = GFAN.map((r, i) => ({ dir: { x: v.x * r[1], y: v.y * r[0] }, lbl: r[0] + '/' + r[1], l: d.s.levels[i] })).filter((r) => r.l && r.l.on);
      if (d.s.fill) for (let k = 0; k < rays.length - 1; k++) g.poly([a, far(a, rays[k].dir), far(a, rays[k + 1].dir)], { close: true, fill: U.rgba(rays[k + 1].l.c, d.s.fa), noStroke: true, hit: false });
      for (const r of rays) {
        ray(g, a, r.dir, { c: r.l.c, w: d.s.w, ls: d.s.ls });
        if (d.s.labels) { const q = add(a, r.dir); g.text(r.lbl, q.x + 3, q.y, { base: 'middle', c: r.l.c, size: 10, hit: false }); }
      }
    },
  };

  /* ===================== 패턴 ===================== */
  const patD = D({ c: '#2962ff', w: 2, fill: true, fc: '#2962ff', fa: 0.15 });
  const patUI = [F.line, F.fill];
  const pv = (d, i) => (d.pts[i] ? d.pts[i].p : NaN);
  T.xabcd = {
    name: 'XABCD 패턴', n: 5, defaults: patD, ui: patUI,
    draw(g, d, P) {
      if (d.s.fill) { if (P.length >= 3) g.poly(P.slice(0, 3), { close: true, fill: fillOf(d), noStroke: true }); if (P.length >= 5) g.poly(P.slice(2, 5), { close: true, fill: fillOf(d), noStroke: true }); }
      g.poly(P, lst(d));
      if (P.length >= 3) ratioLine(g, P[0], P[2], rt(pv(d, 0), pv(d, 1), pv(d, 1), pv(d, 2)), d);
      if (P.length >= 4) ratioLine(g, P[1], P[3], rt(pv(d, 1), pv(d, 2), pv(d, 2), pv(d, 3)), d);
      if (P.length >= 5) { ratioLine(g, P[2], P[4], rt(pv(d, 2), pv(d, 3), pv(d, 3), pv(d, 4)), d); ratioLine(g, P[0], P[4], rt(pv(d, 0), pv(d, 1), pv(d, 1), pv(d, 4)), d); }
      'XABCD'.split('').forEach((c, i) => ptLabel(g, d, P, i, c));
    },
  };
  T.cypher = {
    name: '사이퍼 패턴', n: 5, defaults: patD, ui: patUI,
    draw(g, d, P) {
      if (d.s.fill) { if (P.length >= 3) g.poly(P.slice(0, 3), { close: true, fill: fillOf(d), noStroke: true }); if (P.length >= 5) g.poly([P[0], P[3], P[4]], { close: true, fill: fillOf(d), noStroke: true }); }
      g.poly(P, lst(d));
      if (P.length >= 3) ratioLine(g, P[0], P[2], rt(pv(d, 0), pv(d, 1), pv(d, 1), pv(d, 2)), d);
      if (P.length >= 4) ratioLine(g, P[0], P[3], rt(pv(d, 0), pv(d, 1), pv(d, 2), pv(d, 3)), d);
      if (P.length >= 5) ratioLine(g, P[1], P[4], rt(pv(d, 0), pv(d, 3), pv(d, 3), pv(d, 4)), d);
      'XABCD'.split('').forEach((c, i) => ptLabel(g, d, P, i, c));
    },
  };
  T.hs = {
    name: '헤드 앤 숄더', n: 7, defaults: patD, ui: patUI,
    draw(g, d, P) {
      if (d.s.fill) for (const k of [0, 2, 4]) if (P.length >= k + 3) g.poly(P.slice(k, k + 3), { close: true, fill: fillOf(d), noStroke: true });
      g.poly(P, lst(d));
      if (P.length >= 5) { const e = U.ext(P[2].x, P[2].y, P[4].x, P[4].y, true, true); g.line(e[0], e[1], e[2], e[3], { c: d.s.c, w: 1, ls: 1, hit: false }); g.text('넥라인', P[4].x + 6, P[4].y + 4, { c: d.s.c, size: 11, hit: false }); }
      ['', '왼쪽 어깨', '', '머리', '', '오른쪽 어깨', ''].forEach((c, i) => ptLabel(g, d, P, i, c));
    },
  };
  T.abcd = {
    name: 'ABCD 패턴', n: 4, defaults: D({ c: '#089981', w: 2 }), ui: [F.line],
    draw(g, d, P) {
      g.poly(P, lst(d));
      if (P.length >= 3) ratioLine(g, P[0], P[2], rt(pv(d, 0), pv(d, 1), pv(d, 1), pv(d, 2)), d);
      if (P.length >= 4) ratioLine(g, P[1], P[3], rt(pv(d, 1), pv(d, 2), pv(d, 2), pv(d, 3)), d);
      'ABCD'.split('').forEach((c, i) => ptLabel(g, d, P, i, c));
    },
  };
  T.trianglepat = {
    name: '삼각형 패턴', n: 4, defaults: D({ c: '#9c27b0', w: 2, fill: true, fc: '#9c27b0', fa: 0.12 }), ui: patUI,
    draw(g, d, P) {
      g.poly(P, lst(d));
      if (P.length >= 4) {
        const I = U.lineInter(P[0], P[2], P[1], P[3]);
        if (I && I.x > Math.max(P[2].x, P[3].x) && I.t > 0 && I.u > 0) {
          if (d.s.fill) g.poly([P[0], I, P[1]], { close: true, fill: fillOf(d), noStroke: true });
          g.line(P[0].x, P[0].y, I.x, I.y, { c: d.s.c, w: 1, ls: 1 }); g.line(P[1].x, P[1].y, I.x, I.y, { c: d.s.c, w: 1, ls: 1 });
        } else { g.line(P[0].x, P[0].y, P[2].x, P[2].y, { c: d.s.c, w: 1, ls: 1, extR: true }); g.line(P[1].x, P[1].y, P[3].x, P[3].y, { c: d.s.c, w: 1, ls: 1, extR: true }); }
      }
      'ABCD'.split('').forEach((c, i) => ptLabel(g, d, P, i, c));
    },
  };
  T.threedrives = {
    name: '쓰리 드라이브 패턴', n: 6, defaults: D({ c: '#ff9800', w: 2 }), ui: [F.line],
    draw(g, d, P) {
      g.poly(P, lst(d));
      for (let i = 2; i < P.length; i++) {
        const r = rt(pv(d, i - 2), pv(d, i - 1), pv(d, i - 1), pv(d, i));
        const m = mid(P[i - 1], P[i]);
        g.text(r, m.x + 6, m.y, { base: 'middle', c: '#fff', bg: U.rgba(d.s.c, 0.85), size: 11, pad: 3, hit: false });
      }
      ['', '1', 'A', '2', 'B', '3'].forEach((c, i) => ptLabel(g, d, P, i, c));
    },
  };

  /* ===================== 엘리엇 파동 ===================== */
  const ROM = { 1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v' };
  function eLabel(s, deg) {
    const low = ROM[s] || s.toLowerCase();
    return [`(${s})`, s, `[${s}]`, low, `(${low})`][deg | 0] || s;
  }
  const eUI = [F.line, F.sel('deg', '파동 등급(라벨)', [[0, '(1) (A)'], [1, '1 A'], [2, '[1] [A]'], [3, 'i a'], [4, '(i) (a)']])];
  function elliott(name, labels) {
    return {
      name, n: labels.length + 1, defaults: D({ c: '#3179f5', w: 1.5, deg: 0 }), ui: eUI,
      draw(g, d, P) {
        g.poly(P, lst(d));
        labels.forEach((s, i) => { const k = i + 1; if (!P[k]) return; const up = isPeak(P, k); g.text(eLabel(s, d.s.deg), P[k].x, P[k].y + (up ? -6 : 6), { align: 'center', base: up ? 'bottom' : 'top', c: d.s.c, size: 13, bold: true, hit: false }); });
      },
    };
  }
  T.elliott5 = elliott('엘리엇 충격파 (12345)', ['1', '2', '3', '4', '5']);
  T.elliottabc = elliott('엘리엇 조정파 (ABC)', ['A', 'B', 'C']);
  T.elliotttri = elliott('엘리엇 삼각파 (ABCDE)', ['A', 'B', 'C', 'D', 'E']);
  T.elliottwxy = elliott('엘리엇 이중 조합 (WXY)', ['W', 'X', 'Y']);
  T.elliottwxyxz = elliott('엘리엇 삼중 조합 (WXYXZ)', ['W', 'X', 'Y', 'X', 'Z']);

  /* ===================== 사이클 ===================== */
  T.cyclic = {
    name: '사이클 라인', n: 2, noPriceAxis: true, defaults: D({ w: 1, c: '#2962ff' }), ui: [F.line],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const i0 = C.t2i(d.pts[0].t), di = Math.abs(C.t2i(d.pts[1].t) - i0);
      if (di < 0.5) { g.vline(P[0].x, lst(d)); return; }
      const iEnd = C.x2i(C.W) + 1;
      for (let i = i0, k = 0; i <= iEnd && k < 2000; i += di, k++) { const x = C.x(i); if (x >= -2) g.line(x, C.top, x, C.top + C.h, lst(d, { hit: k < 2 })); }
    },
  };
  T.timecycles = {
    name: '타임 사이클', n: 2, defaults: D({ w: 1, c: '#9c27b0', fill: true, fc: '#9c27b0', fa: 0.08 }), ui: [F.line, F.fill],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P, D0 = Math.abs(b.x - a.x);
      if (D0 < 2) return;
      const r = D0 / 2;
      for (let k = 0, cx = Math.min(a.x, b.x) + r; cx - r < C.W && k < 500; k++, cx += D0) {
        if (cx + r < 0) continue;
        g.arc(cx, a.y, r, Math.PI, Math.PI * 2, { c: d.s.c, w: d.s.w, ls: d.s.ls, fill: fillOf(d), hit: k < 3 });
      }
      g.line(Math.min(a.x, b.x), a.y, C.W + 10, a.y, { c: d.s.c, w: 1, ls: 1, hit: false });
    },
    handles: (d, P) => (P.length < 2 ? P : [P[0], { x: P[1].x, y: P[0].y }]),
    onHandle(d, k, pt) { if (k === 1) d.pts[1] = { t: pt.t, p: d.pts[0].p }; else { d.pts[0] = pt; } },
  };
  T.sine = {
    name: '사인 라인', n: 2, defaults: D({ w: 1.5, c: '#00bcd4' }), ui: [F.line],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P, hp = b.x - a.x;
      if (Math.abs(hp) < 2) return;
      const A = (b.y - a.y) / 2, yc = (a.y + b.y) / 2, pts = [];
      for (let x = -4; x <= C.W + 4; x += 2) pts.push({ x, y: yc - A * Math.cos((Math.PI * (x - a.x)) / hp) });
      g.poly(pts, lst(d));
    },
  };

  /* ===================== 예측·측정 ===================== */
  function position(isLong) {
    return {
      name: isLong ? '롱 포지션' : '숏 포지션', n: 1, mainOnly: true, noAxis: false,
      defaults: { c: '#787b86', w: 1, ls: 0, acct: 1000, risk: 1, lev: 1, qtyDec: 4, tc: '#ffffff', fs: 12, showRes: true },
      ui: [F.num('acct', '계좌 규모'), F.num('risk', '리스크(%)', { step: 0.1 }), F.num('lev', '레버리지', { step: 1 }), F.num('qtyDec', '수량 소수점', { step: 1 }), F.bool('showRes', '결과(도달 여부) 표시')],
      init(d, C) {
        const e = d.pts[0], r = Math.max(C.hi - C.lo, Math.abs(e.p) * 0.01), up = isLong ? 1 : -1;
        const tEnd = C.i2t(C.t2i(e.t) + Math.max(10, Math.round(140 / C.s)));
        d.pts = [e, { t: tEnd, p: e.p + up * r * 0.12 }, { t: tEnd, p: e.p - up * r * 0.06 }];
      },
      onHandle(d, k, pt) {
        if (k === 0) d.pts[0] = pt;
        else if (k === 1) { d.pts[1] = { t: pt.t, p: pt.p }; d.pts[2].t = pt.t; }
        else { d.pts[2] = { t: pt.t, p: pt.p }; d.pts[1].t = pt.t; }
      },
      draw(g, d, P, C) {
        if (P.length < 3) return;
        const [E, Tg, St] = P;
        const e = d.pts[0].p, tp = d.pts[1].p, sp = d.pts[2].p;
        const xl = Math.min(E.x, Tg.x), xr = Math.max(E.x, Tg.x), w = Math.max(2, xr - xl);
        g.rect(xl, Math.min(E.y, Tg.y), w, Math.abs(Tg.y - E.y), { fill: 'rgba(8,153,129,0.22)', noStroke: true });
        g.rect(xl, Math.min(E.y, St.y), w, Math.abs(St.y - E.y), { fill: 'rgba(242,54,69,0.22)', noStroke: true });
        g.line(xl, E.y, xr, E.y, { c: '#787b86', w: 1 });
        const s = isLong ? 1 : -1;
        const tPct = ((tp - e) / e) * 100 * s, sPct = ((e - sp) / e) * 100 * s;
        const rr = Math.abs(e - sp) > 0 ? Math.abs(tp - e) / Math.abs(e - sp) : 0;
        const riskAmt = (d.s.acct || 0) * ((d.s.risk || 0) / 100);
        const qty = Math.abs(e - sp) > 0 ? riskAmt / Math.abs(e - sp) : 0;
        const prof = qty * Math.abs(tp - e);
        const cx = xl + w / 2;
        const tAbove = isLong ? Tg.y < E.y : Tg.y < E.y;
        g.text('목표: ' + C.fp(tp) + ' (' + U.fmtPct(tPct) + ')  +' + U.fmt(prof, 2), cx, Tg.y + (tAbove ? -4 : 4), { align: 'center', base: tAbove ? 'bottom' : 'top', c: '#fff', bg: '#089981', size: d.s.fs, pad: 4, hit: false });
        g.text('손절: ' + C.fp(sp) + ' (-' + Math.abs(sPct).toFixed(2) + '%)  -' + U.fmt(riskAmt, 2), cx, St.y + (St.y > E.y ? 4 : -4), { align: 'center', base: St.y > E.y ? 'top' : 'bottom', c: '#fff', bg: '#f23645', size: d.s.fs, pad: 4, hit: false });
        let res = '';
        if (d.s.showRes) {
          const b = C.bars, i0 = Math.max(0, Math.ceil(C.t2i(d.pts[0].t))), i1 = Math.min(b.length - 1, Math.floor(C.t2i(d.pts[1].t)));
          let hit = null;
          for (let i = i0 + 1; i <= i1; i++) {
            const x = b[i];
            const stopHit = isLong ? x.l <= sp : x.h >= sp, tgtHit = isLong ? x.h >= tp : x.l <= tp;
            if (stopHit) { hit = { i, p: sp, win: false }; break; }
            if (tgtHit) { hit = { i, p: tp, win: true }; break; }
          }
          if (hit) {
            const hx = C.x(hit.i), hy = C.y(hit.p);
            g.rect(xl, Math.min(E.y, hy), hx - xl, Math.abs(hy - E.y), { fill: hit.win ? 'rgba(8,153,129,0.25)' : 'rgba(242,54,69,0.25)', noStroke: true, hit: false });
            g.line(E.x, E.y, hx, hy, { c: hit.win ? '#089981' : '#f23645', w: 1, ls: 1, hit: false });
            res = hit.win ? '  ✔ 목표 도달' : '  ✘ 손절';
          } else if (i1 >= i0 && i1 === b.length - 1 && b.length) {
            const pl = ((b[b.length - 1].c - e) / e) * 100 * s;
            res = '  미실현 ' + U.fmtPct(pl);
          }
        }
        const q = qty * (d.s.lev || 1);
        const qs = !(q > 0) ? '0' : q >= 100 ? U.fmt(q, 0) : q >= 1 ? U.fmt(q, Math.min(4, d.s.qtyDec != null ? d.s.qtyDec : 4)) : (+q.toPrecision(3)).toString();
        g.text('손익비 ' + rr.toFixed(2) + '  수량 ' + qs + res, cx, E.y, { align: 'center', base: 'middle', c: '#fff', bg: 'rgba(38,38,38,0.95)', size: d.s.fs, pad: 4 });
      },
    };
  }
  T.longpos = position(true);
  T.shortpos = position(false);
  T.forecast = {
    name: '예측', n: 2, mainOnly: true, defaults: D({ c: '#2962ff', w: 1.5 }), ui: [F.line],
    finish(d, C) { const i = U.clamp(Math.round(C.t2i(d.pts[0].t)), 0, C.bars.length - 1); if (C.bars[i]) d.pts[0].p = C.bars[i].c; },
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P;
      g.line(a.x, a.y, b.x, b.y, lst(d, { ls: 1 }));
      g.circle(a.x, a.y, 4, { c: d.s.c, w: 1.5, fill: C.th.bg });
      g.circle(b.x, b.y, 5, { c: d.s.c, w: 1.5, fill: U.rgba(d.s.c, 0.3) });
      const up = d.pts[1].p >= d.pts[0].p;
      g.text(statsText(d, C), b.x + 10, b.y, { base: 'middle', c: '#fff', bg: up ? 'rgba(8,153,129,0.9)' : 'rgba(242,54,69,0.9)', size: 11, pad: 5 });
    },
  };
  function rangeDraw(kind, colorFn) {
    return function (g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P;
      const col = colorFn ? colorFn(d) : d.s.c;
      g.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y), { fill: U.rgba(col, 0.18), c: U.rgba(col, 0.5), w: 1, hitFill: true });
      const my = (a.y + b.y) / 2, mx = (a.x + b.x) / 2;
      if (kind !== 'price' && Math.abs(b.x - a.x) > 4) g.line(a.x, my, b.x, my, { c: col, w: 1, arrowE: true, ah: 8, hit: false });
      if (kind !== 'date' && Math.abs(b.y - a.y) > 4) g.line(mx, a.y, mx, b.y, { c: col, w: 1, arrowE: true, ah: 8, hit: false });
      const p0 = d.pts[0], p1 = d.pts[1], lines = [];
      if (kind !== 'date') { const dp = p1.p - p0.p; lines.push((dp >= 0 ? '+' : '') + C.fp(dp) + ' (' + U.fmtPct(p0.p ? (dp / Math.abs(p0.p)) * 100 : 0) + ')'); }
      if (kind !== 'price') {
        const i0 = C.t2i(p0.t), i1 = C.t2i(p1.t);
        let vol = 0;
        for (let i = Math.max(0, Math.round(Math.min(i0, i1))); i <= Math.min(C.bars.length - 1, Math.round(Math.max(i0, i1))); i++) vol += C.bars[i].v || 0;
        lines.push(Math.round(i1 - i0) + '봉, ' + U.fmtDur(p1.t - p0.t));
        lines.push('거래량 ' + U.fmtVol(vol));
      }
      const below = b.y >= a.y;
      g.text(lines.join('\n'), mx, (below ? Math.max(a.y, b.y) : Math.min(a.y, b.y)) + (below ? 6 : -6), { align: 'center', tAlign: 'center', base: below ? 'top' : 'bottom', c: '#fff', bg: U.rgba(col, 0.92), size: 12, pad: 6, hit: false });
    };
  }
  T.daterange = { name: '기간 범위', n: 2, defaults: D({ c: '#2962ff', w: 1 }), ui: [F.line], draw: rangeDraw('date') };
  T.pricerange = { name: '가격 범위', n: 2, defaults: D({ c: '#2962ff', w: 1 }), ui: [F.line], draw: rangeDraw('price') };
  T.dprange = { name: '기간·가격 범위', n: 2, defaults: D({ c: '#2962ff', w: 1 }), ui: [F.line], draw: rangeDraw('both') };
  T.measure = { name: '측정', n: 2, hidden: true, defaults: {}, ui: [], draw: rangeDraw('both', (d) => (d.pts[1].p >= d.pts[0].p ? '#2962ff' : '#f23645')) };
  T.barspattern = {
    name: '바 패턴', n: 2, mainOnly: true, defaults: D({ c: '#2962ff', w: 1, mode: 'candle', mirror: false, flip: false }),
    ui: [F.color('c', '색'), F.sel('mode', '모드', [['candle', '캔들'], ['hl', 'HL 바'], ['line', '종가 선']]), F.bool('mirror', '좌우 반전'), F.bool('flip', '상하 반전')],
    finish(d, C) {
      const b = C.bars, i0 = Math.round(C.t2i(d.pts[0].t)), i1 = Math.round(C.t2i(d.pts[1].t));
      const lo = U.clamp(Math.min(i0, i1), 0, b.length - 1), hi = U.clamp(Math.max(i0, i1), 0, b.length - 1);
      const rows = [];
      for (let i = lo; i <= hi; i++) rows.push([b[i].o, b[i].h, b[i].l, b[i].c]);
      if (!rows.length) return;
      d.data = { rows, base: rows[0][0] };
      d.pts = [{ t: b[lo].t, p: rows[0][0] }, { t: b[hi].t, p: rows[0][0] }];
    },
    draw(g, d, P, C) {
      if (P.length < 2) return;
      if (!d.data) { g.rect(Math.min(P[0].x, P[1].x), C.top + 2, Math.abs(P[1].x - P[0].x), C.h - 4, { fill: U.rgba(d.s.c, 0.08), c: d.s.c, w: 1, ls: 1 }); return; }
      let rows = d.data.rows;
      if (d.s.mirror) rows = rows.slice().reverse();
      const N = rows.length, i0 = C.t2i(d.pts[0].t), i1 = C.t2i(d.pts[1].t), st = N > 1 ? (i1 - i0) / (N - 1) : 1;
      const base = d.data.base, anc = d.pts[0].p;
      const tv = (v) => (d.s.flip ? anc - (v - base) : anc + (v - base));
      const ctx = g.ctx, bw = Math.max(1, Math.round(Math.abs(st) * C.s * 0.6));
      let minY = Infinity, maxY = -Infinity;
      ctx.fillStyle = U.rgba(d.s.c, 0.45); ctx.strokeStyle = d.s.c; ctx.lineWidth = 1;
      if (d.s.mode === 'line') ctx.beginPath();
      rows.forEach((r, k) => {
        const x = C.x(i0 + k * st);
        let [o, h, l, c] = r.map(tv);
        if (d.s.flip) [h, l] = [l, h];
        const yo = C.y(o), yh = C.y(h), yl = C.y(l), yc = C.y(c);
        minY = Math.min(minY, yh, yl); maxY = Math.max(maxY, yh, yl);
        if (d.s.mode === 'line') { k ? ctx.lineTo(x, yc) : ctx.moveTo(x, yc); return; }
        ctx.beginPath(); ctx.moveTo(x, yh); ctx.lineTo(x, yl); ctx.stroke();
        if (d.s.mode === 'candle') { ctx.fillRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo))); ctx.strokeRect(x - bw / 2, Math.min(yo, yc), bw, Math.max(1, Math.abs(yc - yo))); }
      });
      if (d.s.mode === 'line') ctx.stroke();
      const xa = Math.min(P[0].x, P[1].x) - bw, xb = Math.max(P[0].x, P[1].x) + bw;
      if (isFinite(minY)) g.rect(xa, minY, xb - xa, maxY - minY, { fill: 'rgba(0,0,0,0)', noStroke: true });
    },
    handles: (d, P) => (P.length < 2 ? P : [P[0], { x: P[1].x, y: P[0].y }]),
    onHandle(d, k, pt) { if (k === 0) d.pts[0] = pt; else d.pts[1] = { t: pt.t, p: d.pts[0].p }; },
  };
  T.ghostfeed = {
    name: '고스트 피드', n: 0, mainOnly: true, defaults: D({ c: '#2962ff', w: 1, vola: 1 }), ui: [F.color('c', '색'), F.num('vola', '변동성 배율', { step: 0.1 })],
    draw(g, d, P, C) {
      if (P.length < 2) { if (P[0]) g.circle(P[0].x, P[0].y, 3, { c: d.s.c }); return; }
      const rnd = U.rng(d.id), ctx = g.ctx;
      const bw = Math.max(1, Math.round(C.s * 0.6)), vr = (C.hi - C.lo) * 0.004 * (d.s.vola || 1);
      let prevC = d.pts[0].p;
      ctx.lineWidth = 1;
      const pts = [];
      for (let k = 0; k < d.pts.length - 1; k++) {
        const a = d.pts[k], b = d.pts[k + 1];
        const ia = C.t2i(a.t), ib = C.t2i(b.t), nb = Math.max(1, Math.round(ib - ia));
        const vol = (Math.abs(b.p - a.p) / nb) * 0.7 * (d.s.vola || 1) + vr;
        for (let j = 1; j <= nb; j++) {
          const tgt = a.p + ((b.p - a.p) * j) / nb;
          const c = j === nb ? b.p : tgt + (rnd() - 0.5) * vol * 2;
          const o = prevC, h = Math.max(o, c) + rnd() * vol, l = Math.min(o, c) - rnd() * vol;
          const x = C.x(ia + ((ib - ia) * j) / nb);
          const up = c >= o;
          ctx.strokeStyle = U.rgba(up ? C.set.up : C.set.dn, 0.6); ctx.fillStyle = U.rgba(up ? C.set.up : C.set.dn, 0.45);
          ctx.beginPath(); ctx.moveTo(x, C.y(h)); ctx.lineTo(x, C.y(l)); ctx.stroke();
          ctx.fillRect(x - bw / 2, Math.min(C.y(o), C.y(c)), bw, Math.max(1, Math.abs(C.y(c) - C.y(o))));
          prevC = c;
        }
      }
      for (const q of P) pts.push(q);
      g.poly(pts, { c: U.rgba(d.s.c, 0.5), w: 1, ls: 1 });
    },
  };
  T.avwap = {
    name: '앵커드 VWAP', n: 1, mainOnly: true, noPriceAxis: true, defaults: D({ c: '#2962ff', w: 2, src: 'hlc3' }),
    ui: [F.line, F.sel('src', '소스', [['hlc3', '(고+저+종)/3'], ['close', '종가']])],
    draw(g, d, P, C) {
      const b = C.bars;
      const i0 = U.clamp(Math.round(C.t2i(d.pts[0].t)), 0, b.length - 1);
      const key = i0 + '|' + b.length + '|' + (b.length ? b[b.length - 1].c : 0) + '|' + d.s.src;
      if (!d._vw || d._vwk !== key) { d._vw = TA.vwapFrom(b, i0, d.s.src); d._vwk = key; }
      const vw = d._vw, pts = [];
      const lo = Math.max(i0, Math.floor(C.x2i(0)) - 1), hi = Math.min(b.length - 1, Math.ceil(C.x2i(C.W)) + 1);
      for (let i = lo; i <= hi; i++) if (vw[i] === vw[i]) pts.push({ x: C.x(i), y: C.y(vw[i]) });
      if (pts.length > 1) g.poly(pts, lst(d));
      d._h0 = { x: C.x(i0), y: C.y(vw[i0]) };
      g.text('VWAP', d._h0.x + 4, d._h0.y - 4, { base: 'bottom', c: d.s.c, size: 11, hit: false });
      if (vw[b.length - 1] === vw[b.length - 1]) g.ptag(vw[b.length - 1], d.s.c);
    },
    handles: (d) => (d._h0 ? [d._h0] : []),
  };
  function vpDraw(anchored) {
    return function (g, d, P, C) {
      const b = C.bars;
      if (!b.length || P.length < (anchored ? 1 : 2)) return;
      const ia = Math.round(C.t2i(d.pts[0].t)), ib = anchored ? b.length - 1 : Math.round(C.t2i(d.pts[1].t));
      const lo = U.clamp(Math.min(ia, ib), 0, b.length - 1), hi = U.clamp(Math.max(ia, ib), 0, b.length - 1);
      const key = lo + '|' + hi + '|' + b.length + '|' + b[b.length - 1].c + '|' + d.s.rows + '|' + d.s.va;
      if (!d._vp || d._vpk !== key) { d._vp = TA.vprofile(b, lo, hi, d.s.rows || 24, (d.s.va || 70) / 100); d._vpk = key; }
      const vp = d._vp;
      if (!vp) return;
      const xl = C.x(lo) - C.s / 2, xr = C.x(hi) + C.s / 2;
      const yt = C.y(vp.hi), yb = C.y(vp.lo);
      g.rect(xl, Math.min(yt, yb), xr - xl, Math.abs(yb - yt), { fill: U.rgba(d.s.c, 0.04), c: U.rgba(d.s.c, 0.35), w: 1 });
      const W = (xr - xl) * ((d.s.wpct || 40) / 100);
      const right = d.s.side === 'right';
      const S = {
        up: { c: d.s.cu || '#1e88e5', a: 0.3 }, dn: { c: d.s.cd || '#fbc02d', a: 0.3 },
        vup: { c: d.s.cu || '#1e88e5', a: 0.65 }, vdn: { c: d.s.cd || '#fbc02d', a: 0.65 },
        poc: { c: '#ff5252', w: 1.5 }, pocExt: false,
      };
      C.c.drawVP(C.p, vp, right ? xr : xl, W, right ? -1 : 1, S, right ? xl : xr);
      d._hh = [{ x: xl, y: yt }, { x: xr, y: yb }];
    };
  }
  const vpUI = [F.color('c', '테두리 색'), F.num('rows', '행 개수', { step: 1 }), F.num('va', '밸류 에어리어(%)', { step: 1 }), F.num('wpct', '폭(%)', { step: 5 }), F.sel('side', '위치', [['left', '왼쪽'], ['right', '오른쪽']]), F.color('cu', '매수 색'), F.color('cd', '매도 색')];
  T.fixedvp = {
    name: '고정 범위 볼륨 프로파일', n: 2, mainOnly: true, noPriceAxis: true,
    defaults: { c: '#2962ff', w: 1, ls: 0, rows: 24, va: 70, wpct: 40, side: 'left', cu: '#1e88e5', cd: '#fbc02d' }, ui: vpUI, draw: vpDraw(false),
    handles: (d, P) => d._hh || P,
    onHandle(d, k, pt) { d.pts[k] = { t: pt.t, p: pt.p }; },
  };
  T.anchoredvp = {
    name: '앵커드 볼륨 프로파일', n: 1, mainOnly: true, noPriceAxis: true,
    defaults: { c: '#2962ff', w: 1, ls: 0, rows: 24, va: 70, wpct: 40, side: 'left', cu: '#1e88e5', cd: '#fbc02d' }, ui: vpUI, draw: vpDraw(true),
    handles: (d, P) => (d._hh ? [d._hh[0]] : P),
  };

  /* ===================== 도형 ===================== */
  const shpD = (o) => D(Object.assign({ c: '#9c27b0', w: 2, fill: true, fc: '#9c27b0', fa: 0.15, tc: null }, o));
  const shpUI = [F.line, F.fill, F.text];
  function centerText(g, d, x, y) { if (d.s.text) g.text(d.s.text, x, y, txtSt(d, { align: 'center', tAlign: 'center', base: 'middle', hit: false })); }
  T.brush = {
    name: '브러시', n: 2, free: true, defaults: D({ c: '#2962ff', w: 2, fill: false, fc: '#2962ff', fa: 0.15 }), ui: [F.line, F.fill],
    draw(g, d, P) { smoothPath(g, P, { c: d.s.c, w: d.s.w, ls: d.s.ls, fill: fillOf(d) }); },
    handles: () => [],
  };
  T.highlighter = {
    name: '하이라이터', n: 2, free: true, defaults: { c: '#ffeb3b', w: 14, ls: 0, op: 0.35 }, ui: [F.color('c', '색'), F.num('w', '두께', { step: 1 }), F.num('op', '불투명도(0~1)', { step: 0.05 })],
    draw(g, d, P) { smoothPath(g, P, { c: U.rgba(d.s.c, d.s.op != null ? d.s.op : 0.35), w: d.s.w }); },
    handles: () => [],
  };
  T.arrowmarker = {
    name: '화살표 마커', n: 2, defaults: D({ c: '#2962ff', w: 1, fc: '#2962ff', tc: null }), ui: [F.color('c', '색'), F.text],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, v = sub(b, a), L0 = len(v);
      if (L0 < 2) return;
      const u = unit(v), n = { x: -u.y, y: u.x };
      const hl = Math.min(24, L0 * 0.5), hw = 11, sw = 4.5;
      const neck = sub(b, mul(u, hl));
      const pts = [add(a, mul(n, sw)), add(neck, mul(n, sw)), add(neck, mul(n, hw)), b, sub(neck, mul(n, hw)), sub(neck, mul(n, sw)), sub(a, mul(n, sw))];
      g.poly(pts, { close: true, fill: d.s.c, c: d.s.c, w: 1 });
      if (d.s.text) g.text(d.s.text, a.x - u.x * 6, a.y - u.y * 6, txtSt(d, { align: u.x > 0 ? 'right' : 'left', base: 'middle', hit: false }));
    },
  };
  T.arrow = {
    name: '화살표', n: 2, defaults: D({ c: '#2962ff', w: 2, arrowS: false }), ui: [F.line, F.bool('arrowS', '양쪽 화살표'), F.text, F.tpos],
    draw(g, d, P) { if (P.length < 2) return; g.line(P[0].x, P[0].y, P[1].x, P[1].y, lst(d, { arrowE: true, arrowS: d.s.arrowS })); lineText(g, d, P[0], P[1]); },
  };
  function markArrow(up) {
    return {
      name: up ? '위 화살표 표시' : '아래 화살표 표시', n: 1, defaults: D({ c: up ? '#089981' : '#f23645', tc: null, size: 18 }), ui: [F.color('c', '색'), F.num('size', '크기', { step: 1 }), F.text],
      draw(g, d, P) {
        const { x, y } = P[0], s = d.s.size || 18, k = up ? 1 : -1;
        const pts = [{ x, y }, { x: x + s * 0.55, y: y + k * s * 0.55 }, { x: x + s * 0.2, y: y + k * s * 0.55 }, { x: x + s * 0.2, y: y + k * s }, { x: x - s * 0.2, y: y + k * s }, { x: x - s * 0.2, y: y + k * s * 0.55 }, { x: x - s * 0.55, y: y + k * s * 0.55 }];
        g.poly(pts, { close: true, fill: d.s.c, c: d.s.c, w: 1 });
        if (d.s.text) g.text(d.s.text, x, y + k * (s + 4), txtSt(d, { align: 'center', tAlign: 'center', base: up ? 'top' : 'bottom' }));
      },
    };
  }
  T.arrowup = markArrow(true);
  T.arrowdown = markArrow(false);
  function markArrowH(right) {
    return {
      name: right ? '오른쪽 화살표 표시' : '왼쪽 화살표 표시', n: 1, defaults: D({ c: '#2962ff', tc: null, size: 18 }), ui: [F.color('c', '색'), F.num('size', '크기', { step: 1 }), F.text],
      draw(g, d, P) {
        const { x, y } = P[0], s = d.s.size || 18, k = right ? -1 : 1;
        const pts = [{ x, y }, { x: x + k * s * 0.55, y: y - s * 0.55 }, { x: x + k * s * 0.55, y: y - s * 0.2 }, { x: x + k * s, y: y - s * 0.2 }, { x: x + k * s, y: y + s * 0.2 }, { x: x + k * s * 0.55, y: y + s * 0.2 }, { x: x + k * s * 0.55, y: y + s * 0.55 }];
        g.poly(pts, { close: true, fill: d.s.c, c: d.s.c, w: 1 });
        if (d.s.text) g.text(d.s.text, x + k * (s + 4), y, txtSt(d, { align: right ? 'right' : 'left', base: 'middle' }));
      },
    };
  }
  T.arrowleft = markArrowH(false);
  T.arrowright = markArrowH(true);
  T.rect = {
    name: '사각형', n: 2, key: 'Alt+Shift+R', defaults: shpD({ extL: false, extR: false }), ui: [F.line, F.fill, F.ext, F.text],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P;
      let x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      if (d.s.extL) x0 = -10;
      if (d.s.extR) x1 = C.W + 10;
      g.rect(x0, Math.min(a.y, b.y), x1 - x0, Math.abs(b.y - a.y), lst(d, { fill: fillOf(d) }));
      centerText(g, d, (Math.min(a.x, b.x) + Math.max(a.x, b.x)) / 2, (a.y + b.y) / 2);
    },
    handles: (d, P) => (P.length < 2 ? P : [P[0], P[1], { x: P[0].x, y: P[1].y }, { x: P[1].x, y: P[0].y }]),
    onHandle(d, k, pt) {
      if (k < 2) d.pts[k] = pt;
      else if (k === 2) { d.pts[0] = { t: pt.t, p: d.pts[0].p }; d.pts[1] = { t: d.pts[1].t, p: pt.p }; }
      else { d.pts[1] = { t: pt.t, p: d.pts[1].p }; d.pts[0] = { t: d.pts[0].t, p: pt.p }; }
    },
  };
  T.rotrect = {
    name: '회전 사각형', n: 3, defaults: shpD(), ui: shpUI,
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const u = unit(sub(b, a)), n = { x: -u.y, y: u.x };
      const w = (P[2].x - a.x) * n.x + (P[2].y - a.y) * n.y;
      const pts = [a, b, add(b, mul(n, w)), add(a, mul(n, w))];
      g.poly(pts, lst(d, { close: true, fill: fillOf(d) }));
      const c = mid(a, pts[2]);
      centerText(g, d, c.x, c.y);
    },
  };
  T.path = {
    name: '경로', n: 0, defaults: D({ c: '#2962ff', w: 2, arrowE: true }), ui: [F.line, F.bool('arrowE', '끝 화살표')],
    draw(g, d, P) { g.poly(P, lst(d, { arrowE: d.s.arrowE })); },
  };
  T.circle = {
    name: '원', n: 2, defaults: shpD(), ui: shpUI,
    draw(g, d, P) { if (P.length < 2) return; const [a, b] = P; g.circle(a.x, a.y, len(sub(b, a)), lst(d, { fill: fillOf(d) })); centerText(g, d, a.x, a.y); },
  };
  T.ellipse = {
    name: '타원', n: 2, defaults: shpD(), ui: shpUI,
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P, c = mid(a, b);
      g.ellipse(c.x, c.y, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, lst(d, { fill: fillOf(d) }));
      centerText(g, d, c.x, c.y);
    },
  };
  T.polyline = {
    name: '폴리라인(다각형)', n: 0, min: 3, defaults: shpD(), ui: [F.line, F.fill],
    draw(g, d, P) { g.poly(P, lst(d, { close: P.length > 2, fill: P.length > 2 ? fillOf(d) : null })); },
  };
  T.triangle = {
    name: '삼각형', n: 3, defaults: shpD(), ui: shpUI,
    draw(g, d, P) {
      g.poly(P, lst(d, { close: P.length > 2, fill: P.length > 2 ? fillOf(d) : null }));
      if (P.length > 2) centerText(g, d, (P[0].x + P[1].x + P[2].x) / 3, (P[0].y + P[1].y + P[2].y) / 3);
    },
  };
  T.arc = {
    name: '호', n: 3, defaults: shpD(), ui: [F.line, F.fill],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const c = P[2], cc = U.circum(a, c, b);
      if (!cc || cc.r > 20000) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const ta = Math.atan2(a.y - cc.y, a.x - cc.x), tb = Math.atan2(b.y - cc.y, b.x - cc.x), tc = Math.atan2(c.y - cc.y, c.x - cc.x);
      const norm = (x) => ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const ccw = !(norm(tc - ta) < norm(tb - ta));
      const ctx = g.ctx;
      ctx.beginPath(); ctx.arc(cc.x, cc.y, cc.r, ta, tb, ccw);
      if (d.s.fill) { ctx.closePath(); ctx.fillStyle = fillOf(d); ctx.fill(); }
      ctx.beginPath(); ctx.arc(cc.x, cc.y, cc.r, ta, tb, ccw);
      ctx.strokeStyle = d.s.c; ctx.lineWidth = d.s.w; ctx.setLineDash(CL.DASH(d.s.ls, d.s.w)); ctx.stroke(); ctx.setLineDash([]);
      const pts = [];
      let span = ccw ? -norm(ta - tb) : norm(tb - ta);
      for (let k = 0; k <= 40; k++) { const t = ta + (span * k) / 40; pts.push({ x: cc.x + cc.r * Math.cos(t), y: cc.y + cc.r * Math.sin(t) }); }
      g.hits.push({ k: 'p', pts, close: !!d.s.fill, fill: !!d.s.fill });
    },
  };
  T.curve = {
    name: '곡선', n: 3, defaults: D({ c: '#2962ff', w: 2 }), ui: [F.line],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const ctrl = sub(mul(P[2], 2), mid(a, b));
      const pts = [];
      for (let k = 0; k <= 48; k++) pts.push(bez2(a, ctrl, b, k / 48));
      g.poly(pts, lst(d));
    },
  };
  T.dcurve = {
    name: '이중 곡선', n: 3, defaults: D({ c: '#2962ff', w: 2 }), ui: [F.line],
    draw(g, d, P) {
      if (P.length < 2) return;
      const [a, b] = P;
      if (P.length < 3) { g.line(a.x, a.y, b.x, b.y, lst(d)); return; }
      const M = mid(a, b), c1 = P[2], c2 = sub(mul(M, 2), P[2]);
      const pts = [];
      for (let k = 0; k <= 60; k++) pts.push(bez3(a, c1, c2, b, k / 60));
      g.poly(pts, lst(d));
    },
  };

  /* ===================== 주석 ===================== */
  const txtD = (o) => Object.assign({ c: '#2962ff', w: 1, ls: 0, text: '', tc: '#2962ff', fs: 14, bold: false, italic: false, fill: false, fc: '#2962ff', fa: 0.15, bd: false }, o);
  const txtUI = [F.textOnly, F.bool('fill', '배경'), F.color('fc', '배경 색'), F.num('fa', '배경 불투명도', { step: 0.05 }), F.bool('bd', '테두리'), F.color('c', '테두리 색')];
  function plainText(g, d, P) {
    const box = g.text(d.s.text || '텍스트', P[0].x, P[0].y, txtSt(d, { c: d.s.tc, base: 'top', bg: d.s.fill ? U.rgba(d.s.fc, d.s.fa) : null, bd: d.s.bd ? d.s.c : null, pad: d.s.fill || d.s.bd ? 5 : 1 }));
    if (!box) g.circle(P[0].x, P[0].y, 4, { c: d.s.c });
  }
  T.text = { name: '텍스트', n: 1, text: true, defaults: txtD(), ui: txtUI, draw: plainText };
  T.atext = { name: '고정 텍스트(화면)', n: 1, text: true, screen: true, noAxis: true, defaults: txtD(), ui: txtUI, draw: plainText };
  function noteDraw(g, d, P) {
    const { x, y } = P[0];
    g.circle(x, y, 9, { c: d.s.c, w: 1.5, fill: U.rgba(d.s.c, 0.9) });
    g.text('✎', x, y + 0.5, { align: 'center', base: 'middle', c: '#fff', size: 11, hit: false });
    if (g.hl && d.s.text) g.text(d.s.text, x + 14, y - 10, txtSt(d, { c: '#d1d4dc', bg: 'rgba(24,24,24,0.97)', bd: d.s.c, pad: 8, size: d.s.fs || 13, hit: false }));
  }
  const noteD = txtD({ c: '#2962ff', tc: '#d1d4dc', fs: 13 });
  T.note = { name: '노트', n: 1, text: true, defaults: noteD, ui: [F.textOnly, F.color('c', '아이콘 색')], draw: noteDraw };
  T.anote = { name: '고정 노트(화면)', n: 1, text: true, screen: true, noAxis: true, defaults: noteD, ui: [F.textOnly, F.color('c', '아이콘 색')], draw: noteDraw };
  T.callout = {
    name: '콜아웃', n: 2, text: true, defaults: txtD({ c: '#2962ff', tc: '#ffffff', fill: true, fc: '#2962ff', fa: 1 }), ui: [F.textOnly, F.color('fc', '배경 색'), F.color('c', '테두리 색')],
    askText: true,
    draw(g, d, P) {
      if (P.length < 2) { g.circle(P[0].x, P[0].y, 3, { c: d.s.c }); return; }
      const [a, b] = P;
      const ctx = g.ctx;
      ctx.font = (d.s.bold ? '600 ' : '') + (d.s.fs || 14) + 'px ' + CL.FONT;
      const lines = (d.s.text || '콜아웃').split('\n');
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16, th = lines.length * Math.round((d.s.fs || 14) * 1.3) + 12;
      const bx = b.x - tw / 2, by = b.y - th / 2;
      const v = unit(sub(a, b)), n = { x: -v.y, y: v.x }, w0 = Math.min(10, tw / 3);
      const bg = U.rgba(d.s.fc, d.s.fa != null ? d.s.fa : 1);
      g.poly([add(b, mul(n, w0)), a, sub(b, mul(n, w0))], { close: true, fill: bg, c: d.s.c, w: 1 });
      g.text(lines.join('\n'), bx, by, txtSt(d, { c: d.s.tc, bg, bd: d.s.c, pad: 6 }));
    },
  };
  T.comment = {
    name: '코멘트', n: 1, text: true, defaults: txtD({ c: '#2962ff', tc: '#ffffff', fill: true, fc: '#2962ff', fa: 1 }), ui: [F.textOnly, F.color('fc', '배경 색')],
    draw(g, d, P) {
      const { x, y } = P[0];
      const box = g.text(d.s.text || '코멘트', x, y - 12, txtSt(d, { c: d.s.tc, base: 'bottom', bg: U.rgba(d.s.fc, d.s.fa != null ? d.s.fa : 1), pad: 7, r: 8 }));
      if (box) g.poly([{ x, y }, { x: x + 4, y: y - 13 }, { x: x + 14, y: y - 13 }], { close: true, fill: U.rgba(d.s.fc, d.s.fa != null ? d.s.fa : 1), noStroke: true });
    },
  };
  T.pricelabel = {
    name: '가격 라벨', n: 1, defaults: txtD({ c: '#2962ff', tc: '#ffffff', fs: 12, fill: true, fc: '#2962ff', fa: 1 }), ui: [F.color('fc', '배경 색'), F.color('tc', '글자 색'), F.num('fs', '글자 크기', { step: 1 })],
    draw(g, d, P, C) {
      const { x, y } = P[0];
      g.poly([{ x, y }, { x: x + 8, y: y - 10 }, { x: x + 16, y: y - 10 }], { close: true, fill: U.rgba(d.s.fc, 1), noStroke: true });
      g.text(C.fp(d.pts[0].p), x + 4, y - 9, { c: d.s.tc, size: d.s.fs || 12, base: 'bottom', bg: U.rgba(d.s.fc, 1), pad: 5 });
    },
  };
  T.pricenote = {
    name: '가격 노트', n: 2, defaults: D({ c: '#2962ff', w: 1, tc: '#ffffff', fs: 12 }), ui: [F.line],
    draw(g, d, P, C) {
      if (P.length < 2) return;
      const [a, b] = P;
      g.line(a.x, a.y, b.x, b.y, lst(d));
      g.circle(a.x, a.y, 3, { c: d.s.c, fill: d.s.c });
      g.text(C.fp(d.pts[0].p), b.x + (b.x >= a.x ? 4 : -4), b.y, { align: b.x >= a.x ? 'left' : 'right', base: 'middle', c: '#fff', bg: d.s.c, size: d.s.fs || 12, pad: 4 });
    },
  };
  T.signpost = {
    name: '사인포스트', n: 1, text: true, defaults: txtD({ c: '#2962ff', tc: '#ffffff', fs: 13, text: '', down: false }), ui: [F.textOnly, F.color('c', '색'), F.bool('down', '아래쪽으로')],
    draw(g, d, P) {
      const { x, y } = P[0], k = d.s.down ? 1 : -1, hgt = 46;
      g.line(x, y, x, y + k * hgt, { c: d.s.c, w: 1.5 });
      g.circle(x, y, 3, { c: d.s.c, fill: d.s.c, hit: false });
      g.text(d.s.text || '📍', x, y + k * hgt, txtSt(d, { c: d.s.tc, align: 'center', tAlign: 'center', base: d.s.down ? 'top' : 'bottom', bg: d.s.c, pad: 6, r: 10 }));
    },
  };
  T.flag = {
    name: '깃발 표시', n: 1, defaults: { c: '#f23645', w: 1, ls: 0 }, ui: [F.color('c', '색')],
    draw(g, d, P) {
      const { x, y } = P[0];
      g.line(x, y, x, y - 24, { c: d.s.c, w: 2 });
      g.poly([{ x, y: y - 24 }, { x: x + 16, y: y - 19 }, { x, y: y - 13 }], { close: true, fill: d.s.c, c: d.s.c, w: 1 });
    },
  };
  T.emoji = {
    name: '이모지·아이콘', n: 1, defaults: { c: '#2962ff', w: 1, ls: 0, text: '🚀', fs: 30 }, ui: [F.str('text', '이모지/문자'), F.num('fs', '크기', { step: 2 })],
    draw(g, d, P) { g.text(d.s.text || '🚀', P[0].x, P[0].y, { align: 'center', base: 'middle', size: d.s.fs || 30, c: '#fff' }); },
  };

  /* ===================== 툴바 그룹 ===================== */
  CL.TOOLGROUPS = [
    { id: 'lines', name: '추세선 도구', tools: ['|선', 'trendline', 'ray', 'infoline', 'extended', 'trendangle', 'hline', 'hray', 'vline', 'crossline', '|채널', 'channel', 'regression', 'flattop', 'disjoint', '|피치포크', 'pitchfork', 'schiff', 'modschiff', '|자동', '@autotl'] },
    { id: 'fib', name: '피보나치·간 도구', tools: ['|피보나치', 'fibret', 'fibext', 'fibchannel', 'fibtime', 'fibfan', 'fibtrendtime', 'fibcircles', 'fibspiral', 'fibarcs', 'fibwedge', 'pitchfan', '|간(Gann)', 'gannbox', 'gannsquare', 'gannfan'] },
    { id: 'pattern', name: '패턴 도구', tools: ['|차트 패턴', 'xabcd', 'cypher', 'hs', 'abcd', 'trianglepat', 'threedrives', '|엘리엇 파동', 'elliott5', 'elliottabc', 'elliotttri', 'elliottwxy', 'elliottwxyxz', '|사이클', 'cyclic', 'timecycles', 'sine'] },
    { id: 'forecast', name: '예측·측정 도구', tools: ['|포지션', 'longpos', 'shortpos', 'forecast', 'barspattern', 'ghostfeed', '|측정', 'daterange', 'pricerange', 'dprange', '|거래량 기반', 'avwap', 'fixedvp', 'anchoredvp'] },
    { id: 'shape', name: '도형 도구', tools: ['|브러시', 'brush', 'highlighter', '|화살표', 'arrowmarker', 'arrow', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '|도형', 'rect', 'rotrect', 'path', 'circle', 'ellipse', 'polyline', 'triangle', 'arc', 'curve', 'dcurve'] },
    { id: 'text', name: '주석 도구', tools: ['|텍스트·노트', 'text', 'atext', 'note', 'anote', 'callout', 'comment', 'pricelabel', 'pricenote', 'signpost', 'flag'] },
  ];
  CL.EMOJIS = ['🚀', '📈', '📉', '💰', '💎', '🔥', '⚠️', '✅', '❌', '⭐', '🐂', '🐻', '👀', '🎯', '💡', '🔔', '📌', '🏁', '⛔', '💥', '🤑', '😱', '👍', '👎', '❓', '❗', '⬆️', '⬇️', '➡️', '⏰'];
})();
