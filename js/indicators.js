/* TradingHyun — indicators.js : 기술적 지표 계산(TA) + 지표 정의(IND) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U;
  const TA = (CL.TA = {});
  const IND = (CL.IND = {});

  const arr = (n) => new Array(n).fill(NaN);
  TA.arr = arr;

  TA.src = function (b, s) {
    const n = b.length, o = new Array(n);
    switch (s) {
      case 'open': for (let i = 0; i < n; i++) o[i] = b[i].o; break;
      case 'high': for (let i = 0; i < n; i++) o[i] = b[i].h; break;
      case 'low': for (let i = 0; i < n; i++) o[i] = b[i].l; break;
      case 'hl2': for (let i = 0; i < n; i++) o[i] = (b[i].h + b[i].l) / 2; break;
      case 'hlc3': for (let i = 0; i < n; i++) o[i] = (b[i].h + b[i].l + b[i].c) / 3; break;
      case 'ohlc4': for (let i = 0; i < n; i++) o[i] = (b[i].o + b[i].h + b[i].l + b[i].c) / 4; break;
      case 'volume': for (let i = 0; i < n; i++) o[i] = b[i].v; break;
      default: for (let i = 0; i < n; i++) o[i] = b[i].c;
    }
    return o;
  };
  TA.sma = function (a, n) {
    const o = arr(a.length);
    let sum = 0, run = 0;
    for (let i = 0; i < a.length; i++) {
      const v = a[i];
      if (v !== v) { sum = 0; run = 0; continue; }
      sum += v; run++;
      if (run > n) { sum -= a[i - n]; run = n; }
      if (run >= n) o[i] = sum / n;
    }
    return o;
  };
  TA.sum = function (a, n) {
    const o = TA.sma(a, n);
    for (let i = 0; i < o.length; i++) o[i] *= n;
    return o;
  };
  TA.ema = function (a, n, alpha) {
    const o = arr(a.length), k = alpha || 2 / (n + 1);
    let prev = NaN, run = 0, sum = 0;
    for (let i = 0; i < a.length; i++) {
      const v = a[i];
      if (prev !== prev) {
        if (v !== v) { run = 0; sum = 0; continue; }
        sum += v; run++;
        if (run === n) { prev = sum / n; o[i] = prev; }
        continue;
      }
      if (v === v) prev = prev + k * (v - prev);
      o[i] = prev;
    }
    return o;
  };
  TA.rma = (a, n) => TA.ema(a, n, 1 / n);
  TA.wma = function (a, n) {
    const o = arr(a.length), den = (n * (n + 1)) / 2;
    for (let i = n - 1; i < a.length; i++) {
      let s = 0, ok = true;
      for (let j = 0; j < n; j++) { const v = a[i - j]; if (v !== v) { ok = false; break; } s += v * (n - j); }
      if (ok) o[i] = s / den;
    }
    return o;
  };
  TA.hma = function (a, n) {
    const h = TA.wma(a, Math.max(1, Math.floor(n / 2))), f = TA.wma(a, n);
    return TA.wma(h.map((v, i) => 2 * v - f[i]), Math.max(1, Math.floor(Math.sqrt(n))));
  };
  TA.vwma = function (a, v, n) {
    const pv = TA.sma(a.map((x, i) => x * v[i]), n), sv = TA.sma(v, n);
    return pv.map((x, i) => (sv[i] ? x / sv[i] : NaN));
  };
  TA.dema = function (a, n) { const e = TA.ema(a, n), e2 = TA.ema(e, n); return e.map((x, i) => 2 * x - e2[i]); };
  TA.tema = function (a, n) {
    const e = TA.ema(a, n), e2 = TA.ema(e, n), e3 = TA.ema(e2, n);
    return e.map((x, i) => 3 * (x - e2[i]) + e3[i]);
  };
  TA.MA_TYPES = ['SMA', 'EMA', 'WMA', 'HMA', 'VWMA', 'RMA', 'DEMA', 'TEMA'];
  TA.ma = function (type, a, n, vol) {
    n = Math.max(1, n | 0);
    switch (type) {
      case 'EMA': return TA.ema(a, n);
      case 'WMA': return TA.wma(a, n);
      case 'HMA': return TA.hma(a, n);
      case 'VWMA': return vol ? TA.vwma(a, vol, n) : TA.sma(a, n);
      case 'RMA': return TA.rma(a, n);
      case 'DEMA': return TA.dema(a, n);
      case 'TEMA': return TA.tema(a, n);
      default: return TA.sma(a, n);
    }
  };
  TA.stdev = function (a, n) {
    const o = arr(a.length), m = TA.sma(a, n);
    for (let i = n - 1; i < a.length; i++) {
      if (m[i] !== m[i]) continue;
      let s = 0;
      for (let j = 0; j < n; j++) { const d = a[i - j] - m[i]; s += d * d; }
      o[i] = Math.sqrt(s / n);
    }
    return o;
  };
  TA.highest = function (a, n) {
    const o = arr(a.length);
    for (let i = n - 1; i < a.length; i++) { let m = -Infinity; for (let j = 0; j < n; j++) { const v = a[i - j]; if (v > m) m = v; } o[i] = m === -Infinity ? NaN : m; }
    return o;
  };
  TA.lowest = function (a, n) {
    const o = arr(a.length);
    for (let i = n - 1; i < a.length; i++) { let m = Infinity; for (let j = 0; j < n; j++) { const v = a[i - j]; if (v < m) m = v; } o[i] = m === Infinity ? NaN : m; }
    return o;
  };
  TA.rsi = function (a, n) {
    const N = a.length, up = arr(N), dn = arr(N);
    for (let i = 1; i < N; i++) { const d = a[i] - a[i - 1]; if (d !== d) continue; up[i] = d > 0 ? d : 0; dn[i] = d < 0 ? -d : 0; }
    const ru = TA.rma(up, n), rd = TA.rma(dn, n), o = arr(N);
    for (let i = 0; i < N; i++) {
      const u = ru[i], d = rd[i];
      if (u !== u || d !== d) continue;
      o[i] = d === 0 ? 100 : u === 0 ? 0 : 100 - 100 / (1 + u / d);
    }
    return o;
  };
  TA.tr = function (b) {
    const o = arr(b.length);
    for (let i = 0; i < b.length; i++) {
      const x = b[i];
      if (i === 0) { o[i] = x.h - x.l; continue; }
      const pc = b[i - 1].c;
      o[i] = Math.max(x.h - x.l, Math.abs(x.h - pc), Math.abs(x.l - pc));
    }
    return o;
  };
  TA.atr = (b, n) => TA.rma(TA.tr(b), n);
  TA.stochK = function (c, h, l, n) {
    const hh = TA.highest(h, n), ll = TA.lowest(l, n);
    return c.map((v, i) => { const r = hh[i] - ll[i]; return r > 0 ? (100 * (v - ll[i])) / r : r === 0 ? 50 : NaN; });
  };
  TA.cum = function (a) { const o = new Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { if (a[i] === a[i]) s += a[i]; o[i] = s; } return o; };

  TA.pivots = function (a, L, R, high) {
    const out = [];
    for (let i = L; i < a.length - R; i++) {
      const v = a[i];
      if (v !== v) continue;
      let ok = true;
      for (let j = 1; j <= L && ok; j++) { const w = a[i - j]; if (w !== w || (high ? w >= v : w <= v)) ok = false; }
      for (let j = 1; j <= R && ok; j++) { const w = a[i + j]; if (w !== w || (high ? w > v : w < v)) ok = false; }
      if (ok) out.push(i);
    }
    return out;
  };
  /* 다이버전스(정규): 오실레이터 피벗 기준 */
  TA.divergence = function (osc, bars, L, R, rmin, rmax) {
    const res = [];
    const pl = TA.pivots(osc, L, R, false), ph = TA.pivots(osc, L, R, true);
    for (let k = 1; k < pl.length; k++) {
      const a = pl[k - 1], b = pl[k], d = b - a;
      if (d < rmin || d > rmax) continue;
      if (osc[b] > osc[a] && bars[b].l < bars[a].l) res.push({ i0: a, i1: b, v0: osc[a], v1: osc[b], bull: true });
    }
    for (let k = 1; k < ph.length; k++) {
      const a = ph[k - 1], b = ph[k], d = b - a;
      if (d < rmin || d > rmax) continue;
      if (osc[b] < osc[a] && bars[b].h > bars[a].h) res.push({ i0: a, i1: b, v0: osc[a], v1: osc[b], bull: false });
    }
    return res;
  };
  /* 거래량 프로파일 (봉의 고저 범위에 거래량을 비례 분배) */
  TA.vprofile = function (bars, i0, i1, rows, vaPct) {
    const n = bars.length;
    i0 = Math.max(0, Math.round(i0)); i1 = Math.min(n - 1, Math.round(i1));
    if (i1 < i0 || n === 0) return null;
    rows = Math.max(2, Math.min(500, rows | 0));
    let lo = Infinity, hi = -Infinity;
    for (let i = i0; i <= i1; i++) { if (bars[i].l < lo) lo = bars[i].l; if (bars[i].h > hi) hi = bars[i].h; }
    if (!(hi > lo)) { hi = lo * 1.001 + 1e-9; }
    const step = (hi - lo) / rows, up = new Float64Array(rows), dn = new Float64Array(rows);
    for (let i = i0; i <= i1; i++) {
      const b = bars[i], v = b.v;
      if (!v) continue;
      const tgt = b.c >= b.o ? up : dn;
      const span = b.h - b.l;
      let r0 = Math.floor((b.l - lo) / step), r1 = Math.floor((b.h - lo) / step);
      r0 = U.clamp(r0, 0, rows - 1); r1 = U.clamp(r1, 0, rows - 1);
      if (span <= 0 || r0 === r1) { tgt[r0] += v; continue; }
      for (let r = r0; r <= r1; r++) {
        const a = Math.max(b.l, lo + r * step), z = Math.min(b.h, lo + (r + 1) * step);
        if (z > a) tgt[r] += (v * (z - a)) / span;
      }
    }
    let poc = 0, max = 0, total = 0;
    for (let r = 0; r < rows; r++) { const t = up[r] + dn[r]; total += t; if (t > max) { max = t; poc = r; } }
    let a = poc, z = poc, acc = max;
    const target = total * (vaPct || 0.7);
    while (acc < target && (a > 0 || z < rows - 1)) {
      const below = a > 0 ? up[a - 1] + dn[a - 1] : -1, above = z < rows - 1 ? up[z + 1] + dn[z + 1] : -1;
      if (above >= below) { z++; acc += above; } else { a--; acc += below; }
    }
    return { lo, hi, step, rows, up, dn, poc, vaLo: a, vaHi: z, max, total };
  };
  TA.vwapFrom = function (bars, i0, src) {
    const n = bars.length, o = arr(n);
    let pv = 0, vv = 0;
    for (let i = Math.max(0, i0); i < n; i++) {
      const b = bars[i];
      const p = src === 'close' ? b.c : (b.h + b.l + b.c) / 3;
      pv += p * b.v; vv += b.v;
      o[i] = vv > 0 ? pv / vv : p;
    }
    return o;
  };

  /* ===================== 지표 정의 ===================== */
  const SRC = ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4'];
  const inp = (k, n, t, v, extra) => Object.assign({ k, n, t, v }, extra || {});
  IND._cats = { trend: '이동평균·추세', vol: '거래량', osc: '오실레이터', vola: '변동성' };

  IND.vol = {
    name: '거래량 (Volume)', short: 'Vol', cat: 'vol', pane: 'main', fmt: 'vol', overlayVol: true,
    inputs: [inp('ma', '이동평균 표시', 'bool', true), inp('maLen', '이동평균 길이', 'int', 20, { min: 1 }), inp('sep', '별도 창에 표시', 'bool', false), inp('h', '차지 높이(%)', 'int', 22, { min: 5, max: 80 })],
    plots: [
      { k: 'up', n: '상승 거래량', c: '#26a69a', a: 0.5, t: 'col' },
      { k: 'dn', n: '하락 거래량', c: '#ef5350', a: 0.5, t: 'col' },
      { k: 'maV', n: '거래량 MA', c: '#2962ff', w: 1 },
    ],
    paneOf: (I) => (I.sep ? 'sub' : 'main'),
    zero: true,
    legend(ch, ind, i) {
      const o = ind._o || {}, b = ch.bars[i], out = [];
      if (o.v && b) { const s = ch.indStyle(ind, b.c >= b.o ? 'up' : 'dn'); out.push({ v: U.fmtVol(o.v[i]), c: s.c }); }
      if (o.maV) { const s = ch.indStyle(ind, 'maV'); if (s.vis !== false) out.push({ v: U.fmtVol(o.maV[i]), c: s.c }); }
      return out;
    },
    label: (I) => 'Vol' + (I.ma ? ' · MA ' + I.maLen : ''),
    calc(b, I) {
      const v = TA.src(b, 'volume');
      return { v, maV: I.ma ? TA.sma(v, I.maLen) : null };
    },
    scaleKeys: ['v', 'maV'],
    render(R, ind, o) {
      const I = ind.inp, bars = R.bars, su = R.st('up'), sd = R.st('dn');
      let y = R.y, base = R.y(0);
      if (!I.sep) {
        let mx = 0;
        for (let i = R.from; i <= R.to; i++) { if (o.v[i] > mx) mx = o.v[i]; if (o.maV && o.maV[i] > mx) mx = o.maV[i]; }
        if (!mx) return;
        const bot = R.pane.top + R.pane.h, hh = (R.pane.h * I.h) / 100;
        y = (v) => bot - (v / mx) * hh;
        base = bot;
      }
      R.hist(o.v, (i) => (bars[i].c >= bars[i].o ? U.rgba(su.c, su.a) : U.rgba(sd.c, sd.a)), base, y);
      if (o.maV) R.plot('maV', o.maV, { y });
    },
  };
  IND.ma = {
    name: '이동평균 (MA)', short: 'MA', cat: 'trend', pane: 'main', fmt: 'price',
    inputs: [inp('len', '길이', 'int', 20, { min: 1 }), inp('type', '유형', 'sel', 'SMA', { o: TA.MA_TYPES }), inp('src', '소스', 'src', 'close'), inp('off', '오프셋', 'int', 0)],
    plots: [{ k: 'ma', n: 'MA', c: '#2962ff', w: 1.5 }],
    label: (I) => I.type + ' ' + I.len + (I.src !== 'close' ? ' ' + I.src : ''),
    calc(b, I) { return { ma: TA.ma(I.type, TA.src(b, I.src), I.len, TA.src(b, 'volume')), _off: { ma: I.off | 0 } }; },
  };
  const MAS_DEF = [[5, 1, '#f7525f'], [10, 0, '#ff9800'], [20, 1, '#ffd54f'], [60, 1, '#22ab94'], [120, 1, '#2962ff'], [240, 0, '#ab47bc']];
  IND.mas = {
    name: '다중 이동평균 (5·20·60·120)', short: 'MAs', cat: 'trend', pane: 'main', fmt: 'price',
    inputs: [inp('type', '유형', 'sel', 'SMA', { o: TA.MA_TYPES }), inp('src', '소스', 'src', 'close')].concat(
      ...MAS_DEF.map((d, i) => [inp('on' + i, (i + 1) + '번 사용', 'bool', !!d[1]), inp('len' + i, (i + 1) + '번 길이', 'int', d[0], { min: 1 })])
    ),
    plots: MAS_DEF.map((d, i) => ({ k: 'm' + i, n: 'MA ' + (i + 1), c: d[2], w: 1.2 })),
    label: (I) => I.type + ' ' + MAS_DEF.map((d, i) => (I['on' + i] ? I['len' + i] : null)).filter((x) => x).join(' · '),
    calc(b, I) {
      const s = TA.src(b, I.src), v = TA.src(b, 'volume'), o = {};
      MAS_DEF.forEach((d, i) => { o['m' + i] = I['on' + i] ? TA.ma(I.type, s, I['len' + i], v) : null; });
      return o;
    },
  };
  IND.bb = {
    name: '볼린저 밴드 (BB)', short: 'BB', cat: 'vola', pane: 'main', fmt: 'price',
    inputs: [inp('len', '길이', 'int', 20, { min: 1 }), inp('mult', '표준편차 배수', 'float', 2, { step: 0.1 }), inp('src', '소스', 'src', 'close'), inp('type', '기준선 유형', 'sel', 'SMA', { o: TA.MA_TYPES })],
    plots: [{ k: 'mid', n: '기준선', c: '#ff6d00', w: 1 }, { k: 'up', n: '상단', c: '#2962ff', w: 1 }, { k: 'lo', n: '하단', c: '#2962ff', w: 1 }, { k: 'bg', n: '배경', c: '#2962ff', a: 0.06, t: 'fill' }],
    label: (I) => 'BB ' + I.len + ' ' + I.mult,
    calc(b, I) {
      const s = TA.src(b, I.src), m = TA.ma(I.type, s, I.len, TA.src(b, 'volume')), sd = TA.stdev(s, I.len);
      return { mid: m, up: m.map((x, i) => x + I.mult * sd[i]), lo: m.map((x, i) => x - I.mult * sd[i]) };
    },
    render(R, ind, o) { R.fillSt(o.up, o.lo, 'bg'); R.plot('mid', o.mid); R.plot('up', o.up); R.plot('lo', o.lo); },
  };
  IND.env = {
    name: '엔벨로프 (Envelope)', short: 'Env', cat: 'vola', pane: 'main', fmt: 'price',
    inputs: [inp('len', '길이', 'int', 20, { min: 1 }), inp('pct', '퍼센트(%)', 'float', 10, { step: 0.5 }), inp('type', '유형', 'sel', 'SMA', { o: TA.MA_TYPES }), inp('src', '소스', 'src', 'close')],
    plots: [{ k: 'mid', n: '기준선', c: '#ff6d00', w: 1 }, { k: 'up', n: '상단', c: '#2962ff', w: 1 }, { k: 'lo', n: '하단', c: '#2962ff', w: 1 }, { k: 'bg', n: '배경', c: '#2962ff', a: 0.05, t: 'fill' }],
    label: (I) => 'Env ' + I.len + ' ' + I.pct + '%',
    calc(b, I) { const m = TA.ma(I.type, TA.src(b, I.src), I.len, TA.src(b, 'volume')); const k = I.pct / 100; return { mid: m, up: m.map((x) => x * (1 + k)), lo: m.map((x) => x * (1 - k)) }; },
    render(R, ind, o) { R.fillSt(o.up, o.lo, 'bg'); R.plot('mid', o.mid); R.plot('up', o.up); R.plot('lo', o.lo); },
  };
  IND.vwap = {
    name: 'VWAP (거래량가중평균가)', short: 'VWAP', cat: 'vol', pane: 'main', fmt: 'price',
    inputs: [inp('anchor', '기준 기간', 'sel', '일', { o: ['일', '주', '월'] }), inp('src', '소스', 'src', 'hlc3'), inp('b1', '밴드 1 배수(0=끔)', 'float', 0, { step: 0.5 }), inp('b2', '밴드 2 배수(0=끔)', 'float', 0, { step: 0.5 })],
    plots: [{ k: 'vw', n: 'VWAP', c: '#2962ff', w: 1.5 }, { k: 'u1', n: '상단 1', c: '#4caf50', w: 1 }, { k: 'l1', n: '하단 1', c: '#4caf50', w: 1 }, { k: 'u2', n: '상단 2', c: '#808000', w: 1 }, { k: 'l2', n: '하단 2', c: '#808000', w: 1 }, { k: 'bg', n: '밴드 배경', c: '#4caf50', a: 0.06, t: 'fill' }],
    label: (I) => 'VWAP ' + I.anchor,
    calc(b, I, ctx) {
      const iv = { 일: '1D', 주: '1W', 월: '1M' }[I.anchor] || '1D';
      const tz = (ctx && ctx.tz) || 0, s = TA.src(b, I.src), n = b.length;
      const vw = arr(n), u1 = arr(n), l1 = arr(n), u2 = arr(n), l2 = arr(n), brk = new Array(n).fill(false);
      let key = null, pv = 0, vv = 0, p2v = 0;
      for (let i = 0; i < n; i++) {
        const k = U.barStart(b[i].t, iv, tz);
        if (k !== key) { key = k; pv = 0; vv = 0; p2v = 0; brk[i] = i > 0; }
        const v = b[i].v || 0;
        pv += s[i] * v; vv += v; p2v += s[i] * s[i] * v;
        const m = vv > 0 ? pv / vv : s[i];
        vw[i] = m;
        const sd = vv > 0 ? Math.sqrt(Math.max(0, p2v / vv - m * m)) : 0;
        if (I.b1) { u1[i] = m + sd * I.b1; l1[i] = m - sd * I.b1; }
        if (I.b2) { u2[i] = m + sd * I.b2; l2[i] = m - sd * I.b2; }
      }
      return { vw, u1: I.b1 ? u1 : null, l1: I.b1 ? l1 : null, u2: I.b2 ? u2 : null, l2: I.b2 ? l2 : null, brk };
    },
    render(R, ind, o) {
      const br = { brk: o.brk };
      if (o.u1) { R.fillSt(o.u1, o.l1, 'bg', br); R.plot('u1', o.u1, br); R.plot('l1', o.l1, br); }
      if (o.u2) { R.plot('u2', o.u2, br); R.plot('l2', o.l2, br); }
      R.plot('vw', o.vw, br);
    },
  };
  IND.ichimoku = {
    name: '일목균형표 (Ichimoku)', short: 'Ichi', cat: 'trend', pane: 'main', fmt: 'price',
    inputs: [inp('conv', '전환선 기간', 'int', 9, { min: 1 }), inp('base', '기준선 기간', 'int', 26, { min: 1 }), inp('spanB', '선행스팬2 기간', 'int', 52, { min: 1 }), inp('disp', '후행/선행 이동', 'int', 26, { min: 1 })],
    plots: [
      { k: 'cv', n: '전환선', c: '#2962ff', w: 1 }, { k: 'bs', n: '기준선', c: '#b71c1c', w: 1 }, { k: 'lag', n: '후행스팬', c: '#43a047', w: 1 },
      { k: 'sa', n: '선행스팬1', c: '#a5d6a7', w: 1 }, { k: 'sb', n: '선행스팬2', c: '#ef9a9a', w: 1 },
      { k: 'cu', n: '구름(상승)', c: '#43a047', a: 0.12, t: 'fill' }, { k: 'cd', n: '구름(하락)', c: '#f44336', a: 0.12, t: 'fill' },
    ],
    label: (I) => 'Ichimoku ' + I.conv + ' ' + I.base + ' ' + I.spanB + ' ' + I.disp,
    calc(b, I) {
      const h = TA.src(b, 'high'), l = TA.src(b, 'low'), c = TA.src(b, 'close');
      const mid = (n) => { const hh = TA.highest(h, n), ll = TA.lowest(l, n); return hh.map((x, i) => (x + ll[i]) / 2); };
      const cv = mid(I.conv), bs = mid(I.base), sb = mid(I.spanB), sa = cv.map((x, i) => (x + bs[i]) / 2);
      const d = I.disp - 1;
      return { cv, bs, lag: c, sa, sb, _off: { lag: -d, sa: d, sb: d } };
    },
    render(R, ind, o) {
      const cu = R.st('cu'), cd = R.st('cd');
      if (cu.vis !== false) R.fill(o.sa, o.sb, (i) => (o.sa[i] >= o.sb[i] ? U.rgba(cu.c, cu.a) : U.rgba(cd.c, cd.a)), o._off.sa);
      R.plot('sa', o.sa); R.plot('sb', o.sb); R.plot('lag', o.lag); R.plot('bs', o.bs); R.plot('cv', o.cv);
    },
  };
  IND.supertrend = {
    name: '슈퍼트렌드 (Supertrend)', short: 'ST', cat: 'trend', pane: 'main', fmt: 'price',
    inputs: [inp('len', 'ATR 길이', 'int', 10, { min: 1 }), inp('mult', '배수', 'float', 3, { step: 0.1 })],
    plots: [{ k: 'up', n: '상승 추세', c: '#089981', w: 1.5 }, { k: 'dn', n: '하락 추세', c: '#f23645', w: 1.5 }, { k: 'bg', n: '배경', c: '#787b86', a: 0.08, t: 'fill' }],
    label: (I) => 'Supertrend ' + I.len + ' ' + I.mult,
    calc(b, I) {
      const n = b.length, atr = TA.atr(b, I.len), st = arr(n), dir = arr(n);
      let pl = 0, pu = 0, pst = NaN;
      for (let i = 0; i < n; i++) {
        const src = (b[i].h + b[i].l) / 2;
        let ub = src + I.mult * atr[i], lb = src - I.mult * atr[i];
        const pc = i > 0 ? b[i - 1].c : b[i].c;
        if (atr[i] !== atr[i]) { pl = 0; pu = 0; continue; }
        lb = lb > pl || pc < pl ? lb : pl;
        ub = ub < pu || pc > pu ? ub : pu;
        let d;
        if (i === 0 || atr[i - 1] !== atr[i - 1]) d = 1;
        else if (pst === pu) d = b[i].c > ub ? -1 : 1;
        else d = b[i].c < lb ? 1 : -1;
        const s = d === -1 ? lb : ub;
        st[i] = s; dir[i] = d; pst = s; pl = lb; pu = ub;
      }
      const up = st.map((v, i) => (dir[i] === -1 ? v : NaN)), dn = st.map((v, i) => (dir[i] === 1 ? v : NaN));
      return { up, dn, st, dir };
    },
    scaleKeys: ['st'],
    render(R, ind, o) {
      const bg = R.st('bg');
      if (bg.vis !== false) {
        const mid = R.bars.map((b) => (b.o + b.c) / 2);
        const su = R.st('up'), sd = R.st('dn');
        R.fill(o.st, mid, (i) => U.rgba(o.dir[i] === -1 ? su.c : sd.c, bg.a));
      }
      R.plot('up', o.up); R.plot('dn', o.dn);
    },
  };
  IND.psar = {
    name: '파라볼릭 SAR', short: 'SAR', cat: 'trend', pane: 'main', fmt: 'price',
    inputs: [inp('start', '시작', 'float', 0.02, { step: 0.01 }), inp('inc', '증가', 'float', 0.02, { step: 0.01 }), inp('max', '최대', 'float', 0.2, { step: 0.01 })],
    plots: [{ k: 'sar', n: 'SAR', c: '#2962ff', w: 1, t: 'dots' }],
    label: (I) => 'SAR ' + I.start + ' ' + I.inc + ' ' + I.max,
    calc(b, I) {
      const n = b.length, o = arr(n);
      if (n < 2) return { sar: o };
      let up = b[1].c >= b[0].c, af = I.start, ep = up ? b[0].h : b[0].l, sar = up ? b[0].l : b[0].h;
      for (let i = 1; i < n; i++) {
        sar = sar + af * (ep - sar);
        if (up) {
          sar = Math.min(sar, b[i - 1].l, i > 1 ? b[i - 2].l : b[i - 1].l);
          if (b[i].l < sar) { up = false; sar = ep; ep = b[i].l; af = I.start; }
          else if (b[i].h > ep) { ep = b[i].h; af = Math.min(I.max, af + I.inc); }
        } else {
          sar = Math.max(sar, b[i - 1].h, i > 1 ? b[i - 2].h : b[i - 1].h);
          if (b[i].h > sar) { up = true; sar = ep; ep = b[i].h; af = I.start; }
          else if (b[i].l < ep) { ep = b[i].l; af = Math.min(I.max, af + I.inc); }
        }
        o[i] = sar;
      }
      return { sar: o };
    },
  };
  /* 자동 추세선: 스윙 고점/저점(피벗)을 이어 만든 선 중, 두 접점 사이에서 종가가 한 번도 넘지 않은 선만 채택.
     두 번째 접점 이후 종가가 선을 넘으면 '돌파/이탈'로 끝나고, 아니면 현재까지 유효한 선으로 오른쪽 연장. */
  IND.autotl = {
    name: '자동 추세선 (Auto Trendlines)', short: 'AutoTL', cat: 'trend', pane: 'main', fmt: 'price', alerts: true,
    inputs: [
      inp('len', '피벗 길이 (좌우 봉 수)', 'int', 10, { min: 2, max: 60 }),
      inp('look', '탐색 범위 (최근 봉 수)', 'int', 300, { min: 30, max: 5000 }),
      inp('sides', '표시할 선', 'sel', '저항선+지지선', { o: ['저항선+지지선', '저항선만', '지지선만'] }),
      inp('nAct', '현재 유효한 선 개수 (종류별)', 'int', 1, { min: 0, max: 5 }),
      inp('nBrk', '돌파·이탈된 선 개수 (종류별)', 'int', 1, { min: 0, max: 5 }),
      inp('minT', '최소 접점 수', 'int', 2, { min: 2, max: 8 }),
      inp('tol', '꼬리 허용 폭 (ATR 배수)', 'float', 0.3, { step: 0.05, min: 0 }),
      inp('maxD', '현재가에서 최대 거리 (ATR 배수, 0=제한 없음)', 'float', 10, { step: 1, min: 0 }),
      inp('src', '기준 가격', 'sel', '꼬리 (고가/저가)', { o: ['꼬리 (고가/저가)', '몸통 (시가/종가)'] }),
      inp('ext', '오른쪽으로 연장', 'bool', true),
      inp('marks', '돌파·이탈 표시', 'bool', true),
      inp('alert', '돌파·이탈 시 알림', 'bool', false),
    ],
    plots: [
      { k: 'res', n: '저항 추세선', c: '#f23645', w: 2 },
      { k: 'sup', n: '지지 추세선', c: '#089981', w: 2 },
      { k: 'resB', n: '돌파된 저항선', c: '#f23645', w: 1, t: 'col' },
      { k: 'supB', n: '이탈된 지지선', c: '#089981', w: 1, t: 'col' },
    ],
    scaleKeys: [],
    label: (I) => '자동 추세선 ' + I.len + ' · ' + I.look + '봉',
    calc(b, I, ctx) {
      const n = b.length, res = arr(n), sup = arr(n), lines = [];
      const out = { res, sup, lines, alert: null };
      const len = Math.max(2, I.len | 0);
      if (n < len * 2 + 3) return out;
      const atr = TA.atr(b, 14);
      const at = (k) => (atr[k] === atr[k] ? atr[k] : 0);
      const body = String(I.src).indexOf('몸통') === 0;
      const hiS = b.map((x) => (body ? Math.max(x.o, x.c) : x.h)), loS = b.map((x) => (body ? Math.min(x.o, x.c) : x.l));
      const start = Math.max(0, n - Math.max(30, I.look | 0));
      const val = (l, k) => l.pa + l.slope * (k - l.a);
      const sides = [];
      if (I.sides !== '지지선만') sides.push('res');
      if (I.sides !== '저항선만') sides.push('sup');
      for (const side of sides) {
        const up = side === 'res', src = up ? hiS : loS;
        let piv = TA.pivots(src, len, len, up).filter((i) => i >= start);
        if (piv.length > 30) piv = piv.slice(-30);
        const cands = [];
        for (let x = 0; x < piv.length - 1; x++) {
          for (let y = x + 1; y < piv.length; y++) {
            const a = piv[x], c = piv[y], pa = src[a], slope = (src[c] - pa) / (c - a);
            let ok = true;
            for (let k = a + 1; k < c && ok; k++) {
              const L = pa + slope * (k - a), tl = at(k) * I.tol;
              if (up ? b[k].c > L || src[k] > L + tl : b[k].c < L || src[k] < L - tl) ok = false;
            }
            if (!ok) continue;
            let brk = -1;
            for (let k = c + 1; k < n; k++) {
              const L = pa + slope * (k - a);
              if (up ? b[k].c > L : b[k].c < L) { brk = k; break; }
            }
            const l = { side, a, c, pa, slope, brk, touches: [] };
            const end = brk >= 0 ? brk : n - 1;
            for (const p of piv) if (p >= a && p <= end && Math.abs(src[p] - val(l, p)) <= at(p) * Math.max(I.tol, 0.2) + 1e-12) l.touches.push(p);
            if (l.touches.length >= Math.max(2, I.minT | 0)) cands.push(l);
          }
        }
        const t1 = at(n - 1) * 0.6;
        const similar = (m, l) => { const k1 = Math.max(m.a, l.a); return Math.abs(val(m, k1) - val(l, k1)) < t1 && Math.abs(val(m, n - 1) - val(l, n - 1)) < t1; };
        // 순위: 접점 수 + 최근성 − 현재가와의 거리(ATR 단위). 너무 먼 선은 제외
        const atrN = at(n - 1) || Math.abs(b[n - 1].c) * 0.01 || 1, lastC = b[n - 1].c, maxD = +I.maxD || 0;
        const dist = (l) => Math.abs(val(l, n - 1) - lastC) / atrN;
        const score = (l) => l.touches.length * 3 + (4 * (l.c - start)) / Math.max(1, n - start) - 0.4 * dist(l);
        const rank = (p, q) => score(q) - score(p) || q.c - p.c;
        const near = (l) => !maxD || dist(l) <= maxD;
        const pick = [];
        for (const l of cands.filter((x) => x.brk < 0 && near(x)).sort(rank)) { if (pick.length >= (I.nAct | 0)) break; if (!pick.some((m) => similar(m, l))) pick.push(l); }
        const pickB = [];
        for (const l of cands.filter((x) => x.brk >= 0).sort((p, q) => q.brk - p.brk || q.touches.length - p.touches.length)) {
          if (pickB.length >= (I.nBrk | 0)) break;
          if (!pickB.some((m) => m.brk === l.brk || similar(m, l))) pickB.push(l);
        }
        if (pick[0]) { const tg = up ? res : sup, l = pick[0]; for (let k = l.a; k < n; k++) tg[k] = val(l, k); }
        for (const l of pick) lines.push(Object.assign(l, { broken: false }));
        for (const l of pickB) lines.push(Object.assign(l, { broken: true }));
        // 알림: 직전 봉까지 1순위였던 선이 이번 봉에서 돌파/이탈되면
        const prevBest = cands.filter((x) => (x.brk < 0 || x.brk === n - 1) && near(x)).sort(rank)[0];
        if (prevBest && prevBest.brk === n - 1) {
          const px = U.fmt(val(prevBest, n - 1), ctx && ctx.prec != null ? ctx.prec : 2);
          out.alert = { key: side + ':' + b[prevBest.a].t + ':' + b[prevBest.c].t + ':' + b[n - 1].t, text: (up ? '저항 추세선 상향 돌파 ▲ ' : '지지 추세선 하향 이탈 ▼ ') + px };
        }
      }
      return out;
    },
    render(R, ind, o) {
      const I = ind.inp, ctx = R.ctx, n = R.bars.length, set = R.chart.app.set;
      for (const l of o.lines || []) {
        const st = R.st(l.side === 'res' ? (l.broken ? 'resB' : 'res') : l.broken ? 'supB' : 'sup');
        if (st.vis === false) continue;
        const val = (k) => l.pa + l.slope * (k - l.a);
        const kEnd = l.broken ? Math.min(n - 1, l.brk + 1) : I.ext ? Math.max(n - 1, R.vTo + 1) : n - 1;
        if (kEnd < R.vFrom || l.a > R.vTo) continue;
        const k0 = Math.max(l.a, R.vFrom - 1), k1 = Math.min(kEnd, R.vTo + 1);
        const step = Math.max(1, Math.floor((k1 - k0) / 80));
        ctx.beginPath();
        for (let k = k0; ; k += step) {
          const kk = Math.min(k, k1), X = R.x(kk), Y = R.y(val(kk));
          if (kk === k0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          if (kk >= k1) break;
        }
        ctx.strokeStyle = st.c; ctx.lineWidth = st.w || 1.5; ctx.setLineDash(l.broken ? [6, 4] : []);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = st.c;
        for (const p of l.touches) { if (p < R.vFrom || p > R.vTo) continue; ctx.beginPath(); ctx.arc(R.x(p), R.y(val(p)), 2.6, 0, Math.PI * 2); ctx.fill(); }
        if (l.broken && I.marks && l.brk >= R.vFrom && l.brk <= R.vTo) {
          const bar = R.bars[l.brk], upB = l.side === 'res', col = upB ? set.up : set.dn;
          const X = R.x(l.brk), Y = upB ? R.y(bar.l) + 6 : R.y(bar.h) - 6;
          ctx.fillStyle = col; ctx.beginPath();
          if (upB) { ctx.moveTo(X, Y); ctx.lineTo(X - 5, Y + 8); ctx.lineTo(X + 5, Y + 8); }
          else { ctx.moveTo(X, Y); ctx.lineTo(X - 5, Y - 8); ctx.lineTo(X + 5, Y - 8); }
          ctx.closePath(); ctx.fill();
          ctx.font = '600 10px ' + CL.FONT; ctx.textAlign = 'center'; ctx.textBaseline = upB ? 'top' : 'bottom';
          ctx.fillText(upB ? '돌파' : '이탈', X, upB ? Y + 10 : Y - 10);
        }
      }
    },
    toDrawings(ch, ind) {
      const o = ind._o || {}, b = ch.bars, outD = [];
      for (const l of o.lines || []) {
        const st = ch.indStyle(ind, l.side === 'res' ? (l.broken ? 'resB' : 'res') : l.broken ? 'supB' : 'sup');
        const val = (k) => l.pa + l.slope * (k - l.a);
        const k2 = l.broken ? l.brk : l.c;
        const s = Object.assign(ch.app.toolStyle('trendline'), { c: st.c, w: Math.max(1, Math.round(st.w || 2)), ls: l.broken ? 1 : 0, extR: !l.broken, extL: false });
        outD.push({ id: U.uid(), type: 'trendline', pane: 'main', pts: [{ t: b[l.a].t, p: val(l.a) }, { t: b[k2].t, p: val(k2) }], s, locked: false, hidden: false });
      }
      return outD;
    },
  };
  IND.vpvr = {
    name: '매물대 (거래량 프로파일, 보이는 범위)', short: 'VPVR', cat: 'vol', pane: 'main', fmt: 'vol', noScale: true,
    inputs: [inp('rows', '행 개수', 'int', 24, { min: 4, max: 300 }), inp('va', '밸류 에어리어(%)', 'int', 70, { min: 10, max: 100 }), inp('width', '폭(%)', 'int', 30, { min: 5, max: 100 }), inp('side', '위치', 'sel', '오른쪽', { o: ['오른쪽', '왼쪽'] }), inp('poc', 'POC 선 표시', 'bool', true)],
    plots: [
      { k: 'up', n: '매수 거래량', c: '#1e88e5', a: 0.28, t: 'col' }, { k: 'dn', n: '매도 거래량', c: '#fbc02d', a: 0.28, t: 'col' },
      { k: 'vup', n: '밸류영역 매수', c: '#1e88e5', a: 0.6, t: 'col' }, { k: 'vdn', n: '밸류영역 매도', c: '#fbc02d', a: 0.6, t: 'col' },
      { k: 'pocL', n: 'POC', c: '#ff5252', w: 1, t: 'col' },
    ],
    label: (I) => 'VPVR ' + I.rows,
    calc() { return {}; },
    render(R, ind) {
      const I = ind.inp;
      const vp = TA.vprofile(R.bars, R.from, R.to, I.rows, I.va / 100);
      if (!vp) return;
      const W = R.plotW * (I.width / 100);
      R.vprofile(vp, I.side === '왼쪽' ? 0 : R.plotW, W, I.side === '왼쪽' ? 1 : -1, {
        up: R.st('up'), dn: R.st('dn'), vup: R.st('vup'), vdn: R.st('vdn'), poc: I.poc ? R.st('pocL') : null, pocExt: true,
      });
    },
  };

  /* ---------- 하위 창 지표 ---------- */
  IND.rsi = {
    name: '상대강도지수 (RSI)', short: 'RSI', cat: 'osc', pane: 'sub', fmt: 2,
    inputs: [
      inp('len', '길이', 'int', 14, { min: 1 }), inp('src', '소스', 'src', 'close'),
      inp('maType', '이동평균 유형', 'sel', 'SMA', { o: ['없음', 'SMA', 'EMA', 'RMA', 'WMA', '볼린저'] }),
      inp('maLen', '이동평균 길이', 'int', 14, { min: 1 }), inp('bbMult', '볼린저 배수', 'float', 2, { step: 0.1 }),
      inp('ob', '과매수', 'float', 70), inp('mid', '중앙선', 'float', 50), inp('os', '과매도', 'float', 30),
      inp('div', '다이버전스 표시', 'bool', false),
    ],
    plots: [
      { k: 'rsi', n: 'RSI', c: '#7e57c2', w: 1.5 }, { k: 'ma', n: 'RSI 이동평균', c: '#f7c843', w: 1 },
      { k: 'bbu', n: '볼린저 상단', c: '#4caf50', w: 1 }, { k: 'bbl', n: '볼린저 하단', c: '#4caf50', w: 1 },
      { k: 'band', n: '과매수/과매도 배경', c: '#7e57c2', a: 0.08, t: 'fill' }, { k: 'lv', n: '기준선', c: '#787b86', w: 1, t: 'level' },
      { k: 'bull', n: '강세 다이버전스', c: '#22ab94', w: 1.5, t: 'col' }, { k: 'bear', n: '약세 다이버전스', c: '#f23645', w: 1.5, t: 'col' },
    ],
    label: (I) => 'RSI ' + I.len + (I.src !== 'close' ? ' ' + I.src : '') + (I.maType !== '없음' ? ' · ' + I.maType + ' ' + I.maLen : ''),
    calc(b, I) {
      const rsi = TA.rsi(TA.src(b, I.src), I.len);
      let ma = null, bbu = null, bbl = null;
      if (I.maType === '볼린저') {
        ma = TA.sma(rsi, I.maLen); const sd = TA.stdev(rsi, I.maLen);
        bbu = ma.map((m, i) => m + sd[i] * I.bbMult); bbl = ma.map((m, i) => m - sd[i] * I.bbMult);
      } else if (I.maType !== '없음') ma = TA.ma(I.maType, rsi, I.maLen);
      return { rsi, ma, bbu, bbl, div: I.div ? TA.divergence(rsi, b, 5, 5, 5, 60) : null };
    },
    levels: (I) => [I.ob, I.mid, I.os],
    render(R, ind, o) {
      const I = ind.inp;
      R.bandSt(I.ob, I.os, 'band');
      R.levelSt([I.ob, I.os], 'lv'); R.levelSt([I.mid], 'lv', [1, 3]);
      if (o.bbu) { R.fill(o.bbu, o.bbl, U.rgba(R.st('bbu').c, 0.08)); R.plot('bbu', o.bbu); R.plot('bbl', o.bbl); }
      if (o.ma) R.plot('ma', o.ma);
      R.plot('rsi', o.rsi);
      if (o.div) R.divergences(o.div, R.st('bull'), R.st('bear'));
    },
  };
  IND.macd = {
    name: 'MACD', short: 'MACD', cat: 'osc', pane: 'sub', fmt: 'auto', zero: false,
    inputs: [inp('fast', '단기', 'int', 12, { min: 1 }), inp('slow', '장기', 'int', 26, { min: 1 }), inp('sig', '시그널', 'int', 9, { min: 1 }), inp('src', '소스', 'src', 'close'), inp('oscT', '오실레이터 MA', 'sel', 'EMA', { o: ['EMA', 'SMA'] }), inp('sigT', '시그널 MA', 'sel', 'EMA', { o: ['EMA', 'SMA'] })],
    plots: [
      { k: 'hist', n: '히스토그램', c: '#26a69a', t: 'hist' }, { k: 'macd', n: 'MACD', c: '#2962ff', w: 1.5 }, { k: 'signal', n: '시그널', c: '#ff6d00', w: 1.5 },
      { k: 'h1', n: '히스토 강한 상승', c: '#26a69a', t: 'col' }, { k: 'h2', n: '히스토 약한 상승', c: '#b2dfdb', t: 'col' },
      { k: 'h3', n: '히스토 약한 하락', c: '#ffcdd2', t: 'col' }, { k: 'h4', n: '히스토 강한 하락', c: '#ff5252', t: 'col' },
      { k: 'lv', n: '0선', c: '#787b86', w: 1, t: 'level' },
    ],
    label: (I) => 'MACD ' + I.fast + ' ' + I.slow + ' ' + I.sig,
    calc(b, I) {
      const s = TA.src(b, I.src), f = TA.ma(I.oscT, s, I.fast), sl = TA.ma(I.oscT, s, I.slow);
      const macd = f.map((x, i) => x - sl[i]), signal = TA.ma(I.sigT, macd, I.sig);
      return { macd, signal, hist: macd.map((x, i) => x - signal[i]) };
    },
    render(R, ind, o) {
      const c = [R.st('h1').c, R.st('h2').c, R.st('h3').c, R.st('h4').c], h = o.hist;
      R.levelSt([0], 'lv', [1, 3]);
      if (R.st('hist').vis !== false) R.hist(h, (i) => { const v = h[i], p = h[i - 1]; return v >= 0 ? (p === p && v < p ? c[1] : c[0]) : p === p && v > p ? c[2] : c[3]; }, R.y(0));
      R.plot('macd', o.macd); R.plot('signal', o.signal);
    },
  };
  const stochPlots = [{ k: 'k', n: '%K', c: '#2962ff', w: 1.5 }, { k: 'd', n: '%D', c: '#ff6d00', w: 1.5 }, { k: 'band', n: '배경', c: '#2962ff', a: 0.06, t: 'fill' }, { k: 'lv', n: '기준선', c: '#787b86', w: 1, t: 'level' }];
  IND.stoch = {
    name: '스토캐스틱 (Stochastic)', short: 'Stoch', cat: 'osc', pane: 'sub', fmt: 2,
    inputs: [inp('k', '%K 길이', 'int', 14, { min: 1 }), inp('sk', '%K 스무딩', 'int', 1, { min: 1 }), inp('d', '%D 스무딩', 'int', 3, { min: 1 }), inp('ob', '상단', 'float', 80), inp('os', '하단', 'float', 20)],
    plots: stochPlots,
    label: (I) => 'Stoch ' + I.k + ' ' + I.sk + ' ' + I.d,
    calc(b, I) { const k = TA.sma(TA.stochK(TA.src(b, 'close'), TA.src(b, 'high'), TA.src(b, 'low'), I.k), I.sk); return { k, d: TA.sma(k, I.d) }; },
    levels: (I) => [I.ob, I.os],
    render(R, ind, o) { const I = ind.inp; R.bandSt(I.ob, I.os, 'band'); R.levelSt([I.ob, I.os], 'lv', [4, 3]); R.levelSt([50], 'lv', [1, 3]); R.plot('d', o.d); R.plot('k', o.k); },
  };
  IND.stochrsi = {
    name: '스토캐스틱 RSI', short: 'StochRSI', cat: 'osc', pane: 'sub', fmt: 2,
    inputs: [inp('sk', '%K 스무딩', 'int', 3, { min: 1 }), inp('d', '%D 스무딩', 'int', 3, { min: 1 }), inp('rl', 'RSI 길이', 'int', 14, { min: 1 }), inp('sl', '스토캐스틱 길이', 'int', 14, { min: 1 }), inp('src', '소스', 'src', 'close'), inp('ob', '상단', 'float', 80), inp('os', '하단', 'float', 20)],
    plots: stochPlots,
    label: (I) => 'StochRSI ' + I.sk + ' ' + I.d + ' ' + I.rl + ' ' + I.sl,
    calc(b, I) { const r = TA.rsi(TA.src(b, I.src), I.rl); const k = TA.sma(TA.stochK(r, r, r, I.sl), I.sk); return { k, d: TA.sma(k, I.d) }; },
    levels: (I) => [I.ob, I.os],
    render: (R, ind, o) => IND.stoch.render(R, ind, o),
  };
  IND.obv = {
    name: 'OBV (거래량 균형)', short: 'OBV', cat: 'vol', pane: 'sub', fmt: 'vol',
    inputs: [inp('maType', '이동평균 유형', 'sel', '없음', { o: ['없음'].concat(TA.MA_TYPES) }), inp('maLen', '이동평균 길이', 'int', 20, { min: 1 })],
    plots: [{ k: 'obv', n: 'OBV', c: '#2962ff', w: 1.5 }, { k: 'ma', n: 'OBV MA', c: '#ff9800', w: 1 }],
    label: (I) => 'OBV' + (I.maType !== '없음' ? ' · ' + I.maType + ' ' + I.maLen : ''),
    calc(b, I) {
      const n = b.length, o = new Array(n); let s = 0;
      for (let i = 0; i < n; i++) { if (i > 0) s += b[i].c > b[i - 1].c ? b[i].v : b[i].c < b[i - 1].c ? -b[i].v : 0; o[i] = s; }
      return { obv: o, ma: I.maType !== '없음' ? TA.ma(I.maType, o, I.maLen) : null };
    },
  };
  IND.mfi = {
    name: 'MFI (자금흐름지수)', short: 'MFI', cat: 'vol', pane: 'sub', fmt: 2,
    inputs: [inp('len', '길이', 'int', 14, { min: 1 }), inp('ob', '과매수', 'float', 80), inp('os', '과매도', 'float', 20)],
    plots: [{ k: 'mfi', n: 'MFI', c: '#7e57c2', w: 1.5 }, { k: 'band', n: '배경', c: '#7e57c2', a: 0.08, t: 'fill' }, { k: 'lv', n: '기준선', c: '#787b86', w: 1, t: 'level' }],
    label: (I) => 'MFI ' + I.len,
    calc(b, I) {
      const n = b.length, tp = TA.src(b, 'hlc3'), pos = arr(n), neg = arr(n);
      for (let i = 1; i < n; i++) { const mf = tp[i] * b[i].v; pos[i] = tp[i] > tp[i - 1] ? mf : 0; neg[i] = tp[i] < tp[i - 1] ? mf : 0; }
      const ps = TA.sum(pos, I.len), ns = TA.sum(neg, I.len);
      return { mfi: ps.map((p, i) => (p !== p ? NaN : ns[i] === 0 ? 100 : 100 - 100 / (1 + p / ns[i]))) };
    },
    levels: (I) => [I.ob, I.os],
    render(R, ind, o) { const I = ind.inp; R.bandSt(I.ob, I.os, 'band'); R.levelSt([I.ob, I.os], 'lv', [4, 3]); R.plot('mfi', o.mfi); },
  };
  IND.cmf = {
    name: 'CMF (차이킨 자금흐름)', short: 'CMF', cat: 'vol', pane: 'sub', fmt: 3,
    inputs: [inp('len', '길이', 'int', 20, { min: 1 })],
    plots: [{ k: 'cmf', n: 'CMF', c: '#43a047', w: 1.5 }, { k: 'lv', n: '0선', c: '#787b86', w: 1, t: 'level' }],
    label: (I) => 'CMF ' + I.len,
    calc(b, I) {
      const mfv = b.map((x) => { const r = x.h - x.l; return r > 0 ? (((x.c - x.l) - (x.h - x.c)) / r) * x.v : 0; });
      const s1 = TA.sum(mfv, I.len), s2 = TA.sum(TA.src(b, 'volume'), I.len);
      return { cmf: s1.map((x, i) => (s2[i] ? x / s2[i] : 0)) };
    },
    levels: () => [0],
    render(R, ind, o) { R.levelSt([0], 'lv', [4, 3]); R.plot('cmf', o.cmf); },
  };
  IND.ad = {
    name: 'A/D (매집/분산)', short: 'A/D', cat: 'vol', pane: 'sub', fmt: 'vol',
    inputs: [],
    plots: [{ k: 'ad', n: 'A/D', c: '#ff9800', w: 1.5 }],
    label: () => 'Accum/Dist',
    calc(b) { return { ad: TA.cum(b.map((x) => { const r = x.h - x.l; return r > 0 ? (((x.c - x.l) - (x.h - x.c)) / r) * x.v : 0; })) }; },
  };
  IND.pvt = {
    name: 'PVT (가격거래량추세)', short: 'PVT', cat: 'vol', pane: 'sub', fmt: 'vol',
    inputs: [],
    plots: [{ k: 'pvt', n: 'PVT', c: '#2962ff', w: 1.5 }],
    label: () => 'PVT',
    calc(b) { return { pvt: TA.cum(b.map((x, i) => (i > 0 && b[i - 1].c ? ((x.c - b[i - 1].c) / b[i - 1].c) * x.v : 0))) }; },
  };
  IND.vosc = {
    name: '거래량 오실레이터', short: 'VolOsc', cat: 'vol', pane: 'sub', fmt: 2,
    inputs: [inp('s', '단기', 'int', 5, { min: 1 }), inp('l', '장기', 'int', 10, { min: 1 })],
    plots: [{ k: 'vo', n: '거래량 오실레이터(%)', c: '#2962ff', w: 1.5 }, { k: 'lv', n: '0선', c: '#787b86', w: 1, t: 'level' }],
    label: (I) => 'Volume Osc ' + I.s + ' ' + I.l,
    calc(b, I) { const v = TA.src(b, 'volume'), s = TA.ema(v, I.s), l = TA.ema(v, I.l); return { vo: s.map((x, i) => (l[i] ? (100 * (x - l[i])) / l[i] : NaN)) }; },
    levels: () => [0],
    render(R, ind, o) { R.levelSt([0], 'lv', [4, 3]); R.plot('vo', o.vo); },
  };
  IND.atr = {
    name: 'ATR (평균진폭)', short: 'ATR', cat: 'vola', pane: 'sub', fmt: 'auto',
    inputs: [inp('len', '길이', 'int', 14, { min: 1 }), inp('type', '스무딩', 'sel', 'RMA', { o: ['RMA', 'SMA', 'EMA', 'WMA'] })],
    plots: [{ k: 'atr', n: 'ATR', c: '#b71c1c', w: 1.5 }],
    label: (I) => 'ATR ' + I.len + ' ' + I.type,
    calc(b, I) { return { atr: TA.ma(I.type, TA.tr(b), I.len) }; },
  };
  IND.cci = {
    name: 'CCI (상품채널지수)', short: 'CCI', cat: 'osc', pane: 'sub', fmt: 2,
    inputs: [inp('len', '길이', 'int', 20, { min: 1 }), inp('src', '소스', 'src', 'hlc3')],
    plots: [{ k: 'cci', n: 'CCI', c: '#2962ff', w: 1.5 }, { k: 'band', n: '배경', c: '#2962ff', a: 0.06, t: 'fill' }, { k: 'lv', n: '기준선', c: '#787b86', w: 1, t: 'level' }],
    label: (I) => 'CCI ' + I.len,
    calc(b, I) {
      const s = TA.src(b, I.src), m = TA.sma(s, I.len), o = arr(b.length), n = I.len;
      for (let i = n - 1; i < s.length; i++) { let md = 0; for (let j = 0; j < n; j++) md += Math.abs(s[i - j] - m[i]); md /= n; o[i] = md ? (s[i] - m[i]) / (0.015 * md) : 0; }
      return { cci: o };
    },
    levels: () => [100, -100],
    render(R, ind, o) { R.bandSt(100, -100, 'band'); R.levelSt([100, -100], 'lv', [4, 3]); R.levelSt([0], 'lv', [1, 3]); R.plot('cci', o.cci); },
  };
  IND.dmi = {
    name: 'DMI / ADX (방향성지수)', short: 'DMI', cat: 'trend', pane: 'sub', fmt: 2,
    inputs: [inp('len', 'DI 길이', 'int', 14, { min: 1 }), inp('adx', 'ADX 스무딩', 'int', 14, { min: 1 })],
    plots: [{ k: 'adx', n: 'ADX', c: '#f50057', w: 1.5 }, { k: 'p', n: '+DI', c: '#2962ff', w: 1.2 }, { k: 'm', n: '-DI', c: '#ff6d00', w: 1.2 }],
    label: (I) => 'DMI ' + I.len + ' ' + I.adx,
    calc(b, I) {
      const n = b.length, pd = arr(n), md = arr(n);
      for (let i = 1; i < n; i++) { const up = b[i].h - b[i - 1].h, dn = b[i - 1].l - b[i].l; pd[i] = up > dn && up > 0 ? up : 0; md[i] = dn > up && dn > 0 ? dn : 0; }
      const tr = TA.rma(TA.tr(b).map((v, i) => (i === 0 ? NaN : v)), I.len);
      const p = TA.rma(pd, I.len).map((v, i) => (100 * v) / tr[i]), m = TA.rma(md, I.len).map((v, i) => (100 * v) / tr[i]);
      const adx = TA.rma(p.map((v, i) => { const s = v + m[i]; return Math.abs(v - m[i]) / (s === 0 ? 1 : s); }), I.adx).map((v) => 100 * v);
      return { p, m, adx };
    },
  };
  IND.willr = {
    name: '윌리엄스 %R', short: '%R', cat: 'osc', pane: 'sub', fmt: 2,
    inputs: [inp('len', '길이', 'int', 14, { min: 1 })],
    plots: [{ k: 'r', n: '%R', c: '#7e57c2', w: 1.5 }, { k: 'band', n: '배경', c: '#7e57c2', a: 0.06, t: 'fill' }, { k: 'lv', n: '기준선', c: '#787b86', w: 1, t: 'level' }],
    label: (I) => '%R ' + I.len,
    calc(b, I) { const hh = TA.highest(TA.src(b, 'high'), I.len), ll = TA.lowest(TA.src(b, 'low'), I.len); return { r: b.map((x, i) => { const r = hh[i] - ll[i]; return r > 0 ? (-100 * (hh[i] - x.c)) / r : NaN; }) }; },
    levels: () => [-20, -80],
    render(R, ind, o) { R.bandSt(-20, -80, 'band'); R.levelSt([-20, -80], 'lv', [4, 3]); R.levelSt([-50], 'lv', [1, 3]); R.plot('r', o.r); },
  };
  IND.mom = {
    name: '모멘텀 (Momentum)', short: 'Mom', cat: 'osc', pane: 'sub', fmt: 'auto',
    inputs: [inp('len', '길이', 'int', 10, { min: 1 }), inp('src', '소스', 'src', 'close')],
    plots: [{ k: 'm', n: '모멘텀', c: '#2962ff', w: 1.5 }, { k: 'lv', n: '0선', c: '#787b86', w: 1, t: 'level' }],
    label: (I) => 'Mom ' + I.len,
    calc(b, I) { const s = TA.src(b, I.src); return { m: s.map((v, i) => (i >= I.len ? v - s[i - I.len] : NaN)) }; },
    levels: () => [0],
    render(R, ind, o) { R.levelSt([0], 'lv', [4, 3]); R.plot('m', o.m); },
  };

  /* 공통 기본값 채우기 */
  for (const k in IND) {
    if (k[0] === '_') continue;
    const d = IND[k];
    d.type = k;
    d.plots = d.plots || [];
    if (!d.render) d.render = function (R, ind, o) { for (const p of d.plots) if (!p.t || p.t === 'line' || p.t === 'dots' || p.t === 'hist') R.plot(p.k, o[p.k]); };
  }
  IND.defaults = function (type) {
    const d = IND[type], I = {};
    for (const i of d.inputs) I[i.k] = i.v;
    return I;
  };
  IND.paneOf = (type, I) => (IND[type].paneOf ? IND[type].paneOf(I) : IND[type].pane);
  IND.SRC = SRC;
})();
