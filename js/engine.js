/* WebGL layer: cosmos, the realm plate, rift-tear transitions, speed lines. One full-screen pass. */
(function () {
  'use strict';

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;',
    'uniform sampler2D uTexA; uniform sampler2D uTexB;',
    'uniform vec2 uSizeA; uniform vec2 uSizeB;',
    'uniform vec3 uCamA; uniform vec3 uCamB;',
    'uniform float uMix; uniform float uWarp; uniform float uFlash; uniform float uDim;',
    'uniform vec3 uA1; uniform vec3 uA2; uniform vec3 uB1; uniform vec3 uB2;',
    'uniform vec3 uAccent; uniform vec3 uAudio;',
    'uniform vec3 uRipple;',
    'uniform float uDrift;',

    'float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }',

    // Cover-fit a plate onto the screen, then zoom and pan inside the overflow.
    'vec2 plateUV(vec2 s, vec2 size, vec3 cam){',
    '  float ia = size.x / size.y; float sa = uRes.x / uRes.y;',
    '  vec2 range = ia > sa ? vec2(sa / ia, 1.0) : vec2(1.0, ia / sa);',
    '  range /= cam.x;',
    '  vec2 c = 0.5 + cam.yz * (1.0 - range) * 0.5;',
    '  return c + (s - 0.5) * range; }',

    'vec3 tapPlate(sampler2D t, vec2 uv){ return texture2D(t, clamp(uv, 0.001, 0.999)).rgb; }',

    'vec3 samplePlate(sampler2D t, vec2 s, vec2 size, vec3 cam, float blur){',
    '  if (blur < 0.01) return tapPlate(t, plateUV(s, size, cam));',
    '  vec3 acc = vec3(0.0); vec2 dir = s - 0.5;',
    '  for (int i = 0; i < 7; i++){',
    '    float k = float(i) / 6.0; vec2 ss = 0.5 + dir * (1.0 - blur * 0.22 * k);',
    '    float ca = blur * 0.012;',
    '    acc.r += tapPlate(t, plateUV(0.5 + (ss - 0.5) * (1.0 + ca), size, cam)).r;',
    '    acc.g += tapPlate(t, plateUV(ss, size, cam)).g;',
    '    acc.b += tapPlate(t, plateUV(0.5 + (ss - 0.5) * (1.0 - ca), size, cam)).b; }',
    '  return acc / 7.0; }',

    'vec3 cosmos(vec2 uv, vec3 c1, vec3 c2, float speed){',
    '  float r = length(uv); float a = atan(uv.y, uv.x);',
    '  vec2 tun = vec2(a * 0.9549, 0.35 / (r + 0.06) - uTime * speed);',
    '  float n = fbm(vec2(tun.x * 3.0, tun.y) + uDrift);',
    '  float n2 = fbm(uv * 2.2 + vec2(uTime * 0.015, -uTime * 0.01) + n);',
    '  vec3 col = mix(c2 * 0.35, c1, smoothstep(0.35, 0.95, n2));',
    '  col *= 0.25 + 0.75 * smoothstep(0.25, 0.85, n);',
    '  col += c1 * 0.55 * exp(-r * 3.2);',
    '  float rays = pow(vnoise(vec2(a * 9.0, uTime * 0.12)), 4.0) * exp(-r * 1.4);',
    '  col += mix(c1, vec3(1.0), 0.4) * rays * (0.35 + uAudio.y * 0.6);',
    '  return col * (0.8 + uAudio.x * 0.6); }',

    'vec3 stars(vec2 uv, float density, float bright){',
    '  vec3 col = vec3(0.0); float r = length(uv); vec2 dir = uv / max(r, 1e-3); vec2 perp = vec2(-dir.y, dir.x);',
    '  for (int i = 0; i < 4; i++){',
    '    float fi = float(i);',
    '    float depth = fract(fi * 0.25 + uTime * (0.035 + uWarp * 0.5));',
    '    float scale = mix(22.0 * density, 1.2, depth);',
    '    float fade = smoothstep(0.0, 0.25, depth) * smoothstep(1.0, 0.85, depth);',
    '    vec2 p = uv * scale + fi * 37.13;',
    '    vec2 id = floor(p); vec2 f = fract(p) - 0.5;',
    '    float rnd = h21(id + fi);',
    '    if (rnd < 0.55) continue;',
    '    vec2 off = vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5;',
    '    vec2 d = f - off * 0.7;',
    '    float along = dot(d, dir); float across = dot(d, perp);',
    // Streaks stay inside their grid cell and fade before its border, or the cell edge cuts them into boxes.
    '    float stretch = 1.0 + uWarp * 7.0 * depth;',
    '    float s = length(vec2(along / stretch, across));',
    '    float cellFade = smoothstep(0.5, 0.32, max(abs(f.x), abs(f.y)));',
    '    float core = (smoothstep(0.035 + 0.02 * depth, 0.0, s) + 0.18 * (1.0 - uWarp * 0.8) * smoothstep(0.16, 0.0, s)) * cellFade;',
    '    float tw = 0.6 + 0.4 * sin(uTime * (2.0 + rnd * 4.0) + rnd * 40.0);',
    '    vec3 tint = mix(vec3(1.0), mix(uA1, uB1, uMix), 0.35 * h21(id + 9.0));',
    '    col += tint * core * fade * tw * bright; }',
    '  return col; }',

    'void main(){',
    '  vec2 frag = gl_FragCoord.xy;',
    '  vec2 uv = (frag - 0.5 * uRes) / uRes.y;',
    '  vec2 s = vec2(frag.x / uRes.x, 1.0 - frag.y / uRes.y);',
    '  float t = uMix;',

    // Click ripple: a shock ring that bends the plate.
    '  vec2 rc = (uRipple.xy - 0.5) * vec2(uRes.x / uRes.y, -1.0);',
    '  float rd = length(uv - rc); float ring = 0.0;',
    '  if (uRipple.z < 1.0) { ring = exp(-pow((rd - uRipple.z * 0.9) * 16.0, 2.0)) * (1.0 - uRipple.z);',
    '    s += normalize(uv - rc + 1e-4) * vec2(1.0, -1.0) * ring * 0.018; }',

    '  vec2 par = uMouse * vec2(0.012, -0.012);',
    '  float r = length(uv);',

    // Soft frame: the plate melts into the cosmos at the screen edges.
    '  float ed = min(min(s.x, 1.0 - s.x) * uRes.x / uRes.y, min(s.y, 1.0 - s.y));',
    '  float en = ed < 0.34 ? fbm(s * 7.0 + uTime * 0.05) : 0.5;',
    '  float frame = smoothstep(0.0, 0.22, ed + (en - 0.5) * 0.1);',
    '  float presence = mix(0.94, 0.55, uWarp) * frame;',

    // The cosmos only gets its full noise where it actually shows through.
    '  vec3 c1 = mix(uA1, uB1, smoothstep(0.3, 0.7, t)); vec3 c2 = mix(uA2, uB2, smoothstep(0.3, 0.7, t));',
    '  vec3 col;',
    '  if (presence < 0.9 || uWarp > 0.01) {',
    '    col = cosmos(uv + uMouse * 0.03, c1, c2, 0.05 + uWarp * 0.9);',
    '    col += stars(uv + uMouse * 0.05, 1.0, 1.1 + uAudio.z);',
    '  } else { col = c2 * 0.3 + c1 * 0.5 * exp(-r * 3.2); }',

    // Plates. A flies in and away, B arrives from the far side of the tear.
    '  vec3 camA = vec3(uCamA.x * (1.0 + 2.2 * t * t), uCamA.yz);',
    '  vec3 camB = vec3(uCamB.x * (1.0 + 0.55 * (1.0 - t) * (1.0 - t)), uCamB.yz);',
    '  vec3 pa = samplePlate(uTexA, s + par, uSizeA, camA, uWarp * (1.0 - t));',
    '  vec3 pb = t > 0.0 ? samplePlate(uTexB, s + par, uSizeB, camB, uWarp * t) : pa;',

    '  float n = 0.5; float key = r * 0.85;',
    '  if (t > 0.0 && t < 1.0) { n = fbm(uv * 2.6 + vec2(uTime * 0.07, 0.0)); key += (n - 0.5) * 0.45; }',
    '  float edge = t * 1.55 - 0.28;',
    '  float wB = t <= 0.0 ? 0.0 : (t >= 1.0 ? 1.0 : smoothstep(edge + 0.03, edge - 0.03, key));',
    '  vec3 plate = mix(pa, pb, wB);',
    '  plate *= 1.0 - uDim;',
    '  col = mix(col, plate, presence);',
    '  float fringe = exp(-abs(ed + (en - 0.5) * 0.08 - 0.05) * 40.0) * 0.35;',
    '  col += mix(vec3(0.27, 1.0, 0.55), uAccent, 0.5) * fringe * (0.5 + uAudio.x);',

    // Rift-tear edge glow during the transition.
    '  if (t > 0.0 && t < 1.0) { float g = exp(-abs(key - edge) * 38.0);',
    '    vec3 gc = mix(vec3(0.3, 1.0, 0.6), uAccent, 0.45 + 0.3 * sin(uTime * 3.0 + n * 6.0));',
    '    col += gc * g * 1.6 * sin(3.14159 * t); }',

    // Foreground motes that pass over the plate sell the forward motion.
    '  col += stars(uv * 0.55 + uMouse * 0.09, 0.45, 0.55 + uWarp);',

    // Speed lines.
    '  if (uWarp > 0.01) {',
    '    float a = atan(uv.y, uv.x) / 6.28318 * 140.0;',
    '    float cell = floor(a); float fa = abs(fract(a) - 0.5);',
    '    float hh = h21(vec2(cell, floor(uTime * 14.0)));',
    '    float line = step(0.8, hh) * smoothstep(0.12, 0.0, fa) * smoothstep(0.32, 0.95, r);',
    '    col += vec3(1.0, 0.97, 0.9) * line * uWarp * 0.75; }',

    '  col += uAccent * ring * 0.9;',
    '  col += vec3(1.0, 0.96, 0.88) * uFlash;',

    '  float vig = smoothstep(1.15, 0.3, length((s - 0.5) * vec2(uRes.x / uRes.y, 1.0)));',
    '  col *= mix(0.42, 1.0, vig);',
    '  col = col / (1.0 + col * 0.18);',
    '  col = pow(col, vec3(0.96));',
    '  col += (h21(frag + fract(uTime) * 100.0) - 0.5) * 0.025;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function hexToRgb(hex) {
    var v = parseInt(hex.replace('#', ''), 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }

  function Engine(canvas) {
    this.canvas = canvas;
    var opts = { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    // WebGL2 can mipmap non-power-of-two plates, which keeps 4K art clean when it is drawn smaller.
    var gl = canvas.getContext('webgl2', opts);
    this.mips = !!gl;
    if (!gl) gl = canvas.getContext('webgl', opts);
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    this.prog = this.build(VERT, FRAG);
    gl.useProgram(this.prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(this.prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    var names = ['uRes', 'uTime', 'uMouse', 'uTexA', 'uTexB', 'uSizeA', 'uSizeB', 'uCamA', 'uCamB', 'uMix', 'uWarp', 'uFlash', 'uDim',
      'uA1', 'uA2', 'uB1', 'uB2', 'uAccent', 'uAudio', 'uRipple', 'uDrift'];
    for (var i = 0; i < names.length; i++) this.u[names[i]] = gl.getUniformLocation(this.prog, names[i]);
    gl.uniform1i(this.u.uTexA, 0);
    gl.uniform1i(this.u.uTexB, 1);
    this.textures = {};
    this.queue = [];
  }

  Engine.prototype.build = function (vs, fs) {
    var gl = this.gl;
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };

  Engine.prototype.addTexture = function (id, img) {
    var gl = this.gl;
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var src = img;
    if (Math.max(w, h) > this.maxTex) {
      var k = this.maxTex / Math.max(w, h);
      src = document.createElement('canvas');
      src.width = Math.floor(w * k); src.height = Math.floor(h * k);
      src.getContext('2d').drawImage(img, 0, 0, src.width, src.height);
      w = src.width; h = src.height;
    }
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    if (this.mips) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures[id] = { tex: tex, w: w, h: h };
  };

  // WebGL2 path: the plate arrives as decoded strips and goes up one strip per frame,
  // so a 4K plate never freezes the flight. strips: [{ y, bmp }]
  Engine.prototype.addStripsAsync = function (id, w, h, strips, immediate) {
    var self = this, gl = this.gl;
    return Promise.resolve().then(function () {
      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return new Promise(function (res) {
        self.queue.push({ id: id, tex: tex, w: w, h: h, strips: strips, i: 0, done: res });
        if (immediate) while (self.queue.length) self.pump();
      });
    });
  };

  Engine.prototype.pump = function () {
    var job = this.queue[0];
    if (!job) return;
    var gl = this.gl, s = job.strips[job.i];
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, job.tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, s.y, gl.RGBA, gl.UNSIGNED_BYTE, s.bmp);
    s.bmp.close();
    if (++job.i >= job.strips.length) {
      this.queue.shift();
      this.textures[job.id] = { tex: job.tex, w: job.w, h: job.h };
      job.done();
    }
  };

  Engine.prototype.dropTexture = function (id) {
    var t = this.textures[id];
    if (!t) return;
    this.gl.deleteTexture(t.tex);
    delete this.textures[id];
  };

  Engine.prototype.resize = function (w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  };

  // f: frame state from main.js
  Engine.prototype.render = function (f) {
    var gl = this.gl, u = this.u;
    var A = this.textures[f.a.id], B = this.textures[f.b.id];
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform2f(u.uMouse, f.mouse[0], f.mouse[1]);
    gl.uniform2f(u.uSizeA, A.w, A.h);
    gl.uniform2f(u.uSizeB, B.w, B.h);
    gl.uniform3fv(u.uCamA, f.camA);
    gl.uniform3fv(u.uCamB, f.camB);
    gl.uniform1f(u.uMix, f.mix);
    gl.uniform1f(u.uWarp, f.warp);
    gl.uniform1f(u.uFlash, f.flash);
    gl.uniform1f(u.uDim, f.dim);
    gl.uniform3fv(u.uA1, hexToRgb(f.a.palette[0]));
    gl.uniform3fv(u.uA2, hexToRgb(f.a.palette[1]));
    gl.uniform3fv(u.uB1, hexToRgb(f.b.palette[0]));
    gl.uniform3fv(u.uB2, hexToRgb(f.b.palette[1]));
    gl.uniform3fv(u.uAccent, f.accent);
    gl.uniform3fv(u.uAudio, f.audio);
    gl.uniform3fv(u.uRipple, f.ripple);
    gl.uniform1f(u.uDrift, f.drift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  window.RiftEngine = Engine;
})();
