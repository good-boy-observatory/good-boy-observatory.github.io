/* The background: a wall of nebula plates, every one of them drawn here rather
   than downloaded. Each plate is its own <canvas> so it can carry a real border
   and shadow and sit at a slightly wrong angle, the way a pinned photograph does.

   A plate is fractal value noise (5 octaves) coloured through a two-hue ramp,
   rendered small and scaled up — the upscale is what gives the gas its softness —
   then dusted with crisp stars drawn at full resolution on top. */

(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- deterministic noise ------------------------------------------------ */

  function makeRandom(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;  s >>>= 0;
      return s / 4294967296;
    };
  }

  function hash2(x, y, seed) {
    var h = x * 374761393 + y * 668265263 + seed * 1442695040;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  function valueNoise(x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = smooth(x - xi), yf = smooth(y - yi);
    var a = hash2(xi, yi, seed),     b = hash2(xi + 1, yi, seed);
    var c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return (a + (b - a) * xf) + ((c + (d - c) * xf) - (a + (b - a) * xf)) * yf;
  }

  function fbm(x, y, seed, octaves) {
    var v = 0, amp = 0.5, freq = 1, norm = 0;
    for (var i = 0; i < octaves; i++) {
      v += valueNoise(x * freq, y * freq, seed + i * 101) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return v / norm;
  }

  /* ---- one nebula --------------------------------------------------------- */

  /* Hues chosen to sit together on a wall: dust-lane reds, ion blues, a little
     teal and violet. Each entry is [core hue, outer hue] in degrees. */
  var PALETTES = [
    [212, 268], [284, 214], [190, 236], [330, 266], [246, 200],
    [258, 306], [200, 250], [274, 322], [222, 186], [206, 292]
  ];

  function drawNebula(canvas, w, h, seed) {
    var rnd = makeRandom(seed * 2654435761 + 12345);
    var pal = PALETTES[Math.floor(rnd() * PALETTES.length)];
    var hueA = pal[0], hueB = pal[1];

    /* low-resolution gas, upscaled later */
    var LW = 220, LH = Math.max(100, Math.round(220 * h / w));
    var low = document.createElement('canvas');
    low.width = LW; low.height = LH;
    var lctx = low.getContext('2d');
    var img = lctx.createImageData(LW, LH);
    var px = img.data;

    /* two glowing cores the gas gathers around */
    var cores = [];
    var nCores = 1 + Math.floor(rnd() * 2);
    for (var c = 0; c < nCores; c++) {
      cores.push({ x: 0.18 + rnd() * 0.64, y: 0.18 + rnd() * 0.64, r: 0.14 + rnd() * 0.22 });
    }

    var scale = 4.2 + rnd() * 4.5;
    var warp = 0.6 + rnd() * 1.1;
    var noiseSeed = Math.floor(rnd() * 100000);
    /* some plates are faint fields, some are loud — a wall of equals is boring */
    var intensity = 0.85 + rnd() * 0.85;

    for (var y = 0; y < LH; y++) {
      for (var x = 0; x < LW; x++) {
        var u = x / LW, v = y / LH;

        /* domain warp: pushes the noise into filaments instead of blobs */
        var wx = fbm(u * scale + 4.3, v * scale, noiseSeed + 7, 3) - 0.5;
        var wy = fbm(u * scale, v * scale + 9.1, noiseSeed + 23, 3) - 0.5;
        var base = fbm(u * scale + wx * warp, v * scale + wy * warp, noiseSeed, 5);

        /* ridged noise on top: this is what makes filaments and dust lanes
           instead of one soft blob */
        var ridge = 1 - Math.abs(fbm(u * scale * 1.9 + wx, v * scale * 1.9 + wy, noiseSeed + 313, 4) * 2 - 1);
        var d = base * 0.5 + ridge * ridge * 0.6;

        /* dust lanes: a second ridge, subtracted, so dark veins cut across the
           gas the way they do in a real plate */
        var lane = 1 - Math.abs(fbm(u * scale * 1.35 + 17.3, v * scale * 1.35 - 8.1, noiseSeed + 977, 3) * 2 - 1);
        d *= 1 - 0.62 * Math.pow(lane, 2.5);

        /* high-frequency mottling, so the gas has grain instead of reading as
           one smooth cloud */
        d *= 0.68 + 0.62 * fbm(u * scale * 5.5, v * scale * 5.5, noiseSeed + 555, 3);

        /* pull density toward the cores, fade it at the plate edges */
        var glow = 0;
        for (var k = 0; k < cores.length; k++) {
          var dx = u - cores[k].x, dy = (v - cores[k].y) * (h / w > 1 ? 1 : 0.9);
          var dist = Math.sqrt(dx * dx + dy * dy);
          glow = Math.max(glow, Math.max(0, 1 - dist / cores[k].r));
        }
        var edge = Math.min(1, Math.min(u, 1 - u) * 5) * Math.min(1, Math.min(v, 1 - v) * 5);
        var density = Math.pow(Math.max(0, d * 1.05 + glow * 0.62 - 0.24), 1.5) * (0.2 + edge * 0.8);
        density = Math.min(1, Math.pow(density * 4.4 * intensity, 1.32));

        /* colour: hot core hue in the dense parts, cooler hue in the wisps */
        var hue = hueA + (hueB - hueA) * (1 - Math.min(1, density * 1.3));
        var sat = 0.95 - 0.3 * density * density;        /* only the very core burns toward white */
        var lum = 0.018 + Math.pow(density, 1.25) * 0.56;
        var rgb = hsl(hue, sat, lum);

        var i = (y * LW + x) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]; px[i + 3] = 255;
      }
    }
    lctx.putImageData(img, 0, 0);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#04050c';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(low, 0, 0, w, h);

    /* crisp stars, drawn after the upscale so they stay sharp */
    var stars = Math.round(w * h / 620);
    for (var s = 0; s < stars; s++) {
      var sx = rnd() * w, sy = rnd() * h;
      var mag = rnd();
      var r = mag > 0.97 ? 1.5 : mag > 0.8 ? 0.9 : 0.55;
      ctx.globalAlpha = 0.25 + rnd() * 0.75;
      ctx.fillStyle = rnd() > 0.85 ? '#cfe3ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, 6.284);
      ctx.fill();
      if (r === 1.5) {                      /* the brightest few get a halo */
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(sx, sy, 4.5, 0, 6.284);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    var vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(2,3,8,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    function ch(t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [Math.round(ch(h + 1 / 3) * 255), Math.round(ch(h) * 255), Math.round(ch(h - 1 / 3) * 255)];
  }

  /* ---- the collage -------------------------------------------------------- */

  function layout() {
    var host = document.getElementById('collage');
    if (!host) return;
    host.innerHTML = '';

    var vw = window.innerWidth, vh = window.innerHeight;
    /* overscan so the slow drift never exposes an edge */
    var W = vw * 1.18, H = vh * 1.18;
    var cols = vw < 560 ? 2 : vw < 900 ? 3 : vw < 1400 ? 4 : 5;
    var cellW = W / cols;
    var rows = Math.ceil(H / (cellW * 0.78));
    var cellH = H / rows;

    var rnd = makeRandom(20260817);
    var taken = {};
    var seed = 1;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (taken[r + ':' + c]) continue;

        /* occasionally a plate spans two cells, which is what stops the wall
           from reading as a grid */
        var wide = c + 1 < cols && !taken[r + ':' + (c + 1)] && rnd() > 0.72;
        var tall = !wide && r + 1 < rows && rnd() > 0.8;
        if (wide) taken[r + ':' + (c + 1)] = true;
        if (tall) taken[(r + 1) + ':' + c] = true;

        var pw = cellW * (wide ? 2 : 1) - 11;
        var ph = cellH * (tall ? 2 : 1) - 11;

        var plate = document.createElement('canvas');
        plate.className = 'plate-bg';
        plate.style.width = pw + 'px';
        plate.style.height = ph + 'px';
        plate.style.left = (c * cellW - (W - vw) / 2 + 5 + (rnd() - 0.5) * 8) + 'px';
        plate.style.top = (r * cellH - (H - vh) / 2 + 5 + (rnd() - 0.5) * 8) + 'px';
        plate.style.transform = 'rotate(' + ((rnd() - 0.5) * 3).toFixed(2) + 'deg)';
        plate.style.zIndex = String(Math.floor(rnd() * 6));
        plate.style.opacity = (0.7 + rnd() * 0.25).toFixed(2);

        drawNebula(plate, pw, ph, seed++);
        host.appendChild(plate);
      }
    }
    host.classList.toggle('drifting', !reduced);
  }

  /* ---- stars in the seams ------------------------------------------------- */

  function starfield() {
    var cv = document.getElementById('sky');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth, h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#03040a';
    ctx.fillRect(0, 0, w, h);
    var rnd = makeRandom(4242);
    for (var i = 0, n = Math.round(w * h / 2600); i < n; i++) {
      ctx.globalAlpha = 0.2 + rnd() * 0.6;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, rnd() > 0.94 ? 1.2 : 0.6, 0, 6.284);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function build() { starfield(); layout(); }

  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(build, 250);
  });

  build();
})();
