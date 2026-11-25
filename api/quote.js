'use strict';
const { yahoo, send, chartPath, SYM_RE } = require('./_lib');

async function one(s) {
  const r = await yahoo(chartPath(s, 'interval=1d&range=5d'));
  try {
    const res = JSON.parse(r.text).chart.result[0];
    const last = res.meta.regularMarketPrice;
    if (last == null) return null;
    // 전일 종가 = 마지막 봉(오늘/최근 거래일) 바로 앞의 확정 종가
    const close = (res.indicators && res.indicators.quote && res.indicators.quote[0].close) || [];
    let prev = null;
    for (let i = close.length - 2; i >= 0; i--) if (close[i] != null) { prev = close[i]; break; }
    if (prev == null) prev = res.meta.previousClose || res.meta.chartPreviousClose;
    return { last, chg: prev ? ((last - prev) / prev) * 100 : null };
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  const syms = String((req.query && req.query.symbols) || '').split(',').filter((s) => SYM_RE.test(s)).slice(0, 40);
  const vals = await Promise.all(syms.map(one));
  const quotes = {};
  syms.forEach((s, i) => { if (vals[i]) quotes[s] = vals[i]; });
  send(res, { quotes }, 15);
};
