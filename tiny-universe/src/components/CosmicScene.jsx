import { useEffect, useMemo, useRef } from "react";
import { CHAPTERS, scrollGeometry } from "../data/galaxies";

// Ambient depth only — no spiral, no rings, no worlds, no tunnel.
// Each galaxy is rendered in the DOM as a blended full-viewport stage;
// this canvas is pure continuity between stages: zone-tinted space,
// three star depths, drifting dust, breathing fog, foreground bokeh.
//
// Zone colors crossfade smoothly from one destination's palette to the
// next as scroll progresses, so handoffs feel like one slow dissolve.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINTS = [
  [215, 224, 245],
  [200, 210, 235],
  [232, 222, 205],
  [190, 205, 240],
];

const GEO = scrollGeometry();

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];
const smooth = (t) => t * t * (3 - 2 * t);

function zoneColors(p) {
  const n = CHAPTERS.length;
  const c0 = GEO.centerOf(0);
  const cn = GEO.centerOf(n - 1);
  if (p <= c0) return { bg: CHAPTERS[0].zone.bg, wash: CHAPTERS[0].zone.wash, fog: CHAPTERS[0].fog };
  if (p >= cn) {
    const l = CHAPTERS[n - 1];
    return { bg: l.zone.bg, wash: l.zone.wash, fog: l.fog };
  }
  for (let i = 0; i < n - 1; i++) {
    const a = GEO.centerOf(i);
    const b = GEO.centerOf(i + 1);
    if (p >= a && p <= b) {
      const t = smooth((p - a) / (b - a));
      return {
        bg: mix3(CHAPTERS[i].zone.bg, CHAPTERS[i + 1].zone.bg, t),
        wash: mix3(CHAPTERS[i].zone.wash, CHAPTERS[i + 1].zone.wash, t),
        fog: mix3(CHAPTERS[i].fog, CHAPTERS[i + 1].fog, t),
      };
    }
  }
  const l = CHAPTERS[n - 1];
  return { bg: l.zone.bg, wash: l.zone.wash, fog: l.fog };
}

function nearestParticle(p) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const d = Math.abs(p - GEO.centerOf(i));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const ch = CHAPTERS[best];
  return (ch.atmosphere && ch.atmosphere.particle) || ch.zone.wash;
}

export default function CosmicScene({
  reducedMotion,
  chartMode,
  marks,
  onToggleMark,
  revealed = true,
}) {
  const canvasRef = useRef(null);
  const fgScreen = useRef([]);

  const live = useRef({ reducedMotion, chartMode, marks, onToggleMark, revealed });
  useEffect(() => {
    live.current = { reducedMotion, chartMode, marks, onToggleMark, revealed };
  });

  const smallScreen = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 720px)").matches,
    []
  );

  const data = useMemo(() => {
    const rand = mulberry32(987654321);
    const layer = (n, rMin, rMax, aMin, aMax) =>
      Array.from({ length: n }, () => ({
        x: rand(),
        y: rand(),
        r: rMin + rand() * (rMax - rMin),
        a: aMin + rand() * (aMax - aMin),
        c: TINTS[Math.floor(rand() * TINTS.length)],
      }));
    const density = smallScreen ? 0.6 : 1;
    return {
      bg: layer(Math.floor(900 * density), 0.4, 1.3, 0.14, 0.55),
      mid: layer(Math.floor(420 * density), 0.6, 1.9, 0.22, 0.72),
      fg: Array.from({ length: 150 }, (_, id) => ({
        id,
        x: rand(),
        y: rand(),
        r: 1 + rand() * 1.5,
        a: 0.45 + rand() * 0.55,
        c: TINTS[Math.floor(rand() * TINTS.length)],
      })),
      dust: Array.from({ length: Math.floor(180 * density) }, () => ({
        x: rand(),
        y: rand(),
        s: 0.8 + rand() * 2.4,
        a: 0.05 + rand() * 0.14,
        drift: rand() * Math.PI * 2,
      })),
      fogblobs: Array.from({ length: 12 }, () => ({
        x: 0.12 + rand() * 0.76,
        y: 0.18 + rand() * 0.64,
        r: 0.16 + rand() * 0.28,
        drift: rand() * Math.PI * 2,
        speed: 0.02 + rand() * 0.04,
      })),
      // Foreground bokeh: near-camera dust drifting past.
      bokeh: Array.from({ length: smallScreen ? 12 : 22 }, () => ({
        x: rand(),
        y: rand(),
        r: 18 + rand() * 70,
        a: 0.025 + rand() * 0.055,
        drift: rand() * Math.PI * 2,
        speed: 0.5 + rand() * 0.6,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 0;
    let H = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, smallScreen ? 1.25 : 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let pS = 0;
    let mxS = 0;
    let myS = 0;
    let velS = 0;
    let prevRaw = 0;
    let revealS = 0;
    let mouseX = 0;
    let mouseY = 0;
    const onMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    const t0 = performance.now();
    const rgb = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

    const coreGlow = (cx, cy, r, color, alpha) => {
      if (alpha <= 0.003 || r <= 0) return;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    // Star layer with its own depth speed. Deeper = slower.
    const drawStarLayer = (stars, f, flow, stretch, wash, fade, particleTint) => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const yy = (((s.y - flow * f) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * f) * W;
        const y = yy * H + myS * 14 * f;
        const len = Math.min(stretch * f, 26);
        const c = mix3(mix3(s.c, wash, 0.38), particleTint, 0.35);
        ctx.globalAlpha = s.a * fade;
        ctx.fillStyle = rgb(c, 1);
        if (len > 1.5) ctx.fillRect(x, y - len / 2, s.r * 0.8, len);
        else ctx.fillRect(x, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now) => {
      const L = live.current;
      const t = L.reducedMotion ? 0 : (now - t0) / 1000;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      pS += (raw - pS) * (L.reducedMotion ? 1 : 0.055);
      if (Math.abs(raw - pS) < 0.00004) pS = raw;
      mxS += ((L.reducedMotion ? 0 : mouseX) - mxS) * (L.reducedMotion ? 1 : 0.05);
      myS += ((L.reducedMotion ? 0 : mouseY) - myS) * (L.reducedMotion ? 1 : 0.05);
      const instVel = Math.abs(raw - prevRaw);
      prevRaw = raw;
      velS += ((L.reducedMotion ? 0 : instVel) - velS) * 0.075;

      const revealTarget = L.revealed ? 1 : 0;
      if (L.reducedMotion) revealS = revealTarget;
      else revealS += (revealTarget - revealS) * 0.024;
      if (Math.abs(revealTarget - revealS) < 0.0005) revealS = revealTarget;
      const easeReveal = smooth(clamp01(revealS));
      const arrival = easeReveal;
      const zoom = 2.4 - 1.4 * easeReveal;
      const rush = (1 - easeReveal) * 160;

      const p = pS;
      const vel = Math.min(velS * 60, 1);
      const stretch = L.reducedMotion ? 0 : vel * 120 + rush;
      const flow = p * 1.7;
      const base = Math.min(W, H);
      const zone = zoneColors(p);
      const pTint = nearestParticle(p);

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgb(zone.bg, 1);
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = 0.15 + 0.85 * arrival;

      // Region color wash.
      const washG = ctx.createLinearGradient(0, 0, W * 0.3, H);
      washG.addColorStop(0, rgb(zone.wash, 0.13));
      washG.addColorStop(0.55, rgb(zone.wash, 0.05));
      washG.addColorStop(1, rgb(zone.fog, 0.12));
      ctx.fillStyle = washG;
      ctx.fillRect(0, 0, W, H);

      // Breathing fog fields.
      for (let bi = 0; bi < data.fogblobs.length; bi++) {
        const b = data.fogblobs[bi];
        const dx = L.reducedMotion ? 0 : Math.sin(t * b.speed * 2 + b.drift) * 0.03;
        const bx = (b.x + dx) * W + mxS * 8;
        const by = b.y * H + myS * 6;
        const br = b.r * base * 1.5;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, rgb(zone.fog, 0.16));
        g.addColorStop(1, rgb(zone.fog, 0));
        ctx.fillStyle = g;
        ctx.fillRect(bx - br, by - br, br * 2, br * 2);
      }

      const intro = Math.max(0, 1 - p * 7);
      if (intro > 0) {
        coreGlow(W * 0.5, H * 0.46, base * 0.75, "140,165,230", 0.2 * intro);
        coreGlow(W * 0.5, H * 0.46, base * 0.3, "235,240,255", 0.16 * intro);
      }

      // Depth-differentiated drift: far crawls, near rushes.
      drawStarLayer(data.bg, 0.16, flow, stretch, zone.wash, 0.15 + 0.85 * arrival, pTint);
      drawStarLayer(data.mid, 0.45, flow, stretch, zone.wash, 0.15 + 0.85 * arrival, pTint);

      // Constant faint dust — part of the air, not a transition effect.
      if (!L.reducedMotion) {
        for (let i = 0; i < data.dust.length; i++) {
          const d = data.dust[i];
          const yy = (((d.y - flow * 0.4 + Math.sin(t * 0.2 + d.drift) * 0.01) % 1) + 1) % 1;
          const x = (d.x + mxS * 0.015) * W;
          const y = yy * H;
          ctx.globalAlpha = d.a;
          ctx.fillStyle = rgb(mix3([200, 205, 225], zone.wash, 0.5), 1);
          ctx.fillRect(x, y, d.s, d.s);
        }
        ctx.globalAlpha = 1;
      }

      // Foreground chartable points (near layer, fastest).
      const toSX = (x) => W / 2 + (x - W / 2) * zoom;
      const toSY = (y) => H / 2 + (y - H / 2) * zoom;
      fgScreen.current = [];
      for (let i = 0; i < data.fg.length; i++) {
        const s = data.fg[i];
        const yy = (((s.y - flow * 0.9) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * 0.9) * W;
        const y = yy * H + myS * 14 * 0.9;
        fgScreen.current.push({ id: s.id, x: toSX(x), y: toSY(y) });
        const marked = L.marks.includes(s.id);
        const c = mix3(mix3(s.c, zone.wash, 0.35), pTint, 0.18);
        ctx.globalAlpha = marked ? 1 : Math.min(1, s.a * 1.15);
        ctx.fillStyle = marked ? "#ffffff" : rgb(c, 1);
        const rr = marked ? s.r + 1.2 : s.r;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
        if (marked) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(x, y, rr + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (L.marks.length > 1) {
        ctx.strokeStyle = "rgba(220,228,245,0.4)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        L.marks.forEach((id, idx) => {
          const pt = fgScreen.current.find((f) => f.id === id);
          if (!pt) return;
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // Foreground bokeh drifts IN FRONT of everything DOM-side below.
      if (!L.reducedMotion) {
        for (let i = 0; i < data.bokeh.length; i++) {
          const b = data.bokeh[i];
          const yy = (((b.y - flow * b.speed) % 1) + 1) % 1;
          const x = (b.x + mxS * 0.03 + Math.sin(t * 0.2 + b.drift) * 0.01) * W;
          const y = yy * H;
          const alpha = b.a * (0.6 + vel * 2.2);
          if (alpha <= 0.004) continue;
          const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
          g.addColorStop(0, `rgba(${pTint[0]},${pTint[1]},${pTint[2]},${alpha})`);
          g.addColorStop(1, `rgba(${pTint[0]},${pTint[1]},${pTint[2]},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      if (arrival < 1) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(0,0,0,${(1 - arrival).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = (e) => {
    const L = live.current;
    if (!L.revealed || !L.chartMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let best = null;
    let bestD = 36;
    fgScreen.current.forEach((s) => {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    });
    if (best) L.onToggleMark(best.id);
  };

  return (
    <canvas
      ref={canvasRef}
      className="cosmos"
      aria-hidden="true"
      onClick={onClick}
    />
  );
}
