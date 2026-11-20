/* Timing, input, audio and Wallpaper Engine properties. Also runs as a plain page;
   there the settings come from the URL, e.g. index.html?mode=interactive&hud=cinematic&realm=aetheria */
(function () {
  'use strict';

  var LORE = window.RIFT_LORE;
  var REALMS = LORE.realms;
  var TRANSITION = 3.4;
  var CACHE = 3;

  var cfg = {
    accent: [0.784, 0.631, 0.29], hud: 'full', mode: 'auto', seconds: 22, idleResume: 0, audio: true, audioGain: 1,
    motes: 54, wiki: true, reticle: true, quality: 'high', clock: true, dim: 0.06, fps: 60, realm: null,
    zones: true, comms: true, unseal: true
  };

  var q = new URLSearchParams(location.search);
  if (q.has('hud')) cfg.hud = q.get('hud');
  if (q.has('mode')) cfg.mode = q.get('mode') === 'interactive' ? 'interactive' : 'auto';
  if (q.has('seconds')) cfg.seconds = Math.max(6, +q.get('seconds') || 22);
  if (q.has('idle')) cfg.idleResume = +q.get('idle') || 0;
  if (q.has('quality')) cfg.quality = q.get('quality');
  if (q.has('fps')) cfg.fps = +q.get('fps') || 60;
  if (q.has('motes')) cfg.motes = +q.get('motes');
  if (q.has('wiki')) cfg.wiki = q.get('wiki') !== '0';
  if (q.has('reticle')) cfg.reticle = q.get('reticle') !== '0';
  if (q.has('clock')) cfg.clock = q.get('clock') !== '0';
  if (q.has('audio')) cfg.audio = q.get('audio') !== '0';
  if (q.has('dim')) cfg.dim = (+q.get('dim') || 0) / 100;
  if (q.has('realm')) cfg.realm = q.get('realm');
  if (q.has('zones')) cfg.zones = q.get('zones') !== '0';
  if (q.has('comms')) cfg.comms = q.get('comms') !== '0';
  if (q.has('unseal')) cfg.unseal = q.get('unseal') !== '0';
  if (q.has('accent')) {
    var v = parseInt(q.get('accent').replace('#', ''), 16);
    if (!isNaN(v)) cfg.accent = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }

  var engine = null, overlay = null, hud = null, deep = null, comms = null, unseal = null;
  var cardUp = function () { return false; };

  var ready = false, paused = false, forced = false, arrivals = 0, glitch = false, nextGlitch = 0;
  var raf = 0, lastFrame = 0, lastTick = 0;
  var audioRaw = [0, 0, 0], audio = [0, 0, 0];
  var mouse = [0, 0], mouseTarget = [0, 0], lastMove = -1e9, lastInput = -1e9;
  var ripple = [0.5, 0.5, 1], rippleStart = -1;
  var zoomExtra = 0;
  var steer = [0, 0];

  // idx: the current realm. next: where the rift is going. pending: chosen, waiting for its plate.
  var state = { idx: 0, next: 0, pending: -1, phase: 'dwell', t0: 0, arrived: true, cam: [1.05, 0, 0], zone: null };

  /* ---------- plates: loaded on demand, at most CACHE on the GPU ---------- */

  var loading = {}, used = [];

  function touch(id) {
    used = used.filter(function (x) { return x !== id; });
    used.push(id);
    while (used.length > CACHE) {
      var drop = used[0];
      if (drop === REALMS[state.idx].id || drop === REALMS[state.next].id) break;
      used.shift();
      engine.dropTexture(drop);
    }
  }

  function ensure(id, done) {
    if (engine.textures[id]) { touch(id); if (done) done(); return; }
    if (loading[id]) { if (done) loading[id].push(done); return; }
    loading[id] = done ? [done] : [];
    window.__loading = (window.__loading || 0) + 1;
    var finish = function () {
      var cbs = loading[id];
      delete loading[id];
      window.__loading--;
      touch(id);
      cbs.forEach(function (cb) { cb(); });
    };
    // The 2.4K cut covers screens up to about 1920 wide; past that the 4K cut loads.
    var meta = window.RIFT_ASSETS.plates[id];
    var key = engine.canvas.width * 1.25 <= meta.sd ? id + '-sd' : id;
    var upload = function (d) {
      window.RIFT_PLATE_DATA[key] = null;
      var legacy = function () {
        var c = document.createElement('canvas');
        c.width = d.w; c.height = d.h;
        var x = c.getContext('2d'), left = d.strips.length;
        d.strips.forEach(function (s) {
          var img = new Image();
          img.onload = function () { x.drawImage(img, 0, s.y); if (--left === 0) { engine.addTexture(id, c); finish(); } };
          img.src = s.src;
        });
      };
      if (!window.createImageBitmap || !engine.mips) { legacy(); return; }
      var opts = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };
      Promise.all(d.strips.map(function (s) {
        return fetch(s.src).then(function (r) { return r.blob(); })
          .then(function (b) { return createImageBitmap(b, opts); })
          .then(function (bmp) { return { y: s.y, bmp: bmp }; });
      }))
        .then(function (strips) { return engine.addStripsAsync(id, d.w, d.h, strips, !ready); })
        .then(finish, legacy);
    };
    var data = window.RIFT_PLATE_DATA && window.RIFT_PLATE_DATA[key];
    if (data) { upload(data); return; }
    var s = document.createElement('script');
    s.src = 'js/plates/' + key + '.js';
    s.onload = function () { s.remove(); upload(window.RIFT_PLATE_DATA[key]); };
    document.body.appendChild(s);
  }

  /* ---------- config ---------- */

  function accentHex() {
    return '#' + cfg.accent.map(function (c) { return ('0' + Math.round(c * 255).toString(16)).slice(-2); }).join('');
  }

  function applyCfg() {
    var root = document.documentElement.style;
    root.setProperty('--accent', accentHex());
    root.setProperty('--accent-rgb', cfg.accent.map(function (c) { return Math.round(c * 255); }).join(', '));
    document.body.classList.remove('hud-full', 'hud-cinematic', 'hud-clean');
    document.body.classList.add('hud-' + cfg.hud);
    document.body.classList.toggle('no-clock', !cfg.clock);
    document.body.classList.toggle('mode-interactive', cfg.mode === 'interactive');
    if (hud) { hud.setMode(cfg.mode); if (cfg.mode !== 'interactive') hud.closeRing(); }
    if (overlay) {
      overlay.moteCount = Math.round(cfg.motes);
      overlay.showWiki = cfg.wiki;
      overlay.showReticle = cfg.reticle;
      if (overlay.accent !== accentHex()) { overlay.accent = accentHex(); overlay.setAccent(overlay.accent); }
    }
    resize();
  }

  // Wallpaper Engine calls these; it must exist before the page finishes loading.
  window.wallpaperPropertyListener = {
    applyUserProperties: function (p) {
      if (p.schemecolor) cfg.accent = p.schemecolor.value.split(' ').map(Number);
      if (p.hudmode) cfg.hud = p.hudmode.value;
      if (p.flightmode) cfg.mode = p.flightmode.value;
      if (p.realmseconds) cfg.seconds = p.realmseconds.value;
      if (p.idleresume) cfg.idleResume = p.idleresume.value;
      if (p.audioreact) cfg.audio = p.audioreact.value;
      if (p.audiostrength) cfg.audioGain = p.audiostrength.value / 100;
      if (p.glyphmotes) cfg.motes = p.glyphmotes.value;
      if (p.wikiweb) cfg.wiki = p.wikiweb.value;
      if (p.translator) cfg.reticle = p.translator.value;
      if (p.quality) cfg.quality = p.quality.value;
      if (p.clock) cfg.clock = p.clock.value;
      if (p.dimplates) cfg.dim = p.dimplates.value / 100;
      if (p.zonetour) cfg.zones = p.zonetour.value;
      if (p.comms) cfg.comms = p.comms.value;
      if (p.unseal) cfg.unseal = p.unseal.value;
      applyCfg();
    },
    applyGeneralProperties: function (p) {
      if (p.fps) cfg.fps = p.fps;
    },
    setPaused: function (isPaused) {
      paused = isPaused;
      if (!paused) start();
    }
  };

  function resize() {
    if (!engine) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    var cap = cfg.quality === 'low' ? 720 : cfg.quality === 'balanced' ? 1080 : 2160;
    var scale = Math.min(1, cap / (h * dpr));
    engine.resize(Math.round(w * dpr * scale), Math.round(h * dpr * scale));
    overlay.resize(w, h, dpr);
  }

  /* ---------- camera ---------- */

  function tourCam(realm, u) {
    var e = u * u * (3 - 2 * u);
    var sway = Math.sin(u * Math.PI * 2) * 0.12;
    switch (realm.pan) {
      case 'down': return [1.03 + 0.07 * u, sway, -0.95 + 1.9 * e];
      case 'up': return [1.03 + 0.07 * u, sway, 0.95 - 1.9 * e];
      case 'right': return [1.06 + 0.12 * u, -0.85 + 1.7 * e, sway * 0.6];
      case 'left': return [1.06 + 0.12 * u, 0.85 - 1.7 * e, sway * 0.6];
    }
    return [1.05 + 0.1 * u, 0, 0];
  }

  // Interactive: the mouse steers the view across the plate, the wheel pushes in.
  function steerCam(now, dt) {
    steer[0] += (mouse[0] * 0.95 - steer[0]) * Math.min(1, dt * 3.5);
    steer[1] += (mouse[1] * 0.95 - steer[1]) * Math.min(1, dt * 3.5);
    return [1.08 + zoomExtra + Math.sin(now * 0.21) * 0.015, steer[0], steer[1]];
  }

  function autoActive(nowMs) {
    if (cfg.mode === 'auto' || forced) return true;
    return cfg.idleResume > 0 && nowMs - lastInput > cfg.idleResume * 60000;
  }

  /* ---------- travel ---------- */

  function travel(to) {
    if (to < 0 || to >= REALMS.length) return;
    if (state.phase === 'trans' || (to === state.idx && state.pending < 0)) return;
    state.pending = to;
    state.zone = null;
    hud.opening(REALMS[to].name);
    ensure(REALMS[to].id, function () {
      if (state.pending !== to || state.phase === 'trans') return;
      state.pending = -1;
      state.next = to;
      state.phase = 'trans';
      state.t0 = performance.now() / 1000;
      state.arrived = false;
    });
  }

  /* ---------- input ---------- */

  function onAudio(arr) {
    if (!cfg.audio) { audioRaw[0] = audioRaw[1] = audioRaw[2] = 0; return; }
    var b = 0, m = 0, t = 0, i;
    for (i = 0; i < 6; i++) b += Math.min(arr[i], 1) + Math.min(arr[i + 64], 1);
    for (i = 8; i < 28; i++) m += Math.min(arr[i], 1) + Math.min(arr[i + 64], 1);
    for (i = 36; i < 64; i++) t += Math.min(arr[i], 1) + Math.min(arr[i + 64], 1);
    audioRaw[0] = (b / 12) * cfg.audioGain;
    audioRaw[1] = (m / 40) * cfg.audioGain;
    audioRaw[2] = (t / 56) * cfg.audioGain;
  }

  function pointer(e) {
    var now = performance.now();
    mouseTarget[0] = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget[1] = (e.clientY / window.innerHeight) * 2 - 1;
    lastMove = lastInput = now;
    if (overlay) overlay.pointer(e.clientX, e.clientY, now);
  }

  function down(e) {
    pointer(e);
    ripple = [e.clientX / window.innerWidth, e.clientY / window.innerHeight, 0];
    rippleStart = performance.now();
    if (overlay) overlay.burst(e.clientX, e.clientY);
  }

  function click(e) {
    if (!ready || e.target.closest('[data-travel]')) return;
    var node = overlay.hovered && overlay.pick(e.clientX, e.clientY, 26);
    if (node) {
      if (node.data.realm) {
        REALMS.forEach(function (r, i) { if (r.id === node.data.realm) travel(i); });
      } else {
        hud.pin(node);
      }
      return;
    }
    if (cfg.mode !== 'interactive' || cfg.hud === 'clean') return;
    if (state.zone !== null) { focusZone(null); return; }
    if (hud.ringOpen) hud.closeRing();
    else hud.openRing(e.clientX, e.clientY, state.idx);
  }

  // Interactive: click a pin to fly in, click it again (or empty space) to pull back.
  function focusZone(i) {
    var realm = REALMS[state.idx];
    if (i !== null && deep.zones(realm)[i] && deep.zones(realm)[i].sealed) { hud.toast('Sealed. The record keeps this zone folded.'); return; }
    state.zone = i === state.zone ? null : i;
    deep.setActive(realm, state.zone, state.idx);
  }

  function arriveAt(idx) {
    hud.arrive(idx);
    deep.reset();
    deep.active = REALMS[idx].id + ':null';
    arrivals++;
    if (cfg.comms && arrivals % 3 === 0) setTimeout(function () { comms.play(); }, 5000);
  }

  function wheel(e) {
    lastInput = performance.now();
    if (cfg.mode !== 'interactive') return;
    zoomExtra = Math.max(0, Math.min(0.7, zoomExtra - e.deltaY * 0.0006));
  }

  /* ---------- frame ---------- */

  function frame(nowMs) {
    raf = 0;
    if (paused || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (cfg.fps < 59 && nowMs - lastFrame < 1000 / cfg.fps - 2) return;
    lastFrame = nowMs;

    engine.pump();
    var now = nowMs / 1000;
    var dt = Math.min(0.1, lastTick ? now - lastTick : 0.016);
    lastTick = now;

    for (var i = 0; i < 3; i++) {
      var k = audioRaw[i] > audio[i] ? 0.5 : 0.08;
      audio[i] += (audioRaw[i] - audio[i]) * k;
    }

    if (nowMs - lastMove > 4000) {
      mouseTarget[0] = Math.sin(now * 0.11) * 0.35;
      mouseTarget[1] = Math.sin(now * 0.07 + 1.3) * 0.25;
    }
    mouse[0] += (mouseTarget[0] - mouse[0]) * Math.min(1, dt * 9);
    mouse[1] += (mouseTarget[1] - mouse[1]) * Math.min(1, dt * 9);

    var cur = REALMS[state.idx];
    var mix = 0, warp = 0, flash = 0, camA, camB;
    var touring = autoActive(nowMs);

    var activeZone = null;
    if (state.phase === 'dwell') {
      if (!touring) state.t0 = now;
      var u = Math.min(1, (now - state.t0) / cfg.seconds);
      var aim, rate = 2.5;
      if (touring) {
        // The tour stops at up to two open zones inside the realm before the rift.
        var plan = cfg.zones ? deep.plan(cur, u) : { zone: null, intro: u };
        activeZone = plan.zone;
        aim = plan.cam || tourCam(cur, plan.intro);
        if (plan.cam) rate = 1.3;
        if (state.zone !== null) state.zone = null;
        deep.setActive(cur, activeZone, state.idx);
      } else if (state.zone !== null) {
        activeZone = state.zone;
        steer[0] += (mouse[0] - steer[0]) * Math.min(1, dt * 2.5);
        steer[1] += (mouse[1] - steer[1]) * Math.min(1, dt * 2.5);
        aim = deep.focusCam(cur, state.zone, steer) || steerCam(now, dt);
        rate = 1.3;
      } else {
        aim = steerCam(now, dt);
        deep.setActive(cur, null, state.idx);
      }
      // A zone reached while the realm title is still up (short dwell, or a quick click) clears the title.
      if (activeZone !== null) document.getElementById('title-card').classList.remove('on');
      var kk = Math.min(1, dt * rate);
      state.cam = state.cam.map(function (c, j) { return c + (aim[j] - c) * kk; });
      camA = camB = state.cam;
      if (touring && u >= 1 && state.pending < 0) travel((state.idx + 1) % REALMS.length);
    }

    var nextRealm = REALMS[state.next];
    if (state.phase === 'trans') {
      var m = Math.min(1, (now - state.t0) / TRANSITION);
      camA = state.cam;
      camB = touring ? tourCam(nextRealm, 0) : [1.08 + zoomExtra, steer[0] * 0.3, steer[1] * 0.3];
      mix = m;
      warp = Math.pow(Math.sin(Math.PI * m), 1.2);
      flash = Math.exp(-Math.pow((m - 0.56) / 0.06, 2)) * 0.28;
      if (!state.arrived && m > 0.58) { state.arrived = true; arriveAt(state.next); }
      if (m >= 1) {
        state.idx = state.next;
        state.phase = 'dwell';
        state.t0 = now;
        cur = REALMS[state.idx];
        mix = 0; warp = 0; flash = 0;
        camA = camB;
        steer[0] *= 0.3; steer[1] *= 0.3;
        state.cam = camA;
        ensure(REALMS[(state.idx + 1) % REALMS.length].id);
      }
    }

    // Technical difficulties: the rift stutters and throws glyphs.
    if (glitch) {
      warp = Math.max(warp, 0.08 + 0.07 * Math.sin(now * 9) + (Math.sin(now * 23.7) > 0.93 ? 0.45 : 0));
      if (nowMs > nextGlitch) {
        nextGlitch = nowMs + 1400 + Math.random() * 2200;
        var gx = window.innerWidth * (0.2 + Math.random() * 0.6), gy = window.innerHeight * (0.2 + Math.random() * 0.6);
        overlay.burst(gx, gy);
        ripple = [gx / window.innerWidth, gy / window.innerHeight, 0];
        rippleStart = nowMs;
      }
    }

    if (rippleStart >= 0) {
      ripple[2] = (nowMs - rippleStart) / 1100;
      if (ripple[2] >= 1) { ripple[2] = 1; rippleStart = -1; }
    }

    var b = mix > 0 ? nextRealm : cur;
    engine.render({
      time: now % 3600, mouse: mouse, a: cur, b: b, camA: camA, camB: camB,
      mix: mix, warp: warp, flash: flash,
      dim: Math.min(0.85, cfg.dim + (cur.dim || 0) * (1 - mix) + (b.dim || 0) * mix), accent: cfg.accent,
      audio: audio, ripple: ripple, drift: state.idx * 7.3
    });

    overlay.titleOn = cfg.hud !== 'clean' && (document.getElementById('title-card').classList.contains('on') || cardUp());
    overlay.update(dt, nowMs, warp, audio[0]);
    overlay.draw(nowMs, accentHex(), warp);
    deep.pins(cur, state.cam, state.phase === 'dwell' && cfg.hud !== 'clean' && (cfg.mode === 'interactive' && !touring || activeZone !== null),
      touring ? 'auto' : cfg.mode, activeZone);
    if (cfg.hud !== 'clean') {
      hud.wiki(overlay.hovered, window.innerWidth, window.innerHeight);
      hud.translate(overlay.mouse.x, overlay.mouse.y, overlay.reticleGlyph,
        cfg.reticle && !overlay.hovered && !hud.ringOpen ? (overlay.reticleAlpha || 0) : 0);
      if (Math.floor(nowMs / 250) !== Math.floor((nowMs - 16) / 250)) {
        hud.setStability(glitch ? 0.08 + Math.random() * 0.2 : 0.9 - audio[0] * 0.35 - warp * 0.4 + Math.sin(now * 0.7) * 0.02);
      }
    }
  }

  function start() {
    if (!ready || raf || paused) return;
    lastTick = 0;
    raf = requestAnimationFrame(frame);
  }

  function boot() {
    try {
      engine = new window.RiftEngine(document.getElementById('gl'));
    } catch (err) {
      document.body.classList.add('no-gl');
      document.getElementById('gl').style.display = 'none';
      return;
    }
    overlay = new window.RiftOverlay(document.getElementById('fx'));
    hud = new window.RiftHud();
    hud.onTravel = function (i) { lastInput = performance.now(); travel(i); };
    hud.onZone = function (i) { lastInput = performance.now(); if (cfg.mode === 'interactive') focusZone(i); };
    deep = new window.RiftDeep(engine, hud);
    comms = new window.RiftComms();
    unseal = new window.RiftUnseal(hud, overlay);

    resize();

    var startIdx = 0;
    if (cfg.realm === 'random') startIdx = Math.floor(Math.random() * REALMS.length);
    else if (cfg.realm) REALMS.forEach(function (r, i) { if (r.id === cfg.realm) startIdx = i; });
    state.idx = state.next = startIdx;

    // The first realm starts the flight; the next one loads behind it.
    ensure(REALMS[startIdx].id, function () {
      applyCfg();
      state.t0 = performance.now() / 1000;
      state.cam = tourCam(REALMS[startIdx], 0);
      arriveAt(state.idx);
      ready = true;
      start();
      ensure(REALMS[(startIdx + 1) % REALMS.length].id);
      if (cfg.unseal) {
        setTimeout(function () { unseal.run(); }, 3000);
        setInterval(function () { if (cfg.unseal) unseal.run(); }, 6 * 3600 * 1000);
      }
    });
  }



  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', pointer);
  window.addEventListener('mousedown', down);
  window.addEventListener('click', click);
  window.addEventListener('wheel', wheel, { passive: true });
  document.addEventListener('visibilitychange', start);

  if (window.wallpaperRegisterAudioListener) window.wallpaperRegisterAudioListener(onAudio);

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var go = boot;

  fontsReady.then(go, go);
})();
