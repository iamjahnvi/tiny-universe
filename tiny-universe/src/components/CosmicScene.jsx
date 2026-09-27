import { useEffect, useMemo, useRef } from "react";
import { CHAPTERS, scrollGeometry } from "../data/galaxies";

// The universe in one canvas. Scroll drives a lerped camera; zones grade
// the atmosphere; Hubble plates approach, dominate, and recede as spatial
// destinations. React only hears about discrete events (hover/open/wish).

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
const INFLUENCE = 0.16; // wide envelopes so regions bleed into each other

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

export default function CosmicScene({
  reducedMotion,
  chartMode,
  marks,
  onToggleMark,
  onHover,
  onOpen,
  onWish,
}) {
  const canvasRef = useRef(null);
  const fgScreen = useRef([]);
  const plateRects = useRef([]);
  const streaks = useRef([]);
  const wishFx = useRef(null);
  const nextStreak = useRef(0);
  const hovered = useRef(null);
  const pendingTap = useRef(null);
  const plates = useRef({}); // i -> { img, aspect, loaded }

  const live = useRef({ reducedMotion, chartMode, marks, onToggleMark, onHover, onOpen, onWish });
  useEffect(() => {
    live.current = { reducedMotion, chartMode, marks, onToggleMark, onHover, onOpen, onWish };
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
      bg: layer(Math.floor(1200 * density), 0.4, 1.2, 0.1, 0.45),
      mid: layer(Math.floor(520 * density), 0.6, 1.7, 0.18, 0.62),
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
      fogblobs: Array.from({ length: 12 }, () => ({
        x: 0.15 + rand() * 0.7,
        y: 0.2 + rand() * 0.6,
        r: 0.16 + rand() * 0.26,
        drift: rand() * Math.PI * 2,
        speed: 0.02 + rand() * 0.04,
      })),
      thread: Array.from({ length: 460 }, (_, i) => ({
        arm: i % 2,
        t: (i / 460 + rand() * 0.01) % 1,
        size: 0.6 + rand() * 1.4,
        a: 0.1 + rand() * 0.38,
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

    // Eagerly fetch the opening plates; the rest stream in on approach.
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

    const drawStarLayer = (stars, f, flow, stretch, wash) => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const yy = (((s.y - flow * f) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * f) * W;
        const y = yy * H + myS * 14 * f;
        const len = Math.min(stretch * f, 26);
        const c = mix3(s.c, wash, 0.35);
        ctx.globalAlpha = s.a;
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

    const frame = (now) => {
      const L = live.current;
      const t = L.reducedMotion ? 0 : (now - t0) / 1000;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

      pS += (raw - pS) * (L.reducedMotion ? 1 : 0.065);
      mxS += ((L.reducedMotion ? 0 : mouseX) - mxS) * (L.reducedMotion ? 1 : 0.045);
      myS += ((L.reducedMotion ? 0 : mouseY) - myS) * (L.reducedMotion ? 1 : 0.045);
      const instVel = Math.abs(raw - prevRaw);
      prevRaw = raw;
      velS += ((L.reducedMotion ? 0 : instVel) - velS) * 0.08;

      const p = pS;
      const vel = Math.min(velS * 60, 1);
      const stretch = L.reducedMotion ? 0 : vel * 120;
      const flow = p * 1.7;
      const base = Math.min(W, H);
      const zone = zoneColors(p);

      // Graded space — the environment itself changes color.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgb(zone.bg, 1);
      ctx.fillRect(0, 0, W, H);

      // Breathing fog fields in the zone's own color.
      data.fogblobs.forEach((b) => {
        const dx = L.reducedMotion ? 0 : Math.sin(t * b.speed * 2 + b.drift) * 0.03;
        const bx = (b.x + dx) * W + mxS * 8;
        const by = b.y * H + myS * 6;
        const br = b.r * base * 1.4;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, rgb(zone.fog, 0.1));
        g.addColorStop(1, rgb(zone.fog, 0));
        ctx.fillStyle = g;
        ctx.fillRect(bx - br, by - br, br * 2, br * 2);
      });

      // Opening glow: the outer edge burns cold at the start.
      const intro = Math.max(0, 1 - p * 7);
      if (intro > 0) {
        coreGlow(W * 0.5, H * 0.46, base * 0.75, "140,165,230", 0.16 * intro);
        coreGlow(W * 0.5, H * 0.46, base * 0.3, "220,230,250", 0.12 * intro);
      }

      drawStarLayer(data.bg, 0.25, flow, stretch, zone.wash);
      drawStarLayer(data.mid, 0.55, flow, stretch, zone.wash);

      // Foreground points (chartable) + hit-test map.
      fgScreen.current = [];
      for (let i = 0; i < data.fg.length; i++) {
        const s = data.fg[i];
        const yy = (((s.y - flow * 0.85) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * 0.85) * W;
        const y = yy * H + myS * 14 * 0.85;
        fgScreen.current.push({ id: s.id, x, y });
        const marked = L.marks.includes(s.id);
        const c = mix3(s.c, zone.wash, 0.3);
        ctx.globalAlpha = marked ? 1 : s.a;
        ctx.fillStyle = marked ? "#f2f5fc" : rgb(c, 1);
        const r = marked ? s.r + 1.2 : s.r;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (marked) {
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (L.marks.length > 1) {
        ctx.strokeStyle = "rgba(205,213,230,0.34)";
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

      // Spiral thread — path through the universe, tinted by zone.
      const envs = CHAPTERS.map((_, i) => {
        const c = GEO.centerOf(i);
        return Math.max(0, 1 - Math.abs(p - c) / INFLUENCE);
      });
      const maxEnv = Math.max(...envs, 0);
      const threadA = 0.2 + 0.55 * (1 - maxEnv);
      const rot = (L.reducedMotion ? 0 : t * 0.035) + p * 10;
      const tcx = W * 0.5 + mxS * 12;
      const tcy = H * 0.52 + myS * 9;
      const threadC = mix3([190, 200, 228], zone.wash, 0.55);
      for (let i = 0; i < data.thread.length; i++) {
        const s = data.thread[i];
        const ang = (s.arm === 0 ? 0 : Math.PI) + s.t * 5.2 + rot * (0.4 + s.t);
        const r = (0.02 + s.t * 0.48) * base;
        ctx.globalAlpha = Math.min(1, s.a * threadA * 2);
        ctx.fillStyle = rgb(threadC, 1);
        ctx.fillRect(tcx + Math.cos(ang) * r, tcy + Math.sin(ang) * r * 0.7, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // Hubble plates: distant → enormous → receding.
      plateRects.current = [];
      ctx.globalCompositeOperation = "lighter";
      CHAPTERS.forEach((ch, i) => {
        const e = envs[i];
        if (e > 0.02) ensurePlate(i);
        if (e <= 0.02) return;
        const rec = plates.current[i];
        const a = Math.pow(e, 1.25);
        const local = clamp01((p - (GEO.centerOf(i) - INFLUENCE)) / (INFLUENCE * 2));
        const dir = i % 2 === 0 ? 1 : -1;
        const gx = W * 0.5 + dir * (0.5 - local) * W * 0.12 + mxS * 22;
        const gy = H * (0.46 + (0.5 - local) * 0.62) + myS * 16;
        const isHot = hovered.current === ch.slug;

        coreGlow(gx, gy, base * 0.55, `${ch.accent[0]},${ch.accent[1]},${ch.accent[2]}`, 0.1 * a);
        coreGlow(gx, gy, base * 0.9, `${zone.fog[0]},${zone.fog[1]},${zone.fog[2]}`, 0.08 * a);

        if (rec && rec.loaded && rec.img) {
          let h = Math.min(H * 1.05, base * (0.34 + local * 1.35));
          if (isHot) h *= 1.06;
          let w = h * rec.aspect;
          if (w > W * 1.35) {
            w = W * 1.35;
            h = w / rec.aspect;
          }
          plateRects.current.push({ slug: ch.slug, cx: gx, cy: gy, w, h, e });
          ctx.save();
          ctx.globalAlpha = Math.min(1, a * (isHot ? 1 : 0.96));
          ctx.translate(gx, gy);
          ctx.rotate(dir * (local - 0.5) * 0.05);
          const far = 1 - Math.min(1, e / 0.45);
          try {
            ctx.filter =
              far > 0.03
                ? `blur(${(far * 7).toFixed(1)}px) brightness(${(0.72 + 0.3 * (1 - far) + (isHot ? 0.1 : 0)).toFixed(2)})`
                : isHot
                  ? "brightness(1.1)"
                  : "none";
          } catch {
            /* older engines ignore filter */
          }
          ctx.drawImage(rec.img, -w / 2, -h / 2, w, h);
          ctx.restore();
          ctx.filter = "none";
        } else {
          // Unloaded plates still bend light: a tinted phantom core.
          coreGlow(gx, gy, base * (0.2 + local * 0.3), `${ch.accent[0]},${ch.accent[1]},${ch.accent[2]}`, 0.16 * a);
        }
      });
      ctx.globalCompositeOperation = "source-over";

      // Deep-field grain swells near the monochrome zone.
      const deepEnv = envs[6] || 0;
      if (deepEnv > 0.03) {
        const ch = CHAPTERS[6];
        const gx = W * 0.5 + mxS * 8;
        const gy = H * 0.46 + myS * 6;
        const zoom = 0.7 + deepEnv * 0.7;
        for (let i = 0; i < data.deep.length; i++) {
          const d = data.deep[i];
          const x = gx + (d.x - 0.5) * base * 1.9 * zoom;
          const y = gy + (d.y - 0.5) * base * 1.9 * zoom;
          const tw = L.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 0.8 + d.tw);
          ctx.globalAlpha = Math.min(1, 0.7 * deepEnv * tw);
          ctx.fillStyle = rgb(TINTS[d.c], 1);
          const s = d.s * (0.7 + deepEnv * 0.8);
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
        void ch;
      }

      // Rare streaks — clickable sky events carrying wishes.
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
        grad.addColorStop(0, `rgba(255,255,255,${0.85 * fade})`);
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

      // Wish confirmation: ring opens, specks drift, words fade.
      if (wishFx.current) {
        const w = wishFx.current;
        const age = (now - w.t0) / 1000;
        if (age > 2.2) wishFx.current = null;
        else {
          const k = age / 2.2;
          ctx.strokeStyle = `rgba(215,222,240,${0.5 * (1 - k)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w.x, w.y, 6 + k * 70, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(215,222,240,${0.6 * (1 - k)})`;
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * Math.PI * 2 + 0.4;
            ctx.fillRect(w.x + Math.cos(ang) * k * 56, w.y + Math.sin(ang) * k * 56, 1.4, 1.4);
          }
          ctx.fillStyle = `rgba(217,220,229,${0.75 * (1 - k * k)})`;
          ctx.font = "10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("W I S H   R E C O R D E D", w.x, w.y + 34);
        }
      }

      // Plate hover discovery (suppressed while charting).
      if (!L.chartMode) {
        const hx = (mouseX * 0.5 + 0.5) * W;
        const hy = (mouseY * 0.5 + 0.5) * H;
        let found = null;
        for (const r of plateRects.current) {
          if (r.e < 0.35) continue;
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
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const L = live.current;

    // Charting takes over all clicks.
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

    // Plates: hover-capable pointers open at once; touch taps arm, then open.
    const hit = plateRects.current.find((r) => {
      if (r.e < 0.35) return false;
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

  // Touch pointers never hover — clear stale discovery state on tap-away.
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
