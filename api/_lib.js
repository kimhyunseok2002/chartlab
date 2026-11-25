// ChartLab — Vercel 서버리스 공용 모듈 (로컬 server.py와 같은 응답 형식)
'use strict';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const YH = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const SYM_RE = /^[A-Za-z0-9.\-^=_&]{1,32}$/;
const INTERVALS = new Set(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);
const RANGES = new Set(['1d', '5d', '7d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max', '60d', '730d']);

async function get(url, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs || 9000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }, signal: ctl.signal });
    return { status: r.status, text: await r.text() };
  } catch (e) {
    return { status: 599, text: JSON.stringify({ error: String(e && e.message || e) }) };
  } finally {
    clearTimeout(t);
  }
}

async function yahoo(path) {
  let last = { status: 599, text: '{}' };
  for (const host of YH) {
    const r = await get(host + path);
    if (r.status === 200) return r;
    last = r;
    if (r.status === 404) break;
  }
  return last;
}

function send(res, obj, maxAge) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', maxAge ? 'public, max-age=0, s-maxage=' + maxAge + ', stale-while-revalidate=' + maxAge * 4 : 'no-store');
  res.status(200).send(JSON.stringify(obj));
}

const chartPath = (sym, qs) => '/v8/finance/chart/' + encodeURIComponent(sym) + '?' + qs;

/* 야후가 당일 일봉을 아직 확정하지 않아 OHLC가 비어 있으면 60분봉으로 다시 만든다 */
async function fillLastDaily(sym, j) {
  const r = j.chart.result[0];
  const ts = r.timestamp || [];
  const q = r.indicators.quote[0];
  const L = ts.length - 1;
  if (L < 0 || q.close[L] != null) return;
  const off = (r.meta && r.meta.gmtoffset) || 0;
  const day = Math.floor((ts[L] + off) / 86400);
  const h = await yahoo(chartPath(sym, 'interval=60m&range=5d'));
  if (h.status !== 200) return;
  const hr = JSON.parse(h.text).chart.result[0];
  const hq = hr.indicators.quote[0];
  const rows = (hr.timestamp || []).map((t, i) => i).filter((i) => Math.floor((hr.timestamp[i] + off) / 86400) === day && hq.close[i] != null);
  if (!rows.length) return;
  q.open[L] = hq.open[rows[0]];
  q.high[L] = Math.max(...rows.map((i) => hq.high[i]));
  q.low[L] = Math.min(...rows.map((i) => hq.low[i]));
  q.close[L] = hq.close[rows[rows.length - 1]];
  q.volume[L] = rows.reduce((s, i) => s + (hq.volume[i] || 0), 0);
}

function naverMap(it) {
  const code = it.code || '', tc = it.typeCode || '', nation = it.nationCode, name = it.name || code;
  if (it.category === 'index') {
    const m = { KOSPI: '^KS11', KOSDAQ: '^KQ11', KPI200: '^KS200' };
    return m[code] ? [m[code], name, '국내지수'] : null;
  }
  if (nation === 'KOR' || tc === 'KOSPI' || tc === 'KOSDAQ' || tc === 'KONEX') {
    if (!/^[0-9A-Z]{6}$/.test(code)) return null;
    return [code + (tc === 'KOSDAQ' ? '.KQ' : '.KS'), name, it.typeName || tc];
  }
  if (nation === 'USA') return [code.replace(/\./g, '-'), name, it.typeName || tc];
  const suf = { TOKYO: '.T', HONGKONG: '.HK', SHANGHAI: '.SS', SHENZHEN: '.SZ', LONDON: '.L', TAIWAN: '.TW' }[tc];
  if (suf) return [(suf === '.HK' ? code.padStart(4, '0') : code) + suf, name, it.typeName || tc];
  return null;
}

module.exports = { get, yahoo, send, chartPath, fillLastDaily, naverMap, SYM_RE, INTERVALS, RANGES };
