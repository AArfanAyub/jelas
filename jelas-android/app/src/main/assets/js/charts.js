/* JELAS — charts. Every chart is hand-authored SVG. No chart library, no CDN.
 * Follows the "clear line" identity: hairlines, one accent, meaning-carrying colour.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmt(n) { return window.I18N.money(n); }
  function shortMoney(n) { return 'RM' + window.I18N.compact(n); }

  /* ---------- Flow bar (signature component) ---------- */
  function flowBar(inAmt, outAmt) {
    var total = Math.max(1, inAmt + outAmt);
    var inPct = (inAmt / total) * 100;
    var outPct = (outAmt / total) * 100;
    var w = 320, h = 34;
    return '' +
      '<svg class="chart flowbar" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' +
        '<rect x="0" y="10" width="' + w + '" height="14" rx="7" fill="var(--line)"/>' +
        '<rect class="flow-in" x="0" y="10" width="' + (inPct * w / 100).toFixed(2) + '" height="14" rx="7" fill="var(--in)"/>' +
        '<rect class="flow-out" x="' + (inPct * w / 100).toFixed(2) + '" y="10" width="' + (outPct * w / 100).toFixed(2) + '" height="14" rx="7" fill="var(--out)"/>' +
      '</svg>';
  }

  /* ---------- Donut ---------- */
  function donut(items, opts) {
    opts = opts || {};
    var size = opts.size || 168;
    var r = size / 2 - 16;
    var cx = size / 2, cy = size / 2;
    var stroke = opts.stroke || 18;
    var total = items.reduce(function (s, i) { return s + i.total; }, 0);
    if (total <= 0) {
      return '<div class="chart-empty">' + esc(opts.empty || '') + '</div>';
    }
    var circ = 2 * Math.PI * r;
    var off = 0;
    var segs = items.map(function (it) {
      var frac = it.total / total;
      var len = frac * circ;
      var seg = '<circle class="seg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" ' +
        'stroke="' + esc(it.color) + '" stroke-width="' + stroke + '" ' +
        'stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" ' +
        'stroke-dashoffset="' + (-off).toFixed(2) + '" ' +
        'transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(it.name) + ' · ' + fmt(it.total) + '</title></circle>';
      off += len;
      return seg;
    }).join('');
    return '<svg class="chart donut" viewBox="0 0 ' + size + ' ' + size + '" role="img">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '"/>' +
      segs + '</svg>';
  }

  /* ---------- Grouped bars (in vs out over buckets) ---------- */
  function bars(buckets, opts) {
    opts = opts || {};
    var w = opts.width || 320, h = opts.height || 150;
    var padB = 22, padT = 10;
    var max = 1;
    buckets.forEach(function (b) { max = Math.max(max, b.in || 0, b.out || 0); });
    var n = Math.max(1, buckets.length);
    var slot = w / n;
    var bw = Math.min(12, slot * 0.28);
    var chartH = h - padB - padT;
    var parts = [];
    buckets.forEach(function (b, i) {
      var cx = slot * i + slot / 2;
      var hi = ((b.in || 0) / max) * chartH;
      var ho = ((b.out || 0) / max) * chartH;
      parts.push('<rect class="bar-in" x="' + (cx - bw - 1).toFixed(1) + '" y="' + (padT + chartH - hi).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, hi).toFixed(1) + '" rx="2" fill="var(--in)"><title>' + esc(b.label) + ' in ' + fmt(b.in || 0) + '</title></rect>');
      parts.push('<rect class="bar-out" x="' + (cx + 1).toFixed(1) + '" y="' + (padT + chartH - ho).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, ho).toFixed(1) + '" rx="2" fill="var(--out)"><title>' + esc(b.label) + ' out ' + fmt(b.out || 0) + '</title></rect>');
      if (b.label && (n <= 8 || i % Math.ceil(n / 6) === 0)) {
        parts.push('<text x="' + cx.toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" class="axis">' + esc(b.label) + '</text>');
      }
    });
    parts.push('<line x1="0" y1="' + (padT + chartH) + '" x2="' + w + '" y2="' + (padT + chartH) + '" stroke="var(--line)" stroke-width="1"/>');
    return '<svg class="chart bars" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" role="img">' + parts.join('') + '</svg>';
  }

  /* ---------- Line / area trend ---------- */
  function line(points, opts) {
    opts = opts || {};
    var w = opts.width || 320, h = opts.height || 140;
    var padB = 20, padT = 10, padX = 6;
    if (!points.length) return '<div class="chart-empty">' + esc(opts.empty || '') + '</div>';
    var max = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([1]));
    var min = Math.min.apply(null, points.map(function (p) { return p.value; }).concat([0]));
    var range = Math.max(1, max - min);
    var chartH = h - padB - padT;
    var stepX = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;
    var coords = points.map(function (p, i) {
      var x = padX + stepX * i;
      var y = padT + chartH - ((p.value - min) / range) * chartH;
      return { x: x, y: y, p: p };
    });
    var d = coords.map(function (c, i) { return (i ? 'L' : 'M') + c.x.toFixed(1) + ' ' + c.y.toFixed(1); }).join(' ');
    var area = d + ' L' + (coords[coords.length - 1].x).toFixed(1) + ' ' + (padT + chartH) + ' L' + coords[0].x.toFixed(1) + ' ' + (padT + chartH) + ' Z';
    var dots = coords.map(function (c) {
      return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="2.6" fill="var(--surface)" stroke="var(--teal)" stroke-width="1.6"><title>' + esc(c.p.label) + ' · ' + fmt(c.p.value) + '</title></circle>';
    }).join('');
    var labels = coords.filter(function (c, i) {
      return i === 0 || i === coords.length - 1 || i % Math.max(1, Math.ceil(coords.length / 5)) === 0;
    }).map(function (c) {
      return '<text x="' + c.x.toFixed(1) + '" y="' + (h - 5) + '" text-anchor="middle" class="axis">' + esc(c.p.label) + '</text>';
    }).join('');
    return '<svg class="chart line" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' +
      '<path d="' + area + '" fill="var(--teal)" opacity="0.10"/>' +
      '<path d="' + d + '" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';
  }

  /* ---------- Calendar heatmap ---------- */
  function heatmap(year, month, values, opts) {
    opts = opts || {};
    var first = new Date(year, month, 1);
    var dim = new Date(year, month + 1, 0).getDate();
    var startWd = (first.getDay() + 6) % 7; // Monday first
    var cell = 30, gap = 5;
    var cols = 7;
    var rows = Math.ceil((startWd + dim) / cols);
    var w = cols * (cell + gap) - gap;
    var h = rows * (cell + gap) - gap;
    var max = 1;
    Object.keys(values).forEach(function (k) { max = Math.max(max, values[k]); });
    var parts = [];
    for (var i = 0; i < startWd; i++) { /* leading blanks */ }
    for (var d = 1; d <= dim; d++) {
      var idx = startWd + d - 1;
      var col = idx % cols, row = Math.floor(idx / cols);
      var x = col * (cell + gap), y = row * (cell + gap);
      var iso = year + '-' + (month + 1 < 10 ? '0' : '') + (month + 1) + '-' + (d < 10 ? '0' : '') + d;
      var v = values[iso] || 0;
      var t = v > 0 ? Math.max(0.14, v / max) : 0;
      var fill = v > 0 ? 'var(--out)' : 'var(--line)';
      var op = v > 0 ? (0.22 + t * 0.78).toFixed(2) : '0.5';
      parts.push('<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="6" fill="' + fill + '" opacity="' + op + '"><title>' + iso + (v ? ' · ' + fmt(v) : '') + '</title></rect>');
      parts.push('<text x="' + (x + cell / 2) + '" y="' + (y + cell / 2 + 4) + '" text-anchor="middle" class="heatnum" fill="' + (v > 0 && t > 0.5 ? '#fff' : 'var(--ink)') + '" opacity="' + (v > 0 ? 1 : 0.45) + '">' + d + '</text>');
    }
    return '<svg class="chart heat" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" role="img">' + parts.join('') + '</svg>';
  }

  /* ---------- Progress ring ---------- */
  function ring(pct, opts) {
    opts = opts || {};
    var size = opts.size || 72;
    var r = size / 2 - 6;
    var circ = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(1, (pct || 0) / 100));
    var col = opts.color || 'var(--teal)';
    // Fixed pixel size: the generic .chart rule would otherwise stretch it to 100%.
    var box = ' style="width:' + size + 'px;height:' + size + 'px"';
    var label = (opts.label === false) ? '' :
      '<text x="' + (size / 2) + '" y="' + (size / 2 + 4) + '" text-anchor="middle" class="ringpct"' +
      (opts.labelColor ? ' fill="' + opts.labelColor + '"' : '') + '>' + Math.round(pct || 0) + '%</text>';
    return '<svg class="chart ring" viewBox="0 0 ' + size + ' ' + size + '"' + box + ' role="img">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="6"/>' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="6" ' +
      'stroke-linecap="round" stroke-dasharray="' + (circ * p).toFixed(2) + ' ' + circ.toFixed(2) + '" ' +
      'transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')"/>' +
      label +
      '</svg>';
  }

  /* ---------- Money-flow (sources → accounts → uses) ---------- */
  function moneyFlow(sources, accounts, uses) {
    var w = 340, h = 200;
    var colW = 46, gap = 10;
    var x0 = 0, x1 = (w - colW) / 2, x2 = w - colW;

    /* Each column is scaled to its own total so every column is readable,
       even when income and spending are wildly different sizes. */
    function layout(items) {
      var total = items.reduce(function (s, i) { return s + (i.value || 0); }, 0) || 1;
      var avail = h - gap * Math.max(0, items.length - 1);
      var y = 0, out = [];
      items.forEach(function (it) {
        var hh = Math.max(10, (it.value / total) * avail);
        out.push({ y: y, h: hh, it: it });
        y += hh + gap;
      });
      return out;
    }
    var L = layout(sources), M = layout(accounts), R = layout(uses);

    var defs = '<defs>' + ['var(--in)', 'var(--teal)', 'var(--out)'].map(function (c, i) {
      return '<linearGradient id="jf' + i + '" x1="0" x2="1">' +
        '<stop offset="0" stop-color="' + c + '" stop-opacity="0.40"/>' +
        '<stop offset="1" stop-color="' + c + '" stop-opacity="0.12"/></linearGradient>';
    }).join('') + '</defs>';

    function ribbon(xa, xb, ya, yb, width, fill) {
      var mx = (xa + xb) / 2;
      return '<path d="M' + xa.toFixed(1) + ' ' + ya.toFixed(1) +
        ' C' + mx.toFixed(1) + ' ' + ya.toFixed(1) + ' ' + mx.toFixed(1) + ' ' + yb.toFixed(1) + ' ' + xb.toFixed(1) + ' ' + yb.toFixed(1) +
        '" stroke="' + fill + '" stroke-width="' + Math.max(1.5, width).toFixed(1) + '" fill="none" stroke-linecap="round"/>';
    }

    var links = '';
    // sources -> accounts (bundled proportionally)
    var lSum = L.reduce(function (s, x) { return s + x.h; }, 0) || 1;
    var mSum = M.reduce(function (s, x) { return s + x.h; }, 0) || 1;
    L.forEach(function (l) {
      var fromY = l.y + l.h / 2;
      var cursor = 0;
      M.forEach(function (m) {
        var share = (l.h / lSum) * m.h;
        var toY = m.y + cursor + share / 2;
        cursor += share;
        links += ribbon(x0 + colW, x1, fromY, toY, Math.min(l.h, m.h) * 0.42, 'url(#jf0)');
      });
    });
    // accounts -> uses
    var rSum = R.reduce(function (s, x) { return s + x.h; }, 0) || 1;
    M.forEach(function (m) {
      var fromY = m.y + m.h / 2;
      var cursor = 0;
      R.forEach(function (r) {
        var share = (m.h / mSum) * r.h;
        var toY = r.y + cursor + share / 2;
        cursor += share;
        links += ribbon(x1 + colW, x2, fromY, toY, Math.min(m.h, r.h) * 0.42, 'url(#jf2)');
      });
    });

    function col(items, x, color) {
      return items.map(function (o) {
        return '<rect x="' + x + '" y="' + o.y.toFixed(1) + '" width="' + colW + '" height="' + o.h.toFixed(1) +
          '" rx="4" fill="' + color + '"><title>' + esc(o.it.name) + ' · ' + fmt(o.it.value) + '</title></rect>' +
          '<text x="' + (x + colW / 2) + '" y="' + (o.y + o.h / 2 + 3.5).toFixed(1) +
          '" text-anchor="middle" class="flownum" fill="#fff">' + esc(shortMoney(o.it.value)) + '</text>';
      }).join('');
    }

    return '<svg class="chart flowmap" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid meet" role="img">' +
      defs + links +
      col(L, x0, 'var(--in)') +
      col(M, x1, 'var(--teal)') +
      col(R, x2, 'var(--out)') +
      '</svg>';
  }

  window.JELAS_CHARTS = {
    flowBar: flowBar, donut: donut, bars: bars, line: line,
    heatmap: heatmap, ring: ring, moneyFlow: moneyFlow, esc: esc
  };
})();
