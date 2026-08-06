"use client";

import { useEffect, useMemo, useState } from "react";

// Celebration palette: evergreen + gold lead, with the accent jewel
// tones behind them. Gold is allowed to shout here — this is the moment
// it exists for.
const COLORS = ["#0e7c66", "#c39a3e", "#e4cc8a", "#4a3aad", "#a83259"];
const DURATION_MS = 2600;

/** Deterministic PRNG so a given burst always renders the same confetti. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * D-04's milestone burst.
 *
 * `fire` is a counter — bump it to set off a burst. The pieces are
 * derived from that counter rather than from Math.random() at render
 * time, so a re-render mid-burst doesn't reshuffle the confetti.
 *
 * Pure CSS transforms on a handful of spans; a canvas library would be
 * more paper than the party is worth, and this respects
 * prefers-reduced-motion for free via globals.css.
 */
export function Confetti({ fire, pieces = 44 }: { fire: number; pieces?: number }) {
  const [finished, setFinished] = useState(0);

  useEffect(() => {
    if (fire === 0 || finished === fire) return;
    const timer = setTimeout(() => setFinished(fire), DURATION_MS);
    return () => clearTimeout(timer);
  }, [fire, finished]);

  const confetti = useMemo(() => {
    if (fire === 0) return [];
    const random = mulberry32(fire * 2654435761);

    return Array.from({ length: pieces }, (_, i) => ({
      key: `${fire}-${i}`,
      left: random() * 100,
      delay: random() * 0.5,
      duration: 2 + random() * 1.2,
      size: 6 + random() * 8,
      tall: random() > 0.5,
      round: random() > 0.6,
      dx: (random() - 0.5) * 30,
      dr: random() * 900 - 450,
      color: COLORS[i % COLORS.length],
    }));
  }, [fire, pieces]);

  if (fire === 0 || finished === fire) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-90 overflow-hidden" aria-hidden>
      {confetti.map((piece) => (
        <span
          key={piece.key}
          style={
            {
              position: "absolute",
              left: `${piece.left}%`,
              top: "-6vh",
              width: piece.size,
              height: piece.size * (piece.tall ? 1.8 : 1),
              background: piece.color,
              borderRadius: piece.round ? "50%" : "2px",
              animation: `fall ${piece.duration}s cubic-bezier(0.3, 0.7, 0.6, 1) ${piece.delay}s forwards`,
              "--dx": `${piece.dx}vw`,
              "--dr": `${piece.dr}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
