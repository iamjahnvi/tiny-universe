import { useState } from "react";
import { MOON_PHASES } from "../data/cosmos";

// Central moon + 8 phases held in a quiet orbital arrangement.
// Phases are placed with trigonometry (inline style) so they always form
// an even ring with breathing room — no fixed-pixel box.
// Hover reveals on precise pointers; tap toggles on touch; all phases
// are keyboard reachable. Names and notes surface only on attention.
function MoonSystem() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(4); // Full Moon

  const reveal = () => setOpen(true);

  return (
    <div className={`moon-system ${open ? "open" : ""}`} onMouseEnter={reveal}>
      <button
        type="button"
        className="moon"
        aria-label="The moon. Activate to reveal the eight lunar phases."
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={reveal}
      />
      <span className="moon-caption" aria-hidden="true">
        {open ? "lunar cycle" : ""}
      </span>

      <div className="moon-orbit" aria-hidden={open ? undefined : true}>
        {MOON_PHASES.map((phase, i) => {
          // Even ring: start at top, go clockwise.
          const angle = (i / MOON_PHASES.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 50;
          const y = 50 + Math.sin(angle) * 50;
          const isActive = active === i;
          // Notes near the bottom of the ring open upward to stay visible.
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
              {isActive && <p className={`phase-fact ${flip}`}>{phase.fact}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MoonSystem;
