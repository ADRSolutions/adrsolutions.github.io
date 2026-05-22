/* ADR Solutions — hero animation.
   Full 96-well plate (A–H × 1–12). An AI imaging line sweeps across the
   plate column by column. As the line clears each column, 0–3 wells in
   that column are flagged as "hits" — their worms turn a random shade
   of red and slow down (darker red = slower). When the sweep reaches
   the last column, the entire plate pulses green and resets. The HUD
   hit counter reflects the number of wells currently turned red. */
(function () {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // Geometry
  var ROWS = 8;
  var COLS = 12;
  var WORMS_PER_WELL = 2;

  // Timing
  var SWEEP_MS = 9500;   // time for sweep to cross the plate
  var FLASH_MS = 900;    // green reset flash duration

  // State machine: 'sweeping' | 'flashing'
  var phase = 'sweeping';
  var phaseStart = performance.now();
  var lastProcessedCol = -1;

  // Palette
  var GREEN_GLW = 'rgba(155, 200, 120, ';
  var WORM_BODY_NORMAL = 'rgba(170,210,140,0.95)';
  var WORM_HEAD_NORMAL = '#cfe2bb';

  var W = 0, H = 0, DPR = 1;
  var wells = [];
  var lastFrameTs = performance.now();

  function rng(seed) {
    var s = seed | 0;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 0) / 0xFFFFFFFF);
    };
  }
  var rnd = rng(7);

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildWells(true);
  }

  function buildWells(preserve) {
    // Layout — leave room for column numbers (top) and row letters (left)
    var padL = W * 0.06;
    var padR = W * 0.025;
    var padTop = H * 0.10;
    var padBot = H * 0.07;
    var gridW = W - padL - padR;
    var gridH = H - padTop - padBot;
    var cellW = gridW / COLS;
    var cellH = gridH / ROWS;
    var r = Math.min(cellW, cellH) * 0.42;

    var oldHits = {};
    if (preserve && wells.length) {
      for (var i = 0; i < wells.length; i++) {
        var w = wells[i];
        if (w.hit) oldHits[w.row + ',' + w.col] = w;
      }
    }

    wells = [];
    var seedRng = rng(1337);
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var cx = padL + cellW * (col + 0.5);
        var cy = padTop + cellH * (row + 0.5);
        var worms = [];
        for (var k = 0; k < WORMS_PER_WELL; k++) {
          worms.push({
            phase: seedRng() * Math.PI * 2,
            speed: 0.7 + seedRng() * 0.9,
            freq:  2.0 + seedRng() * 1.2,
            amp:   r * (0.22 + seedRng() * 0.16),
            angle: seedRng() * Math.PI * 2,
            len:   r * (1.0 + seedRng() * 0.25)
          });
        }
        var key = row + ',' + col;
        var preservedHit = oldHits[key];
        wells.push({
          row: row, col: col,
          cx: cx, cy: cy, r: r,
          worms: worms,
          hit: preservedHit ? preservedHit.hit : false,
          redIntensity: preservedHit ? preservedHit.redIntensity : 0,
          // for fade-in of the red tint after a sweep crosses
          tint: preservedHit ? preservedHit.tint : 0,
          jitter: seedRng() * 1000
        });
      }
    }
  }

  function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }

  function getWell(row, col) { return wells[row * COLS + col]; }

  function processColumn(col) {
    // Randomly assign 0–3 hits in this column
    var n = Math.floor(Math.random() * 4); // 0..3 inclusive
    var available = [];
    for (var r = 0; r < ROWS; r++) available.push(r);
    // Shuffle
    for (var i = available.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = available[i]; available[i] = available[j]; available[j] = t;
    }
    for (var k = 0; k < n; k++) {
      var row = available[k];
      var well = getWell(row, col);
      well.hit = true;
      // Random shade — uniform across the full red range (0.3..1.0).
      // Higher = darker = slower.
      well.redIntensity = 0.3 + Math.random() * 0.7;
    }
  }

  // Worm body / head color for a hit well, given redIntensity 0..1.
  // Darker red = higher intensity.
  function hitColors(intensity) {
    // Lerp from a lighter red (low intensity) to a deep red (high intensity)
    // light: rgb(232, 110, 110)  ->  dark: rgb(110, 18, 22)
    var t = Math.max(0, Math.min(1, intensity));
    var rC = Math.round(232 + (110 - 232) * t);
    var gC = Math.round(110 + (18  - 110) * t);
    var bC = Math.round(110 + (22  - 110) * t);
    var body = 'rgba(' + rC + ',' + gC + ',' + bC + ',0.96)';
    // Head: slightly lighter than body
    var rH = Math.min(255, rC + 28);
    var gH = Math.min(255, gC + 22);
    var bH = Math.min(255, bC + 22);
    var head = 'rgb(' + rH + ',' + gH + ',' + bH + ')';
    // Glow: tinted from green-glow to red-glow as intensity grows
    var glowR = Math.round(155 + (210 - 155) * t);
    var glowG = Math.round(200 + (60  - 200) * t);
    var glowB = Math.round(120 + (60  - 120) * t);
    var glow  = 'rgba(' + glowR + ',' + glowG + ',' + glowB + ',';
    return { body: body, head: head, glow: glow };
  }

  function drawWell(well, t) {
    var cx = well.cx, cy = well.cy, r = well.r;

    // Well backing (dark glass) — with optional red tint when hit
    var bgR = 20, bgG = 59, bgB = 34;       // base inner color
    var bgR2 = 12, bgG2 = 36, bgB2 = 21;    // base outer
    if (well.hit && well.tint > 0) {
      var ti = well.tint * Math.max(0.35, well.redIntensity);
      // Bias the well backing toward a dark red glass
      bgR  = Math.round(bgR  + (60  - bgR ) * ti);
      bgG  = Math.round(bgG  + (12  - bgG ) * ti);
      bgB  = Math.round(bgB  + (12  - bgB ) * ti);
      bgR2 = Math.round(bgR2 + (40  - bgR2) * ti);
      bgG2 = Math.round(bgG2 + (8   - bgG2) * ti);
      bgB2 = Math.round(bgB2 + (8   - bgB2) * ti);
    }
    var grd = ctx.createRadialGradient(cx - r*0.4, cy - r*0.4, r*0.1, cx, cy, r);
    grd.addColorStop(0,   'rgb(' + bgR  + ',' + bgG  + ',' + bgB  + ')');
    grd.addColorStop(1,   'rgb(' + bgR2 + ',' + bgG2 + ',' + bgB2 + ')');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Inner ring — red if hit
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    if (well.hit && well.tint > 0.1) {
      var alpha = 0.18 + 0.45 * well.tint * well.redIntensity;
      ctx.strokeStyle = 'rgba(220,80,80,' + alpha.toFixed(3) + ')';
    } else {
      ctx.strokeStyle = 'rgba(123,160,91,0.18)';
    }
    ctx.lineWidth = 1;
    ctx.stroke();

    // Clip worms inside well
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();

    // Motility scales with red intensity (darker = slower)
    var motility = well.hit ? (1 - well.redIntensity * 0.85) : 1;
    motility = Math.max(0.08, motility);

    var colors = well.hit && well.tint > 0.05 ? hitColors(well.redIntensity) : null;

    for (var i = 0; i < well.worms.length; i++) {
      var w = well.worms[i];
      var phaseV = w.phase + (t * 0.001 * w.speed * motility) + well.jitter * 0.0001;
      var drift = 0.16 * r * motility;
      var dx = Math.cos(w.angle + t * 0.0005) * drift;
      var dy = Math.sin(w.angle * 0.7 + t * 0.0004) * drift;

      var ox = cx + dx;
      var oy = cy + dy;
      var ang = w.angle + Math.sin(t * 0.0006 + w.phase) * 0.3 * motility;
      var cosA = Math.cos(ang);
      var sinA = Math.sin(ang);
      var L = w.len;
      var amp = w.amp * (0.45 + 0.55 * motility);

      ctx.beginPath();
      var seg = 22;
      for (var s = 0; s <= seg; s++) {
        var u = s / seg;
        var x0 = (u - 0.5) * L;
        var y0 = Math.sin(u * Math.PI * w.freq + phaseV) * amp * Math.sin(u * Math.PI);
        var px = ox + x0 * cosA - y0 * sinA;
        var py = oy + x0 * sinA + y0 * cosA;
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Glow
      if (colors) {
        ctx.strokeStyle = colors.glow + ((0.20 * motility + 0.05).toFixed(3)) + ')';
      } else {
        ctx.strokeStyle = GREEN_GLW + ((0.25 * motility + 0.05).toFixed(3)) + ')';
      }
      ctx.lineWidth = 3.4;
      ctx.stroke();
      // Body
      ctx.strokeStyle = colors ? colors.body : WORM_BODY_NORMAL;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Head dot
      var hx = ox + (0.5 * L) * cosA;
      var hy = oy + (0.5 * L) * sinA;
      ctx.beginPath();
      ctx.arc(hx, hy, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = colors ? colors.head : WORM_HEAD_NORMAL;
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCoordinates() {
    ctx.fillStyle = 'rgba(214,227,207,0.42)';
    ctx.font = '600 8px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var padL = W * 0.06;
    var padR = W * 0.025;
    var padTop = H * 0.10;
    var gridW = W - padL - padR;
    var gridH = H - padTop - H * 0.07;
    var cellW = gridW / COLS;
    var cellH = gridH / ROWS;
    var letters = 'ABCDEFGH';
    for (var c = 0; c < COLS; c++) {
      ctx.fillText(String(c + 1), padL + cellW * (c + 0.5), padTop - 10);
    }
    for (var r = 0; r < ROWS; r++) {
      ctx.fillText(letters[r], padL - 12, padTop + cellH * (r + 0.5));
    }
  }

  function drawSweep(now) {
    if (phase !== 'sweeping') return -1;
    var elapsed = now - phaseStart;
    var u = Math.min(1, elapsed / SWEEP_MS);
    var padL = W * 0.06;
    var padR = W * 0.025;
    var usable = W - padL - padR;
    // Linear sweep — easier to map to columns
    var x = padL + u * usable;

    // Sweep glow
    var grad = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
    grad.addColorStop(0, 'rgba(155,200,120,0)');
    grad.addColorStop(0.5, 'rgba(180,220,140,0.55)');
    grad.addColorStop(1, 'rgba(155,200,120,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 18, H * 0.06, 36, H * 0.88);

    // Center line
    ctx.strokeStyle = 'rgba(214,227,207,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.06);
    ctx.lineTo(x, H * 0.94);
    ctx.stroke();

    // Determine the column boundary the sweep has just crossed.
    // We mark a column "processed" once the sweep has passed its right edge.
    var cellW = usable / COLS;
    var colsCrossed = Math.floor((x - padL) / cellW); // 0..COLS
    // When the sweep has crossed the right edge of column C, process column C
    // (only once).
    while (lastProcessedCol < colsCrossed - 1 && lastProcessedCol + 1 < COLS) {
      lastProcessedCol++;
      processColumn(lastProcessedCol);
    }

    // When sweep finishes traversing the plate, kick off the flash phase
    if (u >= 1) {
      // Process any final column we may have missed
      while (lastProcessedCol < COLS - 1) {
        lastProcessedCol++;
        processColumn(lastProcessedCol);
      }
      phase = 'flashing';
      phaseStart = now;
    }

    return x;
  }

  function drawFlash(now) {
    if (phase !== 'flashing') return;
    var elapsed = now - phaseStart;
    var u = Math.min(1, elapsed / FLASH_MS);

    // Ramp up (0..0.4) then ramp down (0.4..1.0)
    var intensity;
    if (u < 0.4) intensity = u / 0.4;
    else intensity = 1 - (u - 0.4) / 0.6;
    intensity = Math.max(0, intensity);

    var padL = W * 0.06;
    var padR = W * 0.025;
    var padTop = H * 0.06;
    var padBot = H * 0.06;

    // Plate-wide green wash
    ctx.fillStyle = 'rgba(123,200,110,' + (0.32 * intensity).toFixed(3) + ')';
    ctx.fillRect(padL - 6, padTop, W - padL - padR + 12, H - padTop - padBot);

    // Bright ring
    ctx.strokeStyle = 'rgba(180,230,150,' + (0.55 * intensity).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(padL - 6, padTop, W - padL - padR + 12, H - padTop - padBot);

    if (u >= 1) {
      // Reset all hits, restart sweep
      for (var i = 0; i < wells.length; i++) {
        wells[i].hit = false;
        wells[i].redIntensity = 0;
        wells[i].tint = 0;
      }
      lastProcessedCol = -1;
      phase = 'sweeping';
      phaseStart = now;
    }
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(214,227,207,0.55)';
    ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PLATE  A-0427    SPECIES  D. immitis    SCREEN  Motility 1 μM', W * 0.06, H * 0.018);

    var hits = 0;
    for (var i = 0; i < wells.length; i++) if (wells[i].hit) hits++;
    var label = 'HITS  ' + String(hits).padStart(2, '0') + ' / ' + (ROWS * COLS);
    ctx.textAlign = 'right';
    ctx.fillText(label, W - W * 0.025, H * 0.018);
  }

  function step(now) {
    var dt = Math.min(60, now - lastFrameTs);
    lastFrameTs = now;

    // Background
    ctx.clearRect(0, 0, W, H);

    // Soft vignette
    var vg = ctx.createRadialGradient(W*0.5, H*0.45, W*0.1, W*0.5, H*0.5, W*0.75);
    vg.addColorStop(0, 'rgba(20,52,33,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    drawCoordinates();

    // Update + draw wells
    for (var i = 0; i < wells.length; i++) {
      var well = wells[i];
      // Ease tint in once hit, ease out when not hit (during flash reset)
      var target = well.hit ? 1 : 0;
      well.tint += (target - well.tint) * 0.10;

      drawWell(well, now);
    }

    drawSweep(now);
    drawFlash(now);
    drawHUD();

    requestAnimationFrame(step);
  }

  // Pause when off-screen / hidden tab
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { lastFrameTs = performance.now(); requestAnimationFrame(step); }
  });

  // Respect reduced motion
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('resize', resize);
  resize();
  if (reduced) {
    drawCoordinates();
    for (var i = 0; i < wells.length; i++) drawWell(wells[i], 0);
    drawHUD();
  } else {
    requestAnimationFrame(step);
  }
})();
