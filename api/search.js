'use strict';
const { get, yahoo, send, naverMap } = require('./_lib');

module.exports = async (req, res) => {
  const q = String((req.query && req.query.q) || '').trim().slice(0, 40);
  if (!q) return send(res, { items: [] }, 60);
  const out = [], seen = new Set();
  const add = (r) => { if (r && r[0] && !seen.has(r[0])) { seen.add(r[0]); out.push({ symbol: r[0], name: r[1], ex: r[2] }); } };
  const nav = (async () => {
    const r = await get('https://ac.stock.naver.com/ac?' + new URLSearchParams({ q, target: 'stock,index,etf' }));
    if (r.status !== 200) return [];
    try { return (JSON.parse(r.text).items || []).map(naverMap).filter(Boolean); } catch (e) { return []; }
  })();
  const hangul = /[ㄱ-ㆎ가-힣]/.test(q);
  const yh = hangul ? Promise.resolve([]) : (async () => {
    const r = await yahoo('/v1/finance/search?' + new URLSearchParams({ q, quotesCount: '12', newsCount: '0', listsCount: '0' }));
    if (r.status !== 200) return [];
    try {
      return (JSON.parse(r.text).quotes || []).filter((it) => it.symbol && it.quoteType !== 'OPTION')
        .map((it) => [it.symbol, it.shortname || it.longname || it.symbol, it.exchDisp || it.exchange || '']);
    } catch (e) { return []; }
  })();
  const [a, b] = await Promise.all([nav, yh]);
  a.forEach(add);
  b.forEach(add);
  send(res, { items: out.slice(0, 30) }, 300);
};
