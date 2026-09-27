import { useEffect, useRef, useState } from "react";
import CosmicScene from "./CosmicScene";
import UniverseHUD from "./UniverseHUD";
import MusicPlayer from "../MusicPlayer";
import useReducedMotion from "../hooks/useReducedMotion";
import { CHAPTERS, SCROLL } from "../data/galaxies";

// One continuous descent: fixed canvas universe + tall scroll track.
// Chapter labels are real DOM text (observable + accessible); the canvas
// reads raw scroll position every frame and moves the camera with inertia.
export default function Universe() {
  const [veiled, setVeiled] = useState(true);
  const [gone, setGone] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [active, setActive] = useState(-1);
  const [chartMode, setChartMode] = useState(false);
  const [marks, setMarks] = useState([]);
  const [formationName, setFormationName] = useState("");
  const [wishCount, setWishCount] = useState(0);
  const ioRef = useRef(null);
  const reducedMotion = useReducedMotion();

  // Minimal loading veil: counts up, then dissolves into space.
  useEffect(() => {
    const t = setInterval(() => {
      setLoadPct((v) => {
        if (v >= 100) {
          clearInterval(t);
          return 100;
        }
        return Math.min(100, v + 4);
      });
    }, 32);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loadPct < 100) return;
    const a = setTimeout(() => setVeiled(false), 250);
    const b = setTimeout(() => setGone(true), 1400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [loadPct]);

  // Chapter observation: only the position readout is React state.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll("[data-chapter]")
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setActive(Number(en.target.dataset.chapter));
        });
      },
      { threshold: 0.55 }
    );
    sections.forEach((s) => io.observe(s));
    ioRef.current = io;
    return () => io.disconnect();
  }, []);

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

  return (
    <div className="uni">
      <CosmicScene
        reducedMotion={reducedMotion}
        chartMode={chartMode}
        marks={marks}
        onToggleMark={toggleMark}
        onWish={() => setWishCount((c) => c + 1)}
      />

      {!gone && (
        <div className={`veil ${veiled ? "" : "lifted"}`} aria-hidden="true">
          <p className="veil-brand">Tiny Universe</p>
          <p className="veil-pct">
            {String(loadPct).padStart(3, "0")} / 100
          </p>
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
      />

      <main className="track">
        <div className="gap" style={{ height: `${SCROLL.introVh}vh` }} aria-hidden="true">
          <p className="drift-in">descend</p>
        </div>

        {CHAPTERS.map((ch, i) => (
          <section
            key={ch.id}
            data-chapter={i}
            className={`ch ${i % 2 === 0 ? "left" : "right"} ${
              active === i ? "lit" : ""
            }`}
            style={{ height: `${SCROLL.chapterVh}vh` }}
            aria-label={`Region ${ch.id}: ${ch.name}`}
          >
            <div className="ch-label">
              <span className="ch-num">{ch.id}</span>
              <h2 className="ch-name">{ch.name}</h2>
              <p className="ch-sub">{ch.sub}</p>
            </div>
          </section>
        ))}

        <div
          className="gap outro"
          style={{ height: `${SCROLL.outroVh}vh` }}
          aria-hidden="true"
        >
          <p className="drift-in">no further data</p>
        </div>
      </main>

      <MusicPlayer />

      {/* Screen-reader log for canvas-only events. */}
      <p className="sr-only" role="status" aria-live="polite">
        {wishCount > 0 ? `Wish recorded. ${wishCount} total.` : ""}
        {formationName ? ` Formation recorded as ${formationName}.` : ""}
      </p>
    </div>
  );
}
