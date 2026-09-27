import { useEffect, useRef, useState } from "react";

// Invisible-unless-needed atmosphere: one local ambient loop running through
// a lowpass filter + gain that morph with the current zone. No playlist UI,
// no switching tracks — the same air gets thinner or thicker as you descend.
// Starts only on explicit toggle (autoplay policies + consent).

const ZONE_AIR = [
  { f: 320, g: 0.5 }, // outer stellar field — sparse
  { f: 520, g: 0.55 }, // rose — slightly richer
  { f: 850, g: 0.6 }, // cluster — harmonic air
  { f: 620, g: 0.6 }, // collision — dramatic low-mid
  { f: 430, g: 0.6 }, // horsehead — ember drone
  { f: 250, g: 0.55 }, // remnant — deep low frequency
  { f: 170, g: 0.22 }, // deep field — almost silent
  { f: 700, g: 0.6 }, // carina — luminous return
];

export default function AmbientSound({ zone }) {
  const [enabled, setEnabled] = useState(false);
  const rig = useRef(null); // { ctx, filter, gain }
  const zoneRef = useRef(zone);
  useEffect(() => {
    zoneRef.current = zone;
  });

  const toggle = () => {
    try {
      if (!rig.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const el = new Audio("/audio/cosmic-1.mp3");
        el.loop = true;
        el.volume = 1;
        const src = ctx.createMediaElementSource(el);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 320;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        rig.current = { ctx, filter, gain, el };
      }
      const { ctx, gain, el } = rig.current;
      if (!enabled) {
        ctx.resume();
        el.play().catch(() => {});
        const air = ZONE_AIR[Math.max(0, zoneRef.current)] || ZONE_AIR[0];
        gain.gain.setTargetAtTime(air.g * 0.5, ctx.currentTime, 1.2);
        setEnabled(true);
      } else {
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        setTimeout(() => {
          el.pause();
        }, 1200);
        setEnabled(false);
      }
    } catch {
      /* audio unavailable — the universe stays silent */
    }
  };

  // Smooth crossfade of the air as zones change. Never abrupt.
  useEffect(() => {
    const r = rig.current;
    if (!r || !enabled) return;
    const air = ZONE_AIR[Math.max(0, zone)] || ZONE_AIR[0];
    r.filter.frequency.setTargetAtTime(air.f, r.ctx.currentTime, 1.5);
    r.gain.gain.setTargetAtTime(air.g * 0.5, r.ctx.currentTime, 1.5);
  }, [zone, enabled]);

  useEffect(
    () => () => {
      try {
        rig.current?.el.pause();
        rig.current?.ctx.close();
      } catch {
        /* already gone */
      }
    },
    []
  );

  return (
    <button
      type="button"
      className={`snd ${enabled ? "on" : ""}`}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute ambient sound" : "Enable ambient sound"}
      onClick={toggle}
    >
      <span className="snd-dot" aria-hidden="true" />
      sound {enabled ? "on" : "off"}
    </button>
  );
}
