import React from 'react';

const STATUS_BADGE = {
  pit:     { label: 'PIT',   cls: 'badge-amber' },
  slow:    { label: 'LENTO', cls: 'badge-red'   },
  retired: { label: 'ABN',   cls: 'badge-gray'  },
};

export default function Leaderboard({ cars = [] }) {
  const sorted = [...cars].sort((a, b) => a.pos - b.pos);

  return (
    <table className="lb-table">
      <thead>
        <tr>
          <th style={{ width: 28 }}>POS</th>
          <th style={{ width: 30 }}>N°</th>
          <th>PILOTO</th>
          <th style={{ width: 62, textAlign: 'right' }}>GAP</th>
          <th style={{ width: 48, textAlign: 'right' }}>EST</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((car) => {
          const diff = car.pos - car.prevPos;
          const rowCls = diff < 0 ? 'highlight-up' : diff > 0 ? 'highlight-down' : '';
          const st = STATUS_BADGE[car.status];
          return (
            <tr key={car.id} className={rowCls}>
              <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text-secondary)' }}>
                {car.pos}
                {diff < 0 && <span style={{ color: 'var(--green)', marginLeft: 2, fontSize: 10 }}>▲</span>}
                {diff > 0 && <span style={{ color: 'var(--red)', marginLeft: 2, fontSize: 10 }}>▼</span>}
              </td>
              <td>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 17, borderRadius: 3,
                  background: car.color, color: '#fff',
                  fontSize: 10, fontWeight: 500,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {car.num}
                </span>
              </td>
              <td style={{ fontSize: 13 }}>{car.name}</td>
              <td style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-secondary)' }}>
                {car.gap}
              </td>
              <td style={{ textAlign: 'right' }}>
                {st ? <span className={`badge ${st.cls}`}>{st.label}</span> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
