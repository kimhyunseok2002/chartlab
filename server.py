#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TradingHyun 로컬 서버

- 정적 파일(index.html, js, css) 제공
- 주식·지수 데이터 프록시: 야후 파이낸스 차트 API, 야후/네이버 종목 검색
  (브라우저에서 직접 부르면 CORS로 막히는 것들만 여기서 대신 받아 줍니다)
- 127.0.0.1에서만 열립니다 (외부 접속 불가)

실행: py -3 server.py            (기본 포트 8777, 브라우저 자동 열림)
옵션: --port 9000  --no-browser
"""
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
YH = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com']
CACHE = {}
LOCK = threading.Lock()
POOL = ThreadPoolExecutor(max_workers=8)

SYM_RE = re.compile(r'^[A-Za-z0-9.\-^=_&]{1,32}$')
INTERVALS = {'1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'}
RANGES = {'1d', '5d', '7d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max', '60d', '730d'}


def fetch(url, ttl=0, timeout=12):
    """URL을 받아 (status, bytes) 반환. ttl>0이면 성공 응답을 그 시간(초) 동안 캐시."""
    now = time.time()
    if ttl:
        with LOCK:
            c = CACHE.get(url)
            if c and now - c[0] < ttl:
                return c[1], c[2]
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json,text/plain,*/*', 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            status, body = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, body = e.code, e.read()
    except Exception as e:  # 네트워크 오류
        return 599, json.dumps({'error': str(e)}).encode()
    if ttl and status == 200:
        with LOCK:
            CACHE[url] = (now, status, body)
            if len(CACHE) > 400:
                for k in sorted(CACHE, key=lambda k: CACHE[k][0])[:100]:
                    CACHE.pop(k, None)
    return status, body


def yahoo(path, ttl):
    last = (599, b'{}')
    for host in YH:
        st, body = fetch(host + path, ttl)
        if st == 200:
            return st, body
        last = (st, body)
        if st == 404:
            break
    return last


def chart(q):
    sym = q.get('symbol', [''])[0]
    iv = q.get('interval', ['1d'])[0]
    if not SYM_RE.match(sym) or iv not in INTERVALS:
        return {'chart': {'result': None, 'error': {'description': '잘못된 종목/주기'}}}
    p = {'interval': iv, 'includePrePost': 'false', 'events': 'div,splits'}
    if 'period1' in q and 'period2' in q:
        try:
            p['period1'] = str(int(q['period1'][0]))
            p['period2'] = str(int(q['period2'][0]))
        except ValueError:
            return {'chart': {'result': None, 'error': {'description': '잘못된 기간'}}}
        ttl = 60
    else:
        rg = q.get('range', ['1y'])[0]
        if rg not in RANGES:
            rg = '1y'
        p['range'] = rg
        ttl = 8 if rg in ('1d', '5d') else 45
    st, body = yahoo('/v8/finance/chart/' + urllib.parse.quote(sym, safe='^=.-_') + '?' + urllib.parse.urlencode(p), ttl)
    try:
        j = json.loads(body.decode('utf-8'))
    except Exception:
        return {'chart': {'result': None, 'error': {'description': '야후 응답 오류 (HTTP %d)' % st}}}
    if st != 200 and not (j.get('chart') or {}).get('error'):
        return {'chart': {'result': None, 'error': {'description': '야후 응답 오류 (HTTP %d)' % st}}}
    if iv == '1d':
        try:
            fill_last_daily(sym, j)
        except Exception:
            pass
    return j


def fill_last_daily(sym, j):
    """야후가 당일 일봉을 아직 확정하지 않아 OHLC가 비어 있으면(국내 주식 장 마감 후 자주 발생) 1시간봉으로 다시 만든다."""
    r = j['chart']['result'][0]
    ts = r.get('timestamp') or []
    q = r['indicators']['quote'][0]
    if not ts or q['close'][-1] is not None:
        return
    off = (r.get('meta') or {}).get('gmtoffset', 0)
    day = (ts[-1] + off) // 86400
    st, body = yahoo('/v8/finance/chart/' + urllib.parse.quote(sym, safe='^=.-_') + '?interval=60m&range=5d', 30)
    if st != 200:
        return
    h = json.loads(body.decode('utf-8'))['chart']['result'][0]
    hq = h['indicators']['quote'][0]
    rows = [i for i, t in enumerate(h.get('timestamp') or []) if (t + off) // 86400 == day and hq['close'][i] is not None]
    if not rows:
        return
    q['open'][-1] = hq['open'][rows[0]]
    q['high'][-1] = max(hq['high'][i] for i in rows)
    q['low'][-1] = min(hq['low'][i] for i in rows)
    q['close'][-1] = hq['close'][rows[-1]]
    q['volume'][-1] = sum(hq['volume'][i] or 0 for i in rows)


def naver_map(it):
    code, tc, nation, cat = it.get('code', ''), it.get('typeCode', ''), it.get('nationCode'), it.get('category')
    name = it.get('name', code)
    if cat == 'index':
        m = {'KOSPI': '^KS11', 'KOSDAQ': '^KQ11', 'KPI200': '^KS200'}
        return (m[code], name, '국내지수') if code in m else None
    if nation == 'KOR' or tc in ('KOSPI', 'KOSDAQ', 'KONEX'):
        if not re.match(r'^[0-9A-Z]{6}$', code):
            return None
        suf = '.KQ' if tc == 'KOSDAQ' else '.KS'
        return (code + suf, name, it.get('typeName') or tc)
    if nation == 'USA':
        return (code.replace('.', '-'), name, it.get('typeName') or tc)
    suf = {'TOKYO': '.T', 'HONGKONG': '.HK', 'SHANGHAI': '.SS', 'SHENZHEN': '.SZ', 'LONDON': '.L', 'TAIWAN': '.TW'}.get(tc)
    if suf:
        c = code.zfill(4) if suf == '.HK' else code
        return (c + suf, name, it.get('typeName') or tc)
    return None


def search(q):
    q = q.strip()[:40]
    if not q:
        return {'items': []}
    out, seen = [], set()

    def add(sym, name, ex):
        if sym and sym not in seen:
            seen.add(sym)
            out.append({'symbol': sym, 'name': name, 'ex': ex})

    def nav():
        st, body = fetch('https://ac.stock.naver.com/ac?' + urllib.parse.urlencode({'q': q, 'target': 'stock,index,etf'}), 300)
        if st != 200:
            return []
        try:
            return [x for x in (naver_map(i) for i in json.loads(body.decode('utf-8')).get('items', [])) if x]
        except Exception:
            return []

    def yh():
        st, body = yahoo('/v1/finance/search?' + urllib.parse.urlencode({'q': q, 'quotesCount': 12, 'newsCount': 0, 'listsCount': 0}), 300)
        if st != 200:
            return []
        try:
            res = []
            for it in json.loads(body.decode('utf-8')).get('quotes', []):
                if it.get('quoteType') in ('OPTION',) or not it.get('symbol'):
                    continue
                res.append((it['symbol'], it.get('shortname') or it.get('longname') or it['symbol'], it.get('exchDisp') or it.get('exchange', '')))
            return res
        except Exception:
            return []

    hangul = re.search('[ㄱ-ㆎ가-힣]', q)
    fn = POOL.submit(nav)
    fy = None if hangul else POOL.submit(yh)
    for r in fn.result():
        add(*r)
    if fy:
        for r in fy.result():
            add(*r)
    return {'items': out[:30]}


def quote(syms):
    syms = [s for s in syms if SYM_RE.match(s)][:40]

    def one(s):
        st, body = yahoo('/v8/finance/chart/' + urllib.parse.quote(s, safe='^=.-_') + '?interval=1d&range=5d', 15)
        try:
            r = json.loads(body.decode('utf-8'))['chart']['result'][0]
            m = r['meta']
            last = m.get('regularMarketPrice')
            # 전일 종가 = 마지막 봉(오늘/최근 거래일) 바로 앞의 확정 종가 (당일 봉이 비어 있어도 올바르게)
            closes = ((r.get('indicators') or {}).get('quote') or [{}])[0].get('close') or []
            prev = next((c for c in reversed(closes[:-1]) if c is not None), None) or m.get('previousClose') or m.get('chartPreviousClose')
            if last is None:
                return s, None
            chg = (last - prev) / prev * 100 if prev else None
            reg = (m.get('currentTradingPeriod') or {}).get('regular') or {}
            now = time.time()
            return s, {
                'last': last, 'chg': chg, 'prev': prev,
                'high': m.get('regularMarketDayHigh'), 'low': m.get('regularMarketDayLow'), 'vol': m.get('regularMarketVolume'),
                'w52h': m.get('fiftyTwoWeekHigh'), 'w52l': m.get('fiftyTwoWeekLow'), 'cur': m.get('currency'),
                'name': m.get('longName') or m.get('shortName'), 'ex': m.get('fullExchangeName') or m.get('exchangeName'),
                'mopen': bool(reg.get('start') and reg.get('end') and reg['start'] <= now <= reg['end']),
            }
        except Exception:
            return s, None

    res = {}
    for s, v in POOL.map(one, syms):
        if v:
            res[s] = v
    return {'quotes': res}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        if args and len(args) > 1 and str(args[1])[:1] in ('4', '5') and '/favicon' not in str(args[0]):
            sys.stderr.write('[%s] %s\n' % (time.strftime('%H:%M:%S'), fmt % args))

    def end_headers(self):
        p = self.path.split('?')[0]
        if p == '/' or p.endswith(('.html', '.js', '.css')):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def send_json(self, obj, status=200):
        b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path.startswith('/api/'):
            q = urllib.parse.parse_qs(u.query)
            try:
                if u.path == '/api/ping':
                    return self.send_json({'ok': True, 'app': 'chartlab', 'v': 1})
                if u.path == '/api/chart':
                    return self.send_json(chart(q))
                if u.path == '/api/search':
                    return self.send_json(search(q.get('q', [''])[0]))
                if u.path == '/api/quote':
                    return self.send_json(quote([s for s in q.get('symbols', [''])[0].split(',') if s]))
                return self.send_json({'error': 'not found'}, 404)
            except Exception as e:  # 서버가 죽지 않도록
                return self.send_json({'error': str(e)}, 500)
        return super().do_GET()


def main():
    port = 8777
    browser = True
    args = sys.argv[1:]
    if '--port' in args:
        try:
            port = int(args[args.index('--port') + 1])
        except (IndexError, ValueError):
            pass
    if '--no-browser' in args:
        browser = False
    srv = None
    for p in range(port, port + 10):
        try:
            srv = ThreadingHTTPServer(('127.0.0.1', p), Handler)
            port = p
            break
        except OSError:
            try:  # 이미 ChartLab이 떠 있으면 그 창만 열기
                with urllib.request.urlopen('http://127.0.0.1:%d/api/ping' % p, timeout=1) as r:
                    if json.loads(r.read().decode()).get('app') == 'chartlab':
                        print('TradingHyun 이 이미 실행 중입니다: http://127.0.0.1:%d' % p)
                        if browser:
                            webbrowser.open('http://127.0.0.1:%d' % p)
                        return
            except Exception:
                pass
    if not srv:
        print('사용 가능한 포트가 없습니다 (%d~%d)' % (port, port + 9))
        sys.exit(1)
    url = 'http://127.0.0.1:%d' % port
    print('=' * 52)
    print('  TradingHyun 실행 중:  ' + url)
    print('  이 창을 닫으면 서버가 종료됩니다 (Ctrl+C)')
    print('=' * 52)
    if browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()


if __name__ == '__main__':
    main()
