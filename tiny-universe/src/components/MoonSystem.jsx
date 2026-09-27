import { useState } from "react";
import { MOON_PHASES } from "../data/cosmos";

// Central moon + 8 phases on a responsive orbit.
// Phases are placed with trigonometry (inline style) so they always form
// an even circle with breathing room — no fixed 650px box.
// Desktop: hover the moon to reveal. Touch/keyboard: tap or Tab to open.
function MoonSystem() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(4); // start on Full Moon

  const reveal = () => setOpen(true);

  return (
    <div
      className={`moon-system ${open ? "open" : ""}`}
      onMouseEnter={reveal}
    >
      <button
        type="button"
        className="moon"
        aria-label="The moon. Activate to reveal the eight moon phases."
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={reveal}
      >
        <span className="moon-label">moon</span>
      </button>

      <div
        className="moon-orbit"
        aria-hidden={open ? undefined : true}
      >
        {MOON_PHASES.map((phase, i) => {
          // Even circle: start at top, go clockwise.
          const angle = (i / MOON_PHASES.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 50;
          const y = 50 + Math.sin(angle) * 50;
          const isActive = active === i;
          // Facts near the bottom of the orbit open upward so they stay visible.
          const flip = Math.sin(angle) > 0.45 ? "flip-up" : "";
          return (
            <div
              key={phase.key}
              className="moon-phase"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <button
                type="button"
                tabIndex={open ? 0 : -1}
                className={`phase-btn ${isActive ? "active" : ""}`}
                aria-label={`${phase.name}. ${phase.fact}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className={`phase-moon ${phase.key}`} aria-hidden="true" />
                <span className="phase-name">{phase.name}</span>
              </button>
              {isActive && (
                <p className={`phase-fact ${flip}`}>{phase.fact}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="moon-hint" aria-hidden="true">
        {open ? "wander among the phases" : "touch the moon"}
      </p>
    </div>
  );
}

export default MoonSystem;
