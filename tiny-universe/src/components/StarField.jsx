import { useMemo } from "react";

// A stable star field. Positions + facts are generated once per density
// (useMemo), so re-renders never reshuffle the sky.
// Stars render as bare points of light — interactive ones are
// indistinguishable until discovered.
function StarField({ stars, selectedIds, constellationMode, onStarClick }) {
  const layers = useMemo(() => stars, [stars]);

  return (
    <>
      {/* Chart lines: SVG in % coordinates so lines follow stars on resize */}
      {selectedIds.length > 1 && (
        <svg
          className="constellation-lines"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points={selectedIds
              .map((id) => {
                const s = layers.find((star) => star.id === id);
                return s ? `${s.x},${s.y}` : "";
              })
              .join(" ")}
          />
          {selectedIds.map((id) => {
            const s = layers.find((star) => star.id === id);
            if (!s) return null;
            return (
              <circle key={id} cx={s.x} cy={s.y} r="0.45" className="node" />
            );
          })}
        </svg>
      )}

      {layers.map((star) => {
        const isSelected = selectedIds.includes(star.id);
        // Keep discoveries on-screen: flip side near edges, drop below near the top.
        const flipSide = star.x > 68 ? "flip-side" : "";
        const dropBelow = star.y < 22 ? "drop-below" : "";
        return (
          <button
            key={star.id}
            type="button"
            className={
              "star" +
              (isSelected ? " selected" : "") +
              (constellationMode ? " charting" : "")
            }
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              "--size": `${star.size}px`,
              "--tw": `${star.twinkle}s`,
              "--delay": `${star.delay}s`,
              "--op": star.opacity,
            }}
            aria-label={
              constellationMode
                ? `Chart this star. Fact: ${star.fact}`
                : `Star. Fact: ${star.fact}`
            }
            aria-pressed={constellationMode ? isSelected : undefined}
            onClick={() => onStarClick(star)}
          >
            <span className="star-dot" aria-hidden="true" />
            {!constellationMode && (
              <span
                className={`star-fact ${flipSide} ${dropBelow}`}
                aria-hidden="true"
              >
                {star.fact}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

export default StarField;
