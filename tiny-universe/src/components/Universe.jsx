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
  const reducedMotion = useReducedMotion();

  // Black-screen infinity load: exactly ~3s. Assets preload silently
  // underneath but never gate the timing — the aura is the experience.
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
      // ease slightly so the tail feels like coalescing, not stalling
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

  // After the 3s complete, the FIRST hover / move / touch / key press
  // triggers the cinematic zoom-out. Reduced-motion users auto-enter.
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

  // Zoom-out runs its cinematic course (~2.6s), then the veil is gone.
  useEffect(() => {
    if (phase !== "zoom") return;
    const t = setTimeout(() => setPhase("gone"), reducedMotion ? 300 : 2600);
    return () => clearTimeout(t);
  }, [phase, reducedMotion]);

  // Lock scroll while the void / zoom holds — the universe waits underneath.
  useEffect(() => {
    const locked = phase !== "gone" || detailSlug;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase, detailSlug]);

  // Chapter observation for the position readout + audio zoning.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll("[data-chapter]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(Number(en.target.dataset.chapter));
        });
      },
      { threshold: 0.55 }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // SPA detail routing: hash changes open/close, back button included.
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

      <main className="track">
        <div className="gap" style={{ height: `${SCROLL.introVh}vh` }} aria-hidden="true">
          <div className="descend">
            <span>descend</span>
            <i />
            <i />
            <i />
          </div>
        </div>

        {CHAPTERS.map((ch, i) => (
          <section
            key={ch.id}
            data-chapter={i}
            className={`ch left ${active === i ? "lit" : ""}`}
            style={{ height: `${SCROLL.chapterVh}vh` }}
            aria-label={`Region ${ch.id}: ${ch.name}, ${ch.object}`}
          >
            <div className="ch-label">
              <span className="ch-num">{ch.id}</span>
              <h2 className="ch-name">{ch.name}</h2>
              <p className="ch-sub">{ch.sub}</p>
            </div>
          </section>
        ))}

        <div className="gap outro" style={{ height: `${SCROLL.outroVh}vh` }} aria-hidden="true">
          <p className="drift-in">no further data</p>
        </div>
      </main>

      {hoverCh && !chartMode && !detail && (
        <button type="button" className="discover" onClick={() => openDetail(hoverCh.slug)}>
          <span className="discover-num">{hoverCh.id}</span>
          <span className="discover-name">{hoverCh.name}</span>
          <span className="discover-go">enter →</span>
        </button>
      )}

      {detail && (
        <div className="detail" role="dialog" aria-modal="true" aria-label={`${detail.name}, ${detail.object}`}>
          <img className="detail-bg" src={detail.image} alt="" />
          <div className="detail-scrim" aria-hidden="true" />
          <button type="button" className="detail-back" onClick={closeDetail} autoFocus>
            ← return
          </button>
          <div className="detail-body">
            <p className="detail-num"># {detail.id}</p>
            <h2 className="detail-name">{detail.name}</h2>
            <p className="detail-object">{detail.object}</p>
            <p className="detail-desc">{detail.description}</p>
            <dl className="detail-data">
              <div><dt>distance</dt><dd>{detail.distance}</dd></div>
              <div><dt>structure</dt><dd>{detail.structure}</dd></div>
              <div><dt>region</dt><dd>{detail.region}</dd></div>
              <div><dt>telescope</dt><dd>{detail.telescope}</dd></div>
              <div><dt>year</dt><dd>{detail.year}</dd></div>
              <div><dt>credit</dt><dd>{detail.credit}</dd></div>
            </dl>
            <p className="detail-source">{detail.source}</p>
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {wishCount > 0 ? `Wish recorded. ${wishCount} total.` : ""}
        {formationName ? ` Formation recorded as ${formationName}.` : ""}
        {detail ? `Entered ${detail.name}.` : ""}
      </p>
    </div>
  );
}
