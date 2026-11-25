'use strict';
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(JSON.stringify({ ok: true, app: 'chartlab', v: 1, host: 'vercel' }));
};
