/* DOM layer: brand, Lore Map, Codex page, glyph title card, timeline, Wiki card, translator readout. */
(function () {
  'use strict';

  var LORE = window.RIFT_LORE;
  var GLYPHS = window.RIFT_GLYPHS;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  // A glyph is its Translator PNG used as a mask. It takes the colour of the text around it.
  function glyphSvg(i) {
    return '<span class="eg eg-' + i + '"></span>';
  }

  // Latin letter -> glyph index, the Translator's own LETTER_MAP.
  var LETTER = window.RIFT_LETTERS;

  function Hud() {
    this.realms = LORE.realms;
    this.noteIdx = Math.floor(Math.random() * LORE.notes.length);
    this.tlIdx = 0;
    this.visited = [];
    this.timers = [];
    this.codexTimers = [];
    this.timeline = LORE.timeline.slice();
    this.defineGlyphs();
    this.buildMap();
    this.buildTimeline();
    var self = this;
    this.onTravel = null;
    this.onZone = null;
    document.addEventListener('click', function (e) {
      var z = e.target.closest('[data-zone]');
      if (z && self.onZone) { e.stopPropagation(); self.onZone(+z.getAttribute('data-zone')); return; }
      var t = e.target.closest('[data-travel]');
      if (!t || !self.onTravel) return;
      e.stopPropagation();
      self.closeRing();
      self.onTravel(+t.getAttribute('data-travel'));
    });
    setInterval(function () { self.stepTimeline(); }, 5200);
    setInterval(function () { self.tickClock(); }, 1000);
    this.tickClock();
  }

  Hud.prototype.defineGlyphs = function () {
    var css = '';
    GLYPHS.forEach(function (g, i) {
      css += '.eg-' + i + '{-webkit-mask-image:url(' + g.png + ');mask-image:url(' + g.png + ')}\n';
    });
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.querySelectorAll('[data-glyph]').forEach(function (el) {
      el.innerHTML = glyphSvg(+el.getAttribute('data-glyph'));
    });
  };

  Hud.prototype.buildMap = function () {
    $('cosmic').src = window.RIFT_ASSETS.cosmic.src;
    var pts = this.realms.map(function (r) { return r.map[0] + ',' + r.map[1]; }).join(' ');
    var svg = $('route');
    svg.innerHTML = '<polyline class="route" points="' + pts + '"/><polyline class="route done" id="route-done" points=""/>';
    var frame = svg.parentNode;
    this.realms.forEach(function (r, i) {
      var b = document.createElement('button');
      b.className = 'hot';
      b.setAttribute('data-travel', i);
      b.setAttribute('data-name', r.name);
      b.style.left = r.map[0] + '%';
      b.style.top = r.map[1] + '%';
      b.style.width = Math.max(10, r.map[2] * 0.7) + '%';
      b.style.height = Math.max(5, r.map[3] * 0.45) + '%';
      frame.appendChild(b);
    });
  };

  Hud.prototype.setMode = function (mode) {
    this.mode = mode;
    $('mode-hint').classList.remove('busy');
    $('mode-hint').textContent = mode === 'interactive' ? 'Interactive / click anywhere for waypoints' : 'Auto tour / click the Lore Map to jump';
  };

  Hud.prototype.opening = function (name) {
    $('mode-hint').classList.add('busy');
    $('mode-hint').textContent = 'Rift opening / ' + name;
  };

  // Waypoint ring around the cursor: one stop per realm.
  Hud.prototype.openRing = function (x, y, current) {
    var ring = $('ring'), n = this.realms.length;
    var R = window.innerHeight * 0.17;
    x = Math.max(R + 90, Math.min(window.innerWidth - R - 90, x));
    y = Math.max(R + 60, Math.min(window.innerHeight - R - 60, y));
    var html = '<div class="ring-core"><span class="label">Waypoints</span><b>' + this.realms[current].name + '</b></div>';
    this.realms.forEach(function (r, i) {
      var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      var gx = Math.cos(a) * R, gy = Math.sin(a) * R;
      var letter = r.name.replace(/^The /, '')[0].toUpperCase();
      html += '<button class="way' + (i === current ? ' here' : '') + '" data-travel="' + i + '" style="left:' + gx + 'px;top:' + gy + 'px;--d:' + (i * 35) + 'ms">' +
        '<i>' + glyphSvg(LETTER[letter] || 0) + '</i><span class="' + (gx < -1 ? 'l' : '') + '">' + r.name + '</span></button>';
    });
    ring.innerHTML = html;
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    ring.classList.remove('on');
    void ring.offsetWidth;
    ring.classList.add('on');
    document.body.classList.add('ring-open');
    this.ringOpen = true;
  };

  Hud.prototype.closeRing = function () {
    $('ring').classList.remove('on');
    document.body.classList.remove('ring-open');
    this.ringOpen = false;
  };

  Hud.prototype.pin = function (node) {
    this.pinned = node;
    this.pinUntil = performance.now() + 7000;
  };

  Hud.prototype.rebuildTimeline = function (list) {
    this.timeline = list;
    this.tlIdx = 0;
    this.buildTimeline();
  };

  Hud.prototype.buildTimeline = function () {
    var track = $('tl-track');
    track.innerHTML = '';
    var n = this.timeline.length;
    var pos = function (i) { return 2 + (i / (n - 1)) * 96; };
    var spans = [];
    this.tlNodes = this.timeline.map(function (t, i) {
      var el = document.createElement('i');
      el.className = 'tl-node' + (t[3] ? ' open' : '');
      el.style.left = pos(i) + '%';
      el.style.setProperty('--c', LORE.sagas[t[2]].color);
      track.appendChild(el);
      var last = spans[spans.length - 1];
      if (last && last.key === t[2]) last.to = i;
      else spans.push({ key: t[2], from: i, to: i });
      return el;
    });
    // One label per saga, centred on its run of titles.
    spans.forEach(function (sp, k) {
      var s = document.createElement('span');
      s.className = 'tl-saga';
      s.textContent = LORE.sagas[sp.key].name;
      s.style.left = (k === 0 ? pos(sp.from) : (pos(sp.from) + pos(sp.to)) / 2) + '%';
      s.style.transform = k === 0 ? 'translateX(-4px)' : 'translateX(-50%)';
      s.style.setProperty('--c', LORE.sagas[sp.key].color);
      track.appendChild(s);
    });
    this.stepTimeline(0);
  };

  Hud.prototype.stepTimeline = function (to) {
    var nodes = this.tlNodes;
    if (nodes[this.tlIdx]) nodes[this.tlIdx].classList.remove('on');
    this.tlIdx = typeof to === 'number' ? to : (this.tlIdx + 1) % nodes.length;
    var t = this.timeline[this.tlIdx];
    nodes[this.tlIdx].classList.add('on');
    var title = $('tl-title'), note = $('tl-note');
    title.style.opacity = note.style.opacity = 0;
    setTimeout(function () {
      title.innerHTML = '<span class="mono">' + esc(t[0]) + '</span>' + esc(t[1]);
      note.textContent = t[3] || LORE.folded;
      title.style.opacity = note.style.opacity = 1;
    }, 350);
  };

  Hud.prototype.tickClock = function () {
    var d = new Date();
    $('clock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  };

  Hud.prototype.setStability = function (v) {
    $('stability').textContent = v.toFixed(2);
  };

  Hud.prototype.later = function (fn, ms) {
    this.timers.push(setTimeout(fn, ms));
  };

  // A new realm comes into view.
  Hud.prototype.arrive = function (idx) {
    var r = this.realms[idx], self = this;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.codexTimers.forEach(clearTimeout);
    this.codexTimers = [];

    $('stratum').textContent = 'Stratum ' + pad(idx + 1) + ' / ' + pad(this.realms.length);
    if (this.mode) this.setMode(this.mode);
    $('stratum-bar').style.width = ((idx + 1) / this.realms.length * 100) + '%';

    var m = $('marker');
    m.style.left = r.map[0] + '%';
    m.style.top = r.map[1] + '%';
    m.style.width = (r.map[2] * 0.8) + '%';
    m.style.height = (r.map[3] * 0.8 * (2 / 3)) + '%';
    if (idx === 0) this.visited = [];
    this.visited.push(r.map[0] + ',' + r.map[1]);
    $('route-done').setAttribute('points', this.visited.join(' '));
    $('map-name').textContent = r.name;
    $('map-coord').textContent = 'x' + r.map[0] + ' y' + r.map[1];

    this.titleCard(r);
    this.codex(r, idx);
  };

  Hud.prototype.titleCard = function (r) {
    var card = $('title-card'), self = this;
    var html = '';
    r.name.toUpperCase().split(' ').forEach(function (word) {
      if (word === '/') return;
      html += '<span class="word">';
      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        if (!(ch in LETTER)) continue;
        html += '<span class="cell"><span class="gw">' + glyphSvg(LETTER[ch]) + '</span><b>' + ch + '</b></span>';
      }
      html += '</span>';
    });
    $('tc-name').innerHTML = html;
    // Long names shrink to stay clear of the side panels on a 16:9 screen.
    var words = r.name.split(' ').filter(function (w) { return /[A-Za-z]/.test(w); }).length;
    var letters = r.name.replace(/[^A-Za-z]/g, '').length + (words - 1) * 0.6;
    var room = window.innerWidth * 0.42 / (window.innerHeight * 0.058);
    $('tc-name').style.setProperty('--tcs', Math.min(1, room / Math.max(letters, 1)).toFixed(3));
    $('tc-tier').textContent = r.tier;
    var cells = card.querySelectorAll('.cell');
    card.classList.remove('on');
    void card.offsetWidth;
    card.classList.add('on');
    cells.forEach(function (c, i) {
      self.later(function () { c.classList.add('seen'); }, 120 + i * 70);
      self.later(function () { c.classList.add('read'); }, 1300 + i * 95);
    });
    this.later(function () { card.classList.remove('on'); }, 6400);
  };

  Hud.prototype.codex = function (r, idx) {
    this.entry({ count: 'Entry ' + pad(idx + 1) + ' / ' + pad(this.realms.length), name: r.name, tier: r.tier,
      desc: r.desc, features: r.features, seed: idx, note: true });
  };

  // A zone inside the realm, from the Lore Map's second layer.
  Hud.prototype.codexZone = function (r, z, i, n, idx) {
    $('map-name').textContent = r.name + ' / ' + z.name;
    this.entry({ count: 'Zone ' + pad(i + 1) + ' / ' + pad(n), name: z.name, tier: r.name + (z.tier ? ' / ' + z.tier : ''),
      desc: z.desc, features: z.features || [], seed: idx * 7 + i, note: false });
  };

  Hud.prototype.entry = function (e) {
    var self = this;
    this.codexTimers.forEach(clearTimeout);
    this.codexTimers = [];
    var later = function (fn, ms) { self.codexTimers.push(setTimeout(fn, ms)); };
    var panel = $('codex-body');
    panel.classList.add('swap-out');
    later(function () {
      $('codex-count').textContent = e.count;
      $('codex-name').textContent = e.name;
      $('codex-tier').textContent = e.tier;
      var desc = $('codex-desc');
      desc.textContent = '';
      var ul = $('codex-features');
      ul.innerHTML = e.features.map(function (f, i) {
        return '<li>' + glyphSvg((e.seed * 3 + i * 5) % GLYPHS.length) + '<span>' + esc(f) + '</span></li>';
      }).join('');
      if (e.note) {
        var note = LORE.notes[self.noteIdx++ % LORE.notes.length];
        var q = $('codex-note');
        q.innerHTML = '<span class="label">The Codex notes</span><p></p><cite></cite>';
        q.querySelector('p').textContent = note.text;
        q.querySelector('cite').textContent = note.source;
      }
      panel.classList.remove('swap-out');
      self.type(desc, e.desc || '', function () {
        ul.querySelectorAll('li').forEach(function (li, i) {
          later(function () { li.classList.add('in'); }, 250 + i * 650);
        });
      }, later);
    }, 700);
  };

  Hud.prototype.type = function (el, text, done, later) {
    var i = 0;
    var caret = '<span class="caret"></span>';
    (function step() {
      i = Math.min(text.length, i + 2);
      el.innerHTML = esc(text.slice(0, i)) + caret;
      if (i < text.length) later(step, 22);
      else { later(function () { el.textContent = text; }, 1200); done(); }
    })();
  };

  // Text as Enochian cells that resolve into letters; anything off the alphabet stays as it is.
  Hud.prototype.glyphCells = function (text) {
    return text.toUpperCase().split(' ').map(function (word) {
      var html = '<span class="word">';
      for (var i = 0; i < word.length; i++) {
        var ch = word[i];
        html += ch in LETTER
          ? '<span class="cell"><span class="gw">' + glyphSvg(LETTER[ch]) + '</span><b>' + esc(ch) + '</b></span>'
          : '<span class="cell plain"><b>' + esc(ch) + '</b></span>';
      }
      return html + '</span>';
    }).join('');
  };

  Hud.prototype.decode = function (root, later) {
    root.querySelectorAll('.cell').forEach(function (c, i) {
      later(function () { c.classList.add('seen'); }, 120 + i * 60);
      later(function () { c.classList.add('read'); }, 900 + i * 80);
    });
  };



  Hud.prototype.toast = function (text) {
    var t = $('toast');
    t.textContent = text;
    t.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(function () { t.classList.remove('on'); }, 3500);
  };

  Hud.prototype.wiki = function (node, w, h) {
    var card = $('wiki-card');
    if (this.pinned && performance.now() < this.pinUntil) node = this.pinned;
    else this.pinned = null;
    if (!node) { card.classList.remove('on'); return; }
    var d = node.data;
    if (this.wikiFor !== d.id) {
      this.wikiFor = d.id;
      card.classList.toggle('sealed', !!d.sealed);
      $('wiki-kind').textContent = 'Wiki / ' + d.kind;
      $('wiki-name').textContent = d.name;
      $('wiki-line').textContent = d.sealed && d.line !== 'Entry folded.' ? d.line + ' Entry folded.' : d.line;
      $('wiki-links').textContent = (d.realm ? 'Click to travel / ' : '') + 'Linked: ' + node.links.map(function (l) { return l.data.name; }).join(' / ');
    }
    var x = node.sx + 26, y = node.sy - 20;
    var cw = card.offsetWidth, ch = card.offsetHeight;
    if (x + cw > w - 16) x = node.sx - cw - 26;
    y = Math.max(16, Math.min(h - ch - 16, y));
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.classList.add('on');
  };

  Hud.prototype.translate = function (x, y, glyph, alpha) {
    var el = $('translate');
    if (alpha <= 0.01) { el.style.opacity = 0; return; }
    if (this.glyphFor !== glyph) {
      this.glyphFor = glyph;
      var g = GLYPHS[glyph];
      $('tr-name').textContent = g.name;
      $('tr-mean').textContent = g.latin + '  /  ' + g.meaning;
    }
    el.style.left = (x + 72) + 'px';
    el.style.top = (y - 34) + 'px';
    el.style.opacity = alpha;
  };

  window.RiftHud = Hud;
})();
