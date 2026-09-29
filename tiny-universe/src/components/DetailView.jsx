import { useEffect } from "react";

// Entering a world: full-screen living astronomical environment with
// white editorial information floating on the LEFT. The right side stays
// dominated by the object. No cards, no panels, no boxed UI.
//
// The source image is treated as environment material:
//  - a vast blurred color field washes the whole viewport
//  - the sharp plate anchors RIGHT, feathered into darkness on its left
//    edge so typography floats over open space, never over a rectangle
//  - microscopic drift: slow Ken Burns scale, breathing glow, drifting
//    dust motes and star parallax keep the place alive
export default function DetailView({ detail, onClose }) {
  const dat = detail.atmosphere || {
    primary: detail.accent,
    secondary: detail.fog,
    glow: detail.accent,
  };
  const fx = (detail.focalPoint?.x ?? 0.5) * 100;
  const fy = (detail.focalPoint?.y ?? 0.5) * 100;

  useEffect(() => {
    const el = document.querySelector(".detail-body");
    if (el) el.scrollTop = 0;
  }, [detail.slug]);

  return (
    <div
      className="detail"
      role="dialog"
      aria-modal="true"
      aria-label={`${detail.name}, ${detail.object}`}
      style={{
        "--d-primary": `${dat.primary.join(",")}`,
        "--d-secondary": `${dat.secondary.join(",")}`,
        "--d-glow": `${dat.glow.join(",")}`,
      }}
    >
      {/* image-derived atmosphere washing the whole state */}
      <div className="detail-atmo" aria-hidden="true" />
      <img
        className="detail-atmo-img"
        src={detail.image}
        alt=""
        aria-hidden="true"
      />
      {/* the world itself, anchored right, feathered left */}
      <div className="detail-world" aria-hidden="true">
        <img
          className="detail-bg"
          src={detail.image}
          alt=""
          style={{ objectPosition: `${fx.toFixed(1)}% ${fy.toFixed(1)}%` }}
        />
        <div className="detail-world-glow" aria-hidden="true" />
      </div>
      {/* drifting dust motes — the air inside the world */}
      <div className="detail-dust" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ "--d": i }} />
        ))}
      </div>
      <div className="detail-scrim" aria-hidden="true" />

      <button type="button" className="detail-back" onClick={onClose} autoFocus>
        ← return to universe
      </button>

      <div className="detail-body">
        <p className="detail-kicker">
          <span className="detail-num"># {detail.id}</span>
          <span className="detail-cat">{detail.category}</span>
        </p>
        <h2 className="detail-name">{detail.name}</h2>
        <p className="detail-object">{detail.designation}</p>
        <p className="detail-desc">{detail.description}</p>
        <dl className="detail-data">
          <div>
            <dt>object</dt>
            <dd>{detail.object}</dd>
          </div>
          <div>
            <dt>type</dt>
            <dd>{detail.type || detail.structure}</dd>
          </div>
          <div>
            <dt>distance</dt>
            <dd>{detail.distance}</dd>
          </div>
          <div>
            <dt>location</dt>
            <dd>{detail.location || detail.region}</dd>
          </div>
          <div>
            <dt>telescope</dt>
            <dd>{detail.telescope}</dd>
          </div>
          <div>
            <dt>year</dt>
            <dd>{detail.year}</dd>
          </div>
        </dl>
        <p className="detail-source">
          {detail.credit} · {detail.source}
        </p>
      </div>
    </div>
  );
}
