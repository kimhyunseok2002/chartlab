/* TradingHyun — app.js : 화면 구성 (상단바·도구모음·검색·지표·설정·관심종목·알림·리플레이·레이아웃) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U, IND = CL.IND, Data = CL.Data, ICON = CL.ICON, T = CL.TOOLS;
  const h = U.h;

  const DEFAULT_SET = {
    theme: 'dark', colorMode: 'global', up: '#089981', dn: '#f23645', line: '#2962ff',
    grid: true, wm: true, hiLo: true, lastLine: true, countdown: true, indLabels: true,
    cursor: 'cross', magnet: 0, stayDraw: false, lockAll: false, hideAll: false,
    rightBars: 8, tz: 'local', syncCross: true, layout: '1', zoomAnchor: 'cursor', panel: true, panelTab: 'watch',
  };
  // 캔들 색 프리셋: PC는 애플 디자인 색, 모바일 화면은 예전 색 그대로 (constructor에서 고름)
  const COLOR_MODES_CLASSIC = { global: { up: '#089981', dn: '#f23645' }, kr: { up: '#f04452', dn: '#3182f6' } };
  const COLOR_MODES_APPLE = { global: { up: '#30d158', dn: '#ff453a' }, kr: { up: '#ff3b30', dn: '#0a84ff' } };
  let COLOR_MODES = COLOR_MODES_CLASSIC;

  /* PC(애플 디자인)에서만: 드로잉 도구·지표 기본색, 색 고르기 판, 깃발 색을 애플 시스템 색으로 바꿈.
     원본(tools.js·indicators.js·util.js·watchlist.js)은 모바일 화면이 쓰는 예전 색 그대로 둠 */
  const APPLE_MAP = {
    '#2962ff': '#0a84ff', '#787b86': '#8e8e93', '#f23645': '#ff453a', '#ff9800': '#ff9f0a', '#089981': '#30d158', '#4caf50': '#34c759',
    '#9c27b0': '#bf5af2', '#131722': '#1c1c1e', '#2a2e39': '#2c2c2e', '#1e88e5': '#64d2ff', '#fbc02d': '#ffd60a', '#d1d4dc': '#d1d1d6',
    '#7e57c2': '#5e5ce6', '#00bcd4': '#40c8e0', '#ff6d00': '#ff9500', '#e91e63': '#ff375f', '#ffeb3b': '#ffd60a', '#ff5252': '#ff6961',
    '#e0e3eb': '#e5e5ea', '#9598a1': '#aeaeb2', '#43a047': '#248a3d', '#26a69a': '#66d4cf', '#22ab94': '#30d158', '#f0f3fa': '#f2f2f7',
    '#e65100': '#c93400', '#b71c1c': '#d70015', '#b22833': '#d70015', '#81c784': '#89e89c', '#673ab7': '#5e5ce6', '#5d606b': '#636366',
    '#ffd54f': '#ffe36e', '#ffb74d': '#ffc266', '#ffcdd2': '#ffd1cf', '#ef9a9a': '#ff8a80', '#ef5350': '#ff6961', '#f44336': '#ff453a',
    '#f50057': '#ff2d55', '#ba68c8': '#da8fff', '#ab47bc': '#bf5af2', '#a5d6a7': '#a8e6b4', '#9575cd': '#7d7aff', '#64b5f6': '#70b8ff',
    '#b2dfdb': '#b6ece9', '#009688': '#00c7be', '#3179f5': '#0a84ff', '#3182f6': '#0a84ff', '#f04452': '#ff3b30', '#f7525f': '#ff6961',
    '#363a45': '#48484a', '#1e222d': '#1c1c1e', '#b2b5be': '#aeaeb2', '#434651': '#48484a',
  };
  const APPLE_PALETTE = [
    '#ffffff', '#e5e5ea', '#c7c7cc', '#aeaeb2', '#8e8e93', '#636366', '#3a3a3c', '#000000',
    '#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#66d4cf', '#64d2ff', '#0a84ff', '#bf5af2',
    '#ffb3ad', '#ffd59e', '#fff0a0', '#a8ecb6', '#c2efec', '#c4ecff', '#a3cfff', '#e8c2fb',
    '#b8241b', '#c26a00', '#b89500', '#1f8a3c', '#2c9a93', '#1f8fbf', '#0058c4', '#8a2fbf',
    '#ff375f', '#5e5ce6', '#ac8e68', '#40c8e0', '#ff6482', '#7d7aff', '#c4a77d', '#5ac8fa',
  ];
  function applyApplePalette() {
    const seen = new Set();
    const walk = (o) => {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string') { const m = APPLE_MAP[v.toLowerCase()]; if (m) o[k] = m; }
        else if (v && typeof v === 'object') walk(v);
      }
    };
    for (const k in CL.TOOLS) walk(CL.TOOLS[k]);
    for (const k in IND) if (IND[k] && typeof IND[k] === 'object' && IND[k].calc) walk(IND[k]);
    if (CL.FLAGC) walk(CL.FLAGC);
    U.PALETTE.splice(0, U.PALETTE.length, ...APPLE_PALETTE);
  }
  const DEF_INDS = [{ type: 'vol' }, { type: 'mas' }, { type: 'rsi' }];
  const DEFAULT_SLOTS = [
    { src: 'upbit', sym: 'KRW-BTC', iv: '1h', inds: DEF_INDS },
    { src: 'binance', sym: 'BTCUSDT', iv: '4h', inds: DEF_INDS },
    { src: 'upbit', sym: 'KRW-ETH', iv: '1D', inds: DEF_INDS },
    { src: 'binance', sym: 'ETHUSDT', iv: '1h', inds: DEF_INDS },
  ];
  const FAV_IV = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
  const SRC_NAMES = { upbit: '업비트', binance: '바이낸스', binancef: '바이낸스 선물', stock: '주식·지수', csv: 'CSV', demo: '데모' };
  const SRC_LABEL = { close: '종가', open: '시가', high: '고가', low: '저가', hl2: '(고+저)/2', hlc3: '(고+저+종)/3', ohlc4: '(시+고+저+종)/4' };
  const CHART_TYPES = [['candle', '캔들'], ['hollow', '할로우 캔들'], ['ha', '하이킨 아시'], ['bar', '바(OHLC)'], ['line', '라인'], ['area', '영역']];
  const LAYOUTS = [['1', '1개'], ['2h', '2개 (좌우)'], ['2v', '2개 (상하)'], ['3', '3개'], ['4', '4개 (2×2)']];
  const STOCK_PICKS = [
    ['^KS11', '코스피 지수', 'KRX'], ['^KQ11', '코스닥 지수', 'KRX'], ['005930.KS', '삼성전자', 'KOSPI'], ['000660.KS', 'SK하이닉스', 'KOSPI'],
    ['^GSPC', 'S&P 500', 'US'], ['^IXIC', '나스닥 종합', 'US'], ['^DJI', '다우존스', 'US'], ['AAPL', '애플', 'NASDAQ'], ['NVDA', '엔비디아', 'NASDAQ'],
    ['TSLA', '테슬라', 'NASDAQ'], ['MSFT', '마이크로소프트', 'NASDAQ'], ['KRW=X', '달러/원 환율', 'FX'], ['GC=F', '금 선물', 'COMEX'], ['CL=F', 'WTI 원유 선물', 'NYMEX'],
  ].map(([symbol, name, ex]) => ({ symbol, name, ex, source: 'stock' }));
  const CRYPTO_PICKS = [
    { symbol: 'KRW-BTC', name: '비트코인', ex: 'UPBIT', source: 'upbit' }, { symbol: 'KRW-ETH', name: '이더리움', ex: 'UPBIT', source: 'upbit' },
    { symbol: 'KRW-XRP', name: '리플', ex: 'UPBIT', source: 'upbit' }, { symbol: 'BTCUSDT', name: 'BTCUSDT', ex: 'BINANCE', source: 'binance' },
    { symbol: 'ETHUSDT', name: 'ETHUSDT', ex: 'BINANCE', source: 'binance' }, { symbol: 'SOLUSDT', name: 'SOLUSDT', ex: 'BINANCE', source: 'binance' },
    { symbol: 'BTCUSDT', name: 'BTCUSDT 무기한', ex: 'BINANCE-F', source: 'binancef' },
  ];

  class App {
    constructor() {
      this.set = Object.assign({}, DEFAULT_SET, U.load('set', {}));
      // 폰이면 모바일 화면 (mobile.js, 애플 디자인 미적용). 설정 → 화면에서 바꿀 수 있음
      this.mobile = !!(CL.Mobile && CL.Mobile.want());
      COLOR_MODES = this.mobile ? COLOR_MODES_CLASSIC : COLOR_MODES_APPLE;
      CL.ACC = this.mobile ? '#2962ff' : '#0a84ff';
      if (!this.mobile) applyApplePalette();
      // 캔들 색이 프리셋(해외식·국내식)이면 그 화면의 프리셋 색을 따름. 라인 차트 기본색도 마찬가지
      if (COLOR_MODES[this.set.colorMode]) Object.assign(this.set, COLOR_MODES[this.set.colorMode]);
      if (/^#(2962ff|0a84ff)$/i.test(this.set.line || '')) this.set.line = CL.ACC;
      U.tzMode = this.set.tz;
      this.tool = 'cursor';
      this.toolDefaults = U.load('toolDefaults', {});
      this.lastInGroup = U.load('lastInGroup', {});
      this.alerts = U.load('alerts', []);
      this.lastPx = {};
      this.names = U.load('names', {});
      this.charts = []; this.active = null; this.modals = [];
      this.emojiPick = '🚀';
      this.server = false;
      this.el = {
        top: U.$('#top'), left: U.$('#left'), charts: U.$('#charts'), panel: U.$('#rpanel'), rbar: U.$('#rbar'), status: U.$('#status'),
      };
      if (this.mobile) document.body.classList.add('mobile');
      this.wl = new CL.Watchlist(this);
      // 시세 허브 → 가격 알림 확인
      CL.Quotes.on((keys) => { for (const k of keys) { const q = CL.Quotes.get(k); if (q && q.last != null) { const i = k.indexOf(':'); this.priceUpdate(k.slice(0, i), k.slice(i + 1), q.last); } } });
      this.applyTheme(true);
      this.buildLeft();
      this.buildTop();
      this.buildRight();
      this.buildStatus();
      this.bindKeys();
      this.setLayout(this.mobile ? '1' : this.set.layout || '1');
      if (this.mobile) this.m = new CL.Mobile(this);
      this.checkServer();
      this.trackQuotes();
      window.addEventListener('beforeunload', () => { for (const c of this.charts) this.saveSlotNow(c); });
    }
    /* 실시간으로 받아야 할 종목: 보이는 관심종목 + 대기 중인 알림 + 상세 정보 */
    trackQuotes() {
      const keys = this.wl.keys();
      for (const a of this.alerts) if (a.active && !a.fired) keys.push(a.src + ':' + a.sym);
      if (this.wl.sel) keys.push(this.wl.sel);
      if (this.m) keys.push(...this.m.trackKeys());
      CL.Quotes.track(keys);
    }

    /* ================= 설정 ================= */
    saveSet() { U.save('set', this.set); }
    applyTheme(first) {
      if (!CL.THEMES[this.set.theme]) this.set.theme = 'dark';
      document.body.classList.toggle('light', this.set.theme === 'light');
      document.body.classList.toggle('navy', this.set.theme === 'navy');
      if (!first) for (const c of this.charts) { c.invalidate(); c._lgKey = ''; }
    }
    magnetLevel(mods) { let m = this.set.magnet || 0; if (mods && mods.ctrl) m = m ? 0 : 2; return m; }
    cursorCss() { return this.set.cursor === 'arrow' ? 'default' : this.set.cursor === 'dot' ? 'none' : 'crosshair'; }
    toolStyle(type) {
      const t = T[type];
      const s = Object.assign(U.clone(t.defaults || {}), U.clone(this.toolDefaults[type] || {}));
      if (t.text && type !== 'emoji') s.text = '';
      if (type === 'emoji') s.text = this.emojiPick;
      return s;
    }
    rememberStyle(d) {
      const s = U.clone(d.s);
      if (d.type !== 'emoji') delete s.text;
      this.toolDefaults[d.type] = s;
      U.save('toolDefaults', this.toolDefaults);
    }

    /* ================= 레이아웃 / 슬롯 ================= */
    setLayout(lay) {
      this.set.layout = lay; this.saveSet();
      const n = { 1: 1, '2h': 2, '2v': 2, 3: 3, 4: 4 }[lay] || 1;
      while (this.charts.length > n) { const c = this.charts.pop(); this.saveSlotNow(c); c.destroy(); c.cell.remove(); }
      while (this.charts.length < n) {
        const i = this.charts.length;
        const host = h('div', { class: 'host' });
        const cell = h('div', { class: 'cell' }, host);
        this.el.charts.append(cell);
        const c = new CL.Chart(host, this, i);
        c.cell = cell;
        cell.addEventListener('pointerdown', () => this.setActive(c), true);
        this.charts.push(c);
        this.restoreSlot(c);
      }
      this.el.charts.className = 'lay-' + lay;
      if (!this.charts.includes(this.active)) this.setActive(this.charts[0]);
      requestAnimationFrame(() => this.charts.forEach((c) => c.resize()));
      this.refreshTop();
    }
    restoreSlot(c) {
      const s = U.load('slot.' + c.slot, null) || DEFAULT_SLOTS[c.slot] || DEFAULT_SLOTS[0];
      c.type = s.type || 'candle';
      c.inds = [];
      for (const x of s.inds || []) {
        if (!IND[x.type]) continue;
        c.inds.push({ id: x.id || U.uid(), type: x.type, inp: Object.assign(IND.defaults(x.type), x.inp || {}), sty: x.sty || {}, hidden: !!x.hidden });
      }
      c.ps = {};
      for (const k in s.ps || {}) c.ps[k] = { w: s.ps[k].w || (k === 'main' ? 4 : 1), log: !!s.ps[k].log, auto: true };
      if (!c.ps.main) c.ps.main = { w: 4, auto: true, log: false };
      if (s.view && s.view.s) c.view.s = s.view.s;
      c.buildLegend();
      c.load(s.src || 'upbit', s.sym || 'KRW-BTC', s.iv || '1h');
    }
    saveSlot(c) {
      clearTimeout(c._saveT);
      c._saveT = setTimeout(() => this.saveSlotNow(c), 400);
    }
    saveSlotNow(c) {
      const ps = {};
      for (const k in c.ps) ps[k] = { w: c.ps[k].w, log: !!c.ps[k].log };
      U.save('slot.' + c.slot, {
        src: c.src, sym: c.sym, iv: c.iv, type: c.type, view: { s: c.view.s }, ps,
        inds: c.inds.map((x) => ({ id: x.id, type: x.type, inp: x.inp, sty: x.sty, hidden: x.hidden })),
      });
    }
    setActive(c) {
      if (!c || this.active === c) return;
      this.active = c;
      for (const x of this.charts) x.cell.classList.toggle('active', x === c && this.charts.length > 1);
      this.refreshTop();
      this.onSelect(c, c.sel);
      this.renderPanel();
    }
    onChartLoaded(c) {
      if (c === this.active) this.refreshTop();
      if (c.bars.length && !CL.Quotes.get(c.key)) CL.Quotes.put(c.key, { last: c.bars[c.bars.length - 1].c });
      this.wl.onChartLoaded(c);
      if (this.set.panelTab === 'tree') this.renderPanel();
      if (this.m) this.m.onChartLoaded(c);
    }
    onTick(c, b) {
      if (!c.replay) CL.Quotes.put(c.key, { last: b.c });
      if (c === this.active && !c.replay) {
        const now = Date.now();
        if (!this._tT || now - this._tT > 1000) { this._tT = now; document.title = (CL.tickOf ? CL.tickOf(c.src, c.sym) : c.sym) + ' ' + U.fmt(b.c, c.prec) + ' — TradingHyun'; }
      }
    }
    onDrawingsChanged(c) {
      for (const x of this.charts) if (x !== c && x.key === c.key) x.reloadDrawings();
      if (this.set.panelTab === 'tree') this.renderPanel();
      if (this.m) this.m.refreshUndo();
    }
    syncCross(c, t) {
      if (!this.set.syncCross || this.charts.length < 2) return;
      for (const x of this.charts) if (x !== c) { if (x.extT !== t) { x.extT = t; x.invalidate(); } }
    }
    alertsFor(c) { return this.alerts.filter((a) => a.src === c.src && a.sym === c.sym && a.active !== false); }

    /* ================= 도구 ================= */
    setTool(t) {
      for (const c of this.charts) { if (c.creating) c.cancelCreate(); if (t !== 'measure' && c.measure) { c.measure = null; c.invalidate(); } }
      if (this.replaySel) { this.replaySel = null; }
      this.tool = t;
      if (T[t]) {
        const g = CL.TOOLGROUPS.find((x) => x.tools.includes(t));
        if (g) { this.lastInGroup[g.id] = t; U.save('lastInGroup', this.lastInGroup); }
      }
      this.refreshLeft();
      const cur = t === 'cursor' ? this.cursorCss() : 'crosshair';
      for (const c of this.charts) c.cv.style.cursor = cur;
      if (this.m) this.m.onTool();
    }

    /* ================= 왼쪽 도구모음 ================= */
    buildLeft() {
      const L = this.el.left;
      L.innerHTML = '';
      this.lb = {};
      const btn = (key, icon, title, onclick, flyout) => {
        const b = h('button', { class: 'tb', title, html: icon, onclick });
        const wrap = h('div', { class: 'tbw' }, b);
        if (flyout) {
          const ar = h('span', { class: 'tb-ar', title: '더 보기', onclick: (e) => { e.stopPropagation(); flyout(wrap); } });
          wrap.append(ar);
          b.addEventListener('contextmenu', (e) => { e.preventDefault(); flyout(wrap); });
        }
        L.append(wrap);
        this.lb[key] = b;
        return b;
      };
      const curIcon = () => (this.set.cursor === 'dot' ? ICON.dot : this.set.cursor === 'arrow' ? ICON.arrowCur : ICON.cross);
      btn('cursor', curIcon(), '커서', () => this.setTool('cursor'), (w) => this.flyout(w, [
        { icon: ICON.cross, name: '십자', on: this.set.cursor === 'cross', fn: () => { this.set.cursor = 'cross'; this.saveSet(); this.setTool('cursor'); this.buildLeft(); } },
        { icon: ICON.dot, name: '점', on: this.set.cursor === 'dot', fn: () => { this.set.cursor = 'dot'; this.saveSet(); this.setTool('cursor'); this.buildLeft(); } },
        { icon: ICON.arrowCur, name: '화살표', on: this.set.cursor === 'arrow', fn: () => { this.set.cursor = 'arrow'; this.saveSet(); this.setTool('cursor'); this.buildLeft(); } },
        { icon: ICON.eraser, name: '지우개 (클릭한 드로잉 삭제)', on: this.tool === 'eraser', fn: () => this.setTool('eraser') },
      ]));
      for (const g of CL.TOOLGROUPS) {
        const cur = this.lastInGroup[g.id] && g.tools.includes(this.lastInGroup[g.id]) ? this.lastInGroup[g.id] : g.tools.find((x) => x[0] !== '|');
        btn('g_' + g.id, ICON[cur] || ICON.trendline, g.name + ' — ' + T[cur].name, () => this.setTool(this.lastInGroup[g.id] && g.tools.includes(this.lastInGroup[g.id]) ? this.lastInGroup[g.id] : cur), (w) => {
          this.flyout(w, g.tools.map((t) => {
            if (t[0] === '|') return { head: t.slice(1) };
            if (t[0] === '@') { const k = t.slice(1); return { icon: ICON[k], name: IND[k].name + ' — 지표로 추가', fn: () => { this.active.addInd(k); U.toast(IND[k].short + ' 추가됨 · 범례의 ⚙에서 조정'); } }; }
            return { icon: ICON[t], name: T[t].name, key: T[t].key, on: this.tool === t, fn: () => this.setTool(t) };
          }), g.name);
        });
      }
      btn('emoji', ICON.emoji, '이모지·아이콘', () => this.setTool('emoji'), (w) => this.emojiFly(w));
      L.append(h('div', { class: 'tb-sep' }));
      btn('measure', ICON.measure, '측정 (Shift+드래그로도 가능)', () => this.setTool(this.tool === 'measure' ? 'cursor' : 'measure'));
      btn('zoom', ICON.zoom, '확대 (영역 드래그)', () => this.setTool(this.tool === 'zoom' ? 'cursor' : 'zoom'));
      L.append(h('div', { class: 'tb-sep' }));
      btn('magnet', ICON.magnet, '자석 모드 (Ctrl 누르면 일시 전환)', () => { this.set.magnet = this.set.magnet ? 0 : 1; this.saveSet(); this.refreshLeft(); }, (w) => this.flyout(w, [
        { icon: ICON.magnet, name: '약한 자석', on: this.set.magnet === 1, fn: () => { this.set.magnet = 1; this.saveSet(); this.refreshLeft(); } },
        { icon: ICON.magnet, name: '강한 자석', on: this.set.magnet === 2, fn: () => { this.set.magnet = 2; this.saveSet(); this.refreshLeft(); } },
        { icon: ICON.close, name: '자석 끄기', on: !this.set.magnet, fn: () => { this.set.magnet = 0; this.saveSet(); this.refreshLeft(); } },
      ]));
      btn('stay', ICON.stay, '그리기 모드 유지', () => { this.set.stayDraw = !this.set.stayDraw; this.saveSet(); this.refreshLeft(); });
      btn('lockAll', ICON.lock, '모든 드로잉 잠금', () => { this.set.lockAll = !this.set.lockAll; this.saveSet(); this.refreshLeft(); });
      btn('hideAll', ICON.eye, '모든 드로잉 숨기기', () => { this.set.hideAll = !this.set.hideAll; this.saveSet(); this.refreshLeft(); this.charts.forEach((c) => c.invalidate()); });
      btn('removeAll', ICON.trash, '드로잉 삭제', () => {}, null);
      this.lb.removeAll.onclick = (e) => this.flyout(this.lb.removeAll.parentNode, [
        { icon: ICON.trash, name: '이 종목의 드로잉 모두 삭제', fn: () => this.confirm('이 종목의 드로잉을 모두 삭제할까요? (Ctrl+Z로 되돌릴 수 있음)', () => this.active.removeAllDrawings()) },
        { icon: ICON.trash, name: '지표 모두 삭제', fn: () => this.confirm('이 차트의 지표를 모두 삭제할까요?', () => { const c = this.active; c.inds.slice().forEach((x) => c.removeInd(x.id)); }) },
      ]);
      btn('tree', ICON.tree, '객체 트리', () => { this.set.panel = true; this.set.panelTab = 'tree'; this.saveSet(); this.renderPanel(); });
      this.refreshLeft();
    }
    refreshLeft() {
      const lb = this.lb;
      if (!lb) return;
      lb.cursor.classList.toggle('on', this.tool === 'cursor' || this.tool === 'eraser');
      lb.cursor.innerHTML = this.tool === 'eraser' ? ICON.eraser : this.set.cursor === 'dot' ? ICON.dot : this.set.cursor === 'arrow' ? ICON.arrowCur : ICON.cross;
      for (const g of CL.TOOLGROUPS) {
        const b = lb['g_' + g.id];
        const on = g.tools.includes(this.tool);
        b.classList.toggle('on', on);
        const cur = this.lastInGroup[g.id] && g.tools.includes(this.lastInGroup[g.id]) ? this.lastInGroup[g.id] : g.tools.find((x) => x[0] !== '|');
        b.innerHTML = ICON[cur] || '';
        b.title = g.name + ' — ' + T[cur].name;
      }
      lb.emoji.classList.toggle('on', this.tool === 'emoji');
      lb.measure.classList.toggle('on', this.tool === 'measure');
      lb.zoom.classList.toggle('on', this.tool === 'zoom');
      lb.magnet.classList.toggle('on', !!this.set.magnet);
      lb.magnet.dataset.badge = this.set.magnet === 2 ? '강' : this.set.magnet === 1 ? '약' : '';
      lb.stay.classList.toggle('on', !!this.set.stayDraw);
      lb.lockAll.classList.toggle('on', !!this.set.lockAll);
      lb.lockAll.innerHTML = this.set.lockAll ? ICON.lock : ICON.unlock;
      lb.hideAll.classList.toggle('on', !!this.set.hideAll);
      lb.hideAll.innerHTML = this.set.hideAll ? ICON.eyeOff : ICON.eye;
    }
    flyout(anchor, items, title) {
      this.closePop();
      const box = h('div', { class: 'pop fly' });
      if (title) box.append(h('div', { class: 'fly-title', text: title }));
      for (const it of items) {
        if (it.head) { box.append(h('div', { class: 'fly-head', text: it.head })); continue; }
        box.append(h('div', { class: 'fly-item' + (it.on ? ' on' : ''), onclick: () => { this.closePop(); it.fn(); } },
          h('span', { class: 'fly-ic', html: it.icon || '' }), h('span', { class: 'fly-nm', text: it.name }), it.key ? h('span', { class: 'fly-key', text: it.key }) : null));
      }
      this.showPop(box, anchor, 'right');
    }
    emojiFly(anchor) {
      this.closePop();
      const box = h('div', { class: 'pop emo' });
      for (const e of CL.EMOJIS) box.append(h('button', { class: 'emo-b', text: e, onclick: () => { this.emojiPick = e; this.closePop(); this.setTool('emoji'); } }));
      this.showPop(box, anchor, 'right');
    }
    showPop(box, anchor, side) {
      document.body.append(box);
      const r = anchor.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
      let x, y;
      if (side === 'right') { x = r.right + 4; y = r.top; }
      else { x = r.left; y = r.bottom + 4; }
      x = U.clamp(x, 4, window.innerWidth - bw - 4);
      y = U.clamp(y, 4, window.innerHeight - bh - 4);
      box.style.left = x + 'px'; box.style.top = y + 'px';
      this.pop = box;
      setTimeout(() => {
        this._popOff = (e) => { if (!box.contains(e.target)) this.closePop(); };
        document.addEventListener('pointerdown', this._popOff, true);
      }, 0);
    }
    closePop() {
      if (this.pop) { this.pop.remove(); this.pop = null; }
      if (this._popOff) { document.removeEventListener('pointerdown', this._popOff, true); this._popOff = null; }
    }

    /* ================= 상단바 ================= */
    buildTop() {
      const T0 = this.el.top;
      T0.innerHTML = '';
      this.tb = {};
      const logo = h('div', { class: 'logo', title: CL.BRAND.name }, h('span', { class: 'logo-m', html: CL.BRAND.mark }), h('span', { class: 'logo-t', text: CL.BRAND.name }));
      this.tb.sym = h('button', { class: 'tbtn sym', title: '종목 검색 (아무 글자나 입력해도 열림)', onclick: () => this.openSearch() });
      const ivBox = h('div', { class: 'ivs' });
      this.tb.iv = {};
      for (const iv of FAV_IV) { const b = h('button', { class: 'tbtn iv', text: U.IV_SHORT[iv], title: U.IV_LABEL[iv], onclick: () => this.setIv(iv) }); this.tb.iv[iv] = b; ivBox.append(b); }
      this.tb.ivMore = h('button', { class: 'tbtn iv more', html: '▾', title: '모든 주기', onclick: (e) => this.ivMenu(e.currentTarget) });
      ivBox.append(this.tb.ivMore);
      this.tb.type = h('button', { class: 'tbtn ic', title: '차트 유형', onclick: (e) => this.typeMenu(e.currentTarget) });
      const ind = h('button', { class: 'tbtn wide', title: '지표', onclick: () => this.openIndicators() }, h('span', { class: 'ic', html: ICON.ind }), '지표');
      const lay = h('button', { class: 'tbtn ic', title: '레이아웃 (여러 차트)', html: ICON.layout, onclick: (e) => this.layoutMenu(e.currentTarget) });
      this.tb.undo = h('button', { class: 'tbtn ic', title: '실행 취소 (Ctrl+Z)', html: ICON.undo, onclick: () => this.active.undo() });
      this.tb.redo = h('button', { class: 'tbtn ic', title: '다시 실행 (Ctrl+Y)', html: ICON.redo, onclick: () => this.active.redo() });
      const rep = h('button', { class: 'tbtn wide', title: '바 리플레이', onclick: () => this.startReplaySelect() }, h('span', { class: 'ic', html: ICON.replay }), '리플레이');
      const alert = h('button', { class: 'tbtn wide', title: '가격 알림 추가', onclick: () => this.openAlertDialog(this.active) }, h('span', { class: 'ic', html: ICON.bell }), '알림');
      const sp = h('div', { class: 'grow' });
      this.tb.panelBox = h('div', { class: 'tseg', title: '사이드바' }); // 관심종목·알림·객체 트리 (buildRight가 채움)
      const shot = h('button', { class: 'tbtn ic', title: '스크린샷 저장', html: ICON.camera, onclick: () => this.screenshot() });
      const theme = h('button', { class: 'tbtn ic', title: '다크/라이트 (설정에서 네이비·배경색 선택)', html: ICON.moon, onclick: () => { this.set.theme = this.set.theme === 'light' ? 'dark' : 'light'; this.saveSet(); this.applyTheme(); } });
      const set = h('button', { class: 'tbtn ic', title: '설정', html: ICON.gear, onclick: () => this.openSettings() });
      const help = h('button', { class: 'tbtn ic help', title: '단축키·사용법', text: '?', onclick: () => this.openHelp() });
      const full = h('button', { class: 'tbtn ic', title: '전체 화면', html: ICON.full, onclick: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } });
      const sep = () => h('div', { class: 'tsep' });
      T0.append(logo, sep(), this.tb.sym, sep(), ivBox, sep(), this.tb.type, ind, sep(), lay, this.tb.undo, this.tb.redo, sep(), rep, alert, sp, help, shot, theme, set, full, sep(), this.tb.panelBox);
    }
    refreshTop() {
      if (this.m) this.m.refreshChart();
      const c = this.active;
      if (!c || !this.tb) return;
      const prov = Data.get(c.src);
      const nm = c.dispName();
      const sk = c.key + '|' + nm;
      if (this._topKey !== sk) {
        this._topKey = sk;
        this.tb.sym.innerHTML = '';
        this.tb.sym.append(...[CL.Logo.el(c.src, c.sym, 20, nm), h('b', { text: CL.tickOf(c.src, c.sym) }), nm ? h('span', { class: 'sym-n', text: nm }) : null, h('span', { class: 'sym-s', text: prov ? prov.name : c.src })].filter(Boolean));
      }
      for (const iv of FAV_IV) {
        const b = this.tb.iv[iv];
        b.classList.toggle('on', c.iv === iv);
        b.disabled = !Data.supports(c.src, iv, c.sym);
      }
      const more = !FAV_IV.includes(c.iv);
      this.tb.ivMore.textContent = more ? U.IV_SHORT[c.iv] + ' ▾' : '▾';
      this.tb.ivMore.classList.toggle('on', more);
      this.tb.type.innerHTML = ICON[c.type] || ICON.candle;
    }
    setIv(iv) {
      const c = this.active;
      if (!Data.supports(c.src, iv, c.sym)) { U.toast(SRC_NAMES[c.src] + '에서 지원하지 않는 주기입니다', 'warn'); return; }
      c.load(c.src, c.sym, iv);
      this.saveSlot(c);
      this.refreshTop();
    }
    ivMenu(anchor) {
      const c = this.active;
      this.closePop();
      const box = h('div', { class: 'pop menu' });
      const groups = [['분', ['1m', '3m', '5m', '10m', '15m', '30m']], ['시간', ['1h', '2h', '4h', '6h', '8h', '12h']], ['일 이상', ['1D', '3D', '1W', '1M']]];
      for (const [gn, ivs] of groups) {
        box.append(h('div', { class: 'fly-head', text: gn }));
        for (const iv of ivs) {
          const ok = Data.supports(c.src, iv, c.sym);
          box.append(h('div', { class: 'fly-item' + (c.iv === iv ? ' on' : '') + (ok ? '' : ' dis'), onclick: () => { if (!ok) return; this.closePop(); this.setIv(iv); } }, h('span', { class: 'fly-nm', text: U.IV_LABEL[iv] })));
        }
      }
      this.showPop(box, anchor, 'down');
    }
    typeMenu(anchor) {
      this.closePop();
      const box = h('div', { class: 'pop menu' });
      for (const [k, n] of CHART_TYPES) box.append(h('div', { class: 'fly-item' + (this.active.type === k ? ' on' : ''), onclick: () => { this.closePop(); this.active.type = k; this.active._ha = null; this.active.invalidate(); this.saveSlot(this.active); this.refreshTop(); } }, h('span', { class: 'fly-ic', html: ICON[k] }), h('span', { class: 'fly-nm', text: n })));
      this.showPop(box, anchor, 'down');
    }
    layoutMenu(anchor) {
      this.closePop();
      const box = h('div', { class: 'pop menu' });
      for (const [k, n] of LAYOUTS) box.append(h('div', { class: 'fly-item' + (this.set.layout === k ? ' on' : ''), onclick: () => { this.closePop(); this.setLayout(k); } }, h('span', { class: 'fly-nm', text: n })));
      box.append(h('div', { class: 'fly-head', text: '동기화' }));
      box.append(h('div', { class: 'fly-item' + (this.set.syncCross ? ' on' : ''), onclick: () => { this.set.syncCross = !this.set.syncCross; this.saveSet(); this.closePop(); } }, h('span', { class: 'fly-nm', text: '크로스헤어 시간 동기화' })));
      this.showPop(box, anchor, 'down');
    }

    /* ================= 하단 상태바 ================= */
    buildStatus() {
      const S = this.el.status;
      this.st = { info: h('span', { class: 'st-info', text: 'Shift+드래그: 측정 · Alt+드래그: 드로잉 복제 · Ctrl: 자석 일시전환 · 더블클릭(가격축): 자동 스케일 · Del: 삭제 · Ctrl+Z: 되돌리기' }), srv: h('span', { class: 'st-srv' }), clock: h('span', { class: 'st-clock' }) };
      const tz = h('select', { class: 'st-tz', title: '시간대', onchange: (e) => { this.set.tz = e.target.value; U.tzMode = this.set.tz; this.saveSet(); this.charts.forEach((c) => { c._tmKey = ''; c._lgKey = ''; c.invalidate(); }); } },
        ...[['local', '내 시간대(로컬)'], ['exchange', '거래소 시간'], ['utc', 'UTC']].map(([v, n]) => h('option', { value: v, text: n, selected: this.set.tz === v })));
      S.append(this.st.info, h('div', { class: 'grow' }), this.st.srv, tz, this.st.clock);
      setInterval(() => {
        const d = new Date();
        this.st.clock.textContent = U.p2(d.getHours()) + ':' + U.p2(d.getMinutes()) + ':' + U.p2(d.getSeconds());
      }, 1000);
    }
    async checkServer() {
      if (location.protocol === 'file:') { this.server = false; this.st.srv.textContent = '로컬 서버 없음 — 주식은 start.bat으로 실행'; this.st.srv.className = 'st-srv off'; return; }
      let host = '';
      try {
        const r = await fetch('/api/ping');
        const j = await r.json();
        this.server = !!j.ok;
        host = j.host || 'local';
      } catch (e) { this.server = false; }
      this.st.srv.textContent = !this.server ? '로컬 서버 없음 — 주식은 start.bat으로 실행' : host === 'vercel' ? '서버 연결됨 (주식 데이터 사용 가능)' : '로컬 서버 연결됨 (주식 데이터 사용 가능)';
      this.st.srv.className = 'st-srv ' + (this.server ? 'on' : 'off');
    }

    /* ================= 키보드 ================= */
    bindKeys() {
      document.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
        if (e.key === 'Escape') {
          if (this.pop) { this.closePop(); return; }
          if (this.ctxEl) { this.closeCtx(); return; }
          if (this.modals.length) { this.modals[this.modals.length - 1].close(false); return; }
          const c = this.active;
          if (c.creating) { c.cancelCreate(); return; }
          if (c.measure) { c.measure = null; c.invalidate(); }
          if (this.replaySel) { this.replaySel = null; U.toast('리플레이 선택 취소'); }
          if (c.sel) c.select(null);
          this.setTool('cursor');
          return;
        }
        if (typing || this.modals.length || (e.target.closest && e.target.closest('.wl-list'))) return;
        const c = this.active;
        if (!c) return;
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); c.undo(); return; }
        if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); c.redo(); return; }
        if ((e.ctrlKey || e.metaKey) && k === 'c' && c.sel) { this.clip = JSON.parse(JSON.stringify(c.sel, (kk, v) => (kk[0] === '_' ? undefined : v))); U.toast('드로잉 복사됨'); return; }
        if ((e.ctrlKey || e.metaKey) && k === 'v' && this.clip) {
          const d = U.clone(this.clip);
          d.id = U.uid(); d.locked = false; d.hidden = false;
          if (!c.pmap[d.pane]) d.pane = 'main';
          if (c.drawings.some((x) => x.id === this.clip.id) && !T[d.type].screen) d.pts = d.pts.map((q) => Object.assign({}, q, q.t != null ? { t: c.i2t(c.t2i(q.t) + 3) } : {}));
          c.drawings.push(d);
          c.select(d);
          c.commit();
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && c.sel) { e.preventDefault(); c.removeDrawing(c.sel); return; }
        if (e.key === 'Enter' && c.creating) { c.createFinishMulti(); return; }
        if (e.altKey && !e.ctrlKey) {
          const map = { t: 'trendline', h: 'hline', j: 'hray', v: 'vline', c: 'crossline', f: 'fibret' };
          if (e.shiftKey && k === 'r') { e.preventDefault(); this.setTool('rect'); return; }
          if (k === 'r') { e.preventDefault(); c.ps.main.auto = true; c.view.s = 8; c.fit(); c.invalidate(); return; }
          if (map[k]) { e.preventDefault(); this.setTool(map[k]); return; }
          if (k === 'a') { e.preventDefault(); this.openAlertDialog(c); return; }
        }
        if (e.key === 'ArrowLeft') { c.view.r -= e.ctrlKey ? 10 : 1; c.invalidate(); e.preventDefault(); return; }
        if (e.key === 'ArrowRight') { c.view.r += e.ctrlKey ? 10 : 1; c.invalidate(); e.preventDefault(); return; }
        if (e.key === 'ArrowUp') { c.view.s = U.clamp(c.view.s * 1.15, 0.3, 80); c.invalidate(); e.preventDefault(); return; }
        if (e.key === 'ArrowDown') { c.view.s = U.clamp(c.view.s / 1.15, 0.3, 80); c.invalidate(); e.preventDefault(); return; }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /[\w가-힣ㄱ-ㅎ^=-]/.test(e.key)) { e.preventDefault(); this.openSearch(c, e.key); }
      });
    }

    /* ================= 공용 대화상자 ================= */
    modal(title, body, buttons, opt) {
      opt = opt || {};
      const ov = h('div', { class: 'modal-ov' });
      const box = h('div', { class: 'modal ' + (opt.cls || '') });
      const m = { ov, box };
      m.close = (ok) => { if (m.closed) return; m.closed = true; ov.remove(); const i = this.modals.indexOf(m); if (i >= 0) this.modals.splice(i, 1); if (opt.onClose) opt.onClose(ok); };
      const head = h('div', { class: 'm-head' }, h('span', { class: 'm-title', text: title }), h('button', { class: 'm-x', html: ICON.close, onclick: () => m.close(false) }));
      box.append(head, h('div', { class: 'm-body' }, body));
      if (buttons && buttons.length) {
        const foot = h('div', { class: 'm-foot' });
        for (const b of buttons) {
          if (b === '|') { foot.append(h('div', { class: 'grow' })); continue; }
          foot.append(h('button', { class: 'btn ' + (b.cls || ''), text: b.t, onclick: () => { if (b.fn && b.fn() === false) return; if (b.keep) return; m.close(!!b.ok); } }));
        }
        box.append(foot);
      }
      ov.append(box);
      document.body.append(ov);
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) m.close(false); });
      this.modals.push(m);
      return m;
    }
    confirm(msg, fn) { this.modal('확인', h('div', { class: 'confirm-msg', text: msg }), [{ t: '취소' }, { t: '확인', cls: 'pri', ok: true, fn }]); }
    palette(anchor, color, alpha, cb) {
      this.closePop();
      const box = h('div', { class: 'pop pal' });
      const grid = h('div', { class: 'pal-grid' });
      let cur = color, a = alpha;
      for (const c of U.PALETTE) grid.append(h('button', { class: 'pal-sw' + (c.toLowerCase() === String(color).toLowerCase() ? ' on' : ''), style: { background: c }, title: c, onclick: (ev) => { cur = c; cb(cur, a); const me = ev.currentTarget; U.$$('.pal-sw', grid).forEach((x) => x.classList.toggle('on', x === me)); } }));
      const custom = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(color) ? color : CL.ACC, oninput: (e) => { cur = e.target.value; cb(cur, a); } });
      box.append(grid, h('div', { class: 'pal-row' }, h('span', { text: '사용자 색' }), custom));
      if (alpha != null) {
        const lab = h('span', { class: 'pal-a', text: Math.round(alpha * 100) + '%' });
        const sl = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: alpha, oninput: (e) => { a = +e.target.value; lab.textContent = Math.round(a * 100) + '%'; cb(cur, a); } });
        box.append(h('div', { class: 'pal-row' }, h('span', { text: '불투명도' }), sl, lab));
      }
      this.showPop(box, anchor, 'down');
    }
    swatch(get, set, alphaGet, alphaSet) {
      const b = h('button', { class: 'sw', type: 'button' });
      const paint = () => { const a = alphaGet ? alphaGet() : 1; b.style.setProperty('--c', U.rgba(get() || '#000000', a)); };
      paint();
      b.onclick = (e) => { e.preventDefault(); this.palette(b, get(), alphaGet ? alphaGet() : null, (c, a) => { set(c); if (alphaSet && a != null) alphaSet(a); paint(); }); };
      b.repaint = paint;
      return b;
    }

    /* ================= 종목 검색 ================= */
    openSearch(c, initial, opts) {
      c = c || this.active;
      opts = opts || {};
      const tabs = [['all', '전체'], ['upbit', '업비트'], ['binance', '바이낸스'], ['binancef', '바이낸스 선물'], ['stock', '주식·지수'], ['csv', 'CSV'], ['demo', '데모']];
      let src = 'all', items = [], hi = 0, token = 0;
      const input = h('input', { class: 's-in', placeholder: '종목 검색 — 비트코인, BTC, 삼성전자, 005930, AAPL, 코스피…', value: initial || '' });
      const tabBox = h('div', { class: 's-tabs' });
      const list = h('div', { class: 's-list' });
      const extra = h('div', { class: 's-extra' });
      const renderTabs = () => {
        tabBox.innerHTML = '';
        for (const [k, n] of tabs) tabBox.append(h('button', { class: 's-tab' + (src === k ? ' on' : ''), text: n, onclick: () => { src = k; renderTabs(); run(); input.focus(); } }));
      };
      const doAdd = (it) => {
        const r = opts.add(it), tk = CL.tickOf(it.source, it.symbol);
        U.toast(r === 'removed' ? tk + ' 뺌' : r === false ? '이미 목록에 있습니다' : tk + ' 추가됨', '', 1400);
        render();
      };
      const pick = (it) => {
        const nm = String(it.name || '').split(' · ')[0].trim();
        if (nm && nm !== it.symbol && it.source !== 'csv' && it.source !== 'demo') { this.names[it.source + ':' + it.symbol] = nm; U.save('names', this.names); }
        if (opts.open) { m.close(true); opts.open(it); return; } // 모바일: 종목 시트로 열기
        if (opts.add) { doAdd(it); input.focus(); return; }
        m.close(true);
        let iv = c.iv;
        if (!Data.supports(it.source, iv, it.symbol)) iv = it.source === 'csv' ? (Data.get('csv').get(it.symbol) || {}).iv || '1D' : '1D';
        c.load(it.source, it.symbol, iv);
        this.saveSlot(c);
        this.refreshTop();
      };
      const highlight = () => {
        U.$$('.s-row', list).forEach((r, k) => r.classList.toggle('hi', k === hi));
        const r = U.$$('.s-row', list)[hi];
        if (r) r.scrollIntoView({ block: 'nearest' });
      };
      const render = () => {
        list.innerHTML = '';
        if (!items.length) { list.append(h('div', { class: 's-empty', text: '결과가 없습니다' })); return; }
        items.forEach((it, i) => {
          const added = opts.has && opts.has(it);
          list.append(h('div', { class: 's-row' + (i === hi ? ' hi' : '') + (added ? ' added' : ''), onclick: () => pick(it), onmouseenter: () => { hi = i; highlight(); } },
            CL.Logo.el(it.source, it.symbol, 22, String(it.name || '').split(' · ')[0]),
            h('span', { class: 's-sym', text: it.symbol }), h('span', { class: 's-name', text: it.name || '' }), h('span', { class: 's-ex', text: it.ex || '' }),
            h('span', { class: 's-src src-' + it.source, text: SRC_NAMES[it.source] || it.source }),
            opts.add ? h('button', { class: 's-add', type: 'button', title: added ? '목록에 있음' : '목록에 추가', text: added ? '✓' : '+', onclick: (e) => { e.stopPropagation(); doAdd(it); } }) : null));
        });
      };
      const run = U.debounce(async () => {
        const q = input.value.trim(), tk = ++token;
        extra.innerHTML = '';
        if (src === 'csv') extra.append(h('button', { class: 'btn pri', text: 'CSV 파일 열기…', onclick: () => this.openCSV(c, () => m.close(true)) }), h('span', { class: 'hint', text: '열 이름: date/time, open, high, low, close, volume (또는 날짜, 시가, 고가, 저가, 종가, 거래량)' }));
        if ((src === 'stock' || src === 'all') && !this.server) extra.append(h('span', { class: 'hint warn', text: '주식·지수는 start.bat(로컬 서버)으로 실행해야 검색·차트가 됩니다.' }));
        list.innerHTML = '<div class="s-empty">검색 중…</div>';
        try {
          let r = [];
          if (src === 'all') {
            if (!q) r = CRYPTO_PICKS.concat(STOCK_PICKS);
            else {
              const jobs = [Data.search('upbit', q).catch(() => []), Data.search('binance', q).catch(() => [])];
              if (this.server) jobs.push(Data.search('stock', q).catch(() => []));
              const res = await Promise.all(jobs);
              r = [].concat(res[0].slice(0, 15), res[2] ? res[2].slice(0, 15) : [], res[1].slice(0, 15));
            }
          } else if (src === 'stock' && !q) r = STOCK_PICKS;
          else if (src === 'binancef' && !q) r = (await Data.search('binancef', '')).slice(0, 40);
          else r = await Data.search(src, q);
          if (tk !== token) return;
          items = r; hi = 0; render();
        } catch (e) {
          if (tk !== token) return;
          list.innerHTML = '';
          list.append(h('div', { class: 's-empty err', text: '검색 실패: ' + e.message }));
        }
      }, 220);
      input.addEventListener('input', run);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { hi = Math.min(items.length - 1, hi + 1); highlight(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { hi = Math.max(0, hi - 1); highlight(); e.preventDefault(); }
        else if (e.key === 'Enter') { if (items[hi]) pick(items[hi]); e.preventDefault(); }
      });
      const m = this.modal(opts.title || '종목 검색', h('div', { class: 's-wrap' }, input, tabBox, extra, list), opts.add && !opts.open ? [{ t: '완료', cls: 'pri', ok: true }] : null, { cls: 'm-search' });
      renderTabs(); run();
      input.focus(); // iOS는 사용자 동작 안에서 바로 포커스해야 키보드가 뜸
      setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 10);
    }
    openCSV(c, done) {
      const fi = h('input', { type: 'file', accept: '.csv,.txt,text/csv', style: { display: 'none' } });
      document.body.append(fi);
      fi.onchange = async () => {
        const f = fi.files[0];
        fi.remove();
        if (!f) return;
        try {
          const txt = await f.text();
          const r = Data.parseCSV(txt);
          const name = f.name.replace(/\.[^.]+$/, '');
          const ok = Data.get('csv').add(name, r.bars, r.iv);
          if (!ok) U.toast('파일이 커서 브라우저 저장은 못 했습니다 (이번 세션에서만 사용)', 'warn', 4000);
          U.toast('CSV 불러옴: ' + r.bars.length + '봉, ' + U.IV_LABEL[r.iv]);
          done && done();
          c.load('csv', name, r.iv);
          this.saveSlot(c);
          this.refreshTop();
        } catch (e) { U.toast('CSV 오류: ' + e.message, 'err', 4000); }
      };
      fi.click();
    }

    /* ================= 지표 ================= */
    openIndicators(c) {
      c = c || this.active;
      const input = h('input', { class: 's-in', placeholder: '지표 검색 (예: RSI, 이동평균, 거래량, MACD)' });
      const list = h('div', { class: 'i-list' });
      const cur = h('div', { class: 'i-cur' });
      const renderCur = () => {
        cur.innerHTML = '';
        if (!c.inds.length) return;
        cur.append(h('div', { class: 'i-head', text: '적용된 지표 (' + c.inds.length + ') — 무제한' }));
        for (const ind of c.inds) cur.append(h('div', { class: 'i-row cur' }, h('span', { class: 'i-nm', text: IND[ind.type].label(ind.inp) }),
          h('button', { class: 'mini', html: ICON.gear, title: '설정', onclick: () => this.openIndSettings(c, ind) }),
          h('button', { class: 'mini', html: ICON.trash, title: '삭제', onclick: () => { c.removeInd(ind.id); renderCur(); } })));
      };
      const render = () => {
        const q = input.value.trim().toLowerCase();
        list.innerHTML = '';
        for (const cat in IND._cats) {
          const defs = Object.keys(IND).filter((k) => k[0] !== '_' && IND[k].cat === cat && typeof IND[k] === 'object' && IND[k].calc);
          const m = defs.filter((k) => !q || (IND[k].name + ' ' + IND[k].short + ' ' + k).toLowerCase().includes(q));
          if (!m.length) continue;
          list.append(h('div', { class: 'i-head', text: IND._cats[cat] }));
          for (const k of m) list.append(h('div', { class: 'i-row', onclick: () => { c.addInd(k); U.toast(IND[k].short + ' 추가됨'); renderCur(); } }, h('span', { class: 'i-nm', text: IND[k].name }), h('span', { class: 'i-pane', text: IND[k].pane === 'sub' ? '하단 창' : '차트 위' })));
        }
      };
      input.addEventListener('input', render);
      this.modal('지표', h('div', { class: 'i-wrap' }, input, cur, list), [{ t: '닫기', cls: 'pri' }], { cls: 'm-ind' });
      render(); renderCur();
      setTimeout(() => input.focus(), 10);
    }
    openIndSettings(c, ind) {
      const def = IND[ind.type];
      const orig = { inp: U.clone(ind.inp), sty: U.clone(ind.sty || {}) };
      const inp = U.clone(ind.inp), sty = U.clone(ind.sty || {});
      const apply = U.debounce(() => c.updateInd(ind, inp, U.clone(sty)), 120);
      const body = h('div', { class: 'form' });
      if (def.inputs.length) body.append(h('div', { class: 'f-sec', text: '입력값' }));
      for (const I of def.inputs) {
        let el;
        const on = (v) => {
          inp[I.k] = v;
          if (I.k === 'alert' && v && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
          apply();
        };
        if (I.t === 'bool') el = h('input', { type: 'checkbox', checked: !!inp[I.k], onchange: (e) => on(e.target.checked) });
        else if (I.t === 'sel') el = h('select', { onchange: (e) => on(e.target.value) }, ...I.o.map((o) => h('option', { value: o, text: o, selected: inp[I.k] === o })));
        else if (I.t === 'src') el = h('select', { onchange: (e) => on(e.target.value) }, ...IND.SRC.map((o) => h('option', { value: o, text: SRC_LABEL[o] || o, selected: inp[I.k] === o })));
        else el = h('input', { type: 'number', value: inp[I.k], step: I.step || (I.t === 'int' ? 1 : 'any'), min: I.min, max: I.max, oninput: (e) => { const v = I.t === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value); if (isFinite(v)) on(v); } });
        body.append(h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: I.n }), el));
      }
      body.append(h('div', { class: 'f-sec', text: '스타일' }));
      for (const pl of def.plots) {
        const st = () => sty[pl.k] || (sty[pl.k] = {});
        const cur = c.indStyle(ind, pl.k);
        const hasA = pl.t === 'fill' || pl.t === 'col' || pl.a != null;
        const vis = h('input', { type: 'checkbox', checked: cur.vis !== false, onchange: (e) => { st().vis = e.target.checked; apply(); } });
        const sw = this.swatch(() => (sty[pl.k] && sty[pl.k].c) || cur.c, (v) => { st().c = v; apply(); }, hasA ? () => (sty[pl.k] && sty[pl.k].a != null ? sty[pl.k].a : cur.a) : null, hasA ? (a) => { st().a = a; apply(); } : null);
        const row = h('div', { class: 'f-row' }, h('label', { class: 'f-l chk' }, vis, h('span', { text: pl.n })), sw);
        if (!pl.t || pl.t === 'line' || pl.t === 'level' || pl.t === 'dots') {
          row.append(h('select', { class: 'w-sel', title: '두께', onchange: (e) => { st().w = +e.target.value; apply(); } }, ...[1, 1.5, 2, 3, 4].map((w) => h('option', { value: w, text: w + 'px', selected: Math.abs(cur.w - w) < 0.01 }))));
          if (!pl.t || pl.t === 'line') row.append(h('select', { class: 'w-sel', title: '선 스타일', onchange: (e) => { st().ls = +e.target.value; apply(); } }, ...[[0, '실선'], [1, '파선'], [2, '점선']].map(([v, n]) => h('option', { value: v, text: n, selected: (cur.ls || 0) === v }))));
        }
        body.append(row);
      }
      let reset = false;
      const copyBtn = def.toDrawings ? [{
        t: '드로잉으로 복사', fn: () => {
          const ds = def.toDrawings(c, ind);
          if (!ds.length) { U.toast('지금 복사할 추세선이 없습니다', 'warn'); return false; }
          c.drawings.push(...ds); c.commit(); c.invalidate();
          U.toast(ds.length + '개 추세선을 드로잉으로 복사했습니다 — 직접 옮기고 고칠 수 있어요');
          return false;
        },
      }] : [];
      this.modal(def.name + ' 설정', body, [
        { t: '기본값', fn: () => { reset = true; } }, ...copyBtn, '|',
        { t: '취소' },
        { t: '확인', cls: 'pri', ok: true },
      ], {
        cls: 'm-set',
        onClose: (ok) => {
          if (reset) { c.updateInd(ind, IND.defaults(ind.type), {}); setTimeout(() => this.openIndSettings(c, ind), 0); return; }
          if (!ok) c.updateInd(ind, orig.inp, orig.sty);
        },
      });
    }

    /* ================= 드로잉 툴바/설정 ================= */
    onSelect(c, d) {
      if (c !== this.active) return;
      if (this.m) this.m.onSelect(c, d);
      if (this.dtb) { this.dtb.remove(); this.dtb = null; }
      if (!d || !T[d.type]) return;
      const t = T[d.type], s = d.s;
      const ui = (t.ui || []).map((x) => x.k);
      const bar = h('div', { class: 'dtb' });
      const commitStyle = () => { this.rememberStyle(d); c.commit(); c.invalidate(); };
      const hasLine = ui.includes('line') || ui.includes('c') || (s.c && !ui.includes('textOnly'));
      if (hasLine) bar.append(this.swatch(() => s.c, (v) => { s.c = v; if (d.type === 'text' || d.type === 'atext') s.tc = v; commitStyle(); }));
      if (ui.includes('fill')) bar.append(this.swatch(() => s.fc || s.c, (v) => { s.fc = v; s.fill = true; commitStyle(); }, () => (s.fa != null ? s.fa : 0.2), (a) => { s.fa = a; commitStyle(); }));
      if ((ui.includes('text') || ui.includes('textOnly')) && (!this.mobile || t.text)) bar.append(h('button', { class: 'dtb-b', title: '텍스트 색', html: '<b style="font-size:13px">T</b>', onclick: (e) => this.palette(e.currentTarget, s.tc || s.c, null, (v) => { s.tc = v; commitStyle(); }) }));
      if (ui.includes('line')) {
        bar.append(h('select', { class: 'dtb-sel', title: '두께', onchange: (e) => { s.w = +e.target.value; commitStyle(); } }, ...[1, 2, 3, 4].map((w) => h('option', { value: w, text: w + 'px', selected: s.w === w }))));
        bar.append(h('select', { class: 'dtb-sel', title: '선 스타일', onchange: (e) => { s.ls = +e.target.value; commitStyle(); } }, ...[[0, '──'], [1, '- -'], [2, '···']].map(([v, n]) => h('option', { value: v, text: n, selected: (s.ls || 0) === v }))));
      }
      if (this.mobile) { // 폰: 폭이 좁으니 자주 쓰는 것만 — 나머지(복제·숨기기·순서·알림)는 ⋯
        bar.append(h('button', { class: 'dtb-b', title: '설정', html: ICON.gear, onclick: () => this.openDrawSettings(c, d) }));
        bar.append(h('button', { class: 'dtb-b' + (d.locked ? ' on' : ''), title: d.locked ? '잠금 해제' : '잠금', html: d.locked ? ICON.lock : ICON.unlock, onclick: () => { d.locked = !d.locked; c.commit(); this.onSelect(c, d); c.invalidate(); } }));
        bar.append(h('button', { class: 'dtb-b del', title: '삭제', html: ICON.trash, onclick: () => c.removeDrawing(d) }));
        bar.append(h('button', { class: 'dtb-b', title: '더 보기', html: ICON.dots, onclick: () => this.m.drawingMenu(c, d) }));
        c.cell.append(bar);
        this.dtb = bar;
        return;
      }
      if (t.text) bar.append(h('button', { class: 'dtb-b', title: '텍스트 편집', html: ICON.text2, onclick: () => this.editText(c, d) }));
      if (d.type === 'hline' || d.type === 'hray') bar.append(h('button', { class: 'dtb-b', title: '이 가격에 알림 추가', html: ICON.bell, onclick: () => this.openAlertDialog(c, d.pts[0].p) }));
      bar.append(h('button', { class: 'dtb-b', title: '설정', html: ICON.gear, onclick: () => this.openDrawSettings(c, d) }));
      bar.append(h('button', { class: 'dtb-b' + (d.locked ? ' on' : ''), title: d.locked ? '잠금 해제' : '잠금', html: d.locked ? ICON.lock : ICON.unlock, onclick: () => { d.locked = !d.locked; c.commit(); this.onSelect(c, d); c.invalidate(); } }));
      bar.append(h('button', { class: 'dtb-b', title: '복제 (Alt+드래그)', html: ICON.clone, onclick: () => c.cloneDrawing(d) }));
      bar.append(h('button', { class: 'dtb-b', title: '숨기기', html: ICON.eyeOff, onclick: () => { d.hidden = true; c.select(null); c.commit(); } }));
      bar.append(h('button', { class: 'dtb-b del', title: '삭제 (Del)', html: ICON.trash, onclick: () => c.removeDrawing(d) }));
      bar.append(h('span', { class: 'dtb-name', text: t.name }));
      c.cell.append(bar);
      this.dtb = bar;
    }
    editText(c, d, isNew) {
      const ta = h('textarea', { class: 'txt-in', rows: 4, placeholder: '텍스트 입력 (Ctrl+Enter: 확인)' });
      ta.value = d.s.text || '';
      const orig = d.s.text;
      const m = this.modal('텍스트', ta, [{ t: '취소' }, { t: '확인', cls: 'pri', ok: true }], {
        cls: 'm-txt',
        onClose: (ok) => {
          d.s.text = ok ? ta.value : orig;
          if (isNew && !d.s.text && (d.type === 'text' || d.type === 'atext')) { c.removeDrawing(d); return; }
          c.commit(); c.invalidate();
        },
      });
      ta.addEventListener('input', () => { d.s.text = ta.value; c.invalidate(); });
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); m.close(true); } });
      setTimeout(() => ta.focus(), 10);
    }
    openDrawSettings(c, d) {
      const t = T[d.type];
      const orig = U.clone(d.s), origPts = U.clone(d.pts);
      const s = d.s;
      const upd = () => { c.invalidate(); };
      const body = h('div', { class: 'form' });
      const row = (label, ...els) => h('div', { class: 'f-row' }, h('span', { class: 'f-l', text: label }), ...els);
      const chk = (k, label) => h('label', { class: 'f-chk' }, h('input', { type: 'checkbox', checked: !!s[k], onchange: (e) => { s[k] = e.target.checked; upd(); } }), h('span', { text: label }));
      const wSel = () => h('select', { class: 'w-sel', onchange: (e) => { s.w = +e.target.value; upd(); } }, ...[1, 1.5, 2, 3, 4].map((w) => h('option', { value: w, text: w + 'px', selected: s.w === w })));
      const lsSel = () => h('select', { class: 'w-sel', onchange: (e) => { s.ls = +e.target.value; upd(); } }, ...[[0, '실선'], [1, '파선'], [2, '점선']].map(([v, n]) => h('option', { value: v, text: n, selected: (s.ls || 0) === v })));
      const textBlock = () => {
        const ta = h('textarea', { class: 'txt-in', rows: 3, oninput: (e) => { s.text = e.target.value; upd(); } });
        ta.value = s.text || '';
        body.append(h('div', { class: 'f-sec', text: '텍스트' }), ta,
          row('글자', this.swatch(() => s.tc || s.c, (v) => { s.tc = v; upd(); }),
            h('select', { class: 'w-sel', onchange: (e) => { s.fs = +e.target.value; upd(); } }, ...[10, 11, 12, 13, 14, 16, 20, 24, 28, 32, 40].map((v) => h('option', { value: v, text: v + 'px', selected: (s.fs || 13) === v }))),
            chk('bold', '굵게'), chk('italic', '기울임')));
      };
      body.append(h('div', { class: 'f-sec', text: '스타일' }));
      for (const f of t.ui || []) {
        switch (f.k) {
          case 'line': body.append(row('선', this.swatch(() => s.c, (v) => { s.c = v; upd(); }), wSel(), lsSel())); break;
          case 'fill': body.append(row('채우기', h('label', { class: 'f-chk' }, h('input', { type: 'checkbox', checked: !!s.fill, onchange: (e) => { s.fill = e.target.checked; upd(); } })), this.swatch(() => s.fc || s.c, (v) => { s.fc = v; upd(); }, () => (s.fa != null ? s.fa : 0.2), (a) => { s.fa = a; upd(); }))); break;
          case 'ext': body.append(row('연장', chk('extL', '왼쪽'), chk('extR', '오른쪽'))); break;
          case 'text': case 'textOnly': textBlock(); break;
          case 'levels': {
            body.append(h('div', { class: 'f-sec', text: '레벨' }));
            const box = h('div', { class: 'lv-grid' });
            const renderLv = () => {
              box.innerHTML = '';
              s.levels.forEach((l, i) => {
                box.append(h('div', { class: 'lv-row' },
                  h('input', { type: 'checkbox', checked: l.on, onchange: (e) => { l.on = e.target.checked; upd(); } }),
                  h('input', { type: 'number', step: 'any', value: l.v, class: 'lv-v', oninput: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { l.v = v; upd(); } } }),
                  this.swatch(() => l.c, (v) => { l.c = v; upd(); }),
                  h('button', { class: 'mini', html: ICON.close, title: '삭제', onclick: () => { s.levels.splice(i, 1); renderLv(); upd(); } })));
              });
              box.append(h('button', { class: 'btn small', text: '+ 레벨 추가', onclick: () => { s.levels.push({ v: 1.5, c: CL.ACC, on: true }); renderLv(); upd(); } }));
            };
            renderLv();
            body.append(box);
            break;
          }
          default: {
            let el;
            if (f.t === 'bool') el = h('input', { type: 'checkbox', checked: !!s[f.k], onchange: (e) => { s[f.k] = e.target.checked; upd(); } });
            else if (f.t === 'sel') el = h('select', { onchange: (e) => { const v = e.target.value; s[f.k] = isNaN(+v) || v === '' ? v : +v; upd(); } }, ...f.o.map(([v, n]) => h('option', { value: v, text: n, selected: String(s[f.k]) === String(v) })));
            else if (f.t === 'color') el = this.swatch(() => s[f.k] || CL.ACC, (v) => { s[f.k] = v; upd(); });
            else if (f.t === 'str') el = h('input', { type: 'text', value: s[f.k] || '', oninput: (e) => { s[f.k] = e.target.value; upd(); } });
            else el = h('input', { type: 'number', step: f.step || 'any', value: s[f.k], oninput: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { s[f.k] = v; upd(); } } });
            body.append(row(f.n, el));
          }
        }
      }
      if (!t.screen && d.pts.length && d.pts.length <= 8) {
        body.append(h('div', { class: 'f-sec', text: '좌표' }));
        const p = c.pmap[d.pane];
        d.pts.forEach((q, i) => {
          if (q.p == null) return;
          const inp = h('input', { type: 'number', step: 'any', value: +(+q.p).toFixed(Math.max(c.prec, 2)), oninput: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) { d.pts[i].p = v; upd(); } } });
          body.append(row('점 ' + (i + 1) + ' · ' + U.fmtDT(q.t, c.iv), inp));
        });
      }
      this.modal(t.name + ' 설정', body, [
        { t: '기본값으로 저장', fn: () => { this.rememberStyle(d); U.toast('이 도구의 기본 스타일로 저장했습니다'); return false; } }, '|',
        { t: '취소' },
        { t: '확인', cls: 'pri', ok: true },
      ], {
        cls: 'm-set',
        onClose: (ok) => {
          if (!ok) { d.s = orig; d.pts = origPts; c.invalidate(); return; }
          this.rememberStyle(d); c.commit(); this.onSelect(c, d); c.invalidate();
        },
      });
    }

    /* ================= 컨텍스트 메뉴 ================= */
    ctxMenu(c, e, info) {
      this.closeCtx();
      const items = [];
      const d = info.drawing;
      if (d) {
        const t = T[d.type];
        items.push({ n: t.name + ' 설정…', fn: () => this.openDrawSettings(c, d) });
        if (t.text) items.push({ n: '텍스트 편집', fn: () => this.editText(c, d) });
        items.push({ n: '복제', fn: () => c.cloneDrawing(d) });
        items.push({ n: d.locked ? '잠금 해제' : '잠금', fn: () => { d.locked = !d.locked; c.commit(); c.invalidate(); } });
        items.push({ n: '숨기기', fn: () => { d.hidden = true; c.select(null); c.commit(); } });
        items.push({ n: '맨 앞으로', fn: () => c.orderDrawing(d, 'front') });
        items.push({ n: '맨 뒤로', fn: () => c.orderDrawing(d, 'back') });
        if (d.type === 'hline' || d.type === 'hray') items.push({ n: '이 가격에 알림 추가', fn: () => this.openAlertDialog(c, d.pts[0].p) });
        items.push('-');
        items.push({ n: '삭제', cls: 'danger', fn: () => c.removeDrawing(d) });
      } else {
        const p = info.pane;
        if (info.price != null && p && p.main && isFinite(info.price)) {
          const ps = c.fmtP(p, info.price);
          items.push({ n: '여기에 수평선 그리기 (' + ps + ')', fn: () => { const dd = { id: U.uid(), type: 'hline', pane: 'main', pts: [{ t: info.time, p: info.price }], s: this.toolStyle('hline') }; c.drawings.push(dd); c.select(dd); c.commit(); } });
          items.push({ n: '여기에 알림 추가 (' + ps + ')', fn: () => this.openAlertDialog(c, info.price) });
          items.push('-');
        }
        items.push({ n: '차트 초기화 (Alt+R)', fn: () => { for (const k in c.ps) c.ps[k].auto = true; c.view.s = 8; c.fit(); c.invalidate(); } });
        items.push({ n: (c.ps.main.log ? '✓ ' : '') + '로그 스케일', fn: () => c.toggleLog() });
        items.push({ n: (c.ps.main.auto ? '✓ ' : '') + '자동 스케일', fn: () => c.toggleAuto() });
        items.push({ n: '지표 추가…', fn: () => this.openIndicators(c) });
        items.push({ n: '바 리플레이 시작', fn: () => this.startReplaySelect(c) });
        items.push({ n: '관심종목에 추가', fn: () => this.addWatch(c) });
        items.push({ n: '스크린샷 저장', fn: () => this.screenshot(c) });
        items.push('-');
        items.push({ n: '숨긴 드로잉 모두 보이기', fn: () => { c.drawings.forEach((x) => (x.hidden = false)); c.commit(); c.invalidate(); } });
        items.push({ n: '이 종목 드로잉 모두 삭제', cls: 'danger', fn: () => this.confirm('이 종목의 드로잉을 모두 삭제할까요?', () => c.removeAllDrawings()) });
        items.push({ n: '설정…', fn: () => this.openSettings() });
      }
      const box = h('div', { class: 'pop ctx' });
      for (const it of items) {
        if (it === '-') { box.append(h('div', { class: 'ctx-sep' })); continue; }
        box.append(h('div', { class: 'ctx-item ' + (it.cls || ''), text: it.n, onclick: () => { this.closeCtx(); it.fn(); } }));
      }
      document.body.append(box);
      const bw = box.offsetWidth, bh = box.offsetHeight;
      box.style.left = U.clamp(e.clientX, 4, innerWidth - bw - 4) + 'px';
      box.style.top = U.clamp(e.clientY, 4, innerHeight - bh - 4) + 'px';
      this.ctxEl = box;
      setTimeout(() => { this._ctxOff = (ev) => { if (!box.contains(ev.target)) this.closeCtx(); }; document.addEventListener('pointerdown', this._ctxOff, true); }, 0);
    }
    closeCtx() {
      if (this.ctxEl) { this.ctxEl.remove(); this.ctxEl = null; }
      if (this._ctxOff) { document.removeEventListener('pointerdown', this._ctxOff, true); this._ctxOff = null; }
    }

    /* ================= 설정 대화상자 ================= */
    openSettings() {
      const s = this.set;
      const body = h('div', { class: 'form' });
      const redraw = () => { this.saveSet(); this.charts.forEach((c) => { c._lgKey = ''; c.invalidate(); }); };
      const chk = (k, n) => h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: n }), h('input', { type: 'checkbox', checked: !!s[k], onchange: (e) => { s[k] = e.target.checked; redraw(); } }));
      body.append(h('div', { class: 'f-sec', text: '모양' }));
      body.append(h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '테마' }), h('select', { onchange: (e) => { s.theme = e.target.value; this.saveSet(); this.applyTheme(); } },
        h('option', { value: 'dark', text: '다크', selected: s.theme === 'dark' }), h('option', { value: 'navy', text: '미드나이트', selected: s.theme === 'navy' }), h('option', { value: 'light', text: '라이트', selected: s.theme === 'light' }))));
      body.append(h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '화면' }), h('select', { onchange: (e) => { U.save('ui', e.target.value); location.replace(location.pathname); } },
        ...[['auto', '자동 (폰은 모바일 화면)'], ['mobile', '모바일 화면'], ['desktop', 'PC 화면']].map(([v, n]) => h('option', { value: v, text: n, selected: U.load('ui', 'auto') === v })))));
      const bgSw = this.swatch(() => s.bgColor || (CL.THEMES[s.theme] || CL.THEMES.dark).bg, (v) => { s.bgColor = v; redraw(); });
      body.append(h('div', { class: 'f-row' }, h('span', { class: 'f-l', text: '차트 배경색' }), bgSw,
        h('button', { class: 'btn small', text: '완전 검정', onclick: () => { s.bgColor = '#000000'; bgSw.repaint(); redraw(); } }),
        h('button', { class: 'btn small', text: '테마 기본', onclick: () => { s.bgColor = null; bgSw.repaint(); redraw(); } })));
      const upSw = this.swatch(() => s.up, (v) => { s.up = v; s.colorMode = 'custom'; redraw(); });
      const dnSw = this.swatch(() => s.dn, (v) => { s.dn = v; s.colorMode = 'custom'; redraw(); });
      body.append(h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '캔들 색 프리셋' }), h('select', {
        onchange: (e) => { const m = COLOR_MODES[e.target.value]; if (m) { s.up = m.up; s.dn = m.dn; s.colorMode = e.target.value; upSw.repaint(); dnSw.repaint(); redraw(); } },
      }, h('option', { value: 'global', text: '해외식 (상승 초록 / 하락 빨강)', selected: s.colorMode === 'global' }), h('option', { value: 'kr', text: '국내식 (상승 빨강 / 하락 파랑)', selected: s.colorMode === 'kr' }), h('option', { value: 'custom', text: '사용자 지정', selected: s.colorMode === 'custom' }))));
      body.append(h('div', { class: 'f-row' }, h('span', { class: 'f-l', text: '상승 / 하락 색' }), upSw, dnSw, h('span', { class: 'f-l2', text: '라인 차트 색' }), this.swatch(() => s.line, (v) => { s.line = v; redraw(); })));
      body.append(chk('grid', '격자선'), chk('wm', '워터마크(종목명)'), chk('hiLo', '보이는 범위 최고/최저 표시'), chk('lastLine', '현재가 선'), chk('countdown', '봉 마감 카운트다운'), chk('indLabels', '가격축에 지표 값 표시'));
      body.append(h('div', { class: 'f-sec', text: '동작' }));
      body.append(h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '오른쪽 여백(봉)' }), h('input', { type: 'number', min: 0, max: 200, value: s.rightBars, oninput: (e) => { s.rightBars = U.clamp(parseInt(e.target.value, 10) || 0, 0, 200); this.saveSet(); } })));
      body.append(h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '휠 확대 기준' }), h('select', { onchange: (e) => { s.zoomAnchor = e.target.value; this.saveSet(); } }, h('option', { value: 'cursor', text: '마우스 위치', selected: s.zoomAnchor !== 'right' }), h('option', { value: 'right', text: '오른쪽 끝', selected: s.zoomAnchor === 'right' }))));
      body.append(chk('syncCross', '여러 차트 크로스헤어 동기화'));
      body.append(h('div', { class: 'f-sec', text: '백업' }));
      body.append(h('div', { class: 'f-row' },
        h('button', { class: 'btn', text: '백업 내보내기 (드로잉·지표·설정)', onclick: () => this.exportAll() }),
        h('button', { class: 'btn', text: '백업 가져오기', onclick: () => this.importAll() })));
      this.modal('설정', body, [{ t: '닫기', cls: 'pri', ok: true }], { cls: 'm-set' });
    }
    openHelp() {
      const rows = [
        ['마우스 휠', '확대/축소 (가격축 위에서는 가격 확대)'], ['드래그', '차트 이동 (위아래로 크게 끌면 가격 이동, 자동 스케일 해제)'],
        ['가격축 / 시간축 드래그', '세로 / 가로 배율 조절'], ['가격축 더블클릭', '자동 스케일로 복귀'], ['시간축 더블클릭', '최신 봉으로 이동 + 기본 간격'],
        ['Shift + 드래그', '측정 (봉 수·기간·가격 변화·거래량)'], ['Alt + 드로잉 드래그', '드로잉 복제'], ['Shift (그리는 중)', '수평으로 고정'],
        ['Ctrl (그리는 중)', '자석(OHLC 스냅) 일시 전환'], ['더블클릭(드로잉)', '설정 열기 / 텍스트 편집'], ['우클릭', '메뉴 (수평선·알림 추가, 로그 스케일 등)'],
        ['Del / Backspace', '선택한 드로잉 삭제'], ['Ctrl+Z / Ctrl+Y', '되돌리기 / 다시 실행'], ['Ctrl+C / Ctrl+V', '드로잉 복사 / 붙여넣기'],
        ['Esc', '그리기 취소 · 선택 해제 · 창 닫기'], ['Enter / 더블클릭', '경로·폴리라인·고스트피드 그리기 끝내기'],
        ['Alt+T / H / J / V / C', '추세선 / 수평선 / 수평 레이 / 수직선 / 십자선'], ['Alt+F', '피보나치 되돌림'], ['Alt+Shift+R', '사각형'],
        ['Alt+R', '차트 초기화'], ['Alt+A', '가격 알림 추가'], ['← → / ↑ ↓', '봉 이동 / 확대·축소'], ['아무 글자 입력', '종목 검색 열기'],
        ['자동 추세선', '지표 → "자동 추세선" (또는 추세선 도구 메뉴 맨 아래). ⚙에서 "드로잉으로 복사"하면 직접 수정 가능'],
      ];
      const tbl = h('div', { class: 'help-tbl' }, ...rows.map(([k, v]) => h('div', { class: 'help-row' }, h('kbd', { text: k }), h('span', { text: v }))));
      const tips = h('div', { class: 'hint', html: '데이터: 업비트·바이낸스(현물/선물)는 실시간, 주식·지수는 야후 파이낸스(약 15~20분 지연)입니다.<br>드로잉은 종목별로, 지표·레이아웃은 차트 칸별로 브라우저에 자동 저장됩니다. 설정 → 백업으로 옮길 수 있어요.' });
      this.modal('단축키 · 사용법', h('div', {}, tbl, tips), [{ t: '닫기', cls: 'pri', ok: true }], { cls: 'm-set' });
    }
    exportAll() {
      for (const c of this.charts) this.saveSlotNow(c);
      const out = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('cl.')) out[k] = localStorage.getItem(k); }
      const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'tradinghyun-backup-' + U.fmtDate(Date.now()) + '.json' });
      document.body.append(a); a.click(); a.remove();
      U.toast('백업 파일을 저장했습니다');
    }
    importAll() {
      const fi = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
      document.body.append(fi);
      fi.onchange = async () => {
        const f = fi.files[0]; fi.remove();
        if (!f) return;
        try {
          const o = JSON.parse(await f.text());
          let n = 0;
          for (const k in o) if (k.startsWith('cl.')) { localStorage.setItem(k, o[k]); n++; }
          U.toast(n + '개 항목 복원 — 새로고침합니다');
          setTimeout(() => location.reload(), 800);
        } catch (e) { U.toast('가져오기 실패: ' + e.message, 'err'); }
      };
      fi.click();
    }
    screenshot(c) {
      c = c || this.active;
      const url = c.snapshot();
      const a = h('a', { href: url, download: c.sym.replace(/[^\w.-]/g, '_') + '_' + c.iv + '_' + U.fmtDate(Date.now()) + '.png' });
      document.body.append(a); a.click(); a.remove();
      U.toast('스크린샷 저장됨');
    }

    /* ================= 리플레이 ================= */
    startReplaySelect(c) {
      c = c || this.active;
      if (c.replay) { this.stopReplay(c); return; }
      if (c.bars.length < 30) { U.toast('데이터가 부족합니다', 'warn'); return; }
      this.replaySel = c;
      this.setTool('cursor');
      this.replaySel = c;
      U.toast(this.mobile ? '리플레이를 시작할 봉을 차트에서 탭하세요' : '리플레이를 시작할 봉을 차트에서 클릭하세요 (Esc: 취소)', '', 3500);
    }
    replayPick(c, idx) {
      this.replaySel = null;
      idx = U.clamp(idx, 10, c.full.length - 2);
      c.replay = { idx, playing: false, speed: 2 };
      c.bars = c.full.slice(0, idx + 1);
      c.calcAll();
      c.view.r = idx + c.rightMargin();
      c.select(null);
      this.showReplayBar(c);
      c.invalidate();
    }
    showReplayBar(c) {
      if (c.repBar) c.repBar.remove();
      const r = c.replay;
      const playB = h('button', { class: 'rb', html: ICON.play, title: '재생/일시정지', onclick: () => this.replayToggle(c) });
      const lbl = h('span', { class: 'rb-l' });
      const bar = h('div', { class: 'replay-bar' },
        h('span', { class: 'rb-t', text: '리플레이' }),
        playB,
        h('button', { class: 'rb', html: ICON.step, title: '한 봉 앞으로', onclick: () => this.replayStep(c) }),
        h('select', { class: 'rb-s', title: '속도', onchange: (e) => { r.speed = +e.target.value; if (r.playing) { this.replayToggle(c); this.replayToggle(c); } } },
          ...[[0.5, '0.5봉/초'], [1, '1봉/초'], [2, '2봉/초'], [5, '5봉/초'], [10, '10봉/초'], [20, '20봉/초']].map(([v, n]) => h('option', { value: v, text: n, selected: r.speed === v }))),
        h('button', { class: 'rb', html: ICON.replay, title: '시작 지점 다시 선택', onclick: () => { this.stopReplay(c, true); this.startReplaySelect(c); } }),
        lbl,
        h('button', { class: 'rb x', html: ICON.close, title: '리플레이 종료 (실시간으로)', onclick: () => this.stopReplay(c) }));
      c.repBar = bar; c.repPlay = playB; c.repLbl = lbl;
      c.cell.append(bar);
      this.updReplayLbl(c);
    }
    updReplayLbl(c) { if (c.repLbl && c.replay) c.repLbl.textContent = U.fmtDT(c.full[c.replay.idx].t, c.iv) + '  (' + (c.full.length - 1 - c.replay.idx) + '봉 남음)'; }
    replayStep(c) {
      const r = c.replay;
      if (!r) return;
      if (r.idx >= c.full.length - 1) { if (r.playing) this.replayToggle(c); U.toast('마지막 봉입니다'); return; }
      const atEnd = c.view.r >= c.bars.length - 1 - 0.5;
      r.idx++;
      c.bars.push(c.full[r.idx]);
      if (atEnd) c.view.r += 1;
      c.calcAll();
      this.updReplayLbl(c);
      c.invalidate();
    }
    replayToggle(c) {
      const r = c.replay;
      if (!r) return;
      r.playing = !r.playing;
      clearInterval(r.timer);
      if (r.playing) r.timer = setInterval(() => this.replayStep(c), 1000 / r.speed);
      c.repPlay.innerHTML = r.playing ? ICON.pause : ICON.play;
    }
    stopReplay(c, silent) {
      if (!c.replay) return;
      clearInterval(c.replay.timer);
      c.replay = null;
      c.bars = c.full;
      c.calcAll();
      if (c.repBar) { c.repBar.remove(); c.repBar = null; }
      if (!silent) { c.fit(); U.toast('리플레이 종료'); }
      c.invalidate();
    }

    /* ================= 알림 ================= */
    openAlertDialog(c, price) {
      c = c || this.active;
      if (!c.bars.length) return;
      price = price != null ? price : c.bars[c.bars.length - 1].c;
      const pIn = h('input', { type: 'number', step: 'any', value: +price.toFixed(Math.max(c.prec, 0)) });
      const cond = h('select', {}, h('option', { value: 'cross', text: '교차 (위·아래 모두)' }), h('option', { value: 'up', text: '상향 돌파' }), h('option', { value: 'down', text: '하향 돌파' }));
      const msg = h('input', { type: 'text', placeholder: '메시지 (선택)' });
      const body = h('div', { class: 'form' },
        h('div', { class: 'f-row' }, h('span', { class: 'f-l', text: '종목' }), h('b', { text: c.sym + ' · ' + (SRC_NAMES[c.src] || c.src) })),
        h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '조건' }), cond),
        h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '가격' }), pIn),
        h('label', { class: 'f-row' }, h('span', { class: 'f-l', text: '메시지' }), msg),
        h('div', { class: 'hint', text: '이 페이지가 열려 있는 동안 동작합니다. 브라우저 알림 + 소리로 알려드려요.' }));
      this.modal('가격 알림 추가', body, [{ t: '취소' }, {
        t: '만들기', cls: 'pri', ok: true, fn: () => {
          const v = parseFloat(pIn.value);
          if (!isFinite(v)) { U.toast('가격을 확인하세요', 'warn'); return false; }
          this.alerts.push({ id: U.uid(), src: c.src, sym: c.sym, price: v, cond: cond.value, msg: msg.value.trim(), active: true, fired: false, created: Date.now() });
          U.save('alerts', this.alerts);
          if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
          U.toast('알림 등록: ' + c.sym + ' ' + U.fmt(v, c.prec));
          this.charts.forEach((x) => x.invalidate());
          this.trackQuotes();
          this.renderPanel();
        },
      }]);
      setTimeout(() => pIn.select(), 10);
    }
    priceUpdate(src, sym, price) {
      const k = src + ':' + sym;
      const prev = this.lastPx[k];
      this.lastPx[k] = price;
      if (prev == null || prev === price) return;
      for (const a of this.alerts) {
        if (!a.active || a.fired || a.src !== src || a.sym !== sym) continue;
        const up = prev < a.price && price >= a.price, dn = prev > a.price && price <= a.price;
        if ((a.cond === 'cross' && (up || dn)) || (a.cond === 'up' && up) || (a.cond === 'down' && dn)) this.fireAlert(a, price);
      }
    }
    fmtPx(src, sym, v) {
      const c = this.charts.find((x) => x.src === src && x.sym === sym && x.bars.length);
      if (c) return U.fmt(v, c.prec);
      const a = Math.abs(v);
      return U.fmt(v, a >= 1000 ? 0 : a >= 1 ? 2 : Math.min(8, Math.ceil(-Math.log10(a || 1)) + 3));
    }
    fireAlert(a, price) {
      a.fired = true; a.firedAt = Date.now();
      U.save('alerts', this.alerts);
      const txt = '🔔 ' + a.sym + ' ' + (a.cond === 'up' ? '상향 돌파 ' : a.cond === 'down' ? '하향 돌파 ' : '도달 ') + this.fmtPx(a.src, a.sym, a.price) + (a.msg ? ' — ' + a.msg : '') + ' (현재 ' + this.fmtPx(a.src, a.sym, price) + ')';
      this.notify(CL.BRAND.name + ' 가격 알림', txt);
      this.charts.forEach((x) => x.invalidate());
      this.trackQuotes();
      this.renderPanel();
    }
    notify(title, txt) {
      U.toast(txt, 'alert', 8000);
      try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body: txt }); } catch (e) {}
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.22].forEach((t0) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + 0.15); });
      } catch (e) {}
    }
    indAlert(c, ind, text) {
      this.notify(CL.BRAND.name + ' 추세선 알림', '📈 ' + (c.dispName() || c.sym) + ' ' + U.IV_LABEL[c.iv] + ' — ' + text);
    }

    /* ================= 오른쪽 사이드바 (위 막대 오른쪽 끝 버튼으로 열고 닫음 + 크기 조절) ================= */
    buildRight() {
      const P = this.el.panel, B = (this.tb && this.tb.panelBox) || this.el.rbar;
      P.innerHTML = ''; B.innerHTML = '';
      this.rp = { btn: {} };
      for (const [k, n, ic] of [['watch', '관심종목', ICON.list], ['alerts', '알림', ICON.bell], ['tree', '객체 트리', ICON.tree]]) {
        const b = h('button', { class: 'rb-btn', title: n, html: ic, onclick: () => {
          if (this.set.panel && this.set.panelTab === k) this.set.panel = false; else { this.set.panel = true; this.set.panelTab = k; }
          this.saveSet(); this.renderPanel(true);
        } });
        this.rp.btn[k] = b;
        B.append(b);
      }
      const rz = h('div', { class: 'rp-resize', title: '드래그해서 패널 너비 조절' });
      rz.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const x0 = e.clientX, w0 = P.offsetWidth;
        document.body.classList.add('resizing');
        const mv = (ev) => { this.set.rpw = U.clamp(w0 - (ev.clientX - x0), 240, Math.min(640, innerWidth - 400)); document.documentElement.style.setProperty('--rpw', this.set.rpw + 'px'); this.charts.forEach((c) => c.resize()); };
        const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); document.body.classList.remove('resizing'); this.saveSet(); };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      if (this.set.rpw) document.documentElement.style.setProperty('--rpw', this.set.rpw + 'px');
      this.rp.body = h('div', { class: 'rp-body' });
      P.append(rz, this.rp.body);
      this.renderPanel(true);
    }
    renderPanel(force) {
      if (!this.rp || this.mobile) return; // 모바일은 mobile.js가 관심종목·알림 화면을 따로 그림
      document.body.classList.toggle('no-panel', !this.set.panel);
      for (const k in this.rp.btn) this.rp.btn[k].classList.toggle('on', !!this.set.panel && this.set.panelTab === k);
      if (!this.set.panel) { this._panelTab = null; setTimeout(() => this.charts.forEach((c) => c.resize()), 0); return; }
      const B = this.rp.body;
      const tab = this.set.panelTab;
      if (tab === 'watch') {
        if (force || this._panelTab !== 'watch' || !this.wl.root || !this.wl.root.isConnected) { B.innerHTML = ''; this.wl.render(B); }
        else this.wl.syncActive();
        this._panelTab = 'watch';
        setTimeout(() => this.charts.forEach((c) => c.resize()), 0);
        return;
      }
      this._panelTab = tab;
      B.innerHTML = '';
      const title = (t) => h('div', { class: 'rp-title' }, h('span', { text: t }));
      if (tab === 'alerts') {
        B.append(title('알림'));
        B.append(h('div', { class: 'rp-tool' }, h('button', { class: 'btn small', text: '+ 알림 추가', onclick: () => this.openAlertDialog(this.active) }),
          h('button', { class: 'btn small', text: '울린 알림 지우기', onclick: () => { this.alerts = this.alerts.filter((a) => !a.fired); U.save('alerts', this.alerts); this.renderPanel(); this.charts.forEach((x) => x.invalidate()); } })));
        if (!this.alerts.length) B.append(h('div', { class: 'rp-empty', text: '알림이 없습니다. 차트 우클릭 → "여기에 알림 추가" 또는 Alt+A' }));
        for (const a of this.alerts.slice().reverse()) {
          B.append(h('div', { class: 'a-row' + (a.fired ? ' fired' : '') },
            h('div', { class: 'a-main' }, h('b', { text: a.sym }), h('span', { text: ' ' + ({ cross: '교차', up: '상향', down: '하향' }[a.cond] || '') + ' ' + this.fmtPx(a.src, a.sym, a.price) })),
            h('small', { text: (a.msg ? a.msg + ' · ' : '') + (a.fired ? '울림 ' + new Date(a.firedAt).toLocaleString() : '대기 중') }),
            h('div', { class: 'a-btns' },
              a.fired ? h('button', { class: 'mini', text: '재설정', title: '다시 대기', onclick: () => { a.fired = false; U.save('alerts', this.alerts); this.renderPanel(); this.charts.forEach((x) => x.invalidate()); } }) : null,
              h('button', { class: 'mini', html: ICON.trash, title: '삭제', onclick: () => { this.alerts.splice(this.alerts.indexOf(a), 1); U.save('alerts', this.alerts); this.renderPanel(); this.charts.forEach((x) => x.invalidate()); } }))));
        }
      } else {
        const c = this.active;
        if (!c) return;
        B.append(title('객체 트리'));
        B.append(h('div', { class: 'rp-sub', text: '지표 (' + c.inds.length + ')' }));
        for (const ind of c.inds) B.append(h('div', { class: 'o-row' }, h('span', { class: 'o-nm', text: IND[ind.type].label(ind.inp) }),
          h('button', { class: 'mini', html: ind.hidden ? ICON.eyeOff : ICON.eye, onclick: () => { c.toggleInd(ind); this.renderPanel(); } }),
          h('button', { class: 'mini', html: ICON.gear, onclick: () => this.openIndSettings(c, ind) }),
          h('button', { class: 'mini', html: ICON.trash, onclick: () => { c.removeInd(ind.id); this.renderPanel(); } })));
        B.append(h('div', { class: 'rp-sub', text: '드로잉 (' + c.drawings.length + ')' }));
        if (!c.drawings.length) B.append(h('div', { class: 'rp-empty', text: '드로잉이 없습니다' }));
        c.drawings.slice().reverse().forEach((d) => {
          const t = T[d.type];
          if (!t) return;
          B.append(h('div', { class: 'o-row' + (c.sel === d ? ' on' : ''), onclick: () => { d.hidden = false; c.select(d); this.renderPanel(); } },
            h('span', { class: 'o-ic', html: ICON[d.type] || '' }), h('span', { class: 'o-nm', text: t.name + (d.s.text ? ' “' + String(d.s.text).slice(0, 12) + '”' : '') }),
            h('button', { class: 'mini', html: d.hidden ? ICON.eyeOff : ICON.eye, onclick: (e) => { e.stopPropagation(); d.hidden = !d.hidden; if (d.hidden && c.sel === d) c.select(null); c.commit(); c.invalidate(); this.renderPanel(); } }),
            h('button', { class: 'mini', html: d.locked ? ICON.lock : ICON.unlock, onclick: (e) => { e.stopPropagation(); d.locked = !d.locked; c.commit(); this.renderPanel(); } }),
            h('button', { class: 'mini', html: ICON.trash, onclick: (e) => { e.stopPropagation(); c.removeDrawing(d); this.renderPanel(); } })));
        });
      }
      setTimeout(() => this.charts.forEach((c) => c.resize()), 0);
    }
    addWatch(c) {
      c = c || this.active;
      this.set.panel = true; this.set.panelTab = 'watch'; this.saveSet();
      this.renderPanel(true);
      if (this.wl.add(c.src, c.sym, c.dispName())) U.toast('관심종목에 추가: ' + CL.tickOf(c.src, c.sym));
      else U.toast('이미 관심종목에 있습니다');
    }
  }

  CL.App = App;
  window.addEventListener('DOMContentLoaded', () => { CL.app = new App(); });
})();
