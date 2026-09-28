// src/components/booking/Celebration.jsx
// Festejo de la pantalla de confirmación: la huellita grande entra con un
// "pop", seis huellitas salen disparadas alrededor y cae una lluvia de
// huellitas de colores (confeti perruno) que gira y se hamaca hasta salir de
// la pantalla. Tocar la huellita grande repite el festejo.
// Con prefers-reduced-motion no se anima nada (lo resuelve el CSS).
import { useEffect, useMemo, useState } from "react";
import { PawIcon } from "./Icons";

const BRAND_COLORS = ["#ff4fa8", "#8356ff", "#d948ef", "#ffb020", "#22c1a4"];

// Huellitas que salen del círculo: posición final y giro (del diseño).
const BURST = [
  { x: -118, y: -46, r: -25, size: 22, color: "#ff4fa8", delay: 0.15 },
  { x: 122, y: -38, r: 20, size: 26, color: "#8356ff", delay: 0.2 },
  { x: -64, y: -86, r: -10, size: 16, color: "#d948ef", delay: 0.25 },
  { x: 72, y: -84, r: 15, size: 14, color: "#ff4fa8", delay: 0.3 },
  { x: -120, y: 44, r: 30, size: 16, color: "#8356ff", delay: 0.35 },
  { x: 124, y: 46, r: -30, size: 18, color: "#ff4fa8", delay: 0.4 },
];

const CONFETTI_COUNT = 34;

function randomConfetti(accent) {
  const colors = accent ? [...BRAND_COLORS, accent] : BRAND_COLORS;
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 12 + Math.round(Math.random() * 16),
    color: colors[i % colors.length],
    delay: Math.random() * 0.9,
    duration: 2.4 + Math.random() * 1.6,
    spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.round(Math.random() * 360)),
    sway: 18 + Math.round(Math.random() * 40),
    tilt: Math.round(Math.random() * 60 - 30),
  }));
}

export default function Celebration({ accent }) {
  const [run, setRun] = useState(0);
  const [raining, setRaining] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- nueva lluvia en cada repetición
  const confetti = useMemo(() => randomConfetti(accent), [run, accent]);

  useEffect(() => {
    setRaining(true);
    const t = setTimeout(() => setRaining(false), 4800);
    return () => clearTimeout(t);
  }, [run]);

  return (
    <div className="bk-celebrate" aria-hidden="true">
      <div className="bk-celebrate__stage" key={run}>
        {BURST.map((p, i) => (
          <span
            key={i}
            className="bk-celebrate__burst"
            style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, "--r": `${p.r}deg`, animationDelay: `${p.delay}s` }}
          >
            <PawIcon size={p.size} color={p.color} />
          </span>
        ))}
        <button
          type="button"
          className="bk-celebrate__circle"
          tabIndex={-1}
          onClick={() => setRun((n) => n + 1)}
          title="¡Otra vez!"
        >
          <PawIcon size={50} color="#fff" />
        </button>
      </div>

      {raining && (
        <div className="bk-confetti" key={`rain-${run}`}>
          {confetti.map((c) => (
            <span
              key={c.id}
              className="bk-confetti__piece"
              style={{
                left: `${c.left}%`,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                "--spin": `${c.spin}deg`,
                "--sway": `${c.sway}px`,
                "--tilt": `${c.tilt}deg`,
              }}
            >
              <span className="bk-confetti__sway" style={{ animationDuration: `${0.9 + (c.id % 5) * 0.15}s` }}>
                <PawIcon size={c.size} color={c.color} />
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
