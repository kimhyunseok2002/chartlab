/* ChartLab — data.js : 데이터 소스 (바이낸스 현물/선물, 업비트, 주식(야후·네이버 via 로컬 서버), CSV, 데모) */
(function () {
  'use strict';
  const CL = window.CL, U = CL.U;
  const Data = (CL.Data = {});
  const P = (Data.providers = {});

  async function getJSON(url) {
    let r;
    try { r = await fetch(url); }
    catch (e) { const er = new Error('네트워크 오류'); er.net = true; throw er; }
    if (!r.ok) {
      let msg = 'HTTP ' + r.status;
      try { const j = await r.json(); if (j && (j.msg || j.error)) msg += ' ' + (j.msg || (j.error.message || j.error)); } catch (e) {}
      const er = new Error(msg); er.status = r.status; throw er;
    }
    return r.json();
  }
  Data.getJSON = getJSON;

  function wsLoop(urls, onOpen, onMsg, status) {
    let ws = null, closed = false, tries = 0, idx = 0, timer = 0;
    const open = () => {
      if (closed) return;
      try { ws = new WebSocket(urls[idx % urls.length]); } catch (e) { schedule(); return; }
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => { const re = tries > 0; tries = 0; onOpen && onOpen(ws); status && status(re ? 'resync' : 'live'); };
      ws.onmessage = onMsg;
      ws.onclose = () => { if (!closed) { status && status('reconnect'); schedule(); } };
      ws.onerror = () => { try { ws.close(); } catch (e) {} };
    };
    const schedule = () => { tries++; idx++; clearTimeout(timer); timer = setTimeout(open, Math.min(30000, 800 * 2 ** Math.min(tries, 5))); };
    open();
    return () => { closed = true; clearTimeout(timer); try { ws && ws.close(); } catch (e) {} };
  }

  /* ================= 바이낸스 ================= */
  function makeBinance(o) {
    return {
      id: o.id, name: o.name, short: o.short, kind: 'crypto', more: true,
      native: {
        '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '2h': '2h', '4h': '4h',
        '6h': '6h', '8h': '8h', '12h': '12h', '1D': '1d', '3D': '3d', '1W': '1w', '1M': '1M',
      },
      base: { '10m': '5m' },
      tz: () => 0,
      async get(path) {
        let err;
        for (const h of o.rest) {
          try { return await getJSON(h + path); }
          catch (e) { err = e; if (e.status === 400) break; }
        }
        throw err;
      },
      async fetch(sym, iv, opt) {
        opt = opt || {};
        let url = o.kl + '?symbol=' + encodeURIComponent(sym) + '&interval=' + this.native[iv] + '&limit=' + o.limit;
        if (opt.end) url += '&endTime=' + (opt.end - 1);
        const raw = await this.get(url);
        return raw.map((k) => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
      },
      subscribe(sym, iv, cb, status) {
        const urls = o.ws.map((w) => w + sym.toLowerCase() + '@kline_' + this.native[iv]);
        return wsLoop(urls, null, (ev) => {
          let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
          const k = m.k; if (!k) return;
          cb({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v });
        }, status);
      },
      async list() {
        if (!this._list) {
          const t = await this.get(o.tick);
          this._list = t
            .filter((x) => +x.quoteVolume > 0 || +x.volume > 0)
            .map((x) => {
              const q = x.symbol;
              const stable = /(USDT|FDUSD|USDC)$/.test(q);
              return { symbol: q, qv: +x.quoteVolume, stable };
            })
            .sort((a, b) => (b.stable - a.stable) || (b.qv - a.qv));
        }
        return this._list;
      },
      async search(q) {
        const L = await this.list();
        const s = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (q.trim() && !s) return [];
        let r = s ? L.filter((x) => x.symbol.indexOf(s) >= 0) : L.slice();
        if (s) r.sort((a, b) => (b.symbol === s) - (a.symbol === s) || (b.symbol.startsWith(s) - a.symbol.startsWith(s)) || (b.stable - a.stable) || (b.qv - a.qv));
        return r.slice(0, 60).map((x) => ({ symbol: x.symbol, name: x.symbol, source: o.id, ex: o.short }));
      },
      async quotes(syms) {
        const out = {};
        await Promise.all(syms.map(async (s) => {
          try {
            const t = await this.get(o.tick1 + encodeURIComponent(s));
            out[s] = { last: +t.lastPrice, chg: +t.priceChangePercent };
          } catch (e) {}
        }));
        return out;
      },
    };
  }
  P.binance = makeBinance({
    id: 'binance', name: '바이낸스', short: 'BINANCE', limit: 1000,
    rest: ['https://data-api.binance.vision', 'https://api.binance.com'],
    ws: ['wss://data-stream.binance.vision/ws/', 'wss://stream.binance.com:9443/ws/'],
    kl: '/api/v3/klines', tick: '/api/v3/ticker/24hr?type=MINI', tick1: '/api/v3/ticker/24hr?symbol=',
  });
  P.binancef = makeBinance({
    id: 'binancef', name: '바이낸스 선물', short: 'BINANCE-F', limit: 1500,
    rest: ['https://fapi.binance.com'],
    ws: ['wss://fstream.binance.com/ws/'],
    kl: '/fapi/v1/klines', tick: '/fapi/v1/ticker/24hr', tick1: '/fapi/v1/ticker/24hr?symbol=',
  });

  /* ================= 업비트 ================= */
  P.upbit = {
    id: 'upbit', name: '업비트', short: 'UPBIT', kind: 'crypto', more: true,
    host: 'https://api.upbit.com/v1',
    native: {
      '1m': 'minutes/1', '3m': 'minutes/3', '5m': 'minutes/5', '10m': 'minutes/10', '15m': 'minutes/15',
      '30m': 'minutes/30', '1h': 'minutes/60', '4h': 'minutes/240', '1D': 'days', '1W': 'weeks', '1M': 'months',
    },
    base: { '2h': '1h', '6h': '1h', '8h': '4h', '12h': '4h', '3D': '1D' },
    tz: () => 0,
    async get(path) {
      for (let i = 0; ; i++) {
        try { return await getJSON(this.host + path); }
        catch (e) { if (e.status === 429 && i < 6) { await U.sleep(300 * (i + 1)); continue; } throw e; }
      }
    },
    parse(c) {
      return { t: Date.parse(c.candle_date_time_utc + 'Z'), o: c.opening_price, h: c.high_price, l: c.low_price, c: c.trade_price, v: c.candle_acc_trade_volume };
    },
    async fetch(sym, iv, opt) {
      opt = opt || {};
      const pages = opt.end ? 3 : 5;
      let out = [], to = opt.end || 0;
      for (let k = 0; k < pages; k++) {
        let u = '/candles/' + this.native[iv] + '?market=' + encodeURIComponent(sym) + '&count=200';
        if (to) u += '&to=' + encodeURIComponent(new Date(to).toISOString().slice(0, 19) + 'Z');
        const r = await this.get(u);
        const b = r.map(this.parse).reverse();
        if (!b.length) break;
        out = b.concat(out);
        to = b[0].t;
        if (b.length < 200) break;
        await U.sleep(120);
      }
      const seen = new Set();
      return out.filter((b) => (seen.has(b.t) ? false : (seen.add(b.t), true)));
    },
    /* 체결(trade) 스트림을 받아 원하는 봉 단위로 직접 집계 */
    subscribe(sym, iv, cb, status, ctx) {
      let cur = ctx && ctx.last ? Object.assign({}, ctx.last) : null;
      let timer = 0, lastEmit = 0;
      const emit = () => { timer = 0; lastEmit = Date.now(); if (cur) cb(Object.assign({}, cur)); };
      const trade = (p, v, ts) => {
        const s = U.barStart(ts, iv, 0);
        if (!cur || s > cur.t) cur = { t: s, o: p, h: p, l: p, c: p, v: v };
        else if (s === cur.t) { if (p > cur.h) cur.h = p; if (p < cur.l) cur.l = p; cur.c = p; cur.v += v; }
        else return;
        if (!timer) timer = setTimeout(emit, Math.max(0, 250 - (Date.now() - lastEmit)));
      };
      const dec = new TextDecoder();
      const stop = wsLoop(['wss://api.upbit.com/websocket/v1'], (ws) => {
        ws.send(JSON.stringify([{ ticket: 'cl-' + U.uid() }, { type: 'trade', codes: [sym] }, { format: 'SIMPLE' }]));
      }, (ev) => {
        let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : dec.decode(ev.data)); } catch (e) { return; }
        if (m && m.ty === 'trade') trade(m.tp, m.tv, m.ttms);
      }, status);
      // 놓친 체결 보정: 1분마다 REST로 현재 봉 재동기화 (네이티브 주기만)
      const self = this;
      const rs = this.native[iv] ? setInterval(async () => {
        try {
          const r = await self.get('/candles/' + self.native[iv] + '?market=' + encodeURIComponent(sym) + '&count=1');
          if (!r.length) return;
          const b = self.parse(r[0]);
          if (!cur || b.t > cur.t) cur = b;
          else if (b.t === cur.t) { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.v = Math.max(cur.v, b.v); }
          emit();
        } catch (e) {}
      }, 60000) : 0;
      return () => { stop(); clearInterval(rs); clearTimeout(timer); };
    },
    async list() {
      if (!this._list) {
        const [m, tk] = await Promise.all([
          this.get('/market/all?isDetails=false'),
          this.get('/ticker/all?quote_currencies=KRW,BTC,USDT').catch(() => []),
        ]);
        const vol = {};
        for (const t of tk) vol[t.market] = t.acc_trade_price_24h;
        const qo = { KRW: 0, USDT: 1, BTC: 2 };
        this._list = m.map((x) => ({ symbol: x.market, name: x.korean_name, en: x.english_name, qv: vol[x.market] || 0, q: qo[x.market.split('-')[0]] ?? 3 }))
          .sort((a, b) => a.q - b.q || b.qv - a.qv);
      }
      return this._list;
    },
    async search(q) {
      const L = await this.list();
      const s = q.trim().toUpperCase();
      let r = s ? L.filter((x) => x.symbol.indexOf(s) >= 0 || x.name.indexOf(q.trim()) >= 0 || (x.en || '').toUpperCase().indexOf(s) >= 0) : L;
      return r.slice(0, 60).map((x) => ({ symbol: x.symbol, name: x.name + ' · ' + x.en, source: 'upbit', ex: 'UPBIT' }));
    },
    async quotes(syms) {
      const out = {};
      if (!syms.length) return out;
      try {
        const r = await this.get('/ticker?markets=' + syms.map(encodeURIComponent).join(','));
        for (const t of r) out[t.market] = { last: t.trade_price, chg: t.signed_change_rate * 100 };
      } catch (e) {}
      return out;
    },
  };

  /* ================= 주식/지수 (로컬 서버 프록시: 야후 파이낸스 + 네이버 검색) ================= */
  P.stock = {
    id: 'stock', name: '주식·지수', short: 'STOCK', kind: 'stock', more: true, _meta: {},
    native: { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '60m', '1D': '1d', '1W': '1wk', '1M': '1mo' },
    base: { '3m': '1m', '10m': '5m', '2h': '1h', '4h': '1h', '6h': '1h', '8h': '1h', '12h': '1h', '3D': '1D' },
    range: { '1m': '7d', '5m': '60d', '15m': '60d', '30m': '60d', '1h': '730d', '1D': 'max', '1W': 'max', '1M': 'max' },
    span: { '1m': 7 * 864e2, '5m': 58 * 864e2, '15m': 58 * 864e2, '30m': 58 * 864e2, '1h': 700 * 864e2 },
    poll: { '1m': '1d', '5m': '5d', '15m': '5d', '30m': '5d', '1h': '5d', '1D': '5d', '1W': '1mo', '1M': '3mo' },
    tz(sym) { return (this._meta[sym] && this._meta[sym].tz) || 0; },
    meta(sym) { return this._meta[sym] || {}; },
    check() {
      if (location.protocol === 'file:') {
        const e = new Error('주식 데이터는 start.bat(로컬 서버)으로 실행했을 때만 됩니다'); e.noServer = true; throw e;
      }
    },
    async chart(sym, iv, q) {
      this.check();
      let j;
      try { j = await getJSON('/api/chart?symbol=' + encodeURIComponent(sym) + '&interval=' + this.native[iv] + q); }
      catch (e) {
        if (e.status === 404 || e.status === 501 || e.net) { const er = new Error('로컬 서버(start.bat)가 필요합니다'); er.noServer = true; throw er; }
        throw e;
      }
      const r = j.chart && j.chart.result && j.chart.result[0];
      if (!r) throw new Error((j.chart && j.chart.error && j.chart.error.description) || '데이터 없음');
      const m = r.meta || {};
      const tz = (m.gmtoffset || 0) * 1000;
      this._meta[sym] = {
        prec: m.priceHint != null ? m.priceHint : undefined, tz,
        name: m.longName || m.shortName || sym, cur: m.currency, ex: m.fullExchangeName || m.exchangeName,
      };
      const ts = r.timestamp || [];
      const qd = (r.indicators && r.indicators.quote && r.indicators.quote[0]) || {};
      const ms = U.IV[iv];
      const daily = ms >= 864e5;
      let bars = [];
      for (let i = 0; i < ts.length; i++) {
        const o = qd.open[i], h = qd.high[i], l = qd.low[i], c = qd.close[i];
        if (o == null || h == null || l == null || c == null) continue;
        let t = ts[i] * 1000;
        if (daily) t = U.barStart(t, iv, tz);
        bars.push({ t, o, h, l, c, v: qd.volume ? qd.volume[i] || 0 : 0 });
      }
      // 마지막 봉 시각 보정 + 중복 병합
      if (!daily && bars.length >= 2) {
        const a = bars[bars.length - 2], b = bars[bars.length - 1];
        const d = b.t - a.t;
        if (d % ms !== 0) b.t = a.t + Math.max(0, Math.floor(d / ms)) * ms;
      }
      const out = [];
      for (const b of bars) {
        const p = out[out.length - 1];
        if (p && b.t <= p.t) { if (b.t === p.t) { p.h = Math.max(p.h, b.h); p.l = Math.min(p.l, b.l); p.c = b.c; p.v = Math.max(p.v, b.v); } continue; }
        out.push(b);
      }
      return out;
    },
    async fetch(sym, iv, opt) {
      opt = opt || {};
      if (opt.end) {
        const sp = this.span[iv];
        if (!sp) return [];
        const p2 = Math.floor(opt.end / 1000) - 1;
        const lim = { '1m': 29 * 864e2, '5m': 59 * 864e2, '15m': 59 * 864e2, '30m': 59 * 864e2, '1h': 729 * 864e2 }[iv];
        if (Date.now() / 1000 - p2 > lim) return [];
        const p1 = Math.max(p2 - sp, Math.floor(Date.now() / 1000 - lim));
        if (p1 >= p2) return [];
        return (await this.chart(sym, iv, '&period1=' + p1 + '&period2=' + p2)).filter((b) => b.t < opt.end);
      }
      // range=max 는 야후가 월봉으로 낮춰 버리므로 일·주·월봉은 period1=0 으로 전체 기간 요청
      if (U.IV[iv] >= 864e5) return this.chart(sym, iv, '&period1=0&period2=' + (Math.ceil(Date.now() / 36e5) * 3600 + 86400));
      return this.chart(sym, iv, '&range=' + this.range[iv]);
    },
    subscribe(sym, iv, cb, status, ctx) {
      const self = this;
      let stop = false;
      const target = ctx && ctx.target;
      const tick = async () => {
        if (stop) return;
        try {
          let b = await self.chart(sym, iv, '&range=' + self.poll[iv]);
          if (target) b = U.resample(b, target, self.tz(sym));
          for (const x of b.slice(-3)) cb(x);
          status && status('poll');
        } catch (e) { status && status('error'); }
      };
      const id = setInterval(tick, 20000);
      status && status('poll');
      return () => { stop = true; clearInterval(id); };
    },
    async search(q) {
      this.check();
      const j = await getJSON('/api/search?q=' + encodeURIComponent(q));
      return (j.items || []).map((x) => Object.assign({ source: 'stock' }, x));
    },
    async quotes(syms) {
      if (!syms.length || location.protocol === 'file:') return {};
      try { return (await getJSON('/api/quote?symbols=' + syms.map(encodeURIComponent).join(','))).quotes || {}; }
      catch (e) { return {}; }
    },
  };

  /* ================= CSV ================= */
  P.csv = {
    id: 'csv', name: 'CSV 파일', short: 'CSV', kind: 'file', more: false, sets: {},
    native: {}, base: {},
    tz: () => -new Date().getTimezoneOffset() * 60000,
    get(sym) {
      if (!this.sets[sym]) { const s = U.load('csv.' + sym, null); if (s) this.sets[sym] = s; }
      return this.sets[sym];
    },
    supports(sym, iv) { const s = this.get(sym); return !!s && U.IV[iv] >= U.IV[s.iv]; },
    async fetch(sym, iv) {
      const s = this.get(sym);
      if (!s) throw new Error('CSV 데이터가 없습니다. 다시 불러오세요');
      if (iv === s.iv) return s.bars.map((b) => Object.assign({}, b));
      return U.resample(s.bars, iv, this.tz());
    },
    subscribe() { return () => {}; },
    add(name, bars, iv) {
      this.sets[name] = { bars, iv };
      const ok = U.save('csv.' + name, { bars, iv });
      const names = U.load('csvNames', []);
      if (names.indexOf(name) < 0) { names.push(name); U.save('csvNames', names); }
      return ok;
    },
    async search(q) {
      const names = U.load('csvNames', []).concat(Object.keys(this.sets)).filter((v, i, a) => a.indexOf(v) === i);
      return names.filter((n) => !q || n.toLowerCase().includes(q.toLowerCase())).map((n) => ({ symbol: n, name: 'CSV · ' + ((this.get(n) || {}).iv || ''), source: 'csv', ex: 'CSV' }));
    },
    quotes() { return {}; },
  };
  Data.parseCSV = function (text) {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) throw new Error('행이 너무 적습니다');
    const delim = [',', ';', '\t'].map((d) => [d, lines[0].split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const split = (l) => l.split(delim).map((s) => s.trim().replace(/^"|"$/g, ''));
    let head = split(lines[0]);
    const hasHead = head.some((h) => h && isNaN(+h.replace(/,/g, '')) && !/^\d{4}[-./]\d/.test(h));
    const idx = { t: 0, o: 1, h: 2, l: 3, c: 4, v: 5 };
    if (hasHead) {
      const find = (re) => head.findIndex((h) => re.test(h.toLowerCase()));
      const m = {
        t: find(/^(time|date|datetime|timestamp|날짜|일자|시간|일시|date\/time)/),
        o: find(/^(open|시가|o)$/), h: find(/^(high|고가|h)$/), l: find(/^(low|저가|l)$/),
        c: find(/^(close|종가|c|현재가|price)$/), v: find(/^(volume|vol|거래량|v)$/),
      };
      if (m.c < 0) m.c = find(/close|종가/);
      for (const k in m) if (m[k] >= 0) idx[k] = m[k];
      if (m.v < 0) idx.v = -1;
    }
    const num = (s) => (s == null || s === '' ? NaN : +String(s).replace(/,/g, ''));
    const ptime = (s) => {
      if (/^\d+(\.\d+)?$/.test(s)) {
        const n = +s;
        if (s.length === 8) return new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)).getTime();
        if (n > 1e14) return n / 1000;
        if (n > 1e11) return n;
        return n * 1000;
      }
      const m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)).getTime();
      const d = Date.parse(s);
      return isNaN(d) ? NaN : d;
    };
    const bars = [];
    for (let i = hasHead ? 1 : 0; i < lines.length; i++) {
      const c = split(lines[i]);
      const b = { t: ptime(c[idx.t]), o: num(c[idx.o]), h: num(c[idx.h]), l: num(c[idx.l]), c: num(c[idx.c]), v: idx.v >= 0 ? num(c[idx.v]) || 0 : 0 };
      if (!isFinite(b.t) || !isFinite(b.c)) continue;
      if (!isFinite(b.o)) b.o = b.c;
      if (!isFinite(b.h)) b.h = Math.max(b.o, b.c);
      if (!isFinite(b.l)) b.l = Math.min(b.o, b.c);
      bars.push(b);
    }
    bars.sort((a, b) => a.t - b.t);
    const out = bars.filter((b, i) => i === 0 || b.t !== bars[i - 1].t);
    if (out.length < 2) throw new Error('읽을 수 있는 봉이 없습니다');
    const diffs = [];
    for (let i = 1; i < Math.min(out.length, 400); i++) diffs.push(out[i].t - out[i - 1].t);
    diffs.sort((a, b) => a - b);
    const med = diffs[diffs.length >> 1];
    let iv = '1D', best = Infinity;
    for (const k of U.IV_ORDER) { const r = Math.abs(Math.log(U.IV[k] / med)); if (r < best) { best = r; iv = k; } }
    if (iv === '3D' && med < 2.5 * 864e5) iv = '1D';
    return { bars: out, iv };
  };

  /* ================= 데모 (오프라인) ================= */
  P.demo = {
    id: 'demo', name: '데모(가상)', short: 'DEMO', kind: 'demo', more: false,
    native: Object.fromEntries(U.IV_ORDER.map((k) => [k, k])), base: {}, tz: () => 0,
    gen(sym, iv) {
      const ms = U.IV[iv], n = 1500;
      const rnd = U.rng(sym + iv);
      const end = U.barStart(Date.now(), iv, 0);
      let p = 100 + rnd() * 50;
      const out = [];
      let trend = 0;
      for (let i = n - 1; i >= 0; i--) {
        if (rnd() < 0.03) trend = (rnd() - 0.5) * 0.004;
        const o = p;
        const ch = trend + (rnd() - 0.5) * 0.02 * Math.sqrt(ms / 36e5) ** 0.5;
        const c = Math.max(1, o * (1 + ch));
        const h = Math.max(o, c) * (1 + rnd() * 0.006);
        const l = Math.min(o, c) * (1 - rnd() * 0.006);
        out.push({ t: end - i * ms, o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2), v: Math.round(1000 + rnd() * 9000 * (1 + Math.abs(ch) * 60)) });
        p = c;
      }
      return out;
    },
    async fetch(sym, iv) { return this.gen(sym, iv); },
    subscribe(sym, iv, cb, status, ctx) {
      let cur = ctx && ctx.last ? Object.assign({}, ctx.last) : null;
      status && status('live');
      const id = setInterval(() => {
        if (!cur) return;
        const t = U.barStart(Date.now(), iv, 0);
        const ch = (Math.random() - 0.5) * 0.002;
        if (t > cur.t) cur = { t, o: cur.c, h: cur.c, l: cur.c, c: cur.c, v: 0 };
        const c = +(cur.c * (1 + ch)).toFixed(2);
        cur.c = c; cur.h = Math.max(cur.h, c); cur.l = Math.min(cur.l, c); cur.v += Math.round(Math.random() * 50);
        cb(Object.assign({}, cur));
      }, 1000);
      return () => clearInterval(id);
    },
    async search(q) { return ['DEMO', 'DEMO-A', 'DEMO-B'].filter((s) => !q || s.includes(q.toUpperCase())).map((s) => ({ symbol: s, name: '가상 데이터', source: 'demo', ex: 'DEMO' })); },
    quotes() { return {}; },
  };

  /* ================= 공통 API ================= */
  Data.get = (id) => P[id];
  Data.supports = function (src, iv, sym) {
    const p = P[src];
    if (!p) return false;
    if (p.supports) return p.supports(sym, iv);
    return !!(p.native[iv] || p.base[iv]);
  };
  Data.load = async function (src, sym, iv) {
    const p = P[src];
    if (!p) throw new Error('알 수 없는 소스: ' + src);
    if (src === 'csv' || p.native[iv]) {
      const bars = await p.fetch(sym, iv);
      return { bars };
    }
    const b = p.base[iv];
    if (!b) throw new Error(p.name + '에서 지원하지 않는 주기');
    const base = await p.fetch(sym, b);
    return { bars: U.resample(base, iv, p.tz(sym)), baseBars: base, baseIv: b };
  };
  Data.loadBefore = async function (src, sym, iv, firstT) {
    const p = P[src];
    if (!p || !p.more) return [];
    const b = p.native[iv] ? iv : p.base[iv];
    const bars = await p.fetch(sym, b, { end: firstT });
    if (b === iv) return bars.filter((x) => x.t < firstT);
    return U.resample(bars, iv, p.tz(sym)).filter((x) => x.t < firstT);
  };
  Data.subscribe = function (src, sym, iv, cb, status, ctx) {
    const p = P[src];
    if (!p) return () => {};
    ctx = ctx || {};
    if (src === 'upbit' || src === 'demo' || src === 'csv' || p.native[iv]) return p.subscribe(sym, iv, cb, status, ctx);
    const b = p.base[iv];
    if (src === 'stock') return p.subscribe(sym, b, cb, status, { target: iv });
    const agg = new U.LiveAgg(iv, p.tz(sym), ctx.baseBars ? ctx.baseBars.slice(-200) : null);
    return p.subscribe(sym, b, (bar) => { const r = agg.push(bar); if (r) cb(r); }, status, ctx);
  };
  Data.search = async function (src, q) {
    const p = P[src];
    if (!p) return [];
    return p.search(q);
  };
  Data.quotes = async function (src, syms) {
    const p = P[src];
    if (!p || !p.quotes) return {};
    return p.quotes(syms);
  };
})();
