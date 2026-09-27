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

const LOAD_LINES = ["INITIALIZING", "STELLAR FIELD", "CALIBRATING OPTICS"];

// One continuous descent. Canvas is the world; DOM is instruments, archive
// labels, the loading sequence, and SPA detail overlays (hash-routed so
// back-button works and scroll/state/audio are preserved underneath).
export default function Universe() {
  const [veiled, setVeiled] = useState(true);
  const [gone, setGone] = useState(false);
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

  // Loading = real asset preload (all plates) under a cinematic sequence.
  // A hard 7s fallback guarantees the veil always lifts.
  useEffect(() => {
    let loaded = 0;
    const total = CHAPTERS.length;
    const stamp = Date.now();
    CHAPTERS.forEach((ch) => {
      const im = new Image();
      im.onload = () => {
        loaded++;
      };
      im.onerror = () => {
        loaded++;
      };
      im.src = ch.image;
    });
    const iv = setInterval(() => {
      const elapsed = (Date.now() - stamp) / 1000;
      const timePct = Math.min(92, (elapsed / 1.6) * 92);
      const realPct = (loaded / total) * 92;
      const v = Math.min(92, Math.max(timePct, realPct));
      setLoadPct(Math.floor(v >= 92 && loaded >= total ? 100 : v));
      if (loaded >= total) {
        setLoadPct(100);
        clearInterval(iv);
      }
    }, 100);
    const force = setTimeout(() => {
      setLoadPct(100);
      clearInterval(iv);
    }, 7000);
    return () => {
      clearInterval(iv);
      clearTimeout(force);
    };
  }, []);

  useEffect(() => {
    if (loadPct < 100) return;
    const a = setTimeout(() => setVeiled(false), 350);
    const b = setTimeout(() => setGone(true), 1600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [loadPct]);

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

  // Lock scroll inside the detail; the universe waits exactly as it was.
  useEffect(() => {
    document.body.style.overflow = detailSlug ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailSlug]);

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
  const loadLine =
    loadPct < 45 ? LOAD_LINES[0] : loadPct < 85 ? LOAD_LINES[1] : loadPct < 100 ? LOAD_LINES[2] : "ENTERING";

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
      />

      {!gone && (
        <div className={`veil ${veiled ? "" : "lifted"}`} role="status" aria-label="Loading universe">
          <p className="veil-brand">Tiny Universe</p>
          <p className="veil-line">{loadLine}</p>
          <p className="veil-pct">{String(loadPct).padStart(3, "0")} / 100</p>
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
            className={`ch ${i % 2 === 0 ? "left" : "right"} ${active === i ? "lit" : ""}`}
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
