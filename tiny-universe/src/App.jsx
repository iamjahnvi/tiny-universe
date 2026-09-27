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

// Deterministic pseudo-random so the field is stable between renders.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_STARS = 220;

function Landing({ onEnter, isLeaving }) {
  return (
    <div className={isLeaving ? "landing leaving" : "landing"}>
      <p className="landing-kicker">Welcome to</p>
      <h1 className="landing-title">Tiny Universe</h1>
      <p className="landing-sub">a little place for people who look up</p>
      <button type="button" className="enter-btn" onClick={onEnter}>
        Enter
      </button>
    </div>
  );
}

function Universe() {
  const [density, setDensity] = useState("moderate");
  const [flight, setFlight] = useState(null);
  const [wishOpen, setWishOpen] = useState(false);
  const [constellationMode, setConstellationMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [constellationName, setConstellationName] = useState("");
  const flightKey = useRef(0);

  const starCount =
    DENSITY_OPTIONS.find((o) => o.key === density)?.count ?? 140;

  // Generated once — stable positions, depths, rhythms, and facts.
  // Squared distribution: a vast bed of barely-visible distant points,
  // a middle field, and a few brighter stars worth investigating.
  const allStars = useMemo(() => {
    const rand = mulberry32(20260927);
    return Array.from({ length: MAX_STARS }, (_, i) => {
      let x = rand() * 100;
      let y = rand() * 100;
      // Keep the gravitational center breathing: nudge points out of the core.
      if (Math.abs(x - 50) < 14 && Math.abs(y - 48) < 16) {
        x = (x + 34) % 100;
        y = (y + 30) % 100;
      }
      const depth = rand();
      const size =
        depth < 0.62
          ? 1 + rand() * 1 // distant dust
          : depth < 0.9
            ? 1.5 + rand() * 1.2 // middle field
            : 2.4 + rand() * 1.6; // rare brighter stars
      return {
        id: i,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        size: Math.round(size * 10) / 10,
        opacity: Math.round((0.22 + rand() * 0.73) * 100) / 100,
        twinkle: Math.round((3 + rand() * 4.5) * 10) / 10,
        delay: Math.round(rand() * 70) / 10,
        fact: STAR_FACTS[Math.floor(rand() * STAR_FACTS.length)],
      };
    });
  }, []);

  const stars = useMemo(() => allStars.slice(0, starCount), [allStars, starCount]);

  // Rare crossings: a single event every 9–17 seconds, each with its own
  // altitude, duration, and descent. Missing one should feel normal.
  useEffect(() => {
    if (flight) return;
    if (wishOpen) return;
    const wait = 9000 + Math.random() * 8000;
    const t = setTimeout(() => {
      flightKey.current += 1;
      setFlight({
        key: flightKey.current,
        startTop: 5 + Math.random() * 30,
        duration: 2.2 + Math.random() * 1.2,
        drop: 34 + Math.random() * 26,
        delay: 0,
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

      <p className="orientation" aria-hidden="true">
        drift slowly — some points of light answer
      </p>

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
    leaveTimer.current = setTimeout(() => setIsEntered(true), 1400);
  };

  return isEntered ? <Universe /> : <Landing onEnter={enter} isLeaving={isLeaving} />;
}

export default App;
