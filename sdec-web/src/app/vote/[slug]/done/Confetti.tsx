"use client";

import * as React from "react";

const COLORS = ["#0E8C7A", "#1F2A4D", "#B7791F", "#C2362F"];

/** A one-time confetti burst for the receipt screen (SDEC_PLAN §8: "Light
 * confetti, only once"). Pure CSS animation, skipped under
 * prefers-reduced-motion (see globals.css). */
interface Piece {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
}

function Confetti() {
  const [pieces, setPieces] = React.useState<Piece[]>([]);

  React.useEffect(() => {
    function generate() {
      setPieces(
        Array.from({ length: 16 }, (_, i) => ({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 200,
          color: COLORS[i % COLORS.length],
          size: 6 + Math.random() * 4,
        })),
      );
    }
    generate();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti-fall absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

export { Confetti };
