import { useState } from "react";

// Mapping an unknown region. Selection lives in App so StarField can draw
// the hairlines; this strip handles the quiet charting language.
function ConstellationBar({
  mode,
  onToggle,
  selectedCount,
  savedName,
  onName,
  onReset,
}) {
  const [draft, setDraft] = useState("");

  const save = (e) => {
    e.preventDefault();
    if (draft.trim()) {
      onName(draft.trim());
      setDraft("");
    }
  };

  return (
    <div className="chart-strip">
      <button
        type="button"
        className={`chart-toggle ${mode ? "active" : ""}`}
        aria-pressed={mode}
        onClick={onToggle}
      >
        {mode ? "charting — select points of light" : "chart formations"}
      </button>

      {mode && selectedCount > 0 && !savedName && (
        <span className="chart-count" role="status">
          {selectedCount} {selectedCount === 1 ? "point" : "points"} marked
        </span>
      )}

      {mode && selectedCount >= 2 && !savedName && (
        <form className="chart-form" onSubmit={save}>
          <span className="chart-unnamed">Unnamed formation.</span>
          <div className="chart-input-row">
            <input
              id="constellation-name"
              type="text"
              maxLength={40}
              placeholder="give it a name"
              aria-label="Name this formation"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={!draft.trim()}>
              record
            </button>
          </div>
        </form>
      )}

      {savedName && (
        <p className="chart-saved" role="status">
          {savedName}
          <button type="button" onClick={onReset} className="chart-reset">
            release
          </button>
        </p>
      )}

      {mode && selectedCount > 0 && !savedName && (
        <button type="button" onClick={onReset} className="chart-reset">
          clear marks
        </button>
      )}
    </div>
  );
}

export default ConstellationBar;
