/* Fourier Çizim Makinesi
   Çizilen yol -> DFT -> dönen çemberler (episaykıllar) yolu yeniden çizer.
   Bağımlılık yok. */

const { PI, sin, cos, atan2, hypot, exp, min, max } = Math;
const TAU = 2 * PI;
const SAMPLES = 512; // yolun yeniden örneklenme sayısı

/* ---------- kanvas ---------- */
const board = document.getElementById("board");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = window.devicePixelRatio || 1;
  W = board.clientWidth;
  H = Math.max(420, Math.round(window.innerHeight - board.getBoundingClientRect().top - 90));
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.height = H + "px";
}
window.addEventListener("resize", () => { resize(); });

/* ---------- durum ---------- */
const state = {
  raw: [],        // çizilen ham noktalar [x,y]
  coeffs: [],     // DFT katsayıları {freq, amp, phase} genliğe göre sıralı
  terms: 40,
  speed: 12,
  circles: true,
  ghost: true,
  drawing: false,
  t: 0,           // animasyon fazı 0..TAU
  trace: [],      // kalemin bıraktığı iz
  path: [],       // yeniden örneklenmiş orijinal yol
};

/* ---------- yol işleme ---------- */
function resample(points, count) {
  // eşit yay uzunluğuna göre yeniden örnekle (kapatarak)
  const pts = [...points, points[0]];
  const dists = [0];
  for (let i = 1; i < pts.length; i++)
    dists.push(dists[i - 1] + hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = dists[dists.length - 1] || 1;
  const out = [];
  let seg = 0;
  for (let i = 0; i < count; i++) {
    const d = (i / count) * total;
    while (dists[seg + 1] < d) seg++;
    const f = (d - dists[seg]) / (dists[seg + 1] - dists[seg] || 1);
    out.push([
      pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f,
      pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f,
    ]);
  }
  return out;
}

function dft(path) {
  // karmaşık DFT; frekanslar 0, ±1, ±2, ...
  const N = path.length;
  const cx = path.reduce((s, p) => s + p[0], 0) / N;
  const cy = path.reduce((s, p) => s + p[1], 0) / N;
  const coeffs = [];
  const half = Math.floor(N / 2);
  for (let k = -half; k <= half; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const ang = (-TAU * k * n) / N;
      const x = path[n][0] - cx, y = path[n][1] - cy;
      re += x * cos(ang) - y * sin(ang);
      im += x * sin(ang) + y * cos(ang);
    }
    re /= N; im /= N;
    coeffs.push({ freq: k, amp: hypot(re, im), phase: atan2(im, re) });
  }
  coeffs.sort((a, b) => b.amp - a.amp);
  return { coeffs, cx, cy };
}

let center = [0, 0];
function setPath(points) {
  if (points.length < 8) return;
  state.path = resample(points, SAMPLES);
  const { coeffs, cx, cy } = dft(state.path);
  state.coeffs = coeffs;
  center = [cx, cy];
  state.trace = [];
  state.t = 0;
  hint.style.display = "none";
  updateScore();
}

/* K terimle konum (t: 0..TAU) */
function epicyclePoint(t, K) {
  let x = center[0], y = center[1];
  for (let i = 0; i < K && i < state.coeffs.length; i++) {
    const c = state.coeffs[i];
    const ang = c.freq * t + c.phase;
    x += c.amp * cos(ang);
    y += c.amp * sin(ang);
  }
  return [x, y];
}

/* ---------- benzerlik puanı ---------- */
function updateScore() {
  if (!state.path.length) return;
  let err = 0, scale = 0;
  for (let n = 0; n < SAMPLES; n += 4) {
    const t = (n / SAMPLES) * TAU;
    const [x, y] = epicyclePoint(t, state.terms);
    err += hypot(x - state.path[n][0], y - state.path[n][1]);
    scale += hypot(state.path[n][0] - center[0], state.path[n][1] - center[1]);
  }
  const sim = max(0, 100 - (err / scale) * 100);
  document.getElementById("score").textContent = `Benzerlik: %${sim.toFixed(1)}`;
}

/* ---------- çizim (kullanıcı girişi) ---------- */
function pointer(ev) {
  const r = canvas.getBoundingClientRect();
  const src = ev.touches ? ev.touches[0] : ev;
  return [src.clientX - r.left, src.clientY - r.top];
}
function startDraw(ev) {
  ev.preventDefault();
  state.drawing = true;
  state.raw = [pointer(ev)];
  state.coeffs = [];
  state.trace = [];
}
function moveDraw(ev) {
  if (!state.drawing) return;
  const p = pointer(ev);
  const last = state.raw[state.raw.length - 1];
  if (hypot(p[0] - last[0], p[1] - last[1]) > 2) state.raw.push(p);
}
function endDraw() {
  if (!state.drawing) return;
  state.drawing = false;
  setPath(state.raw);
}
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", moveDraw);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("touchstart", startDraw, { passive: false });
canvas.addEventListener("touchmove", (ev) => { ev.preventDefault(); moveDraw(ev); }, { passive: false });
canvas.addEventListener("touchend", endDraw);

/* ---------- hazır şekiller ---------- */
const SHAPES = {
  heart: (t) => [16 * sin(t) ** 3, -(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t))],
  star: (t) => {
    const k = Math.floor((t / TAU) * 10) % 2;
    const r = k ? 0.45 : 1;
    const ang = Math.round((t / TAU) * 10) * (TAU / 10) - PI / 2;
    return [r * cos(ang), r * sin(ang)];
  },
  butterfly: (t) => {
    const r = exp(sin(t)) - 2 * cos(4 * t) + sin((2 * t - PI) / 24) ** 5;
    return [r * sin(t), -r * cos(t)];
  },
  infinity: (t) => [cos(t) / (1 + sin(t) ** 2), (sin(t) * cos(t)) / (1 + sin(t) ** 2)],
};

function loadShape(name) {
  const fn = SHAPES[name];
  const n = 400;
  let pts = [];
  for (let i = 0; i < n; i++) pts.push(fn((i / n) * TAU));
  // yıldız köşe örneklemesi: poligonu doğrudan kur
  if (name === "star") {
    pts = [];
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * TAU - PI / 2;
      const r = i % 2 ? 0.45 : 1;
      pts.push([r * cos(ang), r * sin(ang)]);
    }
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = max(...xs) - min(...xs), h = max(...ys) - min(...ys);
  const s = 0.62 * min(W / w, H / h);
  const mx = (max(...xs) + min(...xs)) / 2, my = (max(...ys) + min(...ys)) / 2;
  setPath(pts.map(([x, y]) => [W / 2 + (x - mx) * s, H / 2 + (y - my) * s]));
}
document.querySelectorAll(".presets [data-shape]").forEach((b) =>
  b.addEventListener("click", () => loadShape(b.dataset.shape))
);
document.getElementById("clearBtn").addEventListener("click", () => {
  state.raw = [];
  state.path = [];
  state.coeffs = [];
  state.trace = [];
  document.getElementById("score").textContent = "";
  hint.style.display = "";
});

/* ---------- kontroller ---------- */
const termSlider = document.getElementById("termSlider");
termSlider.addEventListener("input", () => {
  state.terms = +termSlider.value;
  document.getElementById("termVal").textContent = state.terms;
  state.trace = [];
  updateScore();
});
document.getElementById("speedSlider").addEventListener("input", (ev) => (state.speed = +ev.target.value));
document.getElementById("circlesChk").addEventListener("change", (ev) => (state.circles = ev.target.checked));
document.getElementById("ghostChk").addEventListener("change", (ev) => (state.ghost = ev.target.checked));

/* ---------- animasyon ---------- */
function drawFrame() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = ctx.lineCap = "round";

  // çizim sürerken ham yolu göster
  if (state.drawing && state.raw.length > 1) {
    ctx.strokeStyle = "#8d93ab";
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.raw.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  if (state.coeffs.length) {
    // orijinal iz (hayalet)
    if (state.ghost && state.path.length) {
      ctx.strokeStyle = "#3a4250";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      state.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
    }

    // episaykıllar
    state.t = (state.t + (state.speed / 8000) * TAU) % TAU;
    let x = center[0], y = center[1];
    if (state.circles) {
      ctx.strokeStyle = "#ffffff22";
      ctx.lineWidth = 1;
    }
    for (let i = 0; i < state.terms && i < state.coeffs.length; i++) {
      const c = state.coeffs[i];
      const ang = c.freq * state.t + c.phase;
      const nx = x + c.amp * cos(ang);
      const ny = y + c.amp * sin(ang);
      if (state.circles && c.amp > 1.5) {
        ctx.beginPath();
        ctx.arc(x, y, c.amp, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
      x = nx; y = ny;
    }

    // iz
    state.trace.push([x, y]);
    const maxTrace = Math.ceil((TAU / ((state.speed / 8000) * TAU)) * 1.0);
    if (state.trace.length > maxTrace) state.trace.splice(0, state.trace.length - maxTrace);
    if (state.trace.length > 1) {
      ctx.strokeStyle = "#f05454";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      state.trace.forEach(([tx, ty], i) => (i ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)));
      ctx.stroke();
    }

    // kalem ucu
    ctx.fillStyle = "#eeeeee";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, TAU);
    ctx.fill();
  }

  requestAnimationFrame(drawFrame);
}

resize();
loadShape("heart");
requestAnimationFrame(drawFrame);
