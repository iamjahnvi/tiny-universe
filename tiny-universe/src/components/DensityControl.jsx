import { DENSITY_OPTIONS } from "../data/cosmos";

// Whimsical density control: "how crowded should your little universe be?"
// Three glowing glyphs instead of a settings slider.
function DensityControl({ value, onChange }) {
  return (
    <div className="density" role="group" aria-label="How crowded should your little universe be?">
      <p className="density-caption">how crowded should your sky be?</p>
      <div className="density-row">
        {DENSITY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`density-btn ${value === opt.key ? "active" : ""}`}
            aria-pressed={value === opt.key}
            aria-label={`${opt.label}, ${opt.count} stars`}
            onClick={() => onChange(opt.key)}
          >
            <span className="density-glyph" aria-hidden="true">
              {opt.glyph}
            </span>
            <span className="density-name">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default DensityControl;
