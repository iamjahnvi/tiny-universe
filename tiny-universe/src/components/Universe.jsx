import { useEffect, useRef, useState } from "react";
import CosmicScene from "./CosmicScene";
import UniverseHUD from "./UniverseHUD";
import AmbientSound from "./AmbientSound";
import useReducedMotion from "../hooks/useReducedMotion";
import { CHAPTERS, SCROLL } from "../data/galaxies";

const slugFromHash = () =>
  typeof window === "undefined"
    ? null
    : window.location.hash.match(/^#\/object\/([\w-]+)$/)?.[1] ?? null;

// One continuous descent. Canvas is the world; DOM is instruments, archive
// labels, the loading sequence, and SPA detail overlays (hash-routed so
// back-button works and scroll/state/audio are preserved underneath).
//
// Opening choreography:
//   1. Pure black screen, 3.0s infinity loader (universe aura).
//   2. Hold on black until first hover / move / touch / key.
//   3. That gesture triggers a slow cinematic zoom-out into the universe.
export default function Universe() {
  const [phase, setPhase] = useState("loading"); // loading | await | zoom | gone
  const [loadPct, setLoadPct] = useState(0);
  const [active, setActive] = useState(-1);
  const [chartMode, setChartMode] = useState(false);
  const [marks, setMarks] = useState([]);
  const [formationName, setFormationName] = useState("");
  const [wishCount, setWishCount] = useState(0);
  const [hoverSlug, setHoverSlug] = useState(null);
  const [detailSlug, setDetailSlug] = useState(slugFromHash);
  const pushedRef = useRef(false);
  const trackRef = useRef(null);
  const activeRef = useRef(-1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    CHAPTERS.forEach((ch) => {
      const im = new Image();
      im.decoding = "async";
      im.src = ch.image;
    });
    if (window.scrollY) window.scrollTo(0, 0);
    const DURATION = 3000;
    const stamp = performance.now();
    let raf = 0;
    const tick = (now) => {
      const k = Math.min(1, (now - stamp) / DURATION);
      const eased = k < 0.7 ? k / 0.7 : 0.7 + ((k - 0.7) / 0.3) * 0.3;
      setLoadPct(Math.min(100, Math.floor(eased * 100)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else {
        setLoadPct(100);
        setPhase((p) => (p === "loading" ? "await" : p));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "await") return;
    if (reducedMotion) {
      const t = setTimeout(() => setPhase("zoom"), 400);
      return () => clearTimeout(t);
    }
    const enter = () => setPhase((p) => (p === "await" ? "zoom" : p));
    const opts = { passive: true };
    window.addEventListener("pointermove", enter, opts);
    window.addEventListener("mousemove", enter, opts);
    window.addEventListener("touchstart", enter, opts);
    window.addEventListener("touchmove", enter, opts);
    window.addEventListener("wheel", enter, opts);
    window.addEventListener("keydown", enter);
    window.addEventListener("click", enter);
    return () => {
      window.removeEventListener("pointermove", enter);
      window.removeEventListener("mousemove", enter);
      window.removeEventListener("touchstart", enter);
      window.removeEventListener("touchmove", enter);
      window.removeEventListener("wheel", enter);
      window.removeEventListener("keydown", enter);
      window.removeEventListener("click", enter);
    };
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== "zoom") return;
    const t = setTimeout(() => setPhase("gone"), reducedMotion ? 300 : 2600);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  useEffect(() => {
    const locked = phase !== "gone" || detailSlug;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase, detailSlug]);

  // Progressive discovery: per-frame envelope per chapter drives staged
  // CSS reveals (title → designation → description → metadata). No React
  // state per frame — CSS vars on refs, one discrete active index.
  useEffect(() => {
    let raf = 0;
    const env = new Array(CHAPTERS.length).fill(0);
    const tick = () => {
      const els = trackRef.current?.querySelectorAll("[data-chapter]");
      if (els && els.length) {
        const vh = window.innerHeight || 1;
        let best = -1;
        let bestE = 0;
        els.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const center = r.top + r.height / 2;
          const dist = Math.abs(center - vh / 2);
          const target = Math.max(0, 1 - dist / (vh * 1.15));
          const e = reducedMotion ? (target > 0.4 ? 1 : 0) : env[i] + (target - env[i]) * 0.12;
          env[i] = e;
          el.style.setProperty("--e", e.toFixed(3));
          el.classList.toggle("lit", e > 0.35);
          if (e > bestE) {
            bestE = e;
            best = i;
          }
        });
        if (bestE > 0.3 && best !== activeRef.current) {
          activeRef.current = best;
          setActive(best);
        } else if (bestE <= 0.3 && activeRef.current !== -1) {
          activeRef.current = -1;
          setActive(-1);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  useEffect(() => {
    const onHash = () => {
      pushedRef.current = false;
      setDetailSlug(slugFromHash());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const openDetail = (slug) => {
    pushedRef.current = true;
    window.location.hash = `#/object/${slug}`;
  };

  const closeDetail = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    } else {
      window.location.hash = "";
      setDetailSlug(null);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (detailSlug) closeDetail();
        else if (chartMode) setChartMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailSlug, chartMode]);

  const toggleMark = (id) => {
    setFormationName("");
    setMarks((prev) =>
      prev.includes(id)
        ? prev.filter((m) => m !== id)
        : prev.length >= 8
          ? prev
          : [...prev, id]
    );
  };

  const releaseChart = () => {
    setMarks([]);
    setFormationName("");
  };

  const hoverCh = hoverSlug ? CHAPTERS.find((c) => c.slug === hoverSlug) : null;
  const detail = detailSlug ? CHAPTERS.find((c) => c.slug === detailSlug) : null;
  const revealed = phase === "zoom" || phase === "gone";

  return (
    <div className="uni">
      <CosmicScene
        reducedMotion={reducedMotion}
        chartMode={chartMode}
        marks={marks}
        onToggleMark={toggleMark}
        onHover={setHoverSlug}
        onOpen={openDetail}
        onWish={() => setWishCount((c) => c + 1)}
        revealed={revealed}
      />

      {phase !== "gone" && (
        <div
          className={`veil veil-void phase-${phase}`}
          role="status"
          aria-label={
            phase === "loading" ? "Loading universe" : phase === "await" ? "Move to enter the universe" : "Entering universe"
          }
        >
          <div className="veil-nebula neb-a" aria-hidden="true" />
          <div className="veil-nebula neb-b" aria-hidden="true" />
          <div className="veil-stardust" aria-hidden="true" />

          <div className="veil-infinity-wrap">
            <svg className="veil-infinity" viewBox="0 0 320 140" aria-hidden="true">
              <defs>
                <linearGradient id="inf-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5b6ee1" />
                  <stop offset="35%" stopColor="#9d7bff" />
                  <stop offset="65%" stopColor="#5ee6d0" />
                  <stop offset="100%" stopColor="#5b6ee1" />
                </linearGradient>
                <filter id="inf-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                className="inf-track"
                d="M 70 70 C 70 30, 120 22, 160 70 C 200 118, 250 110, 250 70 C 250 30, 200 22, 160 70 C 120 118, 70 110, 70 70 Z"
              />
              <path
                className="inf-flow"
                filter="url(#inf-glow)"
                stroke="url(#inf-grad)"
                d="M 70 70 C 70 30, 120 22, 160 70 C 200 118, 250 110, 250 70 C 250 30, 200 22, 160 70 C 120 118, 70 110, 70 70 Z"
              />
              <circle className="inf-comet" cx="0" cy="0" r="3.2" filter="url(#inf-glow)">
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  path="M 70 70 C 70 30, 120 22, 160 70 C 200 118, 250 110, 250 70 C 250 30, 200 22, 160 70 C 120 118, 70 110, 70 70 Z"
                />
              </circle>
            </svg>
            <div className="veil-core" aria-hidden="true" />
          </div>

          <p className="veil-brand">Tiny Universe</p>
          {phase === "loading" ? (
            <p className="veil-line">universe loading — {String(loadPct).padStart(3, "0")} / 100</p>
          ) : phase === "await" ? (
            <p className="veil-enter">
              <span className="veil-enter-pulse">move to enter</span>
              <span className="veil-enter-sub">hover · touch · scroll</span>
            </p>
          ) : (
            <p className="veil-line">entering</p>
          )}
        </div>
      )}

      <UniverseHUD
        active={active}
        chartMode={chartMode}
        onToggleChart={() => {
          setChartMode((v) => !v);
          releaseChart();
        }}
        marksCount={marks.length}
        formationName={formationName}
        onRecord={setFormationName}
        onRelease={releaseChart}
        sound={<AmbientSound zone={active} />}
      />

      <main className="track" ref={trackRef}>
        <div className="gap" style={{ height: `${SCROLL.introVh}vh` }} aria-hidden="true">
          <div className="descend">
            <span>descend</span>
            <i />
            <i />
            <i />
          </div>
        </div>

        {CHAPTERS.map((ch, i) => {
          const at = ch.atmosphere || { glow: ch.accent };
          const glowCss = `${at.glow[0]},${at.glow[1]},${at.glow[2]}`;
          return (
            <section
              key={ch.id}
              data-chapter={i}
              className={`ch ${ch.infoSide || (i % 2 === 0 ? "left" : "right")}`}
              style={{
                height: `${SCROLL.chapterVh}vh`,
                "--ch-glow": glowCss,
              }}
              aria-label={`Region ${ch.id}: ${ch.name}, ${ch.object}`}
            >
              <div className="ch-label">
                <span className="ch-index rv rv-1">
                  <span className="ch-num">{ch.id}</span>
                  <span className="ch-cat">{ch.category}</span>
                </span>
                <h2 className="ch-name rv rv-2">{ch.name}</h2>
                <p className="ch-desig rv rv-3">{ch.designation}</p>
                <p className="ch-desc rv rv-4">{ch.description}</p>
                <dl className="ch-meta rv rv-5">
                  <div><dt>object</dt><dd>{ch.object}</dd></div>
                  <div><dt>distance</dt><dd>{ch.distance}</dd></div>
                  <div><dt>telescope</dt><dd>{ch.telescope}</dd></div>
                </dl>
                <p className="ch-credit rv rv-5">{ch.credit} · {ch.source}</p>
              </div>
            </section>
          );
        })}

        <div className="gap outro" style={{ height: `${SCROLL.outroVh}vh` }} aria-hidden="true">
          <p className="drift-in">no further data — the dark continues</p>
        </div>
      </main>

      {hoverCh && !chartMode && !detail && (
        <button
          type="button"
          className="discover"
          onClick={() => openDetail(hoverCh.slug)}
          style={{
            "--hv-glow": `${(hoverCh.atmosphere?.glow || hoverCh.accent).join(",")}`,
          }}
        >
          <span className="discover-top">
            <span className="discover-num">{hoverCh.id}</span>
            <span className="discover-cat">{hoverCh.category}</span>
          </span>
          <span className="discover-name">{hoverCh.name}</span>
          <span className="discover-teaser">{hoverCh.teaser}</span>
          <span className="discover-go">enter →</span>
        </button>
      )}

      {detail && (() => {
        const dat = detail.atmosphere || { primary: detail.accent, secondary: detail.fog, glow: detail.accent };
        const fx = (detail.focalPoint?.x ?? 0.5) * 100;
        const fy = (detail.focalPoint?.y ?? 0.5) * 100;
        return (
          <div
            className="detail"
            role="dialog"
            aria-modal="true"
            aria-label={`${detail.name}, ${detail.object}`}
            style={{
              "--d-primary": `${dat.primary.join(",")}`,
              "--d-secondary": `${dat.secondary.join(",")}`,
              "--d-glow": `${dat.glow.join(",")}`,
            }}
          >
            <div className="detail-atmo" aria-hidden="true" />
            <img
              className="detail-bg"
              src={detail.image}
              alt=""
              style={{ objectPosition: `${fx.toFixed(1)}% ${fy.toFixed(1)}%` }}
            />
            <div className="detail-scrim" aria-hidden="true" />
            <button type="button" className="detail-back" onClick={closeDetail} autoFocus>
              ← return to universe
            </button>
            <div className="detail-body">
              <p className="detail-kicker">
                <span className="detail-num"># {detail.id}</span>
                <span className="detail-cat">{detail.category}</span>
              </p>
              <h2 className="detail-name">{detail.name}</h2>
              <p className="detail-object">{detail.designation}</p>
              <p className="detail-desc">{detail.description}</p>
              <dl className="detail-data">
                <div><dt>object</dt><dd>{detail.object}</dd></div>
                <div><dt>type</dt><dd>{detail.type || detail.structure}</dd></div>
                <div><dt>distance</dt><dd>{detail.distance}</dd></div>
                <div><dt>location</dt><dd>{detail.location || detail.region}</dd></div>
                <div><dt>telescope</dt><dd>{detail.telescope}</dd></div>
                <div><dt>year</dt><dd>{detail.year}</dd></div>
              </dl>
              <p className="detail-source">{detail.credit} · {detail.source}</p>
            </div>
          </div>
        );
      })()}

      <p className="sr-only" role="status" aria-live="polite">
        {wishCount > 0 ? `Wish recorded. ${wishCount} total.` : ""}
        {formationName ? ` Formation recorded as ${formationName}.` : ""}
        {detail ? `Entered ${detail.name}.` : ""}
      </p>
    </div>
  );
}
