import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import MusicPlayer from "./MusicPlayer";
import StarField from "./components/StarField";
import MoonSystem from "./components/MoonSystem";
import ShootingStar from "./components/ShootingStar";
import WishOverlay from "./components/WishOverlay";
import DensityControl from "./components/DensityControl";
import ConstellationBar from "./components/ConstellationBar";
import { STAR_FACTS, DENSITY_OPTIONS } from "./data/cosmos";

// Deterministic pseudo-random so the sky is stable between renders.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Landing({ onEnter, isLeaving }) {
  return (
    <div className={isLeaving ? "landing leaving" : "landing"}>
      <p className="landing-kicker">WELCOME TO</p>
      <h1 className="landing-title">Tiny Universe</h1>
      <h2 className="landing-sub">a little place for people who look up</h2>
      <button type="button" className="enter-btn" onClick={onEnter}>
        Enter Universe
      </button>
      <p className="landing-hint" aria-hidden="true">
        ✦ &nbsp;take your time&nbsp; ✦
      </p>
    </div>
  );
}

function Universe() {
  const [density, setDensity] = useState("cozy");
  const [flight, setFlight] = useState(null);
  const [wishOpen, setWishOpen] = useState(false);
  const [constellationMode, setConstellationMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [constellationName, setConstellationName] = useState("");
  const flightKey = useRef(0);

  const starCount =
    DENSITY_OPTIONS.find((o) => o.key === density)?.count ?? 95;

  // Generated once — stable positions, sizes, twinkle, and facts forever.
  const allStars = useMemo(() => {
    const rand = mulberry32(20260927);
    return Array.from({ length: 150 }, (_, i) => {
      let x = rand() * 100;
      let y = rand() * 100;
      // Keep the gravitational center breathing: nudge stars out of the core.
      if (Math.abs(x - 50) < 15 && Math.abs(y - 48) < 17) {
        x = (x + 34) % 100;
        y = (y + 30) % 100;
      }
      return {
        id: i,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        size: Math.round((10 + rand() * 10) * 10) / 10,
        opacity: Math.round((0.45 + rand() * 0.55) * 100) / 100,
        glow: `${Math.round(4 + rand() * 10)}px`,
        twinkle: Math.round((1.8 + rand() * 2.7) * 10) / 10,
        delay: Math.round(rand() * 40) / 10,
        fact: STAR_FACTS[Math.floor(rand() * STAR_FACTS.length)],
      };
    });
  }, []);

  const stars = useMemo(() => allStars.slice(0, starCount), [allStars, starCount]);

  // Shooting-star loop: one crossing at a time, roughly every 5 seconds.
  // Single timeout chain — no overlapping intervals.
  useEffect(() => {
    if (flight) return;
    if (wishOpen) return;
    const wait = 3600 + Math.random() * 2600;
    const t = setTimeout(() => {
      flightKey.current += 1;
      setFlight({
        key: flightKey.current,
        startTop: 6 + Math.random() * 26,
        duration: 1.8 + Math.random() * 1.1,
      });
    }, wait);
    return () => clearTimeout(t);
  }, [flight, wishOpen]);

  const handleStarClick = (star) => {
    if (!constellationMode) return;
    setConstellationName("");
    setSelectedIds((prev) =>
      prev.includes(star.id)
        ? prev.filter((id) => id !== star.id)
        : [...prev, star.id].slice(0, 12)
    );
  };

  return (
    <div className="universe">
      <StarField
        stars={stars}
        selectedIds={selectedIds}
        constellationMode={constellationMode}
        onStarClick={handleStarClick}
      />

      <div className="universe-core">
        <MoonSystem />
        <p className="catch-hint" aria-hidden="true">
          psst — catch a shooting star to make a wish
        </p>
        <ConstellationBar
          mode={constellationMode}
          onToggle={() => {
            setConstellationMode((v) => !v);
            setSelectedIds([]);
            setConstellationName("");
          }}
          selectedCount={selectedIds.length}
          savedName={constellationName}
          onName={setConstellationName}
          onReset={() => {
            setSelectedIds([]);
            setConstellationName("");
          }}
        />
      </div>

      {flight && (
        <ShootingStar
          key={flight.key}
          flight={flight}
          onWish={() => setWishOpen(true)}
          onDone={() => setFlight(null)}
        />
      )}

      <WishOverlay open={wishOpen} onClose={() => setWishOpen(false)} />
      <DensityControl value={density} onChange={setDensity} />
      <MusicPlayer />
    </div>
  );
}

function App() {
  const [isEntered, setIsEntered] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimer = useRef(null);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const enter = () => {
    setIsLeaving(true);
    leaveTimer.current = setTimeout(() => setIsEntered(true), 950);
  };

  return isEntered ? <Universe /> : <Landing onEnter={enter} isLeaving={isLeaving} />;
}

export default App;
