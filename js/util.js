/* TradingHyun — util.js : 공용 헬퍼 (포맷, 시간, 기하, 저장소, DOM) */
(function () {
  'use strict';
  const CL = (window.CL = window.CL || {});
  const U = (CL.U = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.uid = () => Math.random().toString(36).slice(2, 9) + (Date.now() % 1e7).toString(36);
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.isNum = (v) => typeof v === 'number' && isFinite(v);
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- 숫자 포맷 ---------- */
  U.fmt = function (v, dec) {
    if (v == null || !isFinite(v)) return '—';
    dec = dec == null ? 2 : dec;
    const s = Math.abs(v).toFixed(dec);
    const k = s.indexOf('.');
    let i = k < 0 ? s : s.slice(0, k);
    const f = k < 0 ? '' : s.slice(k);
    if (i.length > 3) i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const neg = v < 0 && +s !== 0;
    return (neg ? '-' : '') + i + f;
  };
  U.fmtVol = function (v) {
    if (v == null || !isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T';
    if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(2) + 'K';
    return U.fmt(v, a === 0 ? 0 : a < 1 ? 4 : a < 100 ? 2 : 0);
  };
  U.fmtPct = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(d) + '%');
  U.decOf = function (x) {
    const s = String(x);
    if (s.indexOf('e-') >= 0) {
      const p = s.split('e-');
      return Math.min(10, +p[1] + ((p[0].split('.')[1] || '').length));
    }
    const i = s.indexOf('.');
    return i < 0 ? 0 : Math.min(10, s.length - i - 1);
  };
  U.detectPrec = function (bars) {
    let d = 0;
    const n = Math.min(bars.length, 300);
    for (let k = bars.length - n; k < bars.length; k++) {
      const b = bars[k];
      d = Math.max(d, U.decOf(b.o), U.decOf(b.h), U.decOf(b.l), U.decOf(b.c));
    }
    return Math.min(d, 8);
  };
  U.niceStep = function (range, count) {
    const raw = range / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return s * mag;
  };
  U.stepDec = (step) => Math.max(0, Math.min(10, -Math.floor(Math.log10(step) + 1e-9)));

  /* ---------- 시간 ---------- */
  U.tzMode = 'local'; // local | exchange | utc
  U.exOffset = 0; // ms
  U.off = (t) =>
    U.tzMode === 'utc' ? 0 : U.tzMode === 'exchange' ? U.exOffset : -new Date(t).getTimezoneOffset() * 60000;
  U.parts = function (t) {
    const d = new Date(t + U.off(t));
    return {
      Y: d.getUTCFullYear(), M: d.getUTCMonth() + 1, D: d.getUTCDate(),
      h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(), w: d.getUTCDay(),
    };
  };
  const p2 = (n) => (n < 10 ? '0' : '') + n;
  U.p2 = p2;
  U.DOW = ['일', '월', '화', '수', '목', '금', '토'];
  U.fmtDate = (t) => { const p = U.parts(t); return p.Y + '-' + p2(p.M) + '-' + p2(p.D); };
  U.fmtDT = function (t, iv) {
    const p = U.parts(t);
    if (iv === '1M') return p.Y + '-' + p2(p.M);
    let s = p.Y + '-' + p2(p.M) + '-' + p2(p.D) + ' (' + U.DOW[p.w] + ')';
    if (!iv || U.IV[iv] < 864e5) s += ' ' + p2(p.h) + ':' + p2(p.m);
    return s;
  };
  U.fmtShort = function (t, iv) {
    const p = U.parts(t);
    if (iv && U.IV[iv] >= 864e5) return (p.Y % 100) + '/' + p2(p.M) + '/' + p2(p.D);
    return p2(p.M) + '/' + p2(p.D) + ' ' + p2(p.h) + ':' + p2(p.m);
  };
  U.fmtDur = function (ms) {
    const neg = ms < 0;
    ms = Math.abs(ms);
    const m = Math.round(ms / 60000);
    let s;
    if (m < 60) s = m + '분';
    else {
      const h = Math.floor(m / 60), mm = m % 60;
      if (h < 24) s = h + '시간' + (mm ? ' ' + mm + '분' : '');
      else {
        const d = Math.floor(h / 24), hh = h % 24;
        s = d + '일' + (hh ? ' ' + hh + '시간' : '');
      }
    }
    return (neg ? '-' : '') + s;
  };

  U.IV = {
    '1m': 6e4, '3m': 18e4, '5m': 3e5, '10m': 6e5, '15m': 9e5, '30m': 18e5,
    '1h': 36e5, '2h': 72e5, '4h': 144e5, '6h': 216e5, '8h': 288e5, '12h': 432e5,
    '1D': 864e5, '3D': 2592e5, '1W': 6048e5, '1M': 26298e5,
  };
  U.IV_ORDER = Object.keys(U.IV);
  U.IV_LABEL = {
    '1m': '1분', '3m': '3분', '5m': '5분', '10m': '10분', '15m': '15분', '30m': '30분',
    '1h': '1시간', '2h': '2시간', '4h': '4시간', '6h': '6시간', '8h': '8시간', '12h': '12시간',
    '1D': '일', '3D': '3일', '1W': '주', '1M': '월',
  };
  U.IV_SHORT = {
    '1m': '1m', '3m': '3m', '5m': '5m', '10m': '10m', '15m': '15m', '30m': '30m',
    '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6H', '8h': '8H', '12h': '12H',
    '1D': 'D', '3D': '3D', '1W': 'W', '1M': 'M',
  };
  U.intraday = (iv) => U.IV[iv] < 864e5;

  /* 구간 시작 시각 (off = 거래소 시간대 오프셋 ms) */
  U.barStart = function (t, iv, off) {
    off = off || 0;
    if (iv === '1M') {
      const d = new Date(t + off);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - off;
    }
    if (iv === '1W') {
      const W = 6048e5, MON = 4 * 864e5; // 1970-01-05 = 월요일
      return Math.floor((t + off - MON) / W) * W + MON - off;
    }
    const ms = U.IV[iv];
    return Math.floor((t + off) / ms) * ms - off;
  };
  U.resample = function (bars, iv, off) {
    const out = [];
    let cur = null;
    for (const b of bars) {
      const s = U.barStart(b.t, iv, off);
      if (!cur || cur.t !== s) {
        cur = { t: s, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v };
        out.push(cur);
      } else {
        if (b.h > cur.h) cur.h = b.h;
        if (b.l < cur.l) cur.l = b.l;
        cur.c = b.c;
        cur.v += b.v;
      }
    }
    return out;
  };
  /* 실시간 리샘플 (하위 봉 → 상위 봉) */
  U.LiveAgg = class {
    constructor(iv, off, seedBase) {
      this.iv = iv; this.off = off || 0; this.cur = null; this.parts = new Map();
      if (seedBase && seedBase.length) {
        const last = seedBase[seedBase.length - 1];
        const s = U.barStart(last.t, iv, this.off);
        this.cur = { t: s };
        for (const b of seedBase) if (U.barStart(b.t, iv, this.off) === s) this.parts.set(b.t, b);
      }
    }
    push(b) {
      const s = U.barStart(b.t, this.iv, this.off);
      if (!this.cur || s > this.cur.t) { this.cur = { t: s }; this.parts = new Map(); }
      else if (s < this.cur.t) return null;
      this.parts.set(b.t, b);
      const arr = Array.from(this.parts.values()).sort((a, c) => a.t - c.t);
      const c = this.cur;
      c.o = arr[0].o; c.c = arr[arr.length - 1].c; c.h = -Infinity; c.l = Infinity; c.v = 0;
      for (const x of arr) { if (x.h > c.h) c.h = x.h; if (x.l < c.l) c.l = x.l; c.v += x.v; }
      return { t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v };
    }
  };

  /* ---------- 기하 ---------- */
  U.distSeg = function (px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
    let t = L ? ((px - x1) * dx + (py - y1) * dy) / L : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = x1 + t * dx - px, y = y1 + t * dy - py;
    return Math.sqrt(x * x + y * y);
  };
  U.pip = function (x, y, pts) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  /* 선분을 화면 밖까지 연장 */
  U.ext = function (x1, y1, x2, y2, l, r) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < 1e-9) return [x1, y1, x2, y2];
    const k = 30000 / L;
    return [l ? x1 - dx * k : x1, l ? y1 - dy * k : y1, r ? x2 + dx * k : x2, r ? y2 + dy * k : y2];
  };
  U.lineInter = function (a, b, c, d) {
    const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
    const den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
    const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
    return { x: a.x + t * r.x, y: a.y + t * r.y, t, u };
  };
  U.circum = function (a, b, c) {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    if (Math.abs(d) < 1e-6) return null;
    const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
    const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
    const y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return { x, y, r: Math.hypot(a.x - x, a.y - y) };
  };

  /* ---------- 색 ---------- */
  U.rgba = function (c, a) {
    if (!c) return 'rgba(0,0,0,0)';
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const n = parseInt(h.slice(0, 6), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + (a == null ? 1 : a) + ')';
    }
    return c;
  };
  U.PALETTE = [
    '#ffffff', '#d1d4dc', '#9598a1', '#787b86', '#5d606b', '#434651', '#2a2e39', '#131722', '#0f0f0f', '#000000',
    '#f23645', '#ff9800', '#ffeb3b', '#4caf50', '#089981', '#00bcd4', '#2962ff', '#673ab7',
    '#9c27b0', '#e91e63', '#fccbcd', '#ffe0b2', '#fff9c4', '#c8e6c9', '#ace5dc', '#b2ebf2',
    '#bbd9fb', '#d1c4e9', '#e1bee7', '#f8bbd0', '#b22833', '#e65100', '#f57f17', '#1b5e20',
    '#056656', '#006064', '#0c3299', '#311b92', '#4a148c', '#880e4f',
  ];

  /* ---------- 저장소 ---------- */
  U.load = function (k, d) {
    try {
      const v = localStorage.getItem('cl.' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  };
  U.save = function (k, v) {
    try { localStorage.setItem('cl.' + k, JSON.stringify(v)); return true; }
    catch (e) { console.warn('저장 실패', k, e); return false; }
  };
  U.del = (k) => { try { localStorage.removeItem('cl.' + k); } catch (e) {} };

  /* ---------- DOM ---------- */
  U.h = function (tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) {
      const kids = [].concat(arguments[i]);
      for (const c of kids) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  };
  U.$ = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastBox = null;
  U.toast = function (msg, kind, ms) {
    if (!toastBox) { toastBox = U.h('div', { class: 'toasts' }); document.body.append(toastBox); }
    const t = U.h('div', { class: 'toast ' + (kind || '') }, msg);
    toastBox.append(t);
    setTimeout(() => t.classList.add('out'), ms || 2600);
    setTimeout(() => t.remove(), (ms || 2600) + 400);
  };

  /* 시드 난수 */
  U.rng = function (seed) {
    let a = typeof seed === 'string' ? [...seed].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703) : seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.debounce = function (fn, ms) {
    let id = 0;
    return function () {
      const a = arguments, self = this;
      clearTimeout(id);
      id = setTimeout(() => fn.apply(self, a), ms);
    };
  };

  /* 이진 탐색: t 이하인 마지막 인덱스 */
  U.bsearch = function (bars, t) {
    let lo = 0, hi = bars.length - 1;
    if (hi < 0 || t < bars[0].t) return -1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (bars[mid].t <= t) lo = mid; else hi = mid - 1;
    }
    return lo;
  };
})();
