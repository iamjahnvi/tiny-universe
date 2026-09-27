import { useEffect, useRef } from "react";
import { CHAPTERS } from "../data/galaxies";

// Instrument corners: identity, position readout, chart toggle, progress.
// The progress hairline updates via rAF on a ref — no React state per frame.
export default function UniverseHUD({
  active,
  chartMode,
  onToggleChart,
  marksCount,
  formationName,
  onRecord,
  onRelease,
}) {
  const barRef = useRef(null);
  const draftRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const label =
    active >= 0 && active < CHAPTERS.length ? CHAPTERS[active] : null;

  return (
    <>
      <header className="hud-top">
        <p className="hud-brand">Tiny Universe</p>
        <p className="hud-pos" aria-live="off">
          {label ? (
            <>
              <span className="hud-num">{label.id}</span>
              <span className="hud-sep">/</span>
              <span>08</span>
              <span className="hud-name">{label.name}</span>
            </>
          ) : (
            <>
              <span className="hud-num">··</span>
              <span className="hud-sep">/</span>
              <span>08</span>
            </>
          )}
        </p>
      </header>

      <div className="hud-bottom">
        <button
          type="button"
          className={`hud-chart ${chartMode ? "active" : ""}`}
          aria-pressed={chartMode}
          onClick={onToggleChart}
        >
          {chartMode ? "charting" : "chart"}
        </button>
        <div className="hud-progress" aria-hidden="true">
          <span ref={barRef} className="hud-progress-fill" />
        </div>
      </div>

      {chartMode && !formationName && (
        <div className="hud-formation">
          {marksCount === 0 && <p>select points of light</p>}
          {marksCount > 0 && marksCount < 3 && (
            <p role="status">
              {marksCount} {marksCount === 1 ? "point" : "points"} marked
            </p>
          )}
          {marksCount >= 3 && (
            <form
              className="hud-name-form"
              onSubmit={(e) => {
                e.preventDefault();
                const v = draftRef.current?.value.trim();
                if (v) {
                  onRecord(v);
                  draftRef.current.value = "";
                }
              }}
            >
              <span>unnamed formation</span>
              <input
                ref={draftRef}
                type="text"
                maxLength={40}
                placeholder="give it a name"
                aria-label="Name this formation"
                autoComplete="off"
              />
              <button type="submit">record</button>
            </form>
          )}
          {marksCount > 0 && (
            <button type="button" className="hud-quiet" onClick={onRelease}>
              clear
            </button>
          )}
        </div>
      )}

      {formationName && (
        <p className="hud-saved" role="status">
          formation — {formationName}
          <button type="button" className="hud-quiet" onClick={onRelease}>
            release
          </button>
        </p>
      )}
    </>
  );
}
