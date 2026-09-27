import { useEffect, useRef, useState } from "react";
import songs from "./songs";

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Tiny cosmic radio, fixed bottom-right. No native controls —
// custom play/pause, prev/next, progress, volume, auto-advance.
function MusicPlayer() {
  const audioRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [notice, setNotice] = useState("");

  const song = songs[index];

  // Load a new track. Never autoplay without a user gesture.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = song.url;
    audio.load();
    setProgress(0);
    setDuration(0);
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        setNotice("tap play to begin");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setNotice("");
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setNotice("tap play to begin"));
    }
  };

  const step = (dir) => {
    setIsPlaying(false);
    setIndex((i) => (i + dir + songs.length) % songs.length);
    // Start the new track on the next tick (counts as continuation of the tap).
    setTimeout(() => {
      audioRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }, 60);
  };

  const seek = (e) => {
    const audio = audioRef.current;
    const value = Number(e.target.value);
    setProgress(value);
    if (audio && Number.isFinite(audio.duration)) {
      audio.currentTime = (value / 100) * audio.duration;
    }
  };

  return (
    <div className="radio" role="region" aria-label="Cosmic radio">
      <div className="radio-orb" aria-hidden="true">
        <span className={`orb-ring ${isPlaying ? "spinning" : ""}`} />
      </div>
      <div className="radio-meta">
        <p className="radio-title">{song.title}</p>
        <p className="radio-artist">
          {song.artist} · {index + 1}/{songs.length}
        </p>
        <div className="radio-progress-row">
          <span className="radio-time">{formatTime((progress / 100) * duration)}</span>
          <input
            type="range"
            className="radio-seek"
            min="0"
            max="100"
            value={progress}
            onChange={seek}
            aria-label="Seek through song"
          />
          <span className="radio-time">{formatTime(duration)}</span>
        </div>
        {notice && (
          <p className="radio-notice" role="status">
            {notice}
          </p>
        )}
      </div>
      <div className="radio-controls">
        <button type="button" aria-label="Previous song" onClick={() => step(-1)}>
          ⏮
        </button>
        <button
          type="button"
          className="radio-play"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={toggle}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button type="button" aria-label="Next song" onClick={() => step(1)}>
          ⏭
        </button>
      </div>
      <label className="radio-volume">
        <span aria-hidden="true">♪</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </label>
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration) && a.duration > 0) {
            setProgress((a.currentTime / a.duration) * 100);
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => setIndex((i) => (i + 1) % songs.length)}
      />
    </div>
  );
}

export default MusicPlayer;
