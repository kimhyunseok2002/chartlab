'use strict';
// 업비트 시세 API 프록시: 업비트는 웹사이트 출처(Origin)에서 온 브라우저 요청을 강하게 제한하므로
// 배포 사이트에서는 서버에서 대신 받아 준다. 공개 시세 경로만 허용 (주문·계정 API는 불가).
const { get } = require('./_lib');

const OK = /^\/(candles\/(minutes\/(1|3|5|10|15|30|60|240)|days|weeks|months)|market\/all|ticker|ticker\/all)(\?[A-Za-z0-9_=&%:.,+-]*)?$/;

module.exports = async (req, res) => {
  const p = String((req.query && req.query.p) || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!OK.test(p)) { res.setHeader('Cache-Control', 'no-store'); res.status(400).send('{"error":"bad path"}'); return; }
  const r = await get('https://api.upbit.com/v1' + p, 8000);
  const ttl = p.startsWith('/market/all') ? 3600 : p.startsWith('/ticker/all') ? 30 : /[?&]to=/.test(p) ? 300 : 2;
  res.setHeader('Cache-Control', r.status === 200 ? 'public, max-age=0, s-maxage=' + ttl + ', stale-while-revalidate=' + ttl : 'no-store');
  res.status(r.status === 599 ? 502 : r.status).send(r.text);
};
