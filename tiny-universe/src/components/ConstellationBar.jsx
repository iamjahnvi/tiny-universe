import { useState } from "react";

// Playful constellation flow. Selection lives in App so StarField can draw
// the lines; this bar handles mode toggle, naming, and reset.
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
    <div className="constellation-bar">
      <button
        type="button"
        className={`connect-btn ${mode ? "active" : ""}`}
        aria-pressed={mode}
        onClick={onToggle}
      >
        {mode ? "✦ connecting… tap stars" : "✦ connect the stars"}
      </button>

      {mode && selectedCount > 0 && !savedName && (
        <span className="connect-count" role="status">
          {selectedCount} {selectedCount === 1 ? "star" : "stars"} joined
        </span>
      )}

      {mode && selectedCount >= 2 && !savedName && (
        <form className="connect-form" onSubmit={save}>
          <label htmlFor="constellation-name">What should we call it?</label>
          <div className="connect-input-row">
            <input
              id="constellation-name"
              type="text"
              maxLength={40}
              placeholder="name your constellation…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={!draft.trim()}>
              name it
            </button>
          </div>
        </form>
      )}

      {savedName && (
        <p className="connect-saved" role="status">
          Your constellation: <strong>{savedName}</strong>
          <button type="button" onClick={onReset} className="connect-reset">
            release it
          </button>
        </p>
      )}

      {mode && selectedCount > 0 && !savedName && (
        <button type="button" onClick={onReset} className="connect-reset">
          start over
        </button>
      )}
    </div>
  );
}

export default ConstellationBar;
