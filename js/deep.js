/* Deep dive: the zones inside each realm, from the Lore Map's second layer.
   Auto: the tour stops at up to two open zones per realm. Interactive: every zone gets a pin; click one to fly in. */
(function () {
  'use strict';

  var ZONES = window.RIFT_ZONES || {};
  var CROP = window.RIFT_CROP || {};
  var ZOOM = 1.9;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Deep(engine, hud) {
    this.engine = engine;
    this.hud = hud;
    this.pinsFor = null;
    this.active = null;
    this.layer = document.getElementById('pins');
  }

  Deep.prototype.zones = function (realm) { return ZONES[realm.id] || []; };
  Deep.prototype.open = function (realm) {
    return this.zones(realm).map(function (z, i) { return { z: z, i: i }; }).filter(function (o) { return !o.z.sealed; });
  };

  // Zone x/y are percent of the full plate; the plate on screen has its frame cropped off.
  Deep.prototype.uv = function (realm, z) {
    var c = CROP[realm.id] || [0, 0, 0, 0];
    return [clamp((z.x / 100 - c[0]) / (1 - c[0] - c[2]), 0.02, 0.98), clamp((z.y / 100 - c[1]) / (1 - c[1] - c[3]), 0.02, 0.98)];
  };

  Deep.prototype.range = function (realm, zoom) {
    var meta = window.RIFT_ASSETS.plates[realm.id];
    var ia = meta.w / meta.h, sa = this.engine.canvas.width / this.engine.canvas.height;
    var r = ia > sa ? [sa / ia, 1] : [1, ia / sa];
    return [r[0] / zoom, r[1] / zoom];
  };

  Deep.prototype.cam = function (realm, z, zoom, nudge) {
    var uv = this.uv(realm, z), r = this.range(realm, zoom);
    var px = r[0] < 0.999 ? (uv[0] - 0.5) * 2 / (1 - r[0]) : 0;
    var py = r[1] < 0.999 ? (uv[1] - 0.5) * 2 / (1 - r[1]) : 0;
    if (nudge) { px += nudge[0] * 0.25; py += nudge[1] * 0.25; }
    return [zoom, clamp(px, -1, 1), clamp(py, -1, 1)];
  };

  // Auto tour inside one realm dwell: realm view first, then up to two open zones.
  Deep.prototype.plan = function (realm, u) {
    var open = this.open(realm);
    if (!open.length) return { zone: null, intro: u };
    var stops = open.slice(0, 2);
    var intro = stops.length === 2 ? 0.38 : 0.45;
    if (u < intro) return { zone: null, intro: u / intro };
    var k = stops.length === 2 && u >= 0.69 ? 1 : 0;
    return { zone: stops[k].i, cam: this.cam(realm, stops[k].z, ZOOM) };
  };

  Deep.prototype.focusCam = function (realm, i, steer) {
    var z = this.zones(realm)[i];
    return z ? this.cam(realm, z, ZOOM + 0.15, steer) : null;
  };

  Deep.prototype.setActive = function (realm, i, idx) {
    var key = realm.id + ':' + i;
    if (this.active === key) return;
    this.active = key;
    if (i === null || i === undefined) this.hud.codex(realm, idx);
    else this.hud.codexZone(realm, this.zones(realm)[i], i, this.zones(realm).length, idx);
  };

  Deep.prototype.reset = function () { this.active = null; };

  // Pins: placed every frame from the camera, hidden during a rift.
  Deep.prototype.pins = function (realm, cam, show, mode, activeZone) {
    var layer = this.layer;
    if (!show) { layer.classList.remove('on'); return; }
    var zones = this.zones(realm);
    if (this.pinsFor !== realm.id) {
      this.pinsFor = realm.id;
      layer.innerHTML = zones.map(function (z, i) {
        return '<button class="pin' + (z.sealed ? ' sealed' : '') + '" data-zone="' + i + '"><i></i><span>' +
          (z.sealed ? 'Sealed' : z.name) + '</span></button>';
      }).join('');
    }
    layer.classList.add('on');
    layer.classList.toggle('auto', mode !== 'interactive');
    var r = this.range(realm, cam[0]);
    var c = [0.5 + cam[1] * (1 - r[0]) / 2, 0.5 + cam[2] * (1 - r[1]) / 2];
    var W = window.innerWidth, H = window.innerHeight, self = this;
    Array.prototype.forEach.call(layer.children, function (el, i) {
      var uv = self.uv(realm, zones[i]);
      var x = (0.5 + (uv[0] - c[0]) / r[0]) * W, y = (0.5 + (uv[1] - c[1]) / r[1]) * H;
      // Clear of the brand row and readouts on top and the timeline at the bottom.
      var inside = x > 20 && x < W - 20 && y > H * 0.12 && y < H * 0.85;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.classList.toggle('hide', !inside);
      el.classList.toggle('active', i === activeZone);
    });
  };

  window.RiftDeep = Deep;
})();
