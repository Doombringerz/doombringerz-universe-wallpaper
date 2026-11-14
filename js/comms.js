/* Rascal and Halcyon on the comms: two portraits from their open Codex entries, trading one Enochian
   word each. The words come from the Translator's own vocabulary, not new dialogue. */
(function () {
  'use strict';

  var GLYPHS = window.RIFT_GLYPHS;
  // [Rascal, Halcyon] as Translator VOCAB words with their glyph ids.
  var EXCHANGES = [
    [['Chaos', 15], ['Order', 7]],
    [['Break', 20], ['Protect', 12]],
    [['Fire', 6], ['Clarity', 10]],
    [['Free', 3], ['Bound', 18]],
    [['Strike', 8], ['Judge', 7]],
    [['Glitch', 15], ['Sacred', 1]]
  ];

  function Comms() {
    this.el = document.getElementById('comms');
    this.n = Math.floor(Math.random() * EXCHANGES.length);
    this.busy = false;
    var art = window.RIFT_CAMEO_ART || {};
    this.el.querySelector('.who.rascal .face').style.backgroundImage = 'url(' + art.rascal + ')';
    this.el.querySelector('.who.halcyon .face').style.backgroundImage = 'url(' + art.halcyon + ')';
  }

  function bubble(el, word, gid) {
    var g = GLYPHS[gid - 1];
    el.innerHTML = '<span class="eg eg-' + (gid - 1) + '"></span><b></b><small></small>';
    el.querySelector('b').textContent = word;
    el.querySelector('small').textContent = g.name + ' / ' + g.meaning;
  }

  Comms.prototype.play = function () {
    if (this.busy || !this.el) return;
    this.busy = true;
    var ex = EXCHANGES[this.n++ % EXCHANGES.length], el = this.el, self = this;
    var r = el.querySelector('.who.rascal'), h = el.querySelector('.who.halcyon');
    bubble(r.querySelector('.say'), ex[0][0], ex[0][1]);
    bubble(h.querySelector('.say'), ex[1][0], ex[1][1]);
    el.className = 'comms on';
    setTimeout(function () { r.classList.add('talk'); }, 700);
    setTimeout(function () { r.classList.add('read'); }, 1900);
    setTimeout(function () { h.classList.add('talk'); }, 2700);
    setTimeout(function () { h.classList.add('read'); }, 3900);
    setTimeout(function () { el.className = 'comms'; }, 10500);
    setTimeout(function () {
      [r, h].forEach(function (w) { w.classList.remove('talk', 'read'); });
      self.busy = false;
    }, 11500);
  };

  window.RiftComms = Comms;
})();
