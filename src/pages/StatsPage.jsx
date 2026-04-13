import React, { useState } from 'react';
import { SEASONS, MODERN_TEAMS, getTeamColor } from '../data/drivers';

function Bar({ value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .6s ease' }} />
    </div>
  );
}

export default function StatsPage() {
  const [activeSeason, setActiveSeason] = useState(2025);
  const season = SEASONS[activeSeason];
  const completed = season.races.filter(r => r.completed && r.winner);

  // Driver wins
  const driverWins = {};
  const driverTeam = {};
  completed.forEach(r => {
    driverWins[r.winner] = (driverWins[r.winner] || 0) + 1;
    driverTeam[r.winner] = r.winnerTeam;
  });
  const driverRanking = Object.entries(driverWins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Team wins
  const teamWins = {};
  completed.forEach(r => {
    if (r.winnerTeam) teamWins[r.winnerTeam] = (teamWins[r.winnerTeam] || 0) + 1;
  });
  const teamRanking = Object.entries(teamWins)
    .sort((a, b) => b[1] - a[1]);

  const maxDriverWins = driverRanking[0]?.[1] || 1;
  const maxTeamWins = teamRanking[0]?.[1] || 1;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <h1 className="season-title">Estadísticas</h1>
        <div className="era-toggle">
          {[2025, 2024].map(y => (
            <button key={y} className={`era-btn ${activeSeason === y ? 'active' : ''}`} onClick={() => setActiveSeason(y)}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {completed.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '32px 0' }}>
          No hay carreras completadas aún en {activeSeason}.
        </div>
      ) : (
        <div className="stats-grid">
          {/* Driver ranking */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Victorias por piloto</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {driverRanking.map(([name, wins], i) => {
                const color = getTeamColor(driverTeam[name]);
                const team = MODERN_TEAMS.find(t => t.id === driverTeam[name]);
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', marginRight: 8 }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{team?.shortName}</span>
                      </div>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color }}>
                        {wins}
                      </span>
                    </div>
                    <Bar value={wins} max={maxDriverWins} color={color} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team ranking */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Victorias por equipo</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {teamRanking.map(([teamId, wins], i) => {
                const team = MODERN_TEAMS.find(t => t.id === teamId);
                return (
                  <div key={teamId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', marginRight: 8 }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{team?.name || teamId}</span>
                      </div>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: team?.color || '#fff' }}>
                        {wins}
                      </span>
                    </div>
                    <Bar value={wins} max={maxTeamWins} color={team?.color || '#888'} />
                  </div>
                );
              })}
            </div>

            {/* Circuits won by different teams */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div className="card-title" style={{ marginBottom: 10 }}>Carreras ganadas por circuito</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {completed.slice(0, 8).map(r => {
                  const color = getTeamColor(r.winnerTeam);
                  return (
                    <div key={r.round} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{r.circuit}</span>
                      <span style={{ color, fontWeight: 500 }}>{r.winner}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
