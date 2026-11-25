'use strict';
const { yahoo, send, chartPath, fillLastDaily, SYM_RE, INTERVALS, RANGES } = require('./_lib');

module.exports = async (req, res) => {
  const q = req.query || {};
  const sym = String(q.symbol || '');
  const iv = String(q.interval || '1d');
  const fail = (msg) => send(res, { chart: { result: null, error: { description: msg } } }, 0);
  if (!SYM_RE.test(sym) || !INTERVALS.has(iv)) return fail('잘못된 종목/주기');
  const p = new URLSearchParams({ interval: iv, includePrePost: 'false', events: 'div,splits' });
  let maxAge;
  if (q.period1 != null && q.period2 != null) {
    const a = parseInt(q.period1, 10), b = parseInt(q.period2, 10);
    if (!isFinite(a) || !isFinite(b)) return fail('잘못된 기간');
    p.set('period1', String(a));
    p.set('period2', String(b));
    maxAge = 60;
  } else {
    const rg = RANGES.has(String(q.range)) ? String(q.range) : '1y';
    p.set('range', rg);
    maxAge = rg === '1d' || rg === '5d' ? 8 : 45;
  }
  const r = await yahoo(chartPath(sym, p.toString()));
  let j;
  try { j = JSON.parse(r.text); } catch (e) { return fail('야후 응답 오류 (HTTP ' + r.status + ')'); }
  if (r.status !== 200 && !(j.chart && j.chart.error)) return fail('야후 응답 오류 (HTTP ' + r.status + ')');
  if (r.status === 200 && iv === '1d') { try { await fillLastDaily(sym, j); } catch (e) { /* 무시 */ } }
  send(res, j, r.status === 200 ? maxAge : 0);
};
