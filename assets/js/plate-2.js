/* ADR Solutions — Plate 2 preview.
   Same plate outline; four large wells in a 2x2 grid with distinct
   phenotypic readouts:
     • magma-like fluid blob
     • mixed-style worms with dye-uptake count (X / 50)
     • rainbow paralyzed worms — scattered ↔ lined-up (bottoms aligned)
     • green worms with red dye stains, motile                          */
(function () {
  var canvas = document.getElementById('hero-canvas-2');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0, DPR = 1;
  var wells = [];
  var startTs = performance.now();
  var lastFrameTs = performance.now();

  function rng() { return Math.random(); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildWells();
  }

  function buildWells() {
    var pad = W * 0.012;
    var colW = (W - pad * 2) / 5;
    // Slightly smaller circles than before — driven by colW, capped by H.
    var r = Math.min(colW * 0.40, H * 0.44);
    var cy = H * 0.5;
    var cx0 = pad + colW * 0.5;

    wells = [
      makeWell('magma',         cx0,            cy, r),
      makeWell('dose-response', cx0 + colW,     cy, r),
      makeWell('dye-uptake',    cx0 + 2 * colW, cy, r),
      makeWell('ion-channel',   cx0 + 3 * colW, cy, r),
      makeWell('rainbow',       cx0 + 4 * colW, cy, r)
    ];
  }

  // Each well is a circle with an inscribed-square content box.
  // Drawing code still uses well.x / y / w / h for content layout —
  // worms placed inside the inscribed square stay inside the circle.
  function makeWell(type, cx, cy, r) {
    var size = r * 1.414;
    var well = {
      type: type,
      cx: cx, cy: cy, r: r,
      x: cx - size / 2,
      y: cy - size / 2,
      w: size, h: size
    };
    initContent(well);
    return well;
  }

  function initContent(well) {
    if (well.type === 'magma') {
      // Mixed palette — magma → orange → red → magenta → violet
      var palettes = [
        // core, mid, outer (rgba alpha applied in draw)
        ['rgba(255, 245, 200, ', 'rgba(255, 170,  40, ', 'rgba(190,  40,   0, '],   // hot magma
        ['rgba(255, 200, 230, ', 'rgba(220,  60, 150, ', 'rgba(100,   0,  80, '],   // magenta
        ['rgba(240, 210, 255, ', 'rgba(150,  70, 220, ', 'rgba( 60,  10, 110, '],   // violet
        ['rgba(255, 220, 170, ', 'rgba(255, 110,  40, ', 'rgba(180,  20,  20, '],   // orange-red
        ['rgba(255, 240, 180, ', 'rgba(255, 160,  40, ', 'rgba(220,  40,  10, ']    // gold-magma
      ];
      var blobs = [];
      for (var i = 0; i < 5; i++) {
        // Random angular wobble harmonics — these give the blob an
        // amorphous, slowly morphing outline (not a stretched ellipse).
        var harmonics = [];
        var ks = [2, 3, 5, 7];
        for (var h = 0; h < ks.length; h++) {
          harmonics.push({
            k:     ks[h],
            amp:   (0.10 + rng() * 0.10) / (0.6 + 0.4 * h), // lower-frequency = bigger amp
            phase: rng() * Math.PI * 2,
            freq:  0.0004 + rng() * 0.0009     // very slow morph
          });
        }
        blobs.push({
          fx: 0.32 + 0.09 * i, fy: 0.30 + 0.10 * (i % 3),
          phaseX: rng() * Math.PI * 2,
          phaseY: rng() * Math.PI * 2,
          speedX: 0.00010 + rng() * 0.00018,   // slower translation
          speedY: 0.00010 + rng() * 0.00018,
          ampX:   0.05 + rng() * 0.07,         // much smaller orbital amplitude
          ampY:   0.05 + rng() * 0.07,
          radius: 0.24 + rng() * 0.10,
          palette: palettes[i % palettes.length],
          harmonics: harmonics
        });
      }
      well.blobs = blobs;
    }
    else if (well.type === 'dye-uptake') {
      // Two populations only: dead (blue, empty outline) and alive (green, slithering)
      var styles = [];
      for (var i = 0; i < 8;  i++) styles.push('dead-blue');
      for (var i = 0; i < 14; i++) styles.push('alive-green');
      for (var i = styles.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = styles[i]; styles[i] = styles[j]; styles[j] = tmp;
      }
      var worms = [];
      for (var i = 0; i < styles.length; i++) {
        // Polar placement across the WHOLE well (1 unit = well radius).
        var pr = rng() * 0.78;
        var pa = rng() * Math.PI * 2;
        worms.push({
          fx: pr * Math.cos(pa),                  // -1..1 in well-radius units
          fy: pr * Math.sin(pa),
          phase:  rng() * Math.PI * 2,
          freq:   2.8 + rng() * 0.8,
          ampF:   0.85 + rng() * 0.3,
          waveSpeed: 0.0040 + rng() * 0.0030,
          swimSpeed: 0.00012 + rng() * 0.00010,   // frac of well radius / ms
          angle:  rng() * Math.PI * 2,
          turnPhase: rng() * 1000,
          turnRate:  0.00015 + rng() * 0.00020,
          turnAmp:   0.7 + rng() * 0.8,
          size:     0.85 + rng() * 0.4,
          style:    styles[i]
        });
      }
      well.worms = worms;
    }
    else if (well.type === 'rainbow') {
      var worms = [];
      var N = 11;
      for (var i = 0; i < N; i++) {
        // Polar placement across the whole well (1 unit = well radius)
        var pr = rng() * 0.78;
        var pa = rng() * Math.PI * 2;
        worms.push({
          // Dynamic motion state — these update each frame in the scattered phase
          fx: pr * Math.cos(pa),
          fy: pr * Math.sin(pa),
          angle: rng() * Math.PI * 2,
          turnPhase: rng() * 1000,
          turnRate:  0.00018 + rng() * 0.00025,
          turnAmp:   0.8 + rng() * 0.9,
          swimSpeed: 0.00010 + rng() * 0.00010,    // frac of well radius / ms
          waveSpeed: 0.0035 + rng() * 0.0025,
          phase:     rng() * Math.PI * 2,
          freq:      2.2 + rng() * 0.9,
          ampF:      0.85 + rng() * 0.35,
          size:      0.45 + rng() * 0.55,
          // Per-worm taper exponents (varied tapering at tail and head)
          tailExp: 0.35 + rng() * 1.8,
          headExp: 0.35 + rng() * 1.8
        });
      }
      // sort by size so lined-up phase reads as a clean distribution
      worms.sort(function(a, b) { return a.size - b.size; });
      for (var i = 0; i < worms.length; i++) worms[i].hue = i / (N - 1);
      well.worms = worms;
    }
    else if (well.type === 'dose-response') {
      var nConc = 6;
      var concs = [];
      for (var i = 0; i < nConc; i++) concs.push(-2.5 + i * 0.5); // half-log
      var logEC50 = -1.25;
      var hill = 1.2;
      var top = 1.0, bot = 0.04;
      var pointsPerConc = [];
      for (var i = 0; i < nConc; i++) {
        var x = concs[i];
        var trueY = bot + (top - bot) / (1 + Math.pow(10, (logEC50 - x) * hill));
        var n = 5 + Math.floor(rng() * 6); // 5–10 replicates
        var pts = [];
        for (var j = 0; j < n; j++) {
          // Box–Muller for a tidy Gaussian
          var u1 = Math.max(1e-9, rng()), u2 = rng();
          var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          var y = clamp(trueY + z * 0.045, 0, 1);
          // small horizontal jitter so overlapping points read distinct
          var xj = (rng() - 0.5) * 0.05;
          pts.push({ x: x + xj, y: y });
        }
        pointsPerConc.push(pts);
      }
      well.concs = concs;
      well.points = pointsPerConc;
      well.logEC50 = logEC50;
      well.hill = hill;
      well.dr_top = top;
      well.dr_bot = bot;
    }
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  function drawWellBacking(well) {
    var grd = ctx.createRadialGradient(
      well.cx - well.r * 0.3, well.cy - well.r * 0.3, 1,
      well.cx, well.cy, well.r);
    if (well.type === 'magma') {
      grd.addColorStop(0, '#1a0904');
      grd.addColorStop(1, '#050201');
    } else if (well.type === 'empty') {
      grd.addColorStop(0, '#0a0a0a');
      grd.addColorStop(1, '#000000');
    } else {
      grd.addColorStop(0, '#143b22');
      grd.addColorStop(1, '#06180d');
    }
    ctx.beginPath();
    ctx.arc(well.cx, well.cy, well.r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = well.type === 'empty'
      ? 'rgba(160, 160, 160, 0.22)'
      : 'rgba(123,160,91,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draws a worm path on the canvas (no stroke); returns segment points
  // so callers can sample them for dye-spot positions, etc.
  function tracePath(ox, oy, ang, L, amp, freq, phase, segments) {
    var cosA = Math.cos(ang);
    var sinA = Math.sin(ang);
    var pts = [];
    var seg = segments || 16;
    ctx.beginPath();
    for (var s = 0; s <= seg; s++) {
      var u = s / seg;
      var x0 = (u - 0.5) * L;
      var taper = Math.sin(u * Math.PI);
      var y0 = Math.sin(u * Math.PI * freq + phase) * amp * taper;
      var px = ox + x0 * cosA - y0 * sinA;
      var py = oy + x0 * sinA + y0 * cosA;
      pts.push({ x: px, y: py });
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    return pts;
  }

  function drawMagma(well, t) {
    var prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    var SEG = 44;
    for (var i = 0; i < well.blobs.length; i++) {
      var b = well.blobs[i];
      // Slow Lissajous drift — much smaller amplitude than before
      var ux = b.fx + Math.cos(b.phaseX + t * b.speedX) * b.ampX;
      var uy = b.fy + Math.sin(b.phaseY + t * b.speedY) * b.ampY;
      var cx = well.x + ux * well.w;
      var cy = well.y + uy * well.h;
      var R  = b.radius * Math.min(well.w, well.h);

      // Build the amorphous outline — sum of slow-evolving angular harmonics
      ctx.beginPath();
      for (var s = 0; s <= SEG; s++) {
        var theta = (s / SEG) * Math.PI * 2;
        var bump = 0;
        for (var h = 0; h < b.harmonics.length; h++) {
          var hr = b.harmonics[h];
          bump += hr.amp * Math.sin(hr.k * theta + hr.phase + t * hr.freq);
        }
        var r = R * (1 + bump);
        var px = cx + r * Math.cos(theta);
        var py = cy + r * Math.sin(theta);
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();

      var pal = b.palette;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.30);
      g.addColorStop(0.00, pal[0] + '0.85)');
      g.addColorStop(0.30, pal[1] + '0.65)');
      g.addColorStop(0.70, pal[2] + '0.32)');
      g.addColorStop(1.00, pal[2] + '0)');
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.globalCompositeOperation = prev;
  }

  // Asymmetric worm width profile (u=0 tail, u=1 head). Slight bulge near head.
  function wormProfile(u) {
    // Bias the bell peak toward the head; gentle taper at both tips.
    var p = Math.pow(u, 1.25) * Math.pow(1 - u, 0.65);
    return p * 4.6; // normalized so peak ≈ 1.0
  }

  // Draw a tapered worm body as a filled ribbon polygon.
  function drawTaperedWorm(pts, halfWidth, bodyColor, glowColor) {
    var n = pts.length;
    var left = new Array(n);
    var right = new Array(n);
    for (var i = 0; i < n; i++) {
      var p = pts[i];
      var tx, ty;
      if (i === 0)         { tx = pts[1].x - p.x;     ty = pts[1].y - p.y; }
      else if (i === n-1)  { tx = p.x - pts[n-2].x;   ty = p.y - pts[n-2].y; }
      else                 { tx = pts[i+1].x - pts[i-1].x; ty = pts[i+1].y - pts[i-1].y; }
      var L = Math.sqrt(tx*tx + ty*ty) || 1;
      var nxp = -ty / L, nyp = tx / L;
      var r = wormProfile(i / (n - 1)) * halfWidth;
      left[i]  = { x: p.x + nxp * r, y: p.y + nyp * r };
      right[i] = { x: p.x - nxp * r, y: p.y - nyp * r };
    }
    // Outer glow
    if (glowColor) {
      ctx.beginPath();
      ctx.moveTo(left[0].x, left[0].y);
      for (var i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
      for (var i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
      ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    // Body fill
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (var i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (var i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = bodyColor;
    ctx.fill();
  }

  // Progressive edge steering for slithering worms. `pos` is the worm's
  // polar-normalized position (1 = well radius). `strength` scales the turn
  // rate — pass a higher value for circle 5 to get sharp wall-turns.
  function steerFromEdge(w, strength, innerStart, hardClamp) {
    var d = Math.sqrt(w.fx * w.fx + w.fy * w.fy);
    if (d > innerStart) {
      var pressure = Math.pow(Math.min(1, (d - innerStart) / (hardClamp - innerStart)), 1.6);
      var targetAng = Math.atan2(-w.fy, -w.fx);
      var delta = ((targetAng - w.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      w.angle += delta * strength * pressure;
    }
    if (d > hardClamp) {
      var scale = hardClamp / d;
      w.fx *= scale;
      w.fy *= scale;
    }
  }

  function drawDyeUptake(well, t) {
    var worms = well.worms;
    var baseLen   = Math.min(well.w, well.h) * 0.22;
    var baseAmp   = Math.min(well.w, well.h) * 0.040;
    var baseHalfW = Math.min(well.w, well.h) * 0.014;
    var dt = 16;

    for (var i = 0; i < worms.length; i++) {
      var w = worms[i];
      var dead = w.style === 'dead-blue';

      if (!dead) {
        // Smooth turning (low-frequency noise)
        w.turnPhase += dt;
        w.angle += Math.sin(w.turnPhase * w.turnRate) * w.turnAmp * 0.012;
        // Forward swim along body axis
        w.fx += Math.cos(w.angle) * w.swimSpeed * dt;
        w.fy += Math.sin(w.angle) * w.swimSpeed * dt;
        // Progressive steering away from the wall (covers the whole well)
        steerFromEdge(w, 0.06, 0.55, 0.88);
      }

      // Position in polar normalized coords (1 unit = well radius)
      var ox = well.cx + w.fx * well.r;
      var oy = well.cy + w.fy * well.r;

      var L = baseLen * w.size;
      var amp = baseAmp * w.ampF;

      if (dead) {
        var ang = w.angle;
        tracePath(ox, oy, ang, L, amp * 0.25, w.freq, w.phase, 14);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(120, 185, 235, 0.95)';
        ctx.lineWidth = 1.7;
        ctx.stroke();
      } else {
        // Traveling body wave; tapered ribbon with head bulge
        var phase = w.phase + t * w.waveSpeed;
        var cosA = Math.cos(w.angle), sinA = Math.sin(w.angle);
        var seg = 22;
        var pts = new Array(seg + 1);
        for (var s = 0; s <= seg; s++) {
          var u = s / seg;
          var x0 = (u - 0.5) * L;
          var env = Math.sin(u * Math.PI);
          var y0 = Math.sin(u * Math.PI * w.freq + phase) * amp * env;
          pts[s] = { x: ox + x0 * cosA - y0 * sinA,
                     y: oy + x0 * sinA + y0 * cosA };
        }
        drawTaperedWorm(
          pts,
          baseHalfW * w.size * 0.88,
          'rgba(160, 210, 130, 0.95)',
          'rgba(110, 200, 130, 0.18)'
        );
      }
    }
  }

  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function drawRainbow(well, t) {
    var worms = well.worms;
    var period = 8000;
    var c = ((t - startTs) % period) / period;
    var lu;
    if      (c < 0.40) lu = 0;
    else if (c < 0.50) lu = (c - 0.40) / 0.10;
    else if (c < 0.90) lu = 1;
    else               lu = 1 - (c - 0.90) / 0.10;
    lu = easeInOut(lu);

    var baseLen = Math.min(well.w, well.h) * 0.62;
    var N = worms.length;
    var marginX = well.w * 0.08;
    var laneW = (well.w - marginX * 2) / N;
    var baseline = well.y + well.h * 0.92;
    var halfW = 1.05;
    var dt = 16;

    for (var i = 0; i < N; i++) {
      var w = worms[i];
      var L = baseLen * w.size;

      // Only slither during the scattered phase. Freeze motion once the
      // worms start lining up so they return to where they were.
      if (lu < 0.05) {
        w.turnPhase += dt;
        w.angle += Math.sin(w.turnPhase * w.turnRate) * w.turnAmp * 0.014;
        w.fx += Math.cos(w.angle) * w.swimSpeed * dt;
        w.fy += Math.sin(w.angle) * w.swimSpeed * dt;
        // Sharper wall-turn than circle 3 — starts earlier, ramps harder
        steerFromEdge(w, 0.16, 0.50, 0.86);
      }

      // Scattered placement (polar normalized; 1 unit = well radius)
      var sx = well.cx + w.fx * well.r;
      var sy = well.cy + w.fy * well.r;
      var sang = w.angle;
      var sAmp = Math.min(well.w, well.h) * 0.04 * w.ampF;

      // Lined-up placement (vertical, bottoms aligned)
      var lx   = well.x + marginX + laneW * (i + 0.5);
      var ly   = baseline - L * 0.5;
      var lang = -Math.PI / 2;
      var lAmp = 0;

      var x   = sx   * (1 - lu) + lx   * lu;
      var y   = sy   * (1 - lu) + ly   * lu;
      var ang = sang * (1 - lu) + lang * lu;
      var amp = sAmp * (1 - lu) + lAmp * lu;

      // Live (time-driven) body wave so worms wiggle as they swim
      var phase = w.phase + t * w.waveSpeed;
      var pts = tracePath(x, y, ang, L, amp, w.freq, phase, 14);

      var c2 = hslToRgb((w.hue * 300) / 360, 0.65, 0.55);
      var color = 'rgba(' + c2.r + ',' + c2.g + ',' + c2.b + ',0.95)';

      if (lu > 0.96) {
        // Fully lined-up: straight uniform stroke (current "lined-up" look)
        ctx.strokeStyle = color;
        ctx.lineWidth = halfW * 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        // Build tapered ribbon polygon with per-worm taper, blended to
        // uniform as lu → 1.
        var n = pts.length;
        var left  = new Array(n);
        var right = new Array(n);
        var peakU = w.tailExp / (w.tailExp + w.headExp);
        var peakVal = Math.pow(peakU, w.tailExp) * Math.pow(1 - peakU, w.headExp);
        for (var s = 0; s < n; s++) {
          var p = pts[s];
          var tx, ty;
          if (s === 0)         { tx = pts[1].x - p.x;       ty = pts[1].y - p.y; }
          else if (s === n-1)  { tx = p.x - pts[n-2].x;     ty = p.y - pts[n-2].y; }
          else                 { tx = pts[s+1].x - pts[s-1].x; ty = pts[s+1].y - pts[s-1].y; }
          var Ln = Math.sqrt(tx * tx + ty * ty) || 1;
          var nxp = -ty / Ln, nyp = tx / Ln;
          var u = s / (n - 1);
          var bell = Math.pow(u, w.tailExp) * Math.pow(1 - u, w.headExp);
          var taper = peakVal > 0 ? bell / peakVal : 0;
          // Blend tapered shape with uniform width as worms straighten
          var profile = taper * (1 - lu) + 1 * lu;
          var r2 = halfW * profile;
          left[s]  = { x: p.x + nxp * r2, y: p.y + nyp * r2 };
          right[s] = { x: p.x - nxp * r2, y: p.y - nyp * r2 };
        }
        ctx.beginPath();
        ctx.moveTo(left[0].x, left[0].y);
        for (var s = 1; s < n; s++) ctx.lineTo(left[s].x, left[s].y);
        for (var s = n - 1; s >= 0; s--) ctx.lineTo(right[s].x, right[s].y);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    // subtle baseline when lined up
    if (lu > 0.6) {
      ctx.beginPath();
      ctx.moveTo(well.x + marginX, baseline + 4);
      ctx.lineTo(well.x + well.w - marginX, baseline + 4);
      ctx.strokeStyle = 'rgba(214,227,207,' + (0.18 * (lu - 0.6) / 0.4).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawDoseResponse(well, t) {
    var period = 9000;
    var cycle = ((t - startTs) % period) / period;
    var fadeOut = cycle > 0.95 ? Math.max(0, 1 - (cycle - 0.95) / 0.05) : 1;

    // Plot bounds inside the circle, leaving room for the x-axis label below.
    var plotL = well.cx - well.r * 0.62;
    var plotR = well.cx + well.r * 0.62;
    var plotT = well.cy - well.r * 0.58;
    var plotB = well.cy + well.r * 0.34;
    var xMin = well.concs[0] - 0.25;
    var xMax = well.concs[well.concs.length - 1] + 0.25;

    function mapX(x) { return plotL + (x - xMin) / (xMax - xMin) * (plotR - plotL); }
    function mapY(y) { return plotB - y * (plotB - plotT); }

    // White axes (y unlabeled, x labeled)
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.62 * fadeOut).toFixed(3) + ')';
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(plotL, plotT);
    ctx.lineTo(plotL, plotB);
    ctx.lineTo(plotR, plotB);
    ctx.stroke();
    // x-axis tick marks at each concentration
    for (var i = 0; i < well.concs.length; i++) {
      var tx = mapX(well.concs[i]);
      ctx.beginPath();
      ctx.moveTo(tx, plotB);
      ctx.lineTo(tx, plotB + 1.8);
      ctx.stroke();
    }
    // x-axis label
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.7 * fadeOut).toFixed(3) + ')';
    ctx.font = '600 6.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('log10[Drug]', (plotL + plotR) / 2, plotB + 3.5);

    // ── Phase timing ─────────────────────────────────────────
    var ptsEnd   = 0.55;    // points appear over 0..0.55
    var curveEnd = 0.72;    // curve animates over 0.55..0.72
    var ec50End  = 0.82;    // ec50 line over 0.72..0.82
    // 0.82..0.95: hold; 0.95..1.0: fade out

    // Points appear left to right (one concentration at a time)
    var ptsProg = Math.min(1, cycle / ptsEnd);
    var concsToShow = ptsProg * well.concs.length;
    for (var i = 0; i < well.concs.length; i++) {
      var concAlpha = Math.max(0, Math.min(1, concsToShow - i));
      if (concAlpha <= 0) continue;
      var pts = well.points[i];
      for (var j = 0; j < pts.length; j++) {
        var px = mapX(pts[j].x);
        var py = mapY(pts[j].y);
        ctx.beginPath();
        ctx.arc(px, py, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.92 * concAlpha * fadeOut).toFixed(3) + ')';
        ctx.fill();
      }
    }

    // Blue sigmoid curve, drawn progressively left → right
    if (cycle > ptsEnd) {
      var curveProg = Math.min(1, (cycle - ptsEnd) / (curveEnd - ptsEnd));
      var steps = 60;
      ctx.strokeStyle = 'rgba(95, 165, 235, ' + (0.95 * fadeOut).toFixed(3) + ')';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      var maxK = Math.floor(steps * curveProg);
      for (var k = 0; k <= maxK; k++) {
        var u = k / steps;
        var xVal = xMin + u * (xMax - xMin);
        var yVal = well.dr_bot + (well.dr_top - well.dr_bot) /
                   (1 + Math.pow(10, (well.logEC50 - xVal) * well.hill));
        var cx = mapX(xVal), cy = mapY(yVal);
        if (k === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Red dashed vertical line at EC50
    if (cycle > curveEnd) {
      var ec50Prog = Math.min(1, (cycle - curveEnd) / (ec50End - curveEnd));
      var ec50X = mapX(well.logEC50);
      ctx.strokeStyle = 'rgba(235, 75, 70, ' + (0.95 * ec50Prog * fadeOut).toFixed(3) + ')';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([2, 1.6]);
      ctx.beginPath();
      ctx.moveTo(ec50X, plotT);
      ctx.lineTo(ec50X, plotB);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawIonChannel(well, t) {
    var cx = well.cx, cy = well.cy, r = well.r;

    // ── Bilayer (shorter, denser; head size unchanged) ─────────────
    var topHeadY    = cy - r * 0.22;
    var botHeadY    = cy + r * 0.22;
    var lipidL      = cx - r * 0.92;
    var lipidR      = cx + r * 0.92;
    var headR       = r * 0.045;
    var headSpacing = r * 0.125;
    var keepout     = r * 0.22;     // smaller (channel is smaller now)

    // ── Channel: a single vase silhouette, smaller overall ─────────
    var chTopY  = cy - r * 0.50;
    var chBotY  = cy + r * 0.50;
    var chHeight = chBotY - chTopY;
    var neckHW   = r * 0.10;        // half-width at the mouths
    var bellyHW  = r * 0.20;        // half-width at the widest middle
    var poreHW   = r * 0.045;       // pore (hole) half-width

    function vaseHW(u) {
      // single bell from top mouth → belly → bottom mouth
      return neckHW + (bellyHW - neckHW) * Math.sin(u * Math.PI);
    }

    // ── Lipid heads (skipping the channel's footprint) ─────────────
    var heads = [];
    for (var hx = lipidL; hx <= lipidR + 0.01; hx += headSpacing) {
      if (Math.abs(hx - cx) < keepout) continue;
      heads.push(hx);
    }

    // Tails first
    var tailGap = r * 0.022;
    var tailLen = r * 0.165;
    ctx.strokeStyle = 'rgba(178, 181, 186, 0.62)';
    ctx.lineWidth   = 0.6;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    for (var i = 0; i < heads.length; i++) {
      var x = heads[i];
      ctx.moveTo(x - tailGap, topHeadY + headR);
      ctx.lineTo(x - tailGap, topHeadY + headR + tailLen);
      ctx.moveTo(x + tailGap, topHeadY + headR);
      ctx.lineTo(x + tailGap, topHeadY + headR + tailLen);
      ctx.moveTo(x - tailGap, botHeadY - headR);
      ctx.lineTo(x - tailGap, botHeadY - headR - tailLen);
      ctx.moveTo(x + tailGap, botHeadY - headR);
      ctx.lineTo(x + tailGap, botHeadY - headR - tailLen);
    }
    ctx.stroke();

    // Heads
    ctx.fillStyle = 'rgba(230, 232, 236, 0.95)';
    for (var i = 0; i < heads.length; i++) {
      ctx.beginPath();
      ctx.arc(heads[i], topHeadY, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(heads[i], botHeadY, headR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Single vase with a pore hole (even-odd fill) ───────────────
    var samples = 36;
    ctx.beginPath();
    // Outer outline — left side top→bottom, then right side bottom→top
    for (var i = 0; i <= samples; i++) {
      var u = i / samples;
      var y = chTopY + u * chHeight;
      var hw = vaseHW(u);
      if (i === 0) ctx.moveTo(cx - hw, y);
      else         ctx.lineTo(cx - hw, y);
    }
    for (var i = samples; i >= 0; i--) {
      var u = i / samples;
      var y = chTopY + u * chHeight;
      var hw = vaseHW(u);
      ctx.lineTo(cx + hw, y);
    }
    ctx.closePath();
    // Inner pore rectangle (creates the hole via even-odd)
    ctx.moveTo(cx - poreHW, chTopY);
    ctx.lineTo(cx + poreHW, chTopY);
    ctx.lineTo(cx + poreHW, chBotY);
    ctx.lineTo(cx - poreHW, chBotY);
    ctx.closePath();

    // Fill walls (gradient), with the pore left transparent
    var chGrd = ctx.createLinearGradient(cx - bellyHW, cy, cx + bellyHW, cy);
    chGrd.addColorStop(0,   'rgba(155, 159, 165, 0.78)');
    chGrd.addColorStop(0.5, 'rgba(220, 224, 230, 0.78)');
    chGrd.addColorStop(1,   'rgba(155, 159, 165, 0.78)');
    ctx.fillStyle = chGrd;
    ctx.fill('evenodd');

    // Stroke both outlines (vase silhouette + pore rim) in one pass
    ctx.strokeStyle = 'rgba(245, 247, 250, 0.92)';
    ctx.lineWidth   = 1.0;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // ── Cations (+) traveling down through the pore ────────────────
    var nIons = 3;
    var period = 3200;
    var travelStart = chTopY - r * 0.13;
    var travelEnd   = chBotY + r * 0.13;
    var travelDist  = travelEnd - travelStart;
    var ionR = r * 0.038;

    for (var i = 0; i < nIons; i++) {
      var phase = (((t - startTs) / period) + i / nIons) % 1;
      var y = travelStart + phase * travelDist;
      var alpha = 1;
      if (phase < 0.08) alpha = phase / 0.08;
      else if (phase > 0.92) alpha = (1 - phase) / 0.08;

      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.95 * alpha).toFixed(3) + ')';
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, y - ionR);
      ctx.lineTo(cx, y + ionR);
      ctx.moveTo(cx - ionR, y);
      ctx.lineTo(cx + ionR, y);
      ctx.stroke();
    }
  }

  function drawWell(well, t) {
    drawWellBacking(well);

    // 'empty' wells are just the black backing — no content to render.
    if (well.type === 'empty') return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(well.cx, well.cy, well.r - 1, 0, Math.PI * 2);
    ctx.clip();

    switch (well.type) {
      case 'magma':         drawMagma(well, t);         break;
      case 'dye-uptake':    drawDyeUptake(well, t);     break;
      case 'rainbow':       drawRainbow(well, t);       break;
      case 'dose-response': drawDoseResponse(well, t);  break;
      case 'ion-channel':   drawIonChannel(well, t);    break;
    }
    ctx.restore();
  }

  function step(now) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < wells.length; i++) drawWell(wells[i], now);
    lastFrameTs = now;
    requestAnimationFrame(step);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { lastFrameTs = performance.now(); requestAnimationFrame(step); }
  });

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('resize', resize);
  resize();
  if (reduced) {
    for (var i = 0; i < wells.length; i++) drawWell(wells[i], 0);
  } else {
    requestAnimationFrame(step);
  }
})();
