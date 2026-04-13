import React, { useEffect, useRef } from 'react';
function trackPos(t, cx = 280, cy = 150, rx = 226, ry = 116) {
  const a = t * Math.PI * 2 - Math.PI / 2;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

const CX = 280, CY = 150, RX = 226, RY = 116;

export default function TrackSVG({ cars = [], phase }) {
  const carGroupsRef = useRef({});

  // Imperatively move car SVG elements for smooth animation
  useEffect(() => {
    cars.forEach((car) => {
      const g = carGroupsRef.current[car.id];
      if (!g) return;
      const p = trackPos(car.t, CX, CY, RX, RY);
      const p2 = trackPos(car.t + 0.006, CX, CY, RX, RY);
      const angle = Math.atan2(p2.y - p.y, p2.x - p.x) * (180 / Math.PI);
      g.setAttribute('transform', `translate(${p.x.toFixed(2)},${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
      g.style.opacity = car.status === 'retired' ? '0.25' : '1';
    });
  });

  return (
    <svg
      className="track-svg"
      viewBox="0 0 560 300"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%' }}
    >
      {/* Track layers */}
      <ellipse cx={CX} cy={CY} rx={RX + 14} ry={RY + 14} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="28" />
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#3a3830" strokeWidth="28" />
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="#46443c" strokeWidth="24" />
      {/* Edge lines */}
      <ellipse cx={CX} cy={CY} rx={RX + 14} ry={RY + 14} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <ellipse cx={CX} cy={CY} rx={RX - 14} ry={RY - 14} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* Start/Finish line */}
      <line x1={CX} y1={CY - RY + 2} x2={CX} y2={CY - RY - 12} stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <line x1={CX - 4} y1={CY - RY + 2} x2={CX - 4} y2={CY - RY - 12} stroke="#e8002d" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <text x={CX + 7} y={CY - RY - 3} fill="rgba(255,255,255,0.5)" fontSize="7" fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.1em">META</text>
      {/* Pit lane */}
      <path d={`M ${CX - 70} ${CY + RY + 18} Q ${CX} ${CY + RY + 28} ${CX + 70} ${CY + RY + 18}`}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
      <text x={CX} y={CY + RY + 44} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7"
        fontFamily="'IBM Plex Mono', monospace" letterSpacing="0.1em">BOXES</text>

      {/* Cars layer */}
      <g id="cars-layer">
        {cars.map((car) => {
          const p = trackPos(car.t, CX, CY, RX, RY);
          const p2 = trackPos(car.t + 0.006, CX, CY, RX, RY);
          const angle = Math.atan2(p2.y - p.y, p2.x - p.x) * (180 / Math.PI);
          return (
            <g
              key={car.id}
              ref={el => { carGroupsRef.current[car.id] = el; }}
              transform={`translate(${p.x.toFixed(2)},${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`}
              style={{ opacity: car.status === 'retired' ? 0.25 : 1, transition: 'opacity .4s' }}
            >
              {/* Car body */}
              <ellipse rx="10" ry="5" fill={car.color} stroke="rgba(0,0,0,0.6)" strokeWidth="0.8" />
              {/* Number */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="5"
                fill="#fff"
                fontWeight="500"
                fontFamily="'IBM Plex Mono', monospace"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {car.num}
              </text>
              {/* Pit indicator */}
              {car.inPit && (
                <circle cx="0" cy="-8" r="3" fill="#ef9f27" />
              )}
            </g>
          );
        })}
      </g>

      {/* Phase overlay */}
      {phase === 'idle' && (
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central"
          fill="rgba(255,255,255,0.25)" fontSize="13" fontFamily="'Bebas Neue', sans-serif"
          letterSpacing="0.1em">
          PRESIONÁ LARGAR
        </text>
      )}
      {phase === 'finished' && (
        <>
          <text x={CX} y={CY - 8} textAnchor="middle" dominantBaseline="central"
            fill="var(--red, #e8002d)" fontSize="20" fontFamily="'Bebas Neue', sans-serif"
            letterSpacing="0.1em">
            CARRERA TERMINADA
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" dominantBaseline="central"
            fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="'IBM Plex Mono', monospace">
            🏁
          </text>
        </>
      )}
    </svg>
  );
}
