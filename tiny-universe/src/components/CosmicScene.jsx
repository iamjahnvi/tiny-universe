import { useEffect, useMemo, useRef } from "react";
import { CHAPTERS, scrollGeometry } from "../data/galaxies";

// The universe in one canvas — a downward journey, not a gallery.
//
// Every destination is a WORLD rendered without a single rectangle:
// elliptical / organic feathered bodies melt into the zone background,
// envelopes surround the camera, and each form (spiral, swarm, veil,
// remnant, deepfield…) has its own composition, rotation and debris.
//
// The spiral thread is the navigation current: it rotates, breathes,
// adopts the upcoming destination's color, tightens near worlds and
// dissolves inside enveloping media. Tunnel rings + foreground bokeh
// sell the fall through an infinite cosmic shaft.

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
const INFLUENCE = 0.075; // reign envelope per destination (wide spacing → narrow reigns, long voids)

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];
const smooth = (t) => t * t * (3 - 2 * t);

// World size per form, in units of min(W,H). Envelopes exceed the viewport.
const SIZE_BY_FORM = {
  spiral: 1.0,
  collision: 1.2,
  swarm: 0.8,
  remnant: 1.05,
  pillars: 2.3,
  veil: 2.1,
  nebula: 2.5,
  deepfield: 2.6,
};

// Squash of the organic mask (ry/rx). <1 = wide, >1 = tall.
const SQUASH_BY_FORM = {
  spiral: 0.82,
  collision: 0.68,
  swarm: 1.0,
  remnant: 0.9,
  pillars: 1.15,
  veil: 1.1,
  nebula: 0.95,
  deepfield: 1.0,
};

const ORBITS_BY_FORM = {
  spiral: 80,
  collision: 95,
  swarm: 210,
  remnant: 70,
  pillars: 40,
  veil: 36,
  nebula: 55,
  deepfield: 0,
};

const ENVELOPES = new Set(["pillars", "veil", "nebula", "deepfield"]);

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

function nearestAtmosphere(p) {
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
  const at = ch.atmosphere || { primary: ch.accent, secondary: ch.fog, glow: ch.accent, particle: ch.accent };
  return { ch, at, dist: bestD, index: best };
}

// The destination ahead — the spiral leans its color toward it.
function upcomingAtmosphere(p) {
  for (let i = 0; i < CHAPTERS.length; i++) {
    if (GEO.centerOf(i) > p + 0.004) {
      const ch = CHAPTERS[i];
      return ch.atmosphere || { primary: ch.accent, glow: ch.accent };
    }
  }
  const ch = CHAPTERS[CHAPTERS.length - 1];
  return ch.atmosphere || { primary: ch.accent, glow: ch.accent };
}

export default function CosmicScene({
  reducedMotion,
  chartMode,
  marks,
  onToggleMark,
  onHover,
  onOpen,
  onWish,
  revealed = true,
}) {
  const canvasRef = useRef(null);
  const fgScreen = useRef([]);
  const plateHits = useRef([]);
  const streaks = useRef([]);
  const wishFx = useRef(null);
  const nextStreak = useRef(0);
  const hovered = useRef(null);
  const pendingTap = useRef(null);
  const plates = useRef({});

  const live = useRef({ reducedMotion, chartMode, marks, onToggleMark, onHover, onOpen, onWish, revealed });
  useEffect(() => {
    live.current = { reducedMotion, chartMode, marks, onToggleMark, onHover, onOpen, onWish, revealed };
  });

  const smallScreen = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 720px)").matches,
    []
  );
  const touchMode = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none)").matches,
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
      bg: layer(Math.floor(1100 * density), 0.4, 1.3, 0.14, 0.55),
      mid: layer(Math.floor(520 * density), 0.6, 1.9, 0.22, 0.72),
      fg: Array.from({ length: 150 }, (_, id) => ({
        id,
        x: rand(),
        y: rand(),
        r: 1 + rand() * 1.5,
        a: 0.45 + rand() * 0.55,
        c: TINTS[Math.floor(rand() * TINTS.length)],
      })),
      deep: Array.from({ length: Math.floor(1500 * density) }, () => ({
        x: rand(),
        y: rand(),
        s: 0.5 + rand() * 1.6,
        c: Math.floor(rand() * 4),
        tw: rand() * Math.PI * 2,
      })),
      dust: Array.from({ length: Math.floor(240 * density) }, () => ({
        x: rand(),
        y: rand(),
        s: 0.8 + rand() * 2.4,
        a: 0.05 + rand() * 0.16,
        drift: rand() * Math.PI * 2,
      })),
      fogblobs: Array.from({ length: 14 }, () => ({
        x: 0.12 + rand() * 0.76,
        y: 0.18 + rand() * 0.64,
        r: 0.16 + rand() * 0.28,
        drift: rand() * Math.PI * 2,
        speed: 0.02 + rand() * 0.04,
      })),
      thread: Array.from({ length: 460 }, (_, i) => ({
        arm: i % 2,
        t: (i / 460 + rand() * 0.01) % 1,
        size: 0.7 + rand() * 1.6,
        a: 0.12 + rand() * 0.42,
      })),
      // Vertical tunnel rings: the falling shaft.
      rings: Array.from({ length: 15 }, () => ({
        seed: rand(),
        wob: rand() * Math.PI * 2,
      })),
      // Foreground bokeh: near-camera dust that rushes past.
      bokeh: Array.from({ length: smallScreen ? 14 : 26 }, () => ({
        x: rand(),
        y: rand(),
        r: 18 + rand() * 70,
        a: 0.025 + rand() * 0.06,
        drift: rand() * Math.PI * 2,
        speed: 0.7 + rand() * 0.9,
      })),
      // Per-world orbital debris — each world owns its swarm.
      orbits: CHAPTERS.map((ch) => {
        const n = ORBITS_BY_FORM[ch.form] ?? 60;
        const arr = [];
        for (let k = 0; k < n; k++) {
          arr.push({
            rad: 0.55 + rand() * 1.15,
            ang: rand() * Math.PI * 2,
            sp: (0.02 + rand() * 0.1) * (rand() < 0.5 ? 1 : -1),
            s: 0.6 + rand() * 1.8,
            a: 0.25 + rand() * 0.6,
            wob: rand() * Math.PI * 2,
          });
        }
        return arr;
      }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rand = mulberry32(123456789);
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
    nextStreak.current = 7;

    const rgb = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

    const ensurePlate = (i) => {
      const cache = plates.current;
      if (cache[i] || typeof window === "undefined") return;
      const rec = { img: null, loaded: false };
      cache[i] = rec;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        rec.img = img;
        rec.loaded = true;
      };
      img.src = CHAPTERS[i].image;
    };
    ensurePlate(0);
    ensurePlate(1);

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
        let c = mix3(s.c, wash, 0.38);
        if (particleTint) c = mix3(c, particleTint, 0.35);
        ctx.globalAlpha = s.a * fade;
        ctx.fillStyle = rgb(c, 1);
        if (len > 1.5) ctx.fillRect(x, y - len / 2, s.r * 0.8, len);
        else ctx.fillRect(x, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    };

    // Focal-aware cover drawn into the CURRENT transform at (-tw/2,-th/2).
    const drawFocalCover = (img, tw, th, fx, fy, scale, bright, alpha) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!iw || !ih) return;
      const base = Math.max(tw / iw, th / ih) * scale;
      const visW = Math.min(iw, tw / base);
      const visH = Math.min(ih, th / base);
      let sx = fx * iw - visW / 2;
      let sy = fy * ih - visH / 2;
      sx = Math.min(Math.max(sx, 0), Math.max(0, iw - visW));
      sy = Math.min(Math.max(sy, 0), Math.max(0, ih - visH));
      ctx.globalAlpha = Math.min(1, alpha);
      try {
        ctx.filter = `brightness(${bright}) contrast(1.07) saturate(1.16)`;
      } catch { /* older engines */ }
      ctx.drawImage(img, sx, sy, visW, visH, -tw / 2, -th / 2, tw, th);
      try { ctx.filter = "none"; } catch { /* noop */ }
      ctx.globalAlpha = 1;
    };

    // Organic world body: elliptical clip + focal cover + edge melt into
    // the zone background. Never a rectangle, never a rim.
    const drawOrganicBody = (img, gx, gy, rx, ry, rot, fx, fy, scale, bright, a, bg, passes) => {
      for (let pass = 0; pass < passes; pass++) {
        const prx = pass === 0 ? rx : rx * 1.35;
        const pry = pass === 0 ? ry : ry * 1.35;
        const pa = pass === 0 ? a : a * 0.28;
        if (pa <= 0.01) continue;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, prx, pry, 0, 0, Math.PI * 2);
        // Remnant gets a second offset lobe for a filamentary shell.
        if (pass === 1) {
          ctx.ellipse(prx * 0.18, -pry * 0.22, prx * 0.7, pry * 0.7, 0.4, 0, Math.PI * 2);
        }
        ctx.clip();
        drawFocalCover(img, prx * 2, pry * 2, fx, fy, scale, bright, pa, 0);
        ctx.restore();
        // Melt the rim into surrounding space.
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(rot);
        const squash = pry / Math.max(1, prx);
        ctx.scale(1, squash);
        const melt = ctx.createRadialGradient(0, 0, prx * 0.4, 0, 0, prx * 1.3);
        melt.addColorStop(0, "rgba(0,0,0,0)");
        melt.addColorStop(0.66, "rgba(0,0,0,0)");
        melt.addColorStop(1, `rgba(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0},${(0.97 * Math.min(1, pa * 1.4)).toFixed(3)})`);
        ctx.fillStyle = melt;
        ctx.beginPath();
        ctx.arc(0, 0, prx * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    // Enveloping medium: the plate surrounds the camera. Full-bleed
    // luminous cover blended with 'screen', then melted on all sides.
    const drawEnvelope = (img, fx, fy, scale, bright, a, bg, t, seedShift) => {
      if (a <= 0.01 || !img || !img.naturalWidth) return;
      const ew = W * 1.5;
      const eh = H * 1.5;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const base = Math.max(ew / iw, eh / ih) * scale;
      const visW = Math.min(iw, ew / base);
      const visH = Math.min(ih, eh / base);
      const driftX = Math.sin(t * 0.05 + seedShift) * iw * 0.02;
      const driftY = Math.cos(t * 0.04 + seedShift) * ih * 0.02;
      let sx = fx * iw - visW / 2 + driftX;
      let sy = fy * ih - visH / 2 + driftY;
      sx = Math.min(Math.max(sx, 0), Math.max(0, iw - visW));
      sy = Math.min(Math.max(sy, 0), Math.max(0, ih - visH));
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = Math.min(1, 0.82 * a);
      try {
        ctx.filter = `brightness(${bright}) contrast(1.06) saturate(1.2)`;
      } catch {}
      ctx.drawImage(img, sx, sy, visW, visH, -ew * 0.5 + W / 2, -eh * 0.5 + H / 2, ew, eh);
      try { ctx.filter = "none"; } catch {}
      ctx.restore();
      // Melt all four edges into the zone so there is no frame.
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const m = Math.min(1, a * 1.2);
      const bgs = (al) => `rgba(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0},${al})`;
      let g = ctx.createLinearGradient(0, 0, 0, H * 0.42);
      g.addColorStop(0, bgs(0.95 * m));
      g.addColorStop(1, bgs(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H * 0.42);
      g = ctx.createLinearGradient(0, H, 0, H * 0.58);
      g.addColorStop(0, bgs(0.95 * m));
      g.addColorStop(1, bgs(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, H * 0.58, W, H * 0.42);
      g = ctx.createLinearGradient(0, 0, W * 0.3, 0);
      g.addColorStop(0, bgs(0.8 * m));
      g.addColorStop(1, bgs(0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W * 0.3, H);
      g = ctx.createLinearGradient(W, 0, W * 0.7, 0);
      g.addColorStop(0, bgs(0.8 * m));
      g.addColorStop(1, bgs(0));
      ctx.fillStyle = g;
      ctx.fillRect(W * 0.7, 0, W * 0.3, H);
      ctx.restore();
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
      const near = nearestAtmosphere(p);
      const ahead = upcomingAtmosphere(p);

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

      const pTint = near.at.particle || zone.wash;
      // Depth-differentiated drift: far crawls, near rushes.
      drawStarLayer(data.bg, 0.16, flow, stretch, zone.wash, 0.15 + 0.85 * arrival, pTint);
      drawStarLayer(data.mid, 0.45, flow, stretch, zone.wash, 0.15 + 0.85 * arrival, pTint);

      // Transition dust surges mid-handoff between reigns.
      const envs = [];
      for (let i = 0; i < CHAPTERS.length; i++) {
        const c = GEO.centerOf(i);
        envs.push(Math.max(0, 1 - Math.abs(p - c) / INFLUENCE));
      }
      const maxEnv = Math.max(0, ...envs);
      let md = Infinity;
      for (let i = 0; i < CHAPTERS.length; i++) md = Math.min(md, Math.abs(p - GEO.centerOf(i)));
      const transK = smooth(clamp01(md / INFLUENCE));
      if (transK > 0.04 && !L.reducedMotion) {
        for (let i = 0; i < data.dust.length; i++) {
          const d = data.dust[i];
          const yy = (((d.y - flow * 0.4 + Math.sin(t * 0.2 + d.drift) * 0.01) % 1) + 1) % 1;
          const x = (d.x + mxS * 0.015) * W;
          const y = yy * H;
          ctx.globalAlpha = d.a * (0.4 + transK * 1.4);
          ctx.fillStyle = rgb(mix3([200, 205, 225], zone.wash, 0.5), 1);
          ctx.fillRect(x, y, d.s, d.s);
        }
        ctx.globalAlpha = 1;
      }

      // ── Tunnel rings: the falling shaft ──
      if (!L.reducedMotion) {
        const ringBoost = 0.5 + transK * 0.9 + Math.min(1, vel * 4) * 0.7;
        for (let j = 0; j < data.rings.length; j++) {
          const r = data.rings[j];
          const u = (((r.seed + flow * 0.5) % 1) + 1) % 1; // 0 far → 1 near
          const y = H * (0.06 + u * 0.94) + Math.sin(t * 0.4 + r.wob) * 6 + myS * 10 * u;
          const rad = base * (0.04 + u * u * 0.85);
          const alpha = (0.028 + (1 - u) * 0.02 + vel * 0.05) * ringBoost;
          if (alpha <= 0.004) continue;
          ctx.globalAlpha = Math.min(0.22, alpha);
          ctx.strokeStyle = rgb(mix3(zone.wash, [255, 255, 255], u * 0.25), 1);
          ctx.lineWidth = 0.8 + u * 1.1;
          ctx.beginPath();
          ctx.ellipse(W / 2 + mxS * 18 * u, y, rad, rad * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
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

      // ── Spiral thread: the gravitational current ──
      // Tightens + dims inside worlds, opens + brightens in the voids,
      // and leans its color toward the destination ahead.
      let envelopeK = 0;
      for (let i = 0; i < CHAPTERS.length; i++) {
        if (ENVELOPES.has(CHAPTERS[i].form)) envelopeK = Math.max(envelopeK, envs[i] || 0);
      }
      const gapK = 1 - maxEnv;
      const dissolve = 1 - envelopeK * 0.82;
      const threadA = (0.34 + 0.62 * gapK + 0.3 * Math.min(1, vel * 3)) * dissolve;
      const rot = (L.reducedMotion ? 0 : t * (0.028 + gapK * 0.06)) + p * 10;
      const tcx = W * 0.5 + mxS * 14;
      const tcy = H * 0.52 + myS * 10;
      const leanT = smooth(clamp01(0.3 + gapK * 0.55));
      const threadC = mix3(
        mix3(mix3([200, 208, 235], zone.wash, 0.5), near.at.primary || zone.wash, 0.4),
        ahead.primary || ahead.glow || zone.wash,
        leanT * 0.72
      );
      const spread = (1 + gapK * 0.5) * (1 + envelopeK * 0.35);
      if (threadA > 0.02) {
        for (let i = 0; i < data.thread.length; i++) {
          const s = data.thread[i];
          const ang = (s.arm === 0 ? 0 : Math.PI) + s.t * 5.2 + rot * (0.4 + s.t);
          const r = (0.02 + s.t * 0.48) * base * spread;
          ctx.globalAlpha = Math.min(1, s.a * threadA * 1.7);
          ctx.fillStyle = rgb(threadC, 1);
          ctx.fillRect(tcx + Math.cos(ang) * r, tcy + Math.sin(ang) * r * 0.7, s.size * (1 + gapK * 0.7), s.size);
        }
        ctx.globalAlpha = 1;
        // A faint downward current line binds the thread to the fall.
        ctx.globalAlpha = Math.min(0.16, 0.05 + gapK * 0.1) * dissolve;
        ctx.strokeStyle = rgb(threadC, 1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tcx, -20);
        ctx.bezierCurveTo(tcx + 40, H * 0.3, tcx - 40, H * 0.6, tcx, H + 20);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Worlds: no rectangles, ever ──
      plateHits.current = [];
      for (let i = 0; i < CHAPTERS.length; i++) {
        const ch = CHAPTERS[i];
        const dd = (p - GEO.centerOf(i)) / INFLUENCE;
        const ad = Math.abs(dd);
        const fade = smooth(clamp01((ad - 0.42) / 0.58));
        const e = Math.max(0, 1 - fade);
        if (e > 0.02) ensurePlate(i);
        if (e <= 0.02) continue;
        const rec = plates.current[i];
        const a = Math.pow(e, 1.05);
        const local = clamp01((p - (GEO.centerOf(i) - INFLUENCE)) / (INFLUENCE * 2));
        const ease = local * local * (3 - 2 * local);
        const isHot = hovered.current === ch.slug;
        const at = ch.atmosphere || { primary: ch.accent, secondary: ch.fog, glow: ch.accent };
        const isEnvelope = ENVELOPES.has(ch.form);

        const narrow = W < 720;
        const dir = i % 2 === 0 ? 1 : -1;
        const sideShift = isEnvelope ? 0 : ch.infoSide === "right" ? -0.07 : 0.07;
        const gx = W * (0.5 + sideShift) + dir * (0.5 - local) * W * (isEnvelope ? 0.02 : 0.08) + mxS * 22;
        const gy = H * (isEnvelope ? 0.5 : 0.47 + (0.5 - local) * 0.5) + myS * 16;

        const fx = (narrow && ch.focalMobile ? ch.focalMobile.x : ch.focalPoint.x) ?? 0.5;
        const fy = (narrow && ch.focalMobile ? ch.focalMobile.y : ch.focalPoint.y) ?? 0.5;

        const sizeUnit = (SIZE_BY_FORM[ch.form] ?? 1.0) * base;
        const grow = 0.55 + ease * 0.85;
        const hot = isHot && !L.reducedMotion ? 1.035 : 1;
        const spin = L.reducedMotion ? 0 : t * (ch.rotation || 0);
        const tilt = dir * (local - 0.5) * 0.03;
        const rotP = tilt + spin;
        const far = clamp01(1 - a * 1.6);
        const bright = (1.04 + 0.1 * (1 - far) + (isHot ? 0.08 : 0)).toFixed(2);

        // Image-derived atmosphere bleeding behind the body.
        ctx.globalCompositeOperation = "lighter";
        const breathe = L.reducedMotion ? 1 : 1 + Math.sin(t * 0.6 + i * 1.7) * 0.04;
        coreGlow(gx, gy, base * (isEnvelope ? 1.2 : 0.85) * breathe, `${at.primary[0]},${at.primary[1]},${at.primary[2]}`, (isEnvelope ? 0.3 : 0.22) * a);
        coreGlow(gx, gy, base * 1.3, `${at.secondary[0]},${at.secondary[1]},${at.secondary[2]}`, 0.13 * a);
        coreGlow(gx, gy, base * 0.4, `${at.glow[0]},${at.glow[1]},${at.glow[2]}`, 0.2 * a);
        ctx.globalCompositeOperation = "source-over";

        if (rec && rec.loaded && rec.img) {
          if (isEnvelope) {
            drawEnvelope(rec.img, fx, fy, ch.scale, far > 0.03 ? 0.9 : Number(bright), a, zone.bg, L.reducedMotion ? 0 : t, i * 2.3);
            // Envelop hit zone: generous central ellipse (the place, not a frame).
            plateHits.current.push({ slug: ch.slug, cx: toSX(W / 2), cy: toSY(H / 2), rx: W * 0.34 * zoom, ry: H * 0.28 * zoom, e });
          } else {
            const squash = SQUASH_BY_FORM[ch.form] ?? 0.85;
            let rx = (sizeUnit * 0.52 * grow * hot * ch.scale) / 1.22;
            let ry = rx * squash;
            if (ch.form === "collision") { rx *= 1.22; ry *= 0.92; }
            if (ch.form === "swarm") { rx *= 0.9; ry *= 0.95; }
            if (far > 0.03) {
              ctx.save();
              ctx.globalAlpha = Math.min(1, a);
              try { ctx.filter = `blur(${(far * 7).toFixed(1)}px) brightness(${(0.72 + 0.32 * (1 - far)).toFixed(2)})`; } catch {}
              drawOrganicBody(rec.img, gx, gy, rx, ry, rotP, fx, fy, ch.scale, 0.9, a, zone.bg, ch.form === "remnant" ? 2 : 1);
              try { ctx.filter = "none"; } catch {}
              ctx.restore();
            } else {
              drawOrganicBody(rec.img, gx, gy, rx, ry, rotP, fx, fy, ch.scale, Number(bright), a, zone.bg, ch.form === "remnant" ? 2 : 1);
            }
            // Hot core light for spirals / collisions / remnants.
            ctx.globalCompositeOperation = "lighter";
            coreGlow(gx, gy, rx * 0.5, `${at.glow[0]},${at.glow[1]},${at.glow[2]}`, 0.22 * a);
            ctx.globalCompositeOperation = "source-over";
            plateHits.current.push({ slug: ch.slug, cx: toSX(gx), cy: toSY(gy), rx: rx * 0.98 * zoom, ry: ry * 0.98 * zoom, e });
          }

          // ── Orbital debris: each world owns a moving system ──
          const orbits = data.orbits[i];
          if (orbits && orbits.length && a > 0.04) {
            const orbR = isEnvelope ? base * 0.7 : (ch.form === "swarm" ? sizeUnit * 0.75 : sizeUnit * 0.55 * grow);
            const pc = at.particle || at.glow;
            for (let k = 0; k < orbits.length; k++) {
              const o = orbits[k];
              const ang = L.reducedMotion ? o.ang : o.ang + t * o.sp * (ch.form === "swarm" ? 2.2 : 1);
              const rad = orbR * o.rad * (isEnvelope ? 0.9 + 0.2 * Math.sin(t * 0.2 + o.wob) : 1);
              const ox = gx + Math.cos(ang) * rad + mxS * 10 * o.rad;
              // Swarms surround the camera: distribute vertically through depth.
              const oy = ch.form === "swarm"
                ? gy + Math.sin(ang * 1.3 + o.wob) * rad * 1.4
                : gy + Math.sin(ang) * rad * 0.62;
              const twk = L.reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(t * 0.9 + o.wob);
              ctx.globalAlpha = Math.min(1, o.a * a * twk);
              ctx.fillStyle = rgb(mix3([225, 228, 242], pc, 0.45), 1);
              const s = o.s * (ch.form === "swarm" ? 1.15 : 1);
              ctx.fillRect(ox, oy, s, s);
            }
            ctx.globalAlpha = 1;
          }
        } else {
          coreGlow(gx, gy, base * 0.35, `${at.primary[0]},${at.primary[1]},${at.primary[2]}`, 0.2 * a);
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.globalCompositeOperation = "source-over";

      // Deep-field grain swells near the monochrome zone.
      const deepEnv = envs[6] || 0;
      if (deepEnv > 0.03) {
        const gx = W * 0.5 + mxS * 8;
        const gy = H * 0.46 + myS * 6;
        const dzoom = 0.7 + deepEnv * 0.7;
        for (let i = 0; i < data.deep.length; i++) {
          const d = data.deep[i];
          const x = gx + (d.x - 0.5) * base * 1.9 * dzoom;
          const y = gy + (d.y - 0.5) * base * 1.9 * dzoom;
          const twk = L.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 0.8 + d.tw);
          ctx.globalAlpha = Math.min(1, 0.8 * deepEnv * twk);
          ctx.fillStyle = rgb(TINTS[d.c], 1);
          const s = d.s * (0.7 + deepEnv * 0.8);
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
      }

      // Foreground bokeh passes IN FRONT of worlds: near-camera dust.
      if (!L.reducedMotion) {
        for (let i = 0; i < data.bokeh.length; i++) {
          const b = data.bokeh[i];
          const yy = (((b.y - flow * b.speed) % 1) + 1) % 1;
          const x = (b.x + mxS * 0.03 + Math.sin(t * 0.2 + b.drift) * 0.01) * W;
          const y = yy * H;
          const alpha = b.a * (0.6 + vel * 2.2);
          if (alpha <= 0.004) continue;
          const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
          const pc = pTint;
          g.addColorStop(0, `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`);
          g.addColorStop(1, `rgba(${pc[0]},${pc[1]},${pc[2]},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
        }
      }

      // Rare streaks.
      if (!L.reducedMotion && t > nextStreak.current && streaks.current.length < 2) {
        const fromLeft = rand() < 0.5;
        streaks.current.push({
          x: fromLeft ? -80 : W * (0.3 + rand() * 0.6),
          y: H * (0.08 + rand() * 0.3),
          vx: (fromLeft ? 1 : -1) * W * (0.9 + rand() * 0.5),
          vy: H * (0.25 + rand() * 0.3),
          life: 0,
        });
        nextStreak.current = t + 9 + rand() * 8;
      }
      streaks.current = streaks.current.filter((s) => {
        s.life += 1 / 60;
        s.x += s.vx / 60;
        s.y += s.vy / 60;
        const alive = s.life < 2.4 && s.x > -200 && s.x < W + 200 && s.y < H + 200;
        if (!alive) return false;
        const fade = Math.min(1, s.life * 6) * Math.max(0, 1 - (s.life - 1.4));
        const mag = Math.hypot(s.vx, s.vy) || 1;
        const tx = (-s.vx / mag) * 130;
        const ty = (-s.vy / mag) * 130;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + tx, s.y + ty);
        grad.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + tx, s.y + ty);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.9 * fade})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      if (wishFx.current) {
        const w = wishFx.current;
        const age = (now - w.t0) / 1000;
        if (age > 2.2) wishFx.current = null;
        else {
          const k = age / 2.2;
          ctx.strokeStyle = `rgba(225,232,250,${0.55 * (1 - k)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w.x, w.y, 6 + k * 70, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(225,232,250,${0.6 * (1 - k)})`;
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * Math.PI * 2 + 0.4;
            ctx.fillRect(w.x + Math.cos(ang) * k * 56, w.y + Math.sin(ang) * k * 56, 1.4, 1.4);
          }
          ctx.fillStyle = `rgba(225,228,238,${0.8 * (1 - k * k)})`;
          ctx.font = "10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("W I S H   R E C O R D E D", w.x, w.y + 34);
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();

      if (arrival < 1) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(0,0,0,${(1 - arrival).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (!L.revealed) {
        if (hovered.current !== null) {
          hovered.current = null;
          L.onHover(null);
        }
      } else if (!L.chartMode) {
        const hx = (mouseX * 0.5 + 0.5) * W;
        const hy = (mouseY * 0.5 + 0.5) * H;
        let found = null;
        for (const r of plateHits.current) {
          if (r.e < 0.3) continue;
          const dx = (hx - r.cx) / (r.rx * 0.95);
          const dy = (hy - r.cy) / (r.ry * 0.95);
          if (dx * dx + dy * dy < 1) {
            found = r.slug;
            break;
          }
        }
        if (found !== hovered.current) {
          hovered.current = found;
          pendingTap.current = null;
          canvas.style.cursor = found ? "pointer" : "crosshair";
          L.onHover(found);
        }
      } else if (hovered.current !== null) {
        hovered.current = null;
        canvas.style.cursor = "crosshair";
        L.onHover(null);
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
    if (!L.revealed) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (L.chartMode) {
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
      return;
    }

    const hit = plateHits.current.find((r) => {
      if (r.e < 0.3) return false;
      const dx = (x - r.cx) / (r.rx * 0.95);
      const dy = (y - r.cy) / (r.ry * 0.95);
      return dx * dx + dy * dy < 1;
    });
    if (hit) {
      if (touchMode) {
        if (pendingTap.current === hit.slug) {
          pendingTap.current = null;
          L.onOpen(hit.slug);
        } else {
          pendingTap.current = hit.slug;
          hovered.current = hit.slug;
          L.onHover(hit.slug);
        }
      } else {
        L.onOpen(hit.slug);
      }
      return;
    }
    pendingTap.current = null;

    for (const s of streaks.current) {
      if (Math.hypot(s.x - x, s.y - y) < 64) {
        wishFx.current = { x: s.x, y: s.y, t0: performance.now() };
        streaks.current = streaks.current.filter((k) => k !== s);
        L.onWish();
        return;
      }
    }
  };

  const onTouchEnd = () => {
    if (!touchMode) return;
  };

  return (
    <canvas
      ref={canvasRef}
      className="cosmos"
      aria-hidden="true"
      onClick={onClick}
      onTouchEnd={onTouchEnd}
    />
  );
}
