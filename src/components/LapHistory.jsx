import React from 'react';

function formatLapTime(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}

// rows come from useReplay.lapHistory
// Each row: { id, lap, pos, name, color, lapTime (seconds), gap, inPit, status }
export default function LapHistory({ rows = [] }) {
  // Show only the most recent lap's data (all drivers), then older laps collapsed
  const latestLap = rows[0]?.lap;

  return (
    <div className="lap-history-wrap">
      <table className="lap-table">
        <thead>
          <tr>
            <th style={{ width: 28 }}>V</th>
            <th style={{ width: 28 }}>P</th>
            <th>PILOTO</th>
            <th style={{ textAlign: 'right' }}>TIEMPO</th>
            <th style={{ textAlign: 'right' }}>GAP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isLatest = row.lap === latestLap;
            return (
              <tr key={row.id} style={{ opacity: isLatest ? 1 : 0.55 }}>
                <td style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: 'var(--text-muted)',
                  fontSize: 11,
                }}>
                  {row.lap}
                </td>
                <td style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: row.pos === 1 ? 'var(--amber)' : 'var(--text-secondary)',
                  fontWeight: row.pos === 1 ? 500 : 400,
                }}>
                  {row.pos}
                </td>
                <td>
                  <span style={{
                    display: 'inline-block',
                    width: 8, height: 8, borderRadius: '50%',
                    background: row.color,
                    marginRight: 5, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{row.name}</span>
                  {row.inPit && (
                    <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--amber)' }}>PIT</span>
                  )}
                </td>
                <td style={{
                  textAlign: 'right',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                }}>
                  {formatLapTime(row.lapTime)}
                </td>
                <td style={{
                  textAlign: 'right',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  color: 'var(--text-muted)',
                }}>
                  {row.gap}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
