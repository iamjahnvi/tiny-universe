import { useEffect, useRef, useState } from "react";

// A quiet exchange. Nothing leaves the browser — the words dissolve here,
// the field answers faintly, and a single point of light travels away.
function WishOverlay({ open, onClose }) {
  const [text, setText] = useState("");
  const [stage, setStage] = useState("writing"); // writing | releasing | gone
  const inputRef = useRef(null);
  const timer = useRef([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 600);
    return () => clearTimeout(t);
  }, [open ]);

  useEffect(() => () => timer.current.forEach(clearTimeout), []);

  const close = () => {
    onClose();
    setTimeout(() => {
      setText("");
      setStage("writing");
    }, 600);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  if (!open) return null;

  const release = (e) => {
    e.preventDefault();
    if (!text.trim() || stage !== "writing") return;
    setStage("releasing");
    timer.current.push(setTimeout(() => setStage("gone"), 2200));
    timer.current.push(setTimeout(close, 5200));
  };

  return (
    <div className="wish-veil" onClick={close} role="presentation">
      <div
        className="wish-field"
        role="dialog"
        aria-modal="true"
        aria-label="Leave something with the universe"
        onClick={(e) => e.stopPropagation()}
      >
        {stage === "writing" && (
          <form onSubmit={release} className="wish-form">
            <p className="wish-kicker">something crossed the dark</p>
            <h2 className="wish-title">Leave something with the universe.</h2>
            <label className="wish-label" htmlFor="wish-input">
              Tell it something. No one else will see it.
            </label>
            <input
              id="wish-input"
              ref={inputRef}
              className="wish-input"
              type="text"
              maxLength={120}
              placeholder=""
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              className="wish-release"
              disabled={!text.trim()}
            >
              Release it
            </button>
          </form>
        )}
        {stage === "releasing" && (
          <div className="wish-dissolve" aria-hidden="true">
            <p className="dissolve-text">{text}</p>
          </div>
        )}
        {stage === "gone" && (
          <div className="wish-gone">
            <span className="departing" aria-hidden="true" />
            <p>It is with the universe now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WishOverlay;
