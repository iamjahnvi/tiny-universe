import { useMemo } from "react";

// A rare astronomical event: a bright nucleus with a fading tail crossing
// deep space. The wrapper is pointer-events:none; only the nucleus is a
// button, with an invisible expanded hit area so a crossing can actually
// be caught without any visible box intruding on the sky.
function ShootingStar({ flight, onWish, onDone }) {
  const laneStyle = useMemo(
    () => ({
      top: `${flight.startTop}%`,
      "--dur": `${flight.duration}s`,
      "--drop": `${flight.drop}vw`,
      "--delay": `${flight.delay}s`,
    }),
    [flight]
  );

  return (
    <div className="shooting-lane" style={laneStyle}>
      <div className="shooting-tail" onAnimationEnd={onDone} aria-hidden="true">
        <span className="tail-core" aria-hidden="true" />
        <span className="tail-glow" aria-hidden="true" />
        <span className="tail-fade" aria-hidden="true" />
      </div>
      <button
        type="button"
        className="shooting-head"
        aria-label="Something crossing the dark. Activate to leave something with the universe."
        onClick={onWish}
      />
    </div>
  );
}

export default ShootingStar;
