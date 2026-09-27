import { useEffect, useRef, useState } from "react";

// Intimate wish dialog. Nothing leaves the browser — the wish lives
// only in this session, then fades like a new star.
function WishOverlay({ open, onClose }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [open ]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const close = () => {
    onClose();
    // Reset for the next wish after the veil fades.
    setTimeout(() => {
      setText("");
      setSent(false);
    }, 300);
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

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSent(true);
    timer.current = setTimeout(close, 3600);
  };

  return (
    <div className="wish-veil" onClick={close} role="presentation">
      <div
        className="wish-box"
        role="dialog"
        aria-modal="true"
        aria-label="Make a wish"
        onClick={(e) => e.stopPropagation()}
      >
        {!sent ? (
          <form onSubmit={send}>
            <p className="wish-kicker">a shooting star heard you</p>
            <h2 className="wish-title">Make a wish ✨</h2>
            <label className="wish-label" htmlFor="wish-input">
              What do you wish for?
            </label>
            <input
              id="wish-input"
              ref={inputRef}
              className="wish-input"
              type="text"
              maxLength={120}
              placeholder="write it into the universe…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
            />
            <div className="wish-actions">
              <button type="submit" className="wish-send" disabled={!text.trim()}>
                Send it to the stars
              </button>
              <button type="button" className="wish-close" onClick={close}>
                not now
              </button>
            </div>
          </form>
        ) : (
          <div className="wish-sent">
            <span className="wish-star" aria-hidden="true">
              ✦
            </span>
            <h2 className="wish-title">Your wish has been sent into the universe ✨</h2>
            <p className="wish-quiet">it now glimmers somewhere above you</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default WishOverlay;
