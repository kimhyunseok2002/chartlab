/* ChartLab — icons.js : SVG 아이콘 (28×28) */
(function () {
  'use strict';
  const CL = (window.CL = window.CL || {});
  function svg(spec) {
    let inner = '';
    for (let p of spec.split('|')) {
      p = p.trim();
      if (!p) continue;
      const head = p[0], rest = p.slice(1).trim();
      if (head === 'c') { const [x, y, r] = rest.split(/\s+/).map(Number); inner += '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 1.9) + '"/>'; }
      else if (head === 'o') { const [x, y, r] = rest.split(/\s+/).map(Number); inner += '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 1.6) + '" fill="currentColor" stroke="none"/>'; }
      else if (head === 'f') inner += '<path d="' + rest + '" fill="currentColor" stroke="none"/>';
      else if (head === 'a') inner += '<path d="' + rest + '" fill="currentColor" fill-opacity=".25" stroke="none"/>';
      else if (head === 'd') inner += '<path d="' + rest + '" stroke-dasharray="2 2.2"/>';
      else if (head === 't') { const m = rest.match(/^(\S+)\s+(\S+)\s+(.*)$/); inner += '<text x="' + m[1] + '" y="' + m[2] + '" font-size="8.5" fill="currentColor" stroke="none" text-anchor="middle" font-family="sans-serif" font-weight="700">' + m[3] + '</text>'; }
      else inner += '<path d="' + p + '"/>';
    }
    return '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  CL.svg = svg;
  const S = {
    // 커서/기본
    cross: 'M14 4v20|M4 14h20', dot: 'o14 14 2.6', arrowCur: 'f M9 4 L9 21 L13 17 L16 23.5 L18.4 22.4 L15.5 16.2 L20.5 16 Z',
    eraser: 'M8 20 L16 12 L22 18 L16.5 23.5 H11.5 Z|M12.5 16 L18 21.5|M5 23.5 H23',
    measure: 'M4 19 L19 4 L24 9 L9 24 Z|M8 15 L10.5 17.5|M11 12 L14 15|M14 9 L16.5 11.5|M17 6 L20 9',
    zoom: 'c12 12 7|M17.2 17.2 L24 24|M9 12h6|M12 9v6',
    magnet: 'M7 5 V14 A7 7 0 0 0 21 14 V5 H17 V14 A3 3 0 0 1 11 14 V5 Z|M7 9h4|M17 9h4',
    stay: 'M6 22 L7.8 16.4 L19 5.2 L22.8 9 L11.6 20.2 Z|M16.6 7.6 L20.4 11.4|M5 25 H14',
    lock: 'M8 13H20V23.5H8Z|M10.5 13V9.5 A3.5 3.5 0 0 1 17.5 9.5 V13|o14 18 1.3', unlock: 'M8 13H20V23.5H8Z|M10.5 13V9.5 A3.5 3.5 0 0 1 17.5 9.5|o14 18 1.3',
    eye: 'M3 14 C7 7.5 21 7.5 25 14 C21 20.5 7 20.5 3 14 Z|c14 14 3.2', eyeOff: 'M3 14 C7 7.5 21 7.5 25 14 C21 20.5 7 20.5 3 14 Z|c14 14 3.2|M5 5 L23 23',
    trash: 'M6 8H22|M11 8V5H17V8|M8 8 L9 23.5 H19 L20 8|M12 12V19.5|M16 12V19.5',
    tree: 'M5 6h5|M5 6v14|M5 13h5|M5 20h5|M13 6h10|M13 13h10|M13 20h10',
    gear: 'c14 14 3.4|M14 4v3.2|M14 20.8V24|M4 14h3.2|M20.8 14H24|M6.9 6.9l2.3 2.3|M18.8 18.8l2.3 2.3|M6.9 21.1l2.3-2.3|M18.8 9.2l2.3-2.3',
    close: 'M8 8L20 20|M20 8L8 20', up: 'M8 17L14 11L20 17', down: 'M8 11L14 17L20 11', plus: 'M14 6V22|M6 14H22',
    undo: 'M9 10H17 A5.5 5.5 0 0 1 17 21 H10|M12.5 6.5 L9 10 L12.5 13.5', redo: 'M19 10H11 A5.5 5.5 0 0 0 11 21 H18|M15.5 6.5 L19 10 L15.5 13.5',
    camera: 'M4 9H9.2L11 6H17L18.8 9H24V22H4Z|c14 15 4', ind: 'M4 20 L9 12 L13 16 L19 7 L24 11|M4 24H24',
    layout: 'M4 5H24V23H4Z|M14 5V23|M4 14H24', replay: 'f M13 7 L5 14 L13 21 Z|f M22 7 L14 14 L22 21 Z',
    bell: 'M9 19V13 A5 5 0 0 1 19 13 V19 L21 21 H7 Z|M12 23.2 A2 2 0 0 0 16 23.2', search: 'c12 12 6.5|M17 17 L23.5 23.5',
    full: 'M4 10V4H10|M18 4H24V10|M24 18V24H18|M10 24H4V18', moon: 'M19 18.5 A8 8 0 1 1 11 5.5 A6.2 6.2 0 0 0 19 18.5 Z',
    save: 'M5 5H20L23 8V23H5Z|M9 5V11H18V5|M9 23V16H19V23', folder: 'M4 8H11L13 10H24V22H4Z', file: 'M7 4H17L22 9V24H7Z|M17 4V9H22',
    list: 'M9 7H23|M9 14H23|M9 21H23|o5 7 1.2|o5 14 1.2|o5 21 1.2', play: 'f M9 6 L22 14 L9 22 Z', pause: 'f M8 6H12V22H8Z|f M16 6H20V22H16Z',
    step: 'f M7 6 L17 14 L7 22 Z|f M19 6H22V22H19Z', stop: 'f M8 8H20V20H8Z', clone: 'M9 9H22V22H9Z|M6 18V6H18', front: 'M5 11H17V23H5Z|aM10 5H23V17H10Z|M10 5H23V17H10Z',
    back: 'aM5 11H17V23H5Z|M5 11H17V23H5Z|M10 5H23V17H10Z', text2: 'M8 7H20|M14 7V22', copy: 'M9 9H22V22H9Z|M6 18V6H18',
    // 차트 유형
    candle: 'M9 5V23|f M7 9H11V18H7Z|M19 4V20|M17 7H21V15H17Z', hollow: 'M9 5V23|M7 9H11V18H7Z|M19 4V20|f M17 7H21V15H17Z',
    bar: 'M9 5V22|M6 8H9|M9 18H12|M19 6V21|M16 16H19|M19 9H22', line: 'M4 20L10 12L15 16L24 6',
    area: 'aM4 20L10 12L15 16L24 6V24H4Z|M4 20L10 12L15 16L24 6', ha: 'M9 6V22|f M7 9H11V17H7Z|M19 5V21|f M17 8H21V16H17Z|t14 27 HA',
    // 선
    trendline: 'M6 22 L22 6|c6 22|c22 6', ray: 'M6 22 L24.5 3.5|c6 22|c13 15', infoline: 'M5 21L16 10|c5 21|c16 10|M17 16h7|M17 19h6|M17 22h7',
    extended: 'M2 26 L26 2|c10 18|c18 10', trendangle: 'M5 22 L21 8|M5 22 H23|M12 22 A7 7 0 0 0 10.4 17.6|c21 8',
    hline: 'M3 14 H25|c14 14', hray: 'M9 14 H26|c9 14', vline: 'M14 3 V25|c14 14', crossline: 'M14 3 V25|M3 14 H25|c14 14',
    channel: 'M4 17 L20 5|M8 24 L24 12|d M6 20.5 L22 8.5', regression: 'M4 20 L24 9|d M4 15 L24 4|d M4 25 L24 14',
    flattop: 'M4 22 L24 13|M4 8 H24|c4 22|c24 13', disjoint: 'M4 12 L24 5|M4 16 L24 23',
    pitchfork: 'M3 21L13 14|M10 9L16 19|M10 9L25 5|M13 14L25 9.5|M16 19L25 14|c3 21', schiff: 'M3 16L13 14|M10 9L16 19|M10 9L25 5|M13 14L25 9.5|M16 19L25 14|t6 26 S',
    modschiff: 'M6 14L13 14|M10 9L16 19|M10 9L25 5|M13 14L25 9.5|M16 19L25 14|t6 26 M',
    // 피보나치/간
    fibret: 'M4 6H24|M4 10.5H24|M4 14H24|M4 18H24|M4 22H24|d M6 22 L22 6', fibext: 'M12 6H25|M12 11H25|M12 16H25|d M3 24 L8 13 L12 20',
    fibchannel: 'M3 11 L17 4|M5 17 L21 9|M7 23 L25 14', fibtime: 'M5 4V24|M8 4V24|M11 4V24|M16 4V24|M24 4V24',
    fibfan: 'M4 24 L24 4|M4 24 L24 10|M4 24 L24 16|M4 24 L24 21', fibtrendtime: 'd M3 20 L8 10 L13 18|M16 4V24|M20 4V24|M25 4V24',
    fibcircles: 'c14 14 3|c14 14 6.5|c14 14 10', fibspiral: 'M14 14 a2 2 0 0 1 2 2 a4 4 0 0 1 -4 4 a6 6 0 0 1 -6 -6 a8 8 0 0 1 8 -8 a10 10 0 0 1 10 10',
    fibarcs: 'M4 22 A10 10 0 0 1 24 22|M8 22 A6 6 0 0 1 20 22|M11 22 A3 3 0 0 1 17 22|d M4 22 H24', fibwedge: 'M5 23 L23 9|M5 23 L24 20|M15 15.5 A12 12 0 0 1 17 21.5|M20 12 A17 17 0 0 1 22.5 21',
    pitchfan: 'M4 22 L24 4|M4 22 L24 10|M4 22 L24 16|M20 3.5 L22.5 17', gannbox: 'M4 6H24V22H4Z|M4 14H24|M14 6V22|M4 10H24|M9 6V22',
    gannsquare: 'M4 6H22V24H4Z|M4 24L22 6|M4 24L22 15|M4 24L13 6', gannfan: 'M4 24L24 4|M4 24L24 12|M4 24L12 4|M4 24L24 18|M4 24L18 4',
    // 패턴
    xabcd: 'M3 20L8 6L13 16L19 9L25 22|d M3 20 L13 16|d M8 6 L19 9', cypher: 'M3 18L9 6L13 14L20 4L25 20|d M3 18 L13 14',
    hs: 'M2 20L6 13L10 17L14 6L18 17L22 13L26 20|d M2 17 H26', abcd: 'M4 22L10 8L17 16L24 4|c4 22|c24 4',
    trianglepat: 'M3 6L8 20L13 9L18 17|d M3 6 L24 13|d M8 20 L24 13', threedrives: 'M2 22L6 14L9 18L14 9L17 13L22 4L25 8',
    elliott5: 'M2 22L6 14L9 18L15 6L18 12L25 3|t6 11 1|t15 4.5 3|t25 2 5', elliottabc: 'M3 6L11 20L16 12L25 24|t11 26 A|t16 9 B',
    elliotttri: 'M2 6L7 22L12 9L17 19L21 12L25 16', elliottwxy: 'M3 5L10 18L15 11L25 24|t10 25 W', elliottwxyxz: 'M2 4L7 15L11 10L15 20L19 14L25 25',
    cyclic: 'M5 6V24|M12 6V24|M19 6V24|M26 6V24|d M5 15 H26', timecycles: 'M2 20 A5 5 0 0 1 12 20|M12 20 A5 5 0 0 1 22 20|M22 20 A2 2 0 0 1 26 20|d M2 20H26',
    sine: 'M2 14 C6 4 8 4 10 14 S14 24 18 14 S22 4 26 14',
    // 예측/측정
    longpos: 'M5 5H23V23H5Z|aM5 5H23V14H5Z|M5 14H23|M14 7.5L11.5 10M14 7.5L16.5 10M14 7.5V12', shortpos: 'M5 5H23V23H5Z|aM5 14H23V23H5Z|M5 14H23|M14 20.5L11.5 18M14 20.5L16.5 18M14 20.5V16',
    forecast: 'c5 20|d M6.5 18.8 L20 9|c22 7.5 3', barspattern: 'M6 8V18|M10 6V16|M14 10V22|M18 7V15|M22 9V19|d M3 24.5 H25',
    ghostfeed: 'd M3 20 L12 10 L25 16|M8 13V20|M12 7V14|M17 10V17|M21 12V19', daterange: 'M5 6V22|M23 6V22|M5 14H23|M20 11L23 14L20 17',
    pricerange: 'M6 5H22|M6 23H22|M14 5V23|M11 20L14 23L17 20', dprange: 'M5 5H23V23H5Z|M14 8V20|M8 14H20|M11 11L14 8L17 11|M17 17L20 14L17 11',
    avwap: 'c5 20|M6.5 19 C10 12 14 18 18 11 S23 8 25 6', fixedvp: 'M5 5V23|M23 5V23|M5 8H13|M5 11H17|M5 14H21|M5 17H15|M5 20H10',
    anchoredvp: 'M5 5V23|M5 8H12|M5 11H16|M5 14H20|M5 17H14|M5 20H9|c5 23',
    // 도형
    brush: 'M5 22 C9 14 12 20 15 13 S21 6 24 8', highlighter: 'M7.5 20.5 L18 10 L21.5 13.5 L11 24 Z|M5 25H12|M15.5 12.5L19 16',
    arrowmarker: 'f M4 19 L15.5 12.5 L14.5 9 L24 6 L19.5 15 L17.5 13.5 L5.5 21.5 Z', arrow: 'M5 23 L22 6|M14 6H22V14',
    arrowup: 'f M14 5 L21 13 H17 V23 H11 V13 H7 Z', arrowdown: 'f M14 23 L21 15 H17 V5 H11 V15 H7 Z',
    arrowleft: 'f M5 14 L13 7 V11 H23 V17 H13 V21 Z', arrowright: 'f M23 14 L15 7 V11 H5 V17 H15 V21 Z',
    rect: 'M5 7H23V21H5Z', rotrect: 'M9 4 L24 10 L19 24 L4 18 Z', path: 'M4 22 L10 10 L17 18 L24 6|M19 6H24V11', circle: 'c14 14 9',
    ellipse: 'M3 14 A11 7 0 1 0 25 14 A11 7 0 1 0 3 14', polyline: 'M5 20 L9 6 L20 9 L24 21 L13 24 Z', triangle: 'M14 5 L24 22 H4 Z',
    arc: 'M4 21 Q14 1 24 21', curve: 'M4 22 Q8 4 24 8', dcurve: 'M4 22 C8 4 20 24 24 6',
    // 주석
    text: 'M8 7H20|M14 7V22|M11 22H17', atext: 'M9 8H21|M15 8V22|M12 22H18|M3 3H8|M3 3V8', note: 'M6 5H22V18L17 23H6Z|M17 23V18H22|M10 10H18|M10 14H16',
    anote: 'M8 7H23V19L18.5 23.5H8Z|M11 11H19|M11 15H17|M3 3H7|M3 3V7', callout: 'M4 5H24V17H13L8 23V17H4Z|M8 9H20|M8 13H16',
    comment: 'M5 6H23V18H11L6 23V18H5Z|M9 11H19|M9 14H16', pricelabel: 'M4 14 L9 9 H24 V19 H9 Z|M13 14H20', pricenote: 'c5 22|M6.5 20.5 L15 12|M15 9H25V15H15Z',
    signpost: 'M14 26V12|M8 4.5H20V12H8Z', flag: 'M7 25V4|f M7 4 L21 8 L7 13 Z', emoji: 'c14 14 9.5|M10 17 Q14 21 18 17|o11 11.5 1.2|o17 11.5 1.2',
  };
  const ICON = (CL.ICON = {});
  for (const k in S) ICON[k] = svg(S[k]);
  ICON.arrowCurFix = ICON.arrowCur;
})();
