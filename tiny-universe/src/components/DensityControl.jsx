import { DENSITY_OPTIONS } from "../data/cosmos";

// Near-invisible field control: how present the distant field should be.
// Three quiet words, bottom-left, dim until approached.
function DensityControl({ value, onChange }) {
  return (
    <div
      className="density"
      role="group"
      aria-label="Density of the distant star field"
    >
      <div className="density-row">
        {DENSITY_OPTIONS.map((opt, i) => (
          <span key={opt.key} className="density-item">
            <button
              type="button"
              className={`density-btn ${value === opt.key ? "active" : ""}`}
              aria-pressed={value === opt.key}
              aria-label={`${opt.label}, ${opt.count} stars`}
              onClick={() => onChange(opt.key)}
            >
              {opt.label}
            </button>
            {i < DENSITY_OPTIONS.length - 1 && (
              <span className="density-sep" aria-hidden="true">
                /
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default DensityControl;
