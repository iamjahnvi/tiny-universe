import { useEffect, useMemo, useRef } from "react";
import { CHAPTERS, scrollGeometry } from "../data/galaxies";

// The universe in one canvas.
// ── Composition system ─────────────────────────────────────
// Every plate is art-directed: the source image is cropped around its
// focalPoint, scaled per-object, placed in a consistent cinematic frame,
// then bled into space (blurred halo + image-derived glow + tinted
// particles). Aspect ratios never dictate layout.

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
const INFLUENCE = 0.145; // reign envelope per destination

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

// Nearest-chapter atmosphere for particle tinting / spiral adoption.
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
  return { ch, at, dist: bestD };
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
  const plateRects = useRef([]);
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
      bg: layer(Math.floor(1200 * density), 0.4, 1.3, 0.14, 0.55),
      mid: layer(Math.floor(560 * density), 0.6, 1.9, 0.22, 0.72),
      fg: Array.from({ length: 150 }, (_, id) => ({
        id,
        x: rand(),
        y: rand(),
        r: 1 + rand() * 1.5,
        a: 0.45 + rand() * 0.55,
        c: TINTS[Math.floor(rand() * TINTS.length)],
      })),
      deep: Array.from({ length: Math.floor(1400 * density) }, () => ({
        x: rand(),
        y: rand(),
        s: 0.5 + rand() * 1.6,
        c: Math.floor(rand() * 4),
        tw: rand() * Math.PI * 2,
      })),
      dust: Array.from({ length: Math.floor(260 * density) }, () => ({
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
      thread: Array.from({ length: 480 }, (_, i) => ({
        arm: i % 2,
        t: (i / 480 + rand() * 0.01) % 1,
        size: 0.7 + rand() * 1.6,
        a: 0.12 + rand() * 0.42,
      })),
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

    const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const ensurePlate = (i) => {
      const cache = plates.current;
      if (cache[i] || typeof window === "undefined") return;
      const rec = { img: null, aspect: 1.5, loaded: false };
      cache[i] = rec;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        rec.img = img;
        rec.aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        rec.loaded = true;
      };
      img.src = CHAPTERS[i].image;
    };
    ensurePlate(0);
    ensurePlate(1);

    const drawStarLayer = (stars, f, flow, stretch, wash, fade = 1, particleTint = null) => {
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

    const coreGlow = (cx, cy, r, color, alpha) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${color},${alpha})`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    };

    // Focal-aware cover: crop the SOURCE around focalPoint so the subject
    // always survives, regardless of source aspect ratio.
    const drawComposedPlate = (img, gx, gy, tw, th, fx, fy, scale, brightness) => {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const base = Math.max(tw / iw, th / ih) * scale;
      const visW = tw / base; // visible source width
      const visH = th / base;
      // center the visible window on the focal point, clamped to bounds
      let sx = fx * iw - visW / 2;
      let sy = fy * ih - visH / 2;
      sx = Math.min(Math.max(sx, 0), Math.max(0, iw - visW));
      sy = Math.min(Math.max(sy, 0), Math.max(0, ih - visH));
      try {
        ctx.filter = `brightness(${brightness}) contrast(1.07) saturate(1.14)`;
      } catch { /* older engines */ }
      ctx.drawImage(img, sx, sy, visW, visH, -tw / 2, -th / 2, tw, th);
      try { ctx.filter = "none"; } catch { /* noop */ }
    };

    const frame = (now) => {
      const L = live.current;
      const t = L.reducedMotion ? 0 : (now - t0) / 1000;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      // Heavy smoothing = Active-Theory-like inertia on scroll + pointer.
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

      // ── Graded space: strong but smooth region color ──
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgb(zone.bg, 1);
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = 0.15 + 0.85 * arrival;

      // Full-viewport color wash — this is what makes each region
      // unmistakably its own. Diagonal gradient, interpolated per frame.
      const washG = ctx.createLinearGradient(0, 0, W * 0.3, H);
      washG.addColorStop(0, rgb(zone.wash, 0.13));
      washG.addColorStop(0.55, rgb(zone.wash, 0.05));
      washG.addColorStop(1, rgb(zone.fog, 0.12));
      ctx.fillStyle = washG;
      ctx.fillRect(0, 0, W, H);

      // Breathing fog fields in the zone's own color.
      data.fogblobs.forEach((b) => {
        const dx = L.reducedMotion ? 0 : Math.sin(t * b.speed * 2 + b.drift) * 0.03;
        const bx = (b.x + dx) * W + mxS * 8;
        const by = b.y * H + myS * 6;
        const br = b.r * base * 1.5;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, rgb(zone.fog, 0.16));
        g.addColorStop(1, rgb(zone.fog, 0));
        ctx.fillStyle = g;
        ctx.fillRect(bx - br, by - br, br * 2, br * 2);
      });

      const intro = Math.max(0, 1 - p * 7);
      if (intro > 0) {
        coreGlow(W * 0.5, H * 0.46, base * 0.75, "140,165,230", 0.2 * intro);
        coreGlow(W * 0.5, H * 0.46, base * 0.3, "235,240,255", 0.16 * intro);
      }

      const pTint = near.at.particle || zone.wash;
      drawStarLayer(data.bg, 0.25, flow, stretch, zone.wash, 0.15 + 0.85 * arrival, pTint);
      drawStarLayer(data.mid, 0.55, flow, stretch, zone.wash, 0.15 + 0.85 * arrival, pTint);

      // Transition dust: surges mid-handoff between reigns.
      let transK = 1;
      {
        let md = Infinity;
        for (let i = 0; i < CHAPTERS.length; i++) md = Math.min(md, Math.abs(p - GEO.centerOf(i)));
        transK = smooth(clamp01(md / INFLUENCE)); // 0 at center, 1 mid-gap
      }
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

      // Foreground chartable points.
      const toSX = (x) => W / 2 + (x - W / 2) * zoom;
      const toSY = (y) => H / 2 + (y - H / 2) * zoom;
      fgScreen.current = [];
      for (let i = 0; i < data.fg.length; i++) {
        const s = data.fg[i];
        const yy = (((s.y - flow * 0.85) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * 0.85) * W;
        const y = yy * H + myS * 14 * 0.85;
        fgScreen.current.push({ id: s.id, x: toSX(x), y: toSY(y) });
        const marked = L.marks.includes(s.id);
        const c = mix3(mix3(s.c, zone.wash, 0.35), pTint, 0.18);
        ctx.globalAlpha = marked ? 1 : Math.min(1, s.a * 1.15);
        ctx.fillStyle = marked ? "#ffffff" : rgb(c, 1);
        const r = marked ? s.r + 1.2 : s.r;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (marked) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
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

      // ── Spiral thread: alive, adopts each region's color ──
      const envs = CHAPTERS.map((_, i) => {
        const c = GEO.centerOf(i);
        return Math.max(0, 1 - Math.abs(p - c) / INFLUENCE);
      });
      const maxEnv = Math.max(...envs, 0);
      // In gaps the spiral opens up + brightens; at reigns it tightens.
      const gapK = 1 - maxEnv;
      const threadA = 0.3 + 0.55 * gapK + 0.25 * Math.min(1, vel * 3);
      const rot = (L.reducedMotion ? 0 : t * (0.028 + gapK * 0.05)) + p * 10;
      const tcx = W * 0.5 + mxS * 14;
      const tcy = H * 0.52 + myS * 10;
      const threadC = mix3(mix3([200, 208, 235], zone.wash, 0.55), near.at.primary || zone.wash, 0.35);
      const spread = 1 + gapK * 0.45; // stretch between galaxies
      for (let i = 0; i < data.thread.length; i++) {
        const s = data.thread[i];
        const ang = (s.arm === 0 ? 0 : Math.PI) + s.t * 5.2 + rot * (0.4 + s.t);
        const r = (0.02 + s.t * 0.48) * base * spread;
        ctx.globalAlpha = Math.min(1, s.a * threadA * 1.6);
        ctx.fillStyle = rgb(threadC, 1);
        ctx.fillRect(tcx + Math.cos(ang) * r, tcy + Math.sin(ang) * r * 0.7, s.size * (1 + gapK * 0.6), s.size);
      }
      ctx.globalAlpha = 1;

      // ── Hubble plates: cinematic viewport composition ──
      plateRects.current = [];
      CHAPTERS.forEach((ch, i) => {
        const dd = (p - GEO.centerOf(i)) / INFLUENCE;
        const ad = Math.abs(dd);
        const fade = smooth(clamp01((ad - 0.42) / 0.58));
        const e = Math.max(0, 1 - fade);
        if (e > 0.02) ensurePlate(i);
        if (e <= 0.02) return;
        const rec = plates.current[i];
        const a = Math.pow(e, 1.05);
        const local = clamp01((p - (GEO.centerOf(i) - INFLUENCE)) / (INFLUENCE * 2));
        const ease = local * local * (3 - 2 * local);
        const isHot = hovered.current === ch.slug;
        const at = ch.atmosphere || { primary: ch.accent, secondary: ch.fog, glow: ch.accent };

        // Frame placement: offset away from the info side so copy never
        // covers the focal subject. Consistent cinematic language.
        const narrow = W < 720;
        const fw = (narrow ? Math.min(0.92, ch.frame.w + 0.18) : ch.frame.w) * W;
        const fh = (narrow ? Math.min(0.52, ch.frame.h) : ch.frame.h) * H;
        const sideShift = ch.infoSide === "right" ? -0.06 : 0.06;
        const dir = i % 2 === 0 ? 1 : -1;
        const gx = W * (0.5 + sideShift) + dir * (0.5 - local) * W * 0.08 + mxS * 22;
        const gy = H * (0.47 + (0.5 - local) * 0.5) + myS * 16;
        let tw = fw * (0.55 + ease * 0.75) * ch.scale;
        let th = fh * (0.55 + ease * 0.75) * ch.scale;
        if (isHot && !L.reducedMotion) { tw *= 1.035; th *= 1.035; }
        const rotP = dir * (local - 0.5) * 0.028;
        const over = 1 + Math.abs(rotP) * 2;
        tw *= over; th *= over;

        const fx = (narrow && ch.focalMobile ? ch.focalMobile.x : ch.focalPoint.x) ?? 0.5;
        const fy = (narrow && ch.focalMobile ? ch.focalMobile.y : ch.focalPoint.y) ?? 0.5;

        // 1) Image-derived atmosphere: bleed halo BEHIND the plate.
        ctx.globalCompositeOperation = "lighter";
        coreGlow(gx, gy, base * 0.85, `${at.primary[0]},${at.primary[1]},${at.primary[2]}`, 0.22 * a);
        coreGlow(gx, gy, base * 1.25, `${at.secondary[0]},${at.secondary[1]},${at.secondary[2]}`, 0.13 * a);
        coreGlow(gx, gy, base * 0.4, `${at.glow[0]},${at.glow[1]},${at.glow[2]}`, 0.2 * a);

        if (rec && rec.loaded && rec.img) {
          // Blurred duplicate = the image bleeding into space.
          ctx.save();
          ctx.globalAlpha = Math.min(1, 0.5 * a);
          ctx.translate(gx, gy);
          ctx.rotate(rotP);
          try { ctx.filter = `blur(${Math.max(18, base * 0.05).toFixed(0)}px) brightness(1.05) saturate(1.25)`; } catch {}
          const btw = tw * 1.28;
          const bth = th * 1.28;
          const biw = rec.img.naturalWidth;
          const bih = rec.img.naturalHeight;
          const bscale = Math.max(btw / biw, bth / bih) * ch.scale;
          ctx.drawImage(rec.img, -btw / 2, -bth / 2, btw, bth);
          void bscale;
          ctx.restore();
          try { ctx.filter = "none"; } catch {}

          plateRects.current.push({ slug: ch.slug, cx: toSX(gx), cy: toSY(gy), w: tw * zoom, h: th * zoom, e });
          ctx.globalCompositeOperation = "source-over";
          ctx.save();
          ctx.globalAlpha = Math.min(1, a);
          ctx.translate(gx, gy);
          ctx.rotate(rotP);
          const far = clamp01(1 - a * 1.6);
          const bright = (1.04 + 0.1 * (1 - far) + (isHot ? 0.08 : 0)).toFixed(2);
          if (far > 0.03) {
            try { ctx.filter = `blur(${(far * 6).toFixed(1)}px) brightness(${(0.75 + 0.3 * (1 - far)).toFixed(2)})`; } catch {}
          }
          drawComposedPlate(rec.img, 0, 0, tw, th, fx, fy, ch.scale, far > 0.03 ? 0.9 : Number(bright));
          try { ctx.filter = "none"; } catch {}
          // Luminous rim: crisp edge separation from space.
          ctx.globalAlpha = Math.min(1, a) * 0.5;
          ctx.strokeStyle = `rgba(${at.glow[0]},${at.glow[1]},${at.glow[2]},0.55)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(-tw / 2, -th / 2, tw, th);
          // Inner vignette for depth.
          const vg = ctx.createRadialGradient(0, 0, Math.min(tw, th) * 0.3, 0, 0, Math.max(tw, th) * 0.75);
          vg.addColorStop(0, "rgba(0,0,0,0)");
          vg.addColorStop(1, "rgba(0,0,0,0.34)");
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = vg;
          ctx.fillRect(-tw / 2, -th / 2, tw, th);
          ctx.restore();
          ctx.globalCompositeOperation = "lighter";
        } else {
          coreGlow(gx, gy, base * 0.35, `${at.primary[0]},${at.primary[1]},${at.primary[2]}`, 0.2 * a);
          ctx.globalCompositeOperation = "source-over";
        }
      });
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
        for (const r of plateRects.current) {
          if (r.e < 0.3) continue;
          const dx = (hx - r.cx) / (r.w * 0.475);
          const dy = (hy - r.cy) / (r.h * 0.475);
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

    const hit = plateRects.current.find((r) => {
      if (r.e < 0.3) return false;
      const dx = (x - r.cx) / (r.w * 0.475);
      const dy = (y - r.cy) / (r.h * 0.475);
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
