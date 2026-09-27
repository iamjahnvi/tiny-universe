import { useMemo } from "react";

// A shooting star that crosses the whole viewport and leaves.
// The wrapper is pointer-events:none; only the glowing head is a button,
// with an invisible expanded hit area (::before) so it stays easy to tap
// without a giant visible box blocking the sky.
function ShootingStar({ flight, onWish, onDone }) {
  const style = useMemo(
    () => ({
      top: `${flight.startTop}%`,
      animationDuration: `${flight.duration}s`,
    }),
    [flight]
  );

  return (
    <div className="shooting-lane" style={style} aria-hidden={false}>
      <div className="shooting-visual" onAnimationEnd={onDone} aria-hidden="true" />
      <button
        type="button"
        className="shooting-head"
        aria-label="A shooting star. Activate to make a wish."
        onClick={onWish}
      />
    </div>
  );
}

export default ShootingStar;
