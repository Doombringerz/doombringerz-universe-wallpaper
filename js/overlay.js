/* 2D layer: Enochian motes, the Wiki web, the translator reticle and click bursts. */
(function () {
  'use strict';

  var GLYPHS = window.RIFT_GLYPHS;
  var LORE = window.RIFT_LORE;
  var SPRITE = 128;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  // The Translator's glyph PNGs are dark ink on transparent: tint them, then add a glow.
  function makeSprites(color, glow, done) {
    var out = new Array(GLYPHS.length), left = GLYPHS.length;
    GLYPHS.forEach(function (g, i) {
      var img = new Image();
      img.onload = function () {
        var pad = SPRITE * 0.16, box = SPRITE - pad * 2;
        var k = Math.min(box / img.width, box / img.height);
        var w = img.width * k, h = img.height * k;
        var ink = document.createElement('canvas');
        ink.width = ink.height = SPRITE;
        var t = ink.getContext('2d');
        t.drawImage(img, (SPRITE - w) / 2, (SPRITE - h) / 2, w, h);
        t.globalCompositeOperation = 'source-in';
        t.fillStyle = color;
        t.fillRect(0, 0, SPRITE, SPRITE);
        var c = document.createElement('canvas');
        c.width = c.height = SPRITE;
        var x = c.getContext('2d');
        x.filter = 'blur(' + glow * 2 + 'px)';
        x.drawImage(ink, 0, 0);
        x.drawImage(ink, 0, 0);
        x.filter = 'none';
        x.drawImage(ink, 0, 0);
        out[i] = c;
        if (--left === 0) done(out);
      };
      img.src = g.png;
    });
  }

  function Overlay(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = null;
    this.spritesHot = null;
    this.motes = [];
    this.bursts = [];
    this.moteCount = 54;
    this.showWiki = true;
    this.showReticle = true;
    this.mouse = { x: -999, y: -999, last: -1e9 };
    this.hovered = null;
    this.reticleGlyph = 0;
    this.nodes = this.layoutWiki();
  }

  Overlay.prototype.setAccent = function (hex) {
    var self = this;
    makeSprites(hex, 3, function (s) { self.sprites = s; });
    makeSprites('#c9ffe0', 5, function (s) { self.spritesHot = s; });
  };

  Overlay.prototype.layoutWiki = function () {
    var byId = {};
    var nodes = LORE.wiki.map(function (w, i) {
      var n = {
        data: w, links: [],
        theta: (i / LORE.wiki.length) * Math.PI * 2 * 2.618,
        radius: rand(0.95, 1.55),
        z: 1.2 + (i / LORE.wiki.length) * 8.5,
        sx: 0, sy: 0, a: 0, s: 0
      };
      byId[w.id] = n;
      return n;
    });
    LORE.links.forEach(function (l) {
      var a = byId[l[0]], b = byId[l[1]];
      if (a && b) { a.links.push(b); b.links.push(a); }
    });
    return nodes;
  };

  Overlay.prototype.resize = function (w, h, dpr) {
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w; this.h = h; this.dpr = dpr;
  };

  Overlay.prototype.spawnMote = function (far) {
    var ang = rand(0, Math.PI * 2), rad = rand(0.25, 2.2);
    return { x: Math.cos(ang) * rad * 1.6, y: Math.sin(ang) * rad, z: far ? rand(4, 7) : rand(0.6, 7), g: (Math.random() * GLYPHS.length) | 0, rot: rand(-Math.PI, Math.PI), spin: rand(-0.6, 0.6), hot: Math.random() < 0.18 };
  };

  Overlay.prototype.pick = function (x, y, radius) {
    var best = radius || 42, hit = null;
    if (!this.showWiki) return null;
    for (var k = 0; k < this.nodes.length; k++) {
      var c = this.nodes[k];
      if (c.a < 0.35) continue;
      var d = Math.hypot(c.sx - x, c.sy - y);
      if (d < best) { best = d; hit = c; }
    }
    return hit;
  };

  Overlay.prototype.pointer = function (x, y, now) {
    this.mouse.x = x; this.mouse.y = y; this.mouse.last = now;
  };

  Overlay.prototype.burst = function (x, y) {
    for (var i = 0; i < 16; i++) {
      var a = (i / 16) * Math.PI * 2 + rand(-0.15, 0.15), v = rand(90, 260);
      this.bursts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: (Math.random() * GLYPHS.length) | 0, life: 0, max: rand(0.9, 1.5), rot: rand(-3, 3) });
    }
    this.bursts.push({ ring: true, x: x, y: y, life: 0, max: 0.9 });
  };

  Overlay.prototype.project = function (x, y, z) {
    var f = this.h * 0.62;
    return [this.w * 0.5 + (x / z) * f, this.h * 0.5 + (y / z) * f];
  };

  Overlay.prototype.update = function (dt, now, warp, audio) {
    var speed = 0.55 + warp * 7 + audio * 0.8;
    while (this.motes.length < this.moteCount) this.motes.push(this.spawnMote(this.motes.length > 0));
    if (this.motes.length > this.moteCount) this.motes.length = this.moteCount;
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      m.z -= dt * speed;
      m.rot += m.spin * dt;
      var p = this.project(m.x, m.y, m.z);
      if (m.z < 0.25 || p[0] < -80 || p[0] > this.w + 80 || p[1] < -80 || p[1] > this.h + 80) this.motes[i] = this.spawnMote(true);
    }

    var nspeed = 0.16 + warp * 3.5;
    for (var j = 0; j < this.nodes.length; j++) {
      var n = this.nodes[j];
      n.z -= dt * nspeed;
      n.theta += dt * 0.025;
      if (n.z < 0.55) { n.z += 9; n.theta += 1.7; n.radius = rand(0.95, 1.55); }
      var q = this.project(Math.cos(n.theta) * n.radius * 1.5, Math.sin(n.theta) * n.radius * 0.9, n.z);
      n.sx = q[0]; n.sy = q[1];
      n.s = clamp(1.6 / n.z, 0.2, 1.6);
      var dc = Math.hypot(n.sx - this.w * 0.5, (n.sy - this.h * 0.4) * 1.6);
      var clear = 0.3 + 0.7 * smooth(this.h * 0.12, this.h * 0.3, dc);
      // Keep the title band readable while a realm name is on screen.
      if (this.titleOn && Math.abs(n.sy - this.h * 0.4) < this.h * 0.14 && Math.abs(n.sx - this.w * 0.5) < this.w * 0.3) clear *= 0.15;
      // And the brand row at the top and the timeline at the bottom.
      clear *= smooth(this.h * 0.06, this.h * 0.14, n.sy) * smooth(this.h * 0.9, this.h * 0.8, n.sy);
      n.a = smooth(9.5, 6.5, n.z) * smooth(0.55, 1.4, n.z) * (1 - warp * 0.7) * clear;
    }

    this.hovered = now - this.mouse.last < 6000 ? this.pick(this.mouse.x, this.mouse.y) : null;

    for (var b = this.bursts.length - 1; b >= 0; b--) {
      var u = this.bursts[b];
      u.life += dt;
      if (!u.ring) { u.x += u.vx * dt; u.y += u.vy * dt; u.vx *= 0.97; u.vy *= 0.97; u.rot += dt; }
      if (u.life > u.max) this.bursts.splice(b, 1);
    }
  };

  Overlay.prototype.draw = function (now, accent, warp) {
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.sprites || !this.spritesHot) return;
    ctx.globalCompositeOperation = 'lighter';

    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      var p = this.project(m.x, m.y, m.z);
      var size = clamp(26 / m.z, 3, 60);
      var a = smooth(7, 4.5, m.z) * smooth(0.25, 0.9, m.z) * 0.85;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(m.rot);
      if (warp > 0.05) ctx.scale(1, 1 + warp * 2.5);
      ctx.drawImage((m.hot ? this.spritesHot : this.sprites)[m.g], -size / 2, -size / 2, size, size);
      ctx.restore();
    }

    if (this.showWiki) this.drawWiki(ctx, accent);
    if (this.showReticle) this.drawReticle(ctx, now, accent);

    for (var b = 0; b < this.bursts.length; b++) {
      var u = this.bursts[b], k = u.life / u.max;
      if (u.ring) {
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 10 + k * 160, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 4 + k * 95, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        var s = 22 * (1 - k * 0.5);
        ctx.globalAlpha = 1 - k;
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.rotate(u.rot);
        ctx.drawImage(this.spritesHot[u.g], -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  Overlay.prototype.drawWiki = function (ctx, accent) {
    var nodes = this.nodes, hov = this.hovered;
    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      for (var j = 0; j < n.links.length; j++) {
        var o = n.links[j];
        if (o.data.id < n.data.id) continue;
        var lit = hov && (hov === n || hov === o);
        var a = Math.min(n.a, o.a) * (lit ? 0.9 : 0.22);
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        ctx.strokeStyle = lit ? '#eafff2' : accent;
        ctx.beginPath();
        ctx.moveTo(n.sx, n.sy);
        ctx.lineTo(o.sx, o.sy);
        ctx.stroke();
      }
    }
    ctx.textBaseline = 'middle';
    for (var k = 0; k < nodes.length; k++) {
      var c = nodes[k];
      if (c.a < 0.03) continue;
      var lit2 = hov === c || (hov && hov.links.indexOf(c) >= 0);
      var r = 3 + c.s * 3;
      ctx.globalAlpha = c.a * (c.data.sealed ? 0.55 : 1);
      ctx.fillStyle = lit2 ? '#eafff2' : accent;
      ctx.beginPath();
      ctx.moveTo(c.sx, c.sy - r); ctx.lineTo(c.sx + r, c.sy); ctx.lineTo(c.sx, c.sy + r); ctx.lineTo(c.sx - r, c.sy);
      ctx.closePath();
      ctx.fill();
      if (c.data.sealed) {
        ctx.strokeStyle = accent;
        ctx.beginPath();
        ctx.arc(c.sx, c.sy, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (c.a > 0.3 && c.s > 0.3) {
        var fs = Math.round(clamp(11 + c.s * 5, 11, 19));
        ctx.font = '500 ' + fs + 'px "Rajdhani", sans-serif';
        ctx.globalAlpha = c.a * (lit2 ? 1 : 0.78);
        ctx.fillStyle = lit2 ? '#ffffff' : '#efe6cf';
        ctx.fillText(c.data.name.toUpperCase(), c.sx + r + 7, c.sy);
      }
    }
  };

  Overlay.prototype.drawReticle = function (ctx, now, accent) {
    var idle = now - this.mouse.last;
    var a = 1 - smooth(2500, 3500, idle);
    if (a <= 0.01) return;
    var x = this.mouse.x, y = this.mouse.y, R = 46, n = GLYPHS.length;
    var rot = now * 0.00025;
    var top = 0, bestD = 9;
    ctx.globalAlpha = a * 0.5;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, R + 13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R - 12, rot * 3, rot * 3 + Math.PI * 1.4); ctx.stroke();
    for (var i = 0; i < n; i++) {
      var ang = rot + (i / n) * Math.PI * 2;
      var d = Math.abs(Math.atan2(Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2)));
      if (d < bestD) { bestD = d; top = i; }
    }
    for (var j = 0; j < n; j++) {
      var an = rot + (j / n) * Math.PI * 2;
      var hot = j === top, s = hot ? 22 : 13;
      ctx.globalAlpha = a * (hot ? 1 : 0.6);
      ctx.drawImage((hot ? this.spritesHot : this.sprites)[j], x + Math.cos(an) * R - s / 2, y + Math.sin(an) * R - s / 2, s, s);
    }
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = accent;
    ctx.fillRect(x - 1, y - 7, 2, 14);
    ctx.fillRect(x - 7, y - 1, 14, 2);
    this.reticleGlyph = top;
    this.reticleAlpha = a;
  };

  window.RiftOverlay = Overlay;
})();
