/* Live unsealing: when online, read the site's own public timeline and Codex files. A title or entry the
   site has opened opens here too. Offline, the wallpaper keeps what it shipped with. */
(function () {
  'use strict';

  var SITE = 'https://www.doombringerz.com';
  var LORE = window.RIFT_LORE;
  // Wiki nodes that open when their Codex entry opens.
  var WIKI_ENTRY = { doomjr: /^Doom Jr\./, luna: /^Luna Jr\./, aethera: /^Aethera\b/, fracture: /^The First Fracture/, laws: /^The Immutable Laws/, enochian: /^The Enochian Alphabet/ };

  function text(html) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    return (d.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function lastSentence(s) {
    var parts = s.split(/(?<=[.!?])\s+/);
    return parts[parts.length - 1];
  }
  function firstSentence(s) { return s.split(/(?<=[.!?])\s+/)[0]; }

  // The site's static files are cached for ten years; a dated query gives each day its own copy.
  function load(path, done) {
    var d = new Date();
    var s = document.createElement('script');
    s.src = SITE + path + '?d=' + d.getFullYear() + (d.getMonth() + 1) + d.getDate();
    s.async = true;
    s.onload = function () { s.remove(); done(true); };
    s.onerror = function () { s.remove(); done(false); };
    document.head.appendChild(s);
  }

  function Unseal(hud, overlay) {
    this.hud = hud;
    this.overlay = overlay;
    this.folded = LORE.folded;
  }

  Unseal.prototype.run = function () {
    if (navigator.onLine === false) return;
    var self = this;
    load('/lore_timeline/js/data.js', function (ok) { if (ok && Array.isArray(window.TIMELINE_DATA)) self.timeline(window.TIMELINE_DATA); });
    load('/codex_of_the_riftborn/js/data.js', function (ok) { if (ok && window.CODEX_DATA) self.codex(window.CODEX_DATA); });
  };

  // Codes for the prelude and side games where the site still says WIP.
  var CODES = { 'before-the-first-blink': 'P1', 'the-hum-repeats': 'P2', 'the-described-town': 'S1' };

  Unseal.prototype.timeline = function (rows) {
    var self = this, sagas = LORE.sagas;
    var list = rows.filter(function (r) { return r && r.title && sagas[r.sagaKey]; }).map(function (r) {
      var open = r.synopsis && r.synopsis !== self.folded;
      var code = r.id && r.id !== 'WIP' ? r.id : CODES[r.slug] || 'WIP';
      return [code, r.title.replace(/\s*\(working title\)\s*$/i, ''), r.sagaKey, open ? lastSentence(r.synopsis) : null];
    });
    if (list.length < 5) return;
    // A shipped title the site does not list yet keeps its place after the title before it.
    var titles = list.map(function (t) { return t[1]; }), codes = list.map(function (t) { return t[0]; });
    this.hud.timeline.forEach(function (t, i, shipped) {
      if (titles.indexOf(t[1]) >= 0 || codes.indexOf(t[0]) >= 0) return;
      var at = i ? titles.indexOf(shipped[i - 1][1]) + 1 : 0;
      list.splice(at, 0, t);
      titles.splice(at, 0, t[1]);
      codes.splice(at, 0, t[0]);
    });
    var before = this.hud.timeline.map(function (t) { return t[0] + t[1] + (t[3] ? 1 : 0); }).join('|');
    var after = list.map(function (t) { return t[0] + t[1] + (t[3] ? 1 : 0); }).join('|');
    if (before !== after) {
      var opened = list.filter(function (t, i) { return t[3] && !(self.hud.timeline[i] && self.hud.timeline[i][3]); }).length;
      this.hud.rebuildTimeline(list);
      if (opened) this.hud.toast('The record opens: ' + opened + (opened === 1 ? ' title' : ' titles'));
    }
  };

  Unseal.prototype.codex = function (data) {
    var notes = LORE.notes, have = {};
    notes.forEach(function (n) { have[n.text.slice(0, 40)] = true; });
    var nodes = this.overlay ? this.overlay.nodes : [];
    (data.chapters || []).forEach(function (ch) {
      (ch.entries || []).forEach(function (e) {
        if (e.locked || !e.content || /not yet been released/i.test(e.content)) return;
        var q = /<blockquote>([\s\S]*?)<\/blockquote>/.exec(e.content);
        if (q) {
          var t = text(q[1]).replace(/^The Codex notes:\s*/i, '');
          if (t && t.length < 220 && !have[t.slice(0, 40)]) { notes.push({ text: t, source: e.title }); have[t.slice(0, 40)] = true; }
        }
        nodes.forEach(function (n) {
          var re = WIKI_ENTRY[n.data.id];
          if (re && n.data.sealed && re.test(e.title)) {
            var p = /<p>([\s\S]*?)<\/p>/.exec(e.content);
            n.data.sealed = false;
            n.data.line = p ? firstSentence(text(p[1])).slice(0, 140) : n.data.line;
          }
        });
      });
    });
  };

  window.RiftUnseal = Unseal;
})();
