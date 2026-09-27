import { useEffect, useMemo, useRef } from "react";
import { CHAPTERS, scrollGeometry } from "../data/galaxies";

// The full universe in one canvas. Scroll drives a virtual camera (progress
// 0 → 1); the mouse adds faint parallax. Everything animated lives in refs
// so React never re-renders per frame — state only changes on discrete
// events (wish recorded, chart marks).

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

function pickTint(rand) {
  return TINTS[Math.floor(rand() * TINTS.length)];
}

const GEO = scrollGeometry();
const INFLUENCE = 0.1; // progress half-width of each environment

export default function CosmicScene({
  reducedMotion,
  chartMode,
  marks,
  onToggleMark,
  onWish,
}) {
  const canvasRef = useRef(null);
  const fgScreen = useRef([]); // projected foreground stars, for hit-testing
  const streaks = useRef([]); // active high-speed streaks (wish carriers)
  const wishFx = useRef(null); // { x, y, t0 } expanding confirmation
  const nextStreak = useRef(0);

  // Mirror discrete props into a ref during an effect so the frame
  // loop never goes stale — and React never re-renders per frame.
  const live = useRef({ reducedMotion, chartMode, marks, onToggleMark, onWish });
  useEffect(() => {
    live.current = { reducedMotion, chartMode, marks, onToggleMark, onWish };
  });

  const smallScreen = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 720px)").matches,
    []
  );

  // Stable universe data, generated once. Never randomize during render.
  const data = useMemo(() => {
    const rand = mulberry32(987654321);
    const layer = (n, rMin, rMax, aMin, aMax) =>
      Array.from({ length: n }, () => ({
        x: rand(),
        y: rand(),
        r: rMin + rand() * (rMax - rMin),
        a: aMin + rand() * (aMax - aMin),
        c: pickTint(rand),
      }));
    const density = smallScreen ? 0.55 : 1;
    return {
      bg: layer(Math.floor(1100 * density), 0.4, 1.1, 0.12, 0.42),
      mid: layer(Math.floor(480 * density), 0.6, 1.6, 0.2, 0.6),
      fg: Array.from({ length: 150 }, (_, id) => ({
        id,
        x: rand(),
        y: rand(),
        r: 1 + rand() * 1.5,
        a: 0.45 + rand() * 0.55,
        c: pickTint(rand),
      })),
      arms: Array.from({ length: Math.floor(760 * density) }, () => ({
        arm: rand() < 0.5 ? 0 : 1,
        t: Math.pow(rand(), 0.7),
        spread: (rand() + rand() + rand() - 1.5) * 0.09,
        size: 0.8 + rand() * 1.8,
        warm: rand() < 0.22,
        a: 0.25 + rand() * 0.6,
      })),
      deep: Array.from({ length: Math.floor(1500 * density) }, () => ({
        x: rand(),
        y: rand(),
        s: 0.5 + rand() * 1.5,
        c: Math.floor(rand() * 4),
        tw: rand() * Math.PI * 2,
      })),
      nebula: Array.from({ length: 26 }, () => ({
        x: 0.2 + rand() * 0.6,
        y: 0.25 + rand() * 0.5,
        r: 0.1 + rand() * 0.24,
        hue: [215, 275, 315, 25][Math.floor(rand() * 4)],
        drift: rand() * Math.PI * 2,
      })),
      dust: Array.from({ length: 9 }, () => ({
        x: 0.25 + rand() * 0.5,
        y: 0.3 + rand() * 0.4,
        r: 0.06 + rand() * 0.12,
        drift: rand() * Math.PI * 2,
      })),
      bridge: Array.from({ length: 260 }, () => ({
        t: rand(),
        off: (rand() - 0.5) * 0.16,
        s: 0.6 + rand() * 1.4,
        a: 0.2 + rand() * 0.5,
      })),
      inflow: Array.from({ length: 320 }, () => ({
        ang: rand() * Math.PI * 2,
        r: 0.08 + Math.pow(rand(), 0.6) * 0.4,
        s: 0.5 + rand() * 1.2,
        a: 0.15 + rand() * 0.5,
      })),
      thread: Array.from({ length: 420 }, (_, i) => ({
        arm: i % 2,
        t: (i / 420 + rand() * 0.01) % 1,
        size: 0.6 + rand() * 1.3,
        a: 0.1 + rand() * 0.35,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rand = mulberry32(123456789);
    let W = 0;
    let H = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        smallScreen ? 1.25 : 1.5
      );
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

    // Camera state — refs only, never React state.
    let pS = 0; // smoothed progress (lags raw scroll → inertia)
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
    nextStreak.current = 6;

    const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const drawStarLayer = (stars, f, flow, stretch) => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const yy = (((s.y - flow * f) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * f) * W;
        const y = yy * H + myS * 14 * f;
        const len = Math.min(stretch * f, 26);
        ctx.globalAlpha = s.a;
        ctx.fillStyle = rgb(s.c, 1);
        if (len > 1.5) {
          ctx.fillRect(x, y - len / 2, s.r * 0.8, len);
        } else {
          ctx.fillRect(x, y, s.r, s.r);
        }
      }
      ctx.globalAlpha = 1;
    };

    const drawSpiralArms = (cx, cy, scale, rot, alpha, tintA, tintB) => {
      for (let i = 0; i < data.arms.length; i++) {
        const p = data.arms[i];
        const ang =
          (p.arm === 0 ? 0 : Math.PI) + p.t * 4.4 + rot + p.spread * 4;
        const r = (0.03 + p.t * 0.3) * scale;
        const x = cx + Math.cos(ang) * r;
        const y = cy + Math.sin(ang) * r * 0.62;
        ctx.globalAlpha = Math.min(1, p.a * alpha);
        ctx.fillStyle = p.warm ? rgb(tintB, 1) : rgb(tintA, 1);
        ctx.fillRect(x, y, p.size, p.size);
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

      const ease = L.reducedMotion ? 1 : 0.065;
      pS += (raw - pS) * ease;
      const mEase = L.reducedMotion ? 1 : 0.045;
      mxS += ((L.reducedMotion ? 0 : mouseX) - mxS) * mEase;
      myS += ((L.reducedMotion ? 0 : mouseY) - myS) * mEase;
      const instVel = Math.abs(raw - prevRaw);
      prevRaw = raw;
      velS += ((L.reducedMotion ? 0 : instVel) - velS) * 0.08;

      const p = pS;
      const vel = Math.min(velS * 60, 1); // fast scrolls → 1
      const stretch = L.reducedMotion ? 0 : vel * 120;
      const flow = p * 1.7;
      const base = Math.min(W, H);

      // Space itself.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#020308";
      ctx.fillRect(0, 0, W, H);
      coreGlow(W * 0.5, H * 0.45, base * 0.9, "10,14,30", 0.5);

      // Depth layers, back to front.
      drawStarLayer(data.bg, 0.25, flow, stretch);
      drawStarLayer(data.mid, 0.55, flow, stretch);

      // Foreground points (chartable) + screen map for hit-testing.
      fgScreen.current = [];
      for (let i = 0; i < data.fg.length; i++) {
        const s = data.fg[i];
        const yy = (((s.y - flow * 0.85) % 1) + 1) % 1;
        const x = (s.x + mxS * 0.02 * 0.85) * W;
        const y = yy * H + myS * 14 * 0.85;
        fgScreen.current.push({ id: s.id, x, y });
        const marked = L.marks.includes(s.id);
        ctx.globalAlpha = marked ? 1 : s.a;
        ctx.fillStyle = marked ? "#f2f5fc" : rgb(s.c, 1);
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

      // Chart hairlines between marked points, in selection order.
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

      // The spiral thread connecting the whole journey.
      let maxEnv = 0;
      const envs = CHAPTERS.map((_, i) => {
        const c = GEO.centerOf(i);
        const e = Math.max(0, 1 - Math.abs(p - c) / INFLUENCE);
        if (e > maxEnv) maxEnv = e;
        return e;
      });
      const threadA = 0.16 + 0.5 * (1 - maxEnv);
      const rot = (L.reducedMotion ? 0 : t * 0.03) + p * 9;
      const tcx = W * 0.5 + mxS * 12;
      const tcy = H * 0.52 + myS * 9;
      for (let i = 0; i < data.thread.length; i++) {
        const s = data.thread[i];
        const ang = (s.arm === 0 ? 0 : Math.PI) + s.t * 5.2 + rot * (0.4 + s.t);
        const r = (0.02 + s.t * 0.46) * base;
        ctx.globalAlpha = Math.min(1, s.a * threadA * 2);
        ctx.fillStyle = "rgb(190,200,228)";
        ctx.fillRect(tcx + Math.cos(ang) * r, tcy + Math.sin(ang) * r * 0.7, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // Environments.
      ctx.globalCompositeOperation = "lighter";
      CHAPTERS.forEach((ch, i) => {
        const e = envs[i];
        if (e <= 0.01) return;
        const a = Math.pow(e, 1.35);
        const local = Math.min(1, Math.max(0, (p - (GEO.centerOf(i) - INFLUENCE)) / (INFLUENCE * 2)));
        const dir = i % 2 === 0 ? 1 : -1;
        const gx = W * ch.anchor.x + dir * (0.5 - local) * W * 0.1 + mxS * 22;
        const gy = H * (ch.anchor.y + (0.5 - local) * 0.6) + myS * 16;
        const sc = base * (0.4 + local * 1.15);

        if (ch.type === "spiral") {
          coreGlow(gx, gy, sc * 0.32, "235,225,205", 0.35 * a);
          coreGlow(gx, gy, sc * 0.6, "120,140,200", 0.12 * a);
          drawSpiralArms(
            gx, gy, sc,
            (L.reducedMotion ? 0 : t * 0.05) + p * 6,
            a, ch.tint, ch.warm
          );
        } else if (ch.type === "stars") {
          coreGlow(gx, gy, sc * 0.4, "150,170,220", 0.1 * a);
        } else if (ch.type === "nebula") {
          data.nebula.forEach((b) => {
            const dx = L.reducedMotion ? 0 : Math.sin(t * 0.05 + b.drift) * 0.02;
            const dy = L.reducedMotion ? 0 : Math.cos(t * 0.04 + b.drift) * 0.02;
            const bx = gx + (b.x - 0.5) * sc * 1.6 + dx * W;
            const by = gy + (b.y - 0.5) * sc * 1.6 + dy * H;
            const br = b.r * sc * (0.8 + local * 0.6);
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
            g.addColorStop(0, `hsla(${b.hue},45%,42%,${0.16 * a})`);
            g.addColorStop(1, "hsla(0,0%,0%,0)");
            ctx.fillStyle = g;
            ctx.fillRect(bx - br, by - br, br * 2, br * 2);
          });
          data.dust.forEach((d) => {
            const bx = gx + (d.x - 0.5) * sc * 1.5;
            const by = gy + (d.y - 0.5) * sc * 1.5;
            const br = d.r * sc;
            ctx.globalCompositeOperation = "source-over";
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
            g.addColorStop(0, `rgba(2,3,8,${0.55 * a})`);
            g.addColorStop(1, "rgba(2,3,8,0)");
            ctx.fillStyle = g;
            ctx.fillRect(bx - br, by - br, br * 2, br * 2);
            ctx.globalCompositeOperation = "lighter";
          });
          coreGlow(gx, gy, sc * 0.2, "255,240,220", 0.22 * a);
        } else if (ch.type === "collision") {
          const sep = sc * 0.3 * (1.2 - local * 0.7);
          drawSpiralArms(gx - sep, gy, sc * 0.7, t * 0.04 + p * 5, a, [170, 190, 235], [235, 200, 165]);
          drawSpiralArms(gx + sep, gy - sc * 0.05, sc * 0.55, -t * 0.035 + p * 4, a, [235, 200, 170], [170, 190, 235]);
          coreGlow(gx - sep, gy, sc * 0.2, "240,230,210", 0.3 * a);
          coreGlow(gx + sep, gy, sc * 0.18, "220,225,245", 0.3 * a);
          ctx.fillStyle = "rgb(220,222,235)";
          data.bridge.forEach((b) => {
            const x = gx - sep + b.t * sep * 2 + b.off * sc;
            const y = gy + b.off * sc * 0.6 + Math.sin(b.t * 9) * 4;
            ctx.globalAlpha = Math.min(1, b.a * a);
            ctx.fillRect(x, y, b.s, b.s);
          });
          ctx.globalAlpha = 1;
        } else if (ch.type === "pillars") {
          coreGlow(gx, gy - sc * 0.3, sc * 0.7, "255,236,200", 0.14 * a);
          const cols = [-0.16, 0.02, 0.19];
          cols.forEach((cx0, ci) => {
            const cx = gx + cx0 * sc * 1.4;
            const wdt = sc * (0.09 - ci * 0.015);
            const top = gy - sc * 0.42;
            const hgt = sc * 0.85;
            const g = ctx.createLinearGradient(0, top, 0, top + hgt);
            g.addColorStop(0, `rgba(6,8,18,${0.85 * a})`);
            g.addColorStop(1, `rgba(6,8,18,${0.25 * a})`);
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = g;
            ctx.fillRect(cx - wdt / 2, top, wdt, hgt);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.5 * a;
            ctx.fillStyle = "rgb(255,214,170)";
            ctx.fillRect(cx - wdt / 2 - 1, top, 1.4, hgt);
            ctx.globalAlpha = 1;
          });
          coreGlow(gx, gy + sc * 0.3, sc * 0.3, "140,160,230", 0.12 * a);
        } else if (ch.type === "deepfield") {
          const zoom = 0.6 + local * 0.9;
          data.deep.forEach((d) => {
            const x = gx + (d.x - 0.5) * sc * 1.9 * zoom + mxS * 8;
            const y = gy + (d.y - 0.5) * sc * 1.9 * zoom + myS * 6;
            const tw = L.reducedMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 0.8 + d.tw);
            ctx.globalAlpha = Math.min(1, 0.75 * a * tw);
            ctx.fillStyle = rgb(TINTS[d.c], 1);
            const s = d.s * (0.7 + local * 0.8);
            ctx.fillRect(x, y, s, s);
          });
          ctx.globalAlpha = 1;
        } else if (ch.type === "quasar") {
          coreGlow(gx, gy, sc * 0.5, "160,190,255", 0.2 * a);
          coreGlow(gx, gy, sc * 0.12, "255,255,255", 0.75 * a);
          ctx.globalAlpha = 0.5 * a;
          ctx.fillStyle = "rgb(190,210,250)";
          const beamL = sc * (0.8 + local * 0.5);
          ctx.fillRect(gx - 0.75, gy - beamL, 1.5, beamL * 2);
          ctx.fillRect(gx - beamL, gy - 0.75, beamL * 2, 1.5);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = `rgba(180,200,245,${0.25 * a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(gx, gy, sc * 0.2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (ch.type === "unknown") {
          const pulse = L.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.4);
          ctx.strokeStyle = `rgba(190,200,230,${(0.1 + 0.14 * pulse) * a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(gx, gy, sc * 0.22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(gx, gy, sc * 0.3, 0, Math.PI * 2);
          ctx.globalAlpha = 0.4 * a;
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "rgb(200,208,230)";
          data.inflow.forEach((s) => {
            const ang = s.ang + (L.reducedMotion ? 0 : t * 0.02);
            const x = gx + Math.cos(ang) * s.r * sc;
            const y = gy + Math.sin(ang) * s.r * sc;
            ctx.globalAlpha = Math.min(1, s.a * a);
            ctx.fillRect(x, y, s.s, s.s);
          });
          ctx.globalAlpha = 1;
          coreGlow(gx, gy, sc * 0.08, "220,228,250", 0.4 * a);
        }
      });
      ctx.globalCompositeOperation = "source-over";

      // Rare high-speed streaks — the only clickable sky events.
      if (!L.reducedMotion && t > nextStreak.current && streaks.current.length < 2) {
        const fromLeft = rand() < 0.5;
        streaks.current.push({
          x: fromLeft ? -80 : W * (0.3 + rand() * 0.6),
          y: H * (0.08 + rand() * 0.3),
          vx: (fromLeft ? 1 : -1) * (W * (0.9 + rand() * 0.5)),
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
        const nx = -s.vx;
        const ny = -s.vy;
        const mag = Math.hypot(nx, ny) || 1;
        const tx = (nx / mag) * 130;
        const ty = (ny / mag) * 130;
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

      // Wish confirmation: a ring opens, specks drift out, words fade.
      if (wishFx.current) {
        const w = wishFx.current;
        const age = (now - w.t0) / 1000;
        if (age > 2.2) {
          wishFx.current = null;
        } else {
          const k = age / 2.2;
          ctx.strokeStyle = `rgba(215,222,240,${0.5 * (1 - k)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w.x, w.y, 6 + k * 70, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(215,222,240,${0.6 * (1 - k)})`;
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * Math.PI * 2 + 0.4;
            ctx.fillRect(
              w.x + Math.cos(ang) * k * 56,
              w.y + Math.sin(ang) * k * 56,
              1.4,
              1.4
            );
          }
          ctx.fillStyle = `rgba(217,220,229,${0.75 * (1 - k * k)})`;
          ctx.font = "10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("W I S H   R E C O R D E D", w.x, w.y + 34);
        }
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

  // Click: chartable star first (chart mode), else streak head (wish).
  const onClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const L = live.current;
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
    for (const s of streaks.current) {
      if (Math.hypot(s.x - x, s.y - y) < 64) {
        wishFx.current = { x: s.x, y: s.y, t0: performance.now() };
        streaks.current = streaks.current.filter((k) => k !== s);
        L.onWish();
        return;
      }
    }
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
