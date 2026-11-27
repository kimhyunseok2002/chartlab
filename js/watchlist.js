/* TradingHyun — watchlist.js : 종목 로고 · 실시간 시세 허브 · 트레이딩뷰식 관심종목(목록·섹션·깃발·정렬·드래그·상세 정보) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U, Data = CL.Data, ICON = CL.ICON;
  const h = U.h;

  /* ===================== 로고 ===================== */
  // 윈도우는 국기 이모지를 글자(KR, US)로 보여 주므로 국기는 작은 SVG로 직접 그린다
  const FLAG_SVG = {
    KR: '<rect width="20" height="20" fill="#fff"/><path d="M6.4 10a3.6 3.6 0 0 1 7.2 0a1.8 1.8 0 0 1-3.6 0a1.8 1.8 0 0 0-3.6 0z" fill="#cd2e3a"/><path d="M13.6 10a3.6 3.6 0 0 1-7.2 0a1.8 1.8 0 0 1 3.6 0a1.8 1.8 0 0 0 3.6 0z" fill="#0047a0"/><g stroke="#000" stroke-width="1"><path d="M3.2 6.6l1.6-2.2M4.1 7.3l1.6-2.2M14.3 12.7l1.6 2.2M15.2 12l1.6 2.2M3.2 13.4l1.6 2.2M15.2 7.9l1.6-2.2"/></g>',
    US: '<rect width="20" height="20" fill="#fff"/><path d="M0 0h20v1.6H0zm0 3.1h20v1.6H0zm0 3.1h20v1.6H0zm0 3.1h20v1.6H0zm0 3.1h20v1.6H0zm0 3.1h20v1.6H0zm0 3.1h20v1.6H0z" fill="#b22234"/><rect width="9" height="9.3" fill="#3c3b6e"/><g fill="#fff"><circle cx="2.2" cy="2.2" r=".6"/><circle cx="4.5" cy="2.2" r=".6"/><circle cx="6.8" cy="2.2" r=".6"/><circle cx="3.3" cy="4.6" r=".6"/><circle cx="5.6" cy="4.6" r=".6"/><circle cx="2.2" cy="7" r=".6"/><circle cx="4.5" cy="7" r=".6"/><circle cx="6.8" cy="7" r=".6"/></g>',
    JP: '<rect width="20" height="20" fill="#fff"/><circle cx="10" cy="10" r="4.8" fill="#bc002d"/>',
    EU: '<rect width="20" height="20" fill="#003399"/><g fill="#fc0">' + Array.from({ length: 12 }, (_, i) => '<circle cx="' + (10 + 5.4 * Math.cos((i * Math.PI) / 6)).toFixed(2) + '" cy="' + (10 + 5.4 * Math.sin((i * Math.PI) / 6)).toFixed(2) + '" r=".9"/>').join('') + '</g>',
    CN: '<rect width="20" height="20" fill="#de2910"/><path d="M5 3.4l1 3 3.1 0-2.5 1.9 1 3-2.6-1.9-2.6 1.9 1-3-2.5-1.9 3.1 0z" fill="#ffde00"/>',
    HK: '<rect width="20" height="20" fill="#de2910"/><circle cx="10" cy="10" r="4.4" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="2.6 2"/>',
    GB: '<rect width="20" height="20" fill="#012169"/><path d="M0 0l20 20M20 0L0 20" stroke="#fff" stroke-width="3.4"/><path d="M0 0l20 20M20 0L0 20" stroke="#c8102e" stroke-width="1.4"/><path d="M10 0v20M0 10h20" stroke="#fff" stroke-width="5.4"/><path d="M10 0v20M0 10h20" stroke="#c8102e" stroke-width="3"/>',
    DE: '<rect width="20" height="6.7" fill="#000"/><rect y="6.7" width="20" height="6.6" fill="#dd0000"/><rect y="13.3" width="20" height="6.7" fill="#ffce00"/>',
  };
  const EMOJI = {
    '^KS11': 'KR', '^KQ11': 'KR', '^KS200': 'KR', '^GSPC': 'US', '^IXIC': 'US', '^DJI': 'US', '^NDX': 'US', '^RUT': 'US', '^VIX': 'US',
    '^SOX': 'US', '^N225': 'JP', '^HSI': 'HK', '^FTSE': 'GB', '^GDAXI': 'DE', '000001.SS': 'CN', 'KRW=X': 'US', 'USDKRW=X': 'US',
    'JPYKRW=X': 'JP', 'EURKRW=X': 'EU', 'CNYKRW=X': 'CN', 'DX-Y.NYB': '💵', 'GC=F': '🥇', 'SI=F': '🥈', 'CL=F': '🛢️', 'BZ=F': '🛢️', 'NG=F': '🔥', 'HG=F': '🟫',
  };
  const QUOTES = ['FDUSD', 'USDT', 'USDC', 'TUSD', 'BUSD', 'DAI', 'BTC', 'ETH', 'BNB', 'TRY', 'EUR', 'BRL', 'JPY', 'USD'];
  function baseOf(src, sym) {
    if (src === 'upbit') return sym.split('-')[1] || sym;
    let s = String(sym).toUpperCase();
    for (const q of QUOTES) if (s.length > q.length && s.endsWith(q)) { s = s.slice(0, -q.length); break; }
    return s.replace(/^1000+/, '').replace(/^1M(?=[A-Z])/, '');
  }
  const hue = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return 'hsl(' + (x % 360) + ',38%,38%)'; };
  const Logo = (CL.Logo = {
    bad: new Set(),
    cands(src, sym) {
      const crypto = src === 'upbit' || src === 'binance' || src === 'binancef' || (src === 'stock' && /^[A-Z0-9]+-USD$/.test(sym));
      if (crypto) {
        const b = src === 'stock' ? sym.split('-')[0] : baseOf(src, sym), l = b.toLowerCase();
        return ['https://static.upbit.com/logos/' + b + '.png', 'https://assets.coincap.io/assets/icons/' + l + '@2x.png', 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/' + l + '.png'];
      }
      if (src === 'stock') {
        const m = sym.match(/^([0-9A-Z]{6})\.(KS|KQ)$/);
        if (m) return ['https://static.toss.im/png-icons/securities/icn-sec-fill-' + m[1] + '.png', 'https://ssl.pstatic.net/imgstock/fn/real/logo/stock/Stock' + m[1] + '.svg'];
        if (/^[A-Z][A-Z0-9-]{0,9}$/.test(sym)) return ['https://static.toss.im/png-icons/securities/icn-sec-fill-' + sym + '.png', 'https://financialmodelingprep.com/image-stock/' + sym + '.png'];
        if (/^[A-Z0-9-]+\.[A-Z]{1,3}$/.test(sym)) return ['https://financialmodelingprep.com/image-stock/' + sym + '.png'];
      }
      return [];
    },
    el(src, sym, size, name) {
      size = size || 18;
      const box = h('span', { class: 'sym-logo', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.52) + 'px' } });
      const emoji = src === 'stock' && EMOJI[sym];
      const fallback = () => {
        box.classList.add('ph');
        if (emoji && FLAG_SVG[emoji]) { box.classList.add('flag'); box.innerHTML = '<svg viewBox="0 0 20 20">' + FLAG_SVG[emoji] + '</svg>'; return; }
        box.textContent = emoji || String(name || baseOf(src, sym) || sym).replace(/^[\^\d.\s-]+/, '').charAt(0).toUpperCase() || '·';
        if (emoji) { box.style.background = 'transparent'; box.style.fontSize = Math.round(size * 0.82) + 'px'; }
        else box.style.background = hue(sym);
      };
      if (emoji) { fallback(); return box; }
      const list = this.cands(src, sym).filter((u) => !this.bad.has(u));
      if (!list.length) { fallback(); return box; }
      let i = 0;
      const img = new Image();
      img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.draggable = false;
      img.onerror = () => { this.bad.add(list[i]); i++; if (i < list.length) img.src = list[i]; else { img.remove(); fallback(); } };
      img.src = list[0];
      box.append(img);
      return box;
    },
  });

  /* ===================== 실시간 시세 허브 ===================== */
  const QH = (CL.Quotes = {
    data: {}, keys: [], sig: '', subs: new Set(), dirty: new Set(), raf: 0, timer: 0, n: 0,
    on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
    get(k) { return this.data[k]; },
    put(k, p) {
      const q = this.data[k] || (this.data[k] = { k });
      const old = q.last;
      for (const x in p) { const v = p[x]; if (v != null && v === v) q[x] = v; }
      if (q.last != null && q.base) { q.chgAbs = q.last - q.base; q.chgP = (q.chgAbs / q.base) * 100; }
      else if (p.chg != null) q.chgP = p.chg;
      if (old != null && q.last !== old) { q.dir = q.last > old ? 1 : -1; q.flashAt = Date.now(); }
      q.upd = Date.now();
      this.dirty.add(k);
      if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; const d = Array.from(this.dirty); this.dirty.clear(); for (const fn of this.subs) { try { fn(d); } catch (e) { console.error(e); } } });
    },
    track(keys) {
      const uniq = Array.from(new Set(keys.filter(Boolean)));
      const sig = uniq.slice().sort().join('|');
      if (sig === this.sig) return;
      const prev = new Set(this.keys);
      this.sig = sig; this.keys = uniq;
      const by = { upbit: [], binance: [], binancef: [] };
      for (const k of uniq) { const i = k.indexOf(':'), s = k.slice(0, i); if (by[s]) by[s].push(k.slice(i + 1)); }
      Data.upbitWS.setTickers(by.upbit);
      Data.binStreams.binance.set(by.binance);
      Data.binStreams.binancef.set(by.binancef);
      const fresh = uniq.filter((k) => !prev.has(k));
      if (fresh.length) this.snapshot(fresh);
      if (!this.timer) this.timer = setInterval(() => this.refresh(), 5000);
    },
    async snapshot(keys) {
      const by = {};
      for (const k of keys) { const i = k.indexOf(':'); (by[k.slice(0, i)] || (by[k.slice(0, i)] = [])).push(k.slice(i + 1)); }
      await Promise.all(Object.keys(by).map(async (src) => {
        if (src === 'csv' || src === 'demo') return;
        try { const q = await Data.quotes(src, by[src]); for (const s in q) if (q[s] && q[s].last != null) this.put(src + ':' + s, q[s]); } catch (e) {}
      }));
    },
    refresh() {
      this.n++;
      const now = Date.now();
      const stock = this.keys.filter((k) => k.startsWith('stock:'));
      if (stock.length && this.n % 3 === 0) this.snapshot(stock);
      const stale = this.keys.filter((k) => !k.startsWith('stock:') && (!this.data[k] || now - (this.data[k].upd || 0) > 20000));
      if (stale.length && this.n % 2 === 0) this.snapshot(stale);
    },
  });
  Data.upbitWS.onTicker = (m) => QH.put('upbit:' + m.cd, { last: m.tp, base: m.pcp, open: m.op, high: m.hp, low: m.lp, vol: m.atv, qv: m.atp, w52h: m.h52wp, w52l: m.l52wp, live: true });
  const binK = (src) => (s, k) => QH.put(src + ':' + s, { last: +k.c, base: +k.o, open: +k.o, high: +k.h, low: +k.l, vol: +k.v, qv: +k.q, live: true });
  Data.binStreams.binance.onK = binK('binance');
  Data.binStreams.binancef.onK = binK('binancef');

  /* ===================== 표시용 헬퍼 ===================== */
  const TICK = {
    '^KS11': 'KOSPI', '^KQ11': 'KOSDAQ', '^KS200': 'KOSPI200', '^GSPC': 'SPX', '^IXIC': 'IXIC', '^DJI': 'DJI', '^NDX': 'NDX', '^VIX': 'VIX',
    '^SOX': 'SOX', '^N225': 'NI225', 'KRW=X': 'USDKRW', 'GC=F': 'GOLD', 'SI=F': 'SILVER', 'CL=F': 'WTI', 'BZ=F': 'BRENT', 'NG=F': 'NATGAS',
  };
  const DEF_NAMES = {
    'stock:^KS11': '코스피', 'stock:^KQ11': '코스닥', 'stock:^GSPC': 'S&P 500', 'stock:^IXIC': '나스닥 종합', 'stock:^DJI': '다우존스', 'stock:005930.KS': '삼성전자',
    'stock:000660.KS': 'SK하이닉스', 'stock:NVDA': '엔비디아', 'stock:AAPL': '애플', 'stock:TSLA': '테슬라', 'stock:MSFT': '마이크로소프트', 'stock:KRW=X': '달러/원 환율',
    'stock:GC=F': '금 선물', 'stock:CL=F': 'WTI 원유', 'binancef:BTCUSDT': '비트코인 무기한 선물',
  };
  const tickOf = (src, sym) => {
    if (src === 'upbit') { const p = sym.split('-'); return p.length === 2 ? p[1] + p[0] : sym; }
    if (src === 'binancef') return sym + '.P';
    if (src === 'stock') return TICK[sym] || sym.replace(/\.(KS|KQ)$/, '').replace(/^\^/, '').replace(/=X$/, '').replace(/=F$/, '1!');
    return sym;
  };
  const exOf = (src, sym, q) => {
    if (src === 'upbit') return 'UPBIT';
    if (src === 'binance') return 'BINANCE';
    if (src === 'binancef') return 'BINANCE 선물';
    if (src === 'stock') return /\.KS$/.test(sym) ? 'KOSPI' : /\.KQ$/.test(sym) ? 'KOSDAQ' : (q && q.ex) || (sym[0] === '^' ? '지수' : /=X$/.test(sym) ? '환율' : /=F$/.test(sym) ? '선물' : 'US');
    return src.toUpperCase();
  };
  const curOf = (src, sym, q) => {
    if (src === 'upbit') return sym.split('-')[0];
    if (src === 'binance' || src === 'binancef') { for (const x of QUOTES) if (sym.endsWith(x)) return x; return ''; }
    if (q && q.cur) return q.cur;
    return /\.(KS|KQ)$/.test(sym) ? 'KRW' : '';
  };
  const decOf = (v) => { const a = Math.abs(v); return a >= 1000 ? (a >= 100000 ? 0 : 2) : a >= 1 ? 2 : a === 0 ? 2 : Math.min(8, Math.ceil(-Math.log10(a)) + 3); };
  const FLAGC = { red: '#f23645', blue: '#2962ff', green: '#089981', orange: '#ff9800', purple: '#9c27b0' };
  const FLAGN = { red: '빨강', blue: '파랑', green: '초록', orange: '주황', purple: '보라' };
  const sec = (name) => ({ t: 'sec', id: U.uid(), name });
  const sym = (src, s) => ({ t: 'sym', src, sym: s });
  const DEFAULT_STATE = () => ({
    v: 1, cur: 'l1', flags: {}, cols: { last: true, chg: true, chgp: true, vol: false }, names: false, sort: null, detH: 340, det: true,
    lists: [{
      id: 'l1', name: '관심종목', items: [
        sec('코인 · 업비트'), sym('upbit', 'KRW-BTC'), sym('upbit', 'KRW-ETH'), sym('upbit', 'KRW-XRP'), sym('upbit', 'KRW-SOL'),
        sec('코인 · 바이낸스'), sym('binance', 'BTCUSDT'), sym('binance', 'ETHUSDT'), sym('binance', 'SOLUSDT'), sym('binancef', 'BTCUSDT'),
        sec('지수 · 주식'), sym('stock', '^KS11'), sym('stock', '^KQ11'), sym('stock', '005930.KS'), sym('stock', '000660.KS'),
        sym('stock', '^IXIC'), sym('stock', 'NVDA'), sym('stock', 'AAPL'), sym('stock', 'KRW=X'),
      ],
    }],
  });

  /* ===================== 관심종목 패널 ===================== */
  class Watchlist {
    constructor(app) {
      this.app = app;
      this.st = this.loadState();
      this.sel = null;
      this.rows = new Map();
      this.root = null;
      QH.on((keys) => this.onQuotes(keys));
      this.upNames = {}; this.upBase = {};
      Data.get('upbit').list().then((L) => {
        for (const x of L) { this.upNames[x.symbol] = x.name; const b = x.symbol.split('-')[1]; if (b && (!this.upBase[b] || x.symbol.startsWith('KRW-'))) this.upBase[b] = x.name; }
        if (this.root) { this.render(this.host); this.app._topKey = ''; this.app.refreshTop(); }
        if (this.app.m) this.app.m.onNames();
      }).catch(() => {});
    }
    loadState() {
      let s = U.load('wl', null);
      if (!s || !s.lists || !s.lists.length) {
        s = DEFAULT_STATE();
        const old = U.load('watch', null);
        const oldDefault = ['upbit:KRW-BTC', 'upbit:KRW-ETH', 'upbit:KRW-XRP', 'binance:BTCUSDT', 'binance:ETHUSDT', 'binance:SOLUSDT'].join();
        if (Array.isArray(old) && old.length && old.map((w) => w.src + ':' + w.sym).join() !== oldDefault) s.lists[0].items = old.map((w) => sym(w.src, w.sym));
        U.save('wl', s);
      }
      s.cols = Object.assign({ last: true, chg: true, chgp: true, vol: false }, s.cols || {});
      s.flags = s.flags || {};
      return s;
    }
    save() { U.save('wl', this.st); if (this.app.m) this.app.m.onWl(); }
    get list() {
      const c = this.st.cur;
      if (String(c).startsWith('flag:')) {
        const col = c.slice(5);
        return { id: c, name: FLAGN[col] + ' 깃발', virtual: true, items: Object.keys(this.st.flags).filter((k) => this.st.flags[k] === col).map((k) => { const i = k.indexOf(':'); return sym(k.slice(0, i), k.slice(i + 1)); }) };
      }
      return this.st.lists.find((l) => l.id === c) || this.st.lists[0];
    }
    keys() { return this.list.items.filter((i) => i.t === 'sym').map((i) => i.src + ':' + i.sym); }
    has(src, s) { return this.keys().includes(src + ':' + s); }
    nameOf(src, s) {
      const k = src + ':' + s;
      let n = (this.app.names && this.app.names[k]) || DEF_NAMES[k] || (src === 'upbit' && this.upNames[s]) || (QH.get(k) && QH.get(k).name) || '';
      if (!n && (src === 'binance' || src === 'binancef')) {
        const b = baseOf(src, s), q = curOf(src, s);
        if (this.upBase[b]) n = this.upBase[b] + ' / ' + q + (src === 'binancef' ? ' 무기한' : '');
      }
      return n;
    }
    labelOf(src, s) { return (this.st.names && this.nameOf(src, s)) || tickOf(src, s); }
    track() { this.app.trackQuotes(); }
    add(src, s, name) {
      if (this.list.virtual) { this.st.flags[src + ':' + s] = this.st.cur.slice(5); this.save(); this.render(this.host); this.track(); return true; }
      if (this.has(src, s)) return false;
      if (name && !this.app.names[src + ':' + s] && name !== s) { this.app.names[src + ':' + s] = name; U.save('names', this.app.names); }
      const items = this.list.items;
      const i = this.sel ? items.findIndex((x) => x.t === 'sym' && x.src + ':' + x.sym === this.sel) : -1;
      items.splice(i >= 0 ? i + 1 : items.length, 0, sym(src, s));
      this.save(); this.render(this.host); this.track();
      return true;
    }
    remove(idx) {
      const L = this.list;
      if (L.virtual) { const it = L.items[idx]; if (it) delete this.st.flags[it.src + ':' + it.sym]; }
      else L.items.splice(idx, 1);
      this.save(); this.render(this.host); this.track();
    }

    /* ---------- 렌더 ---------- */
    render(host) {
      if (!host) return;
      this.host = host;
      host.innerHTML = '';
      const s = this.st, L = this.list;
      const root = h('div', { class: 'wl' + ['last', 'chg', 'chgp', 'vol'].map((c) => (s.cols[c] ? '' : ' no-' + c)).join('') });
      root.style.setProperty('--wlcols', ['3px', 'minmax(0,1fr)', s.cols.last && '78px', s.cols.chg && '62px', s.cols.chgp && '56px', s.cols.vol && '54px', '18px'].filter(Boolean).join(' '));
      const head = h('div', { class: 'wl-head' },
        h('button', { class: 'wl-name', title: '관심종목 목록', onclick: (e) => this.listsMenu(e.currentTarget) }, h('span', { text: L.name }), h('i', { text: '▾' })),
        h('div', { class: 'grow' }),
        h('button', { class: 'wl-btn', title: '종목 추가', html: ICON.plus, onclick: () => this.openAdd() }),
        L.virtual ? null : h('button', { class: 'wl-btn', title: '섹션 추가', html: ICON.sec, onclick: () => this.addSection() }),
        h('button', { class: 'wl-btn', title: '보기 설정', html: ICON.dots, onclick: (e) => this.viewMenu(e.currentTarget) }));
      const so = s.sort || {};
      const colH = (k, n, cls) => h('span', { class: 'wl-c ' + cls + (so.col === k ? ' sorted' : ''), onclick: () => this.toggleSort(k) }, n, so.col === k ? h('i', { text: so.dir > 0 ? ' ▲' : ' ▼' }) : null);
      const cols = h('div', { class: 'wl-cols' }, h('span'), colH('sym', '종목', 'c-s'), colH('last', '현재가', 'c-last'), colH('chg', '변동', 'c-chg'), colH('chgp', '변동%', 'c-chgp'), colH('vol', '거래량', 'c-vol'), h('span'));
      const list = h('div', { class: 'wl-list', tabindex: 0 });
      this.list_el = list;
      this.rows = new Map();
      const items = this.displayItems();
      let collapsed = false;
      if (!items.length) list.append(h('div', { class: 'wl-empty', html: L.virtual ? '깃발을 단 종목이 없습니다.<br>종목 우클릭 → 깃발' : '종목이 없습니다. <b>+</b> 로 추가하세요.' }));
      for (const { it, idx } of items) {
        if (it.t === 'sec') { collapsed = !!it.collapsed; list.append(this.secEl(it, idx)); continue; }
        if (collapsed) continue;
        list.append(this.rowEl(it, idx));
      }
      this.bindList(list);
      const det = h('div', { class: 'wl-det' + (s.det ? '' : ' hidden'), style: { height: s.detH + 'px' } });
      const split = h('div', { class: 'wl-split' + (s.det ? '' : ' hidden'), title: '드래그해서 크기 조절' });
      this.bindSplit(split, det);
      root.append(head, cols, list, split, det);
      host.append(root);
      this.root = root; this.det = det;
      if (!this.sel || !this.keys().includes(this.sel)) {
        const a = this.app.active;
        this.sel = a && this.keys().includes(a.key) ? a.key : this.keys()[0] || null;
      }
      this.syncActive();
      this.renderDetails();
      for (const k of this.rows.keys()) this.paint(k);
      this.track();
    }
    displayItems() {
      const items = this.list.items.map((it, idx) => ({ it, idx }));
      const so = this.st.sort;
      if (!so || !so.col) return items;
      const val = (it) => {
        if (so.col === 'sym') return this.labelOf(it.src, it.sym).toLowerCase();
        const q = QH.get(it.src + ':' + it.sym) || {};
        return so.col === 'last' ? q.last : so.col === 'chg' ? q.chgAbs : so.col === 'chgp' ? q.chgP : q.vol;
      };
      const out = [];
      let group = [];
      const flush = () => {
        group.sort((a, b) => {
          const x = val(a.it), y = val(b.it);
          if (x == null) return 1; if (y == null) return -1;
          return (x < y ? -1 : x > y ? 1 : 0) * so.dir;
        });
        out.push(...group); group = [];
      };
      for (const e of items) { if (e.it.t === 'sec') { flush(); out.push(e); } else group.push(e); }
      flush();
      return out;
    }
    secEl(it, idx) {
      return h('div', { class: 'wl-sec' + (it.collapsed ? ' col' : ''), 'data-i': idx, draggable: !this.list.virtual && !this.st.sort ? 'true' : 'false' },
        h('span', { class: 'wl-caret', text: it.collapsed ? '▸' : '▾' }), h('span', { class: 'wl-sec-n', text: it.name }),
        this.list.virtual ? null : h('button', { class: 'wl-x', html: ICON.close, title: '섹션 삭제 (종목은 유지)', 'data-act': 'rm' }));
    }
    rowEl(it, idx) {
      const k = it.src + ':' + it.sym, nm = this.nameOf(it.src, it.sym), fl = this.st.flags[k];
      const c = {
        last: h('span', { class: 'wl-c c-last' }), chg: h('span', { class: 'wl-c c-chg' }), chgp: h('span', { class: 'wl-c c-chgp' }), vol: h('span', { class: 'wl-c c-vol' }),
      };
      const row = h('div', { class: 'wl-row', 'data-k': k, 'data-i': idx, draggable: !this.st.sort && !this.list.virtual ? 'true' : 'false', title: (nm ? nm + ' · ' : '') + exOf(it.src, it.sym) + ' · ' + it.sym },
        h('span', { class: 'wl-flag', style: fl ? { background: FLAGC[fl] } : {} }),
        h('span', { class: 'wl-c c-s' }, Logo.el(it.src, it.sym, 18, nm), h('span', { class: 'wl-t', text: this.labelOf(it.src, it.sym) })),
        c.last, c.chg, c.chgp, c.vol,
        h('button', { class: 'wl-x', html: ICON.close, title: '목록에서 삭제', 'data-act': 'rm' }));
      this.rows.set(k, { row, c });
      return row;
    }
    paint(k) {
      const r = this.rows.get(k), q = QH.get(k);
      if (!r || !q || q.last == null) return;
      const set = this.app.set, ch = this.app.charts.find((x) => x.key === k && x.bars.length);
      const d = ch ? ch.prec : decOf(q.last);
      r.c.last.textContent = U.fmt(q.last, d);
      const col = q.chgP > 0 ? set.up : q.chgP < 0 ? set.dn : '';
      r.c.chg.textContent = q.chgAbs != null ? (q.chgAbs > 0 ? '+' : '') + U.fmt(q.chgAbs, d) : '';
      r.c.chgp.textContent = q.chgP != null ? U.fmtPct(q.chgP) : '';
      r.c.chg.style.color = r.c.chgp.style.color = col;
      r.c.vol.textContent = q.vol != null ? U.fmtVol(q.vol) : '';
      if (q.flashAt && Date.now() - q.flashAt < 300 && q.dir) {
        const el = r.c.last;
        el.classList.remove('fl-up', 'fl-dn');
        void el.offsetWidth;
        el.classList.add(q.dir > 0 ? 'fl-up' : 'fl-dn');
      }
    }
    onQuotes(keys) {
      if (!this.root || !this.root.isConnected) return;
      for (const k of keys) { this.paint(k); if (k === this.sel) this.paintDetails(); }
    }
    syncActive() {
      const a = this.app.active, ak = a ? a.key : '';
      for (const [k, r] of this.rows) { r.row.classList.toggle('on', k === ak); r.row.classList.toggle('sel', k === this.sel); }
    }
    onChartLoaded(c) {
      if (c !== this.app.active) return;
      if (this.keys().includes(c.key)) { this.sel = c.key; this.renderDetails(); }
      this.syncActive();
    }

    /* ---------- 상호작용 ---------- */
    open(k, inNext) {
      const i = k.indexOf(':'), src = k.slice(0, i), s = k.slice(i + 1);
      let c = this.app.active;
      if (inNext && this.app.charts.length > 1) c = this.app.charts[(this.app.charts.indexOf(c) + 1) % this.app.charts.length];
      const iv = Data.supports(src, c.iv, s) ? c.iv : '1D';
      if (c.key !== k || c.iv !== iv) { c.load(src, s, iv); this.app.saveSlot(c); }
      this.sel = k;
      this.syncActive(); this.renderDetails();
      this.app.refreshTop();
    }
    bindList(list) {
      list.addEventListener('click', (e) => {
        const x = e.target.closest('[data-act="rm"]');
        const row = e.target.closest('.wl-row'), secR = e.target.closest('.wl-sec');
        if (x && (row || secR)) { e.stopPropagation(); this.remove(+(row || secR).dataset.i); return; }
        if (secR) { const it = this.list.items[+secR.dataset.i]; it.collapsed = !it.collapsed; this.save(); this.render(this.host); return; }
        if (row) { list.focus({ preventScroll: true }); this.open(row.dataset.k); }
      });
      list.addEventListener('contextmenu', (e) => {
        const row = e.target.closest('.wl-row'), secR = e.target.closest('.wl-sec');
        if (!row && !secR) return;
        e.preventDefault();
        if (row) this.rowMenu(e, row.dataset.k, +row.dataset.i); else this.secMenu(e, +secR.dataset.i);
      });
      list.addEventListener('keydown', (e) => {
        const vis = Array.from(list.querySelectorAll('.wl-row')).map((r) => r.dataset.k);
        const i = vis.indexOf(this.sel);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const j = U.clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, vis.length - 1);
          if (vis[j]) { this.open(vis[j]); const r = this.rows.get(vis[j]); if (r) r.row.scrollIntoView({ block: 'nearest' }); }
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel) {
          e.preventDefault();
          const r = this.rows.get(this.sel);
          if (r) { const nx = vis[i + 1] || vis[i - 1]; this.remove(+r.row.dataset.i); if (nx) { this.sel = nx; this.syncActive(); } }
        } else if (e.key === 'Enter' && this.sel) this.open(this.sel);
      });
      // 드래그로 순서 바꾸기
      let dragI = -1;
      list.addEventListener('dragstart', (e) => {
        const el = e.target.closest('.wl-row, .wl-sec');
        if (!el || this.list.virtual || this.st.sort) { e.preventDefault(); return; }
        dragI = +el.dataset.i; el.classList.add('drag');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(dragI)); } catch (er) {}
      });
      list.addEventListener('dragend', () => { dragI = -1; list.querySelectorAll('.drag, .drop-a, .drop-b').forEach((x) => x.classList.remove('drag', 'drop-a', 'drop-b')); });
      list.addEventListener('dragover', (e) => {
        if (dragI < 0) return;
        e.preventDefault();
        list.querySelectorAll('.drop-a, .drop-b').forEach((x) => x.classList.remove('drop-a', 'drop-b'));
        const el = e.target.closest('.wl-row, .wl-sec');
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-a' : 'drop-b');
      });
      list.addEventListener('drop', (e) => {
        if (dragI < 0) return;
        e.preventDefault();
        const el = e.target.closest('.wl-row, .wl-sec');
        const items = this.list.items;
        let to = items.length;
        if (el) { const r = el.getBoundingClientRect(); to = +el.dataset.i + (e.clientY < r.top + r.height / 2 ? 0 : 1); }
        const [it] = items.splice(dragI, 1);
        if (to > dragI) to--;
        items.splice(to, 0, it);
        dragI = -1;
        this.save(); this.render(this.host);
      });
    }
    bindSplit(split, det) {
      split.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const y0 = e.clientY, h0 = det.offsetHeight;
        const mv = (ev) => { const hh = U.clamp(h0 - (ev.clientY - y0), 110, Math.max(140, this.root.offsetHeight - 160)); det.style.height = hh + 'px'; this.st.detH = hh; };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); this.save(); };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
    }
    toggleSort(col) {
      const so = this.st.sort;
      if (!so || so.col !== col) this.st.sort = { col, dir: col === 'sym' ? 1 : -1 };
      else if ((col === 'sym' && so.dir === 1) || (col !== 'sym' && so.dir === -1)) so.dir = -so.dir;
      else this.st.sort = null;
      this.save(); this.render(this.host);
    }
    openAdd() {
      this.app.openSearch(this.app.active, '', {
        title: this.list.virtual ? this.list.name + ' 목록에 추가' : '"' + this.list.name + '"에 종목 추가',
        add: (it) => this.add(it.source, it.symbol, String(it.name || '').split(' · ')[0]),
        has: (it) => (this.list.virtual ? this.st.flags[it.source + ':' + it.symbol] === this.st.cur.slice(5) : this.has(it.source, it.symbol)),
      });
    }
    ask(title, value, cb) {
      const inp = h('input', { type: 'text', value: value || '', class: 's-in' });
      const m = this.app.modal(title, inp, [{ t: '취소' }, { t: '확인', cls: 'pri', ok: true, fn: () => { const v = inp.value.trim(); if (!v) return false; cb(v); } }], { cls: 'm-txt' });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = inp.value.trim(); if (v) { cb(v); m.close(true); } } });
      setTimeout(() => { inp.focus(); inp.select(); }, 10);
    }
    addSection() {
      this.ask('섹션 추가', '새 섹션', (name) => {
        const items = this.list.items;
        const i = this.sel ? items.findIndex((x) => x.t === 'sym' && x.src + ':' + x.sym === this.sel) : -1;
        items.splice(i >= 0 ? i : items.length, 0, sec(name));
        this.save(); this.render(this.host);
      });
    }
    menu(anchorOrEvent, items) {
      const app = this.app;
      app.closePop(); app.closeCtx();
      const box = h('div', { class: 'pop ctx' });
      for (const it of items) {
        if (it === '-') { box.append(h('div', { class: 'ctx-sep' })); continue; }
        if (it.head) { box.append(h('div', { class: 'fly-head', text: it.head })); continue; }
        box.append(h('div', { class: 'ctx-item ' + (it.cls || '') + (it.on ? ' on' : ''), onclick: () => { app.closePop(); it.fn(); } }, it.dot ? h('i', { class: 'm-dot', style: { background: it.dot } }) : null, it.n));
      }
      if (anchorOrEvent.clientX != null) {
        document.body.append(box);
        box.style.left = U.clamp(anchorOrEvent.clientX, 4, innerWidth - box.offsetWidth - 4) + 'px';
        box.style.top = U.clamp(anchorOrEvent.clientY, 4, innerHeight - box.offsetHeight - 4) + 'px';
        app.pop = box;
        setTimeout(() => { app._popOff = (ev) => { if (!box.contains(ev.target)) app.closePop(); }; document.addEventListener('pointerdown', app._popOff, true); }, 0);
      } else app.showPop(box, anchorOrEvent, 'down');
    }
    rowMenu(e, k, idx) {
      const i = k.indexOf(':'), src = k.slice(0, i), s = k.slice(i + 1);
      const fl = this.st.flags[k];
      const setFlag = (c) => { if (c) this.st.flags[k] = c; else delete this.st.flags[k]; this.save(); this.render(this.host); };
      const items = [
        { n: '차트에 열기', fn: () => this.open(k) },
        this.app.charts.length > 1 ? { n: '다음 칸 차트에 열기', fn: () => this.open(k, true) } : null,
        { n: '가격 알림 추가…', fn: () => { this.open(k); setTimeout(() => this.app.openAlertDialog(this.app.active), 300); } },
        '-', { head: '깃발' },
        ...Object.keys(FLAGC).map((c) => ({ n: FLAGN[c], dot: FLAGC[c], on: fl === c, fn: () => setFlag(c) })),
        fl ? { n: '깃발 해제', fn: () => setFlag(null) } : null,
        '-',
      ];
      if (!this.list.virtual) {
        items.push({ n: '위에 섹션 추가…', fn: () => { this.sel = k; this.addSection(); } });
        items.push({ n: '맨 위로 이동', fn: () => { const L = this.list.items; const [it] = L.splice(idx, 1); L.unshift(it); this.save(); this.render(this.host); } });
        const others = this.st.lists.filter((l) => l.id !== this.list.id);
        for (const l of others) items.push({ n: '"' + l.name + '"에 복사', fn: () => { if (!l.items.some((x) => x.t === 'sym' && x.src === src && x.sym === s)) { l.items.push(sym(src, s)); this.save(); U.toast(l.name + '에 추가됨'); } } });
      }
      items.push({ n: this.list.virtual ? '이 목록에서 빼기 (깃발 해제)' : '목록에서 삭제', cls: 'danger', fn: () => this.remove(idx) });
      this.menu(e, items.filter(Boolean));
    }
    secMenu(e, idx) {
      const it = this.list.items[idx];
      this.menu(e, [
        { n: '이름 바꾸기…', fn: () => this.ask('섹션 이름', it.name, (v) => { it.name = v; this.save(); this.render(this.host); }) },
        { n: it.collapsed ? '펼치기' : '접기', fn: () => { it.collapsed = !it.collapsed; this.save(); this.render(this.host); } },
        { n: '섹션 삭제 (종목은 유지)', cls: 'danger', fn: () => this.remove(idx) },
      ]);
    }
    listsMenu(anchor) {
      const s = this.st, items = [{ head: '내 목록' }];
      for (const l of s.lists) items.push({ n: l.name + '  (' + l.items.filter((x) => x.t === 'sym').length + ')', on: s.cur === l.id, fn: () => { s.cur = l.id; this.sel = null; this.save(); this.render(this.host); } });
      items.push({ head: '깃발 목록' });
      for (const c of Object.keys(FLAGC)) {
        const n = Object.values(s.flags).filter((x) => x === c).length;
        items.push({ n: FLAGN[c] + ' 깃발  (' + n + ')', dot: FLAGC[c], on: s.cur === 'flag:' + c, fn: () => { s.cur = 'flag:' + c; this.sel = null; this.save(); this.render(this.host); } });
      }
      items.push('-');
      items.push({ n: '새 목록 만들기…', fn: () => this.ask('새 관심종목 목록', '새 목록', (v) => { const l = { id: U.uid(), name: v, items: [] }; s.lists.push(l); s.cur = l.id; this.save(); this.render(this.host); }) });
      if (!this.list.virtual) {
        const L = this.list;
        items.push({ n: '이름 바꾸기…', fn: () => this.ask('목록 이름', L.name, (v) => { L.name = v; this.save(); this.render(this.host); }) });
        items.push({ n: '목록 복사', fn: () => { const c = JSON.parse(JSON.stringify(L)); c.id = U.uid(); c.name = L.name + ' 복사본'; s.lists.push(c); s.cur = c.id; this.save(); this.render(this.host); } });
        if (s.lists.length > 1) items.push({ n: '목록 삭제', cls: 'danger', fn: () => this.app.confirm('"' + L.name + '" 목록을 삭제할까요?', () => { s.lists = s.lists.filter((x) => x !== L); s.cur = s.lists[0].id; this.save(); this.render(this.host); }) });
      }
      items.push('-');
      items.push({ n: '가져오기… (.txt, 트레이딩뷰 내보내기 파일 가능)', fn: () => this.importList() });
      items.push({ n: '내보내기 (.txt)', fn: () => this.exportList() });
      this.menu(anchor, items);
    }
    viewMenu(anchor) {
      const s = this.st;
      const tg = (k, n) => ({ n: (s.cols[k] ? '✓ ' : '　') + n, fn: () => { s.cols[k] = !s.cols[k]; this.save(); this.render(this.host); } });
      this.menu(anchor, [
        { head: '열' }, tg('last', '현재가'), tg('chg', '변동'), tg('chgp', '변동%'), tg('vol', '거래량'), '-',
        { n: (s.names ? '✓ ' : '　') + '종목명으로 표시', fn: () => { s.names = !s.names; this.save(); this.render(this.host); } },
        { n: (s.det ? '✓ ' : '　') + '상세 정보 표시', fn: () => { s.det = !s.det; this.save(); this.render(this.host); } },
        s.sort ? { n: '정렬 해제', fn: () => { s.sort = null; this.save(); this.render(this.host); } } : null,
      ].filter(Boolean));
    }

    /* ---------- 가져오기 / 내보내기 ---------- */
    exportList() {
      const L = this.list;
      const lines = L.items.map((it) => (it.t === 'sec' ? '###' + it.name : it.src + ':' + it.sym));
      const a = h('a', { href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' })), download: L.name.replace(/[\\/:*?"<>|]/g, '_') + '.txt' });
      document.body.append(a); a.click(); a.remove();
    }
    importList() {
      const fi = h('input', { type: 'file', accept: '.txt,.csv,text/plain', style: { display: 'none' } });
      document.body.append(fi);
      fi.onchange = async () => {
        const f = fi.files[0]; fi.remove();
        if (!f) return;
        const items = await this.parseImport(await f.text());
        if (!items.length) { U.toast('가져올 종목을 찾지 못했습니다', 'warn'); return; }
        const l = { id: U.uid(), name: f.name.replace(/\.[^.]+$/, ''), items };
        this.st.lists.push(l); this.st.cur = l.id; this.save(); this.render(this.host);
        U.toast(items.filter((x) => x.t === 'sym').length + '개 종목을 가져왔습니다');
      };
      fi.click();
    }
    async parseImport(text) {
      const toks = text.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
      const out = [];
      const TV = { 'TVC:KOSPI': '^KS11', 'KRX:KOSPI': '^KS11', 'TVC:KOSDAQ': '^KQ11', 'KRX:KOSDAQ': '^KQ11', 'SP:SPX': '^GSPC', 'TVC:SPX': '^GSPC', 'NASDAQ:IXIC': '^IXIC', 'TVC:IXIC': '^IXIC', 'DJ:DJI': '^DJI', 'TVC:DJI': '^DJI', 'FX_IDC:USDKRW': 'KRW=X', 'FX:USDKRW': 'KRW=X', 'TVC:GOLD': 'GC=F', 'TVC:USOIL': 'CL=F' };
      for (const t0 of toks) {
        if (t0.startsWith('###')) { out.push(sec(t0.slice(3).trim() || '섹션')); continue; }
        const t = t0.replace(/^﻿/, '');
        const m = t.match(/^(upbit|binance|binancef|stock|csv|demo):(.+)$/);
        if (m) { out.push(sym(m[1], m[2])); continue; }
        const u = t.toUpperCase();
        if (TV[u]) { out.push(sym('stock', TV[u])); continue; }
        const p = u.split(':');
        if (p.length !== 2) continue;
        const [ex, tk] = p;
        if (ex === 'UPBIT') { const q = ['KRW', 'USDT', 'BTC'].find((x) => tk.endsWith(x)); if (q) out.push(sym('upbit', q + '-' + tk.slice(0, -q.length))); }
        else if (ex === 'BINANCE') out.push(tk.endsWith('.P') ? sym('binancef', tk.slice(0, -2)) : sym('binance', tk));
        else if (ex === 'KRX') {
          let s2 = tk + '.KS';
          try { const r = await Data.search('stock', tk); const hit = r.find((x) => x.symbol.split('.')[0] === tk); if (hit) s2 = hit.symbol; } catch (e) {}
          out.push(sym('stock', s2));
        } else if (/^(NASDAQ|NYSE|AMEX|NYSEARCA|ARCA|BATS|CBOE)$/.test(ex)) out.push(sym('stock', tk.replace(/\./g, '-')));
      }
      return out;
    }

    /* ---------- 상세 정보 ---------- */
    renderDetails() {
      const det = this.det;
      if (!det || det.classList.contains('hidden')) return;
      det.innerHTML = '';
      const k = this.sel;
      if (!k) { det.append(h('div', { class: 'wl-empty', text: '종목을 선택하세요' })); return; }
      const i = k.indexOf(':'), src = k.slice(0, i), s = k.slice(i + 1), nm = this.nameOf(src, s);
      const q = QH.get(k) || {};
      this.dEl = {
        price: h('span', { class: 'd-price' }), cur: h('span', { class: 'd-cur' }), chg: h('span', { class: 'd-chg' }), status: h('div', { class: 'd-status' }),
        day: h('div', { class: 'd-range' }), w52: h('div', { class: 'd-range' }), stats: h('div', { class: 'd-stats' }), perf: h('div', { class: 'd-perf' }),
      };
      det.append(
        h('div', { class: 'd-head' }, Logo.el(src, s, 34, nm),
          h('div', { class: 'd-id' }, h('div', { class: 'd-tick' }, h('b', { text: tickOf(src, s) }), h('span', { class: 'd-ex', text: exOf(src, s, q) })), h('div', { class: 'd-name', text: nm || s }))),
        h('div', { class: 'd-pr' }, this.dEl.price, this.dEl.cur), this.dEl.chg, this.dEl.status,
        h('div', { class: 'd-lbl', text: '일간 범위' }), this.dEl.day,
        h('div', { class: 'd-lbl', text: '52주 범위' }), this.dEl.w52,
        this.dEl.stats, h('div', { class: 'd-lbl', text: '성과' }), this.dEl.perf);
      this.paintDetails();
      const tok = (this._dtok = (this._dtok || 0) + 1);
      Data.daily(src, s).then((bars) => { if (tok === this._dtok) { this.dBars = bars; this.paintDetails(); } }).catch(() => {});
      this.dBars = Data._daily[k] ? Data._daily[k].bars : null;
    }
    paintDetails() {
      const E = this.dEl, k = this.sel;
      if (!E || !k || !this.det || !this.det.isConnected) return;
      const i = k.indexOf(':'), src = k.slice(0, i), s = k.slice(i + 1);
      const q = QH.get(k) || {}, set = this.app.set, bars = this.dBars;
      const ch = this.app.charts.find((x) => x.key === k && x.bars.length);
      const last = q.last != null ? q.last : bars && bars.length ? bars[bars.length - 1].c : null;
      const d = ch ? ch.prec : last != null ? decOf(last) : 2;
      E.price.textContent = last != null ? U.fmt(last, d) : '—';
      E.cur.textContent = curOf(src, s, q);
      const up = q.chgP > 0, dn = q.chgP < 0;
      E.chg.textContent = q.chgP != null ? (q.chgAbs > 0 ? '+' : '') + U.fmt(q.chgAbs, d) + '  (' + U.fmtPct(q.chgP) + ')' : '';
      E.chg.style.color = up ? set.up : dn ? set.dn : '';
      if (src === 'stock') { E.status.textContent = q.mopen ? '● 장중 · 약 15~20분 지연' : '● 장 마감'; E.status.className = 'd-status ' + (q.mopen ? 'poll' : 'off'); }
      else if (src === 'csv' || src === 'demo') { E.status.textContent = '● 파일/가상 데이터'; E.status.className = 'd-status off'; }
      else { E.status.textContent = q.live ? '● 실시간' : '● 연결 중…'; E.status.className = 'd-status ' + (q.live ? 'live' : 'off'); }
      const range = (el, lo, hi, v) => {
        el.innerHTML = '';
        if (lo == null || hi == null || !(hi > lo) || v == null) { el.textContent = '—'; return; }
        const p = U.clamp((v - lo) / (hi - lo), 0, 1);
        el.append(h('span', { text: U.fmt(lo, d) }), h('span', { class: 'd-bar' }, h('i', { style: { width: p * 100 + '%' } }), h('b', { style: { left: p * 100 + '%' } })), h('span', { text: U.fmt(hi, d) }));
      };
      let w52h = q.w52h, w52l = q.w52l;
      if ((w52h == null || w52l == null) && bars && bars.length) {
        const t0 = Date.now() - 365 * 864e5;
        for (const b of bars) if (b.t >= t0) { w52h = w52h == null || b.h > w52h ? b.h : w52h; w52l = w52l == null || b.l < w52l ? b.l : w52l; }
      }
      range(E.day, q.low, q.high, last);
      range(E.w52, w52l, w52h, last);
      E.stats.innerHTML = '';
      const st = (n, v) => E.stats.append(h('div', {}, h('span', { text: n }), h('b', { text: v })));
      st('시가', q.open != null ? U.fmt(q.open, d) : '—');
      st('전일 종가', q.base != null ? U.fmt(q.base, d) : '—');
      st('거래량', q.vol != null ? U.fmtVol(q.vol) : '—');
      if (q.qv != null) st('거래대금', U.fmtVol(q.qv));
      E.perf.innerHTML = '';
      if (bars && bars.length && last != null) {
        const ref = (t) => { let r = null; for (const b of bars) { if (b.t <= t) r = b.c; else break; } return r; };
        const now = Date.now(), y0 = new Date(new Date().getFullYear(), 0, 1).getTime();
        for (const [n, t] of [['1주', now - 7 * 864e5], ['1개월', now - 30 * 864e5], ['3개월', now - 91 * 864e5], ['6개월', now - 182 * 864e5], ['올해', y0 - 1], ['1년', now - 365 * 864e5]]) {
          const r = ref(t), v = r ? ((last - r) / r) * 100 : null;
          const c = v == null ? '' : v >= 0 ? set.up : set.dn;
          E.perf.append(h('div', { class: 'd-pt', style: c ? { background: U.rgba(c, 0.16), color: c } : {} }, h('b', { text: v == null ? '—' : U.fmtPct(v) }), h('span', { text: n })));
        }
      } else E.perf.append(h('div', { class: 'd-loading', text: bars ? '데이터 없음' : '불러오는 중…' }));
    }
  }
  CL.Watchlist = Watchlist;
  CL.tickOf = tickOf;
  // 모바일 화면(mobile.js)에서 같이 씀
  Object.assign(CL, { exOf, curOf, pxDec: decOf, FLAGC, FLAGN, baseOf });
})();
