import React, { useState } from 'react';
import { SEASONS, MODERN_TEAMS, getTeamColor, FLAGS } from '../data/drivers';

function RaceCard({ race, season, onClick }) {
  const teamColor = race.winnerTeam ? getTeamColor(race.winnerTeam) : 'var(--red)';
  const flag = FLAGS[race.country] || '';
  const date = new Date(race.date);
  const dateStr = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const isNext = !race.completed && (() => {
    const today = new Date();
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 30);
    return date >= today && prev <= today;
  })();

  return (
    <div
      className={`race-card ${race.completed ? 'completed' : ''} ${isNext ? 'next' : ''}`}
      style={{ '--team-color': teamColor }}
      onClick={() => onClick(race)}
    >
      <div className="race-round">
        {flag} RONDA {race.round} · {dateStr}
        {isNext && <span className="badge badge-red" style={{ marginLeft: 8, fontSize: 9 }}>PRÓXIMA</span>}
      </div>
      <div className="race-name">{race.name.replace('Gran Premio de ', '').replace('Gran Premio del ', '')}</div>
      <div className="race-meta">
        <span>{race.circuit}</span>
        <span>{race.laps} vueltas</span>
      </div>
      {race.completed && race.winner && (
        <div className="race-winner">
          🏆 <b>{race.winner}</b> &mdash; {MODERN_TEAMS.find(t => t.id === race.winnerTeam)?.name || ''}
        </div>
      )}
      {!race.completed && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          Simular carrera →
        </div>
      )}
    </div>
  );
}

export default function CalendarPage({ onSelectRace }) {
  const [activeSeason, setActiveSeason] = useState(2025);
  const season = SEASONS[activeSeason];
  const completed = season.races.filter(r => r.completed);
  const upcoming = season.races.filter(r => !r.completed);

  // Champion (most wins)
  const winCount = {};
  completed.forEach(r => { if (r.winner) winCount[r.winner] = (winCount[r.winner] || 0) + 1; });
  const leader = Object.entries(winCount).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="page">
      {/* Season header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="season-header" style={{ marginBottom: 4 }}>
            <h1 className="season-title">Temporada {activeSeason}</h1>
            <span className="badge badge-gray">F1</span>
          </div>
          <p className="season-subtitle">
            {season.races.length} Grandes Premios · {completed.length} completados · {upcoming.length} por disputar
          </p>
        </div>

        {/* Season switch */}
        <div className="era-toggle">
          {[2025, 2024, 2023].map(y => (
            <button key={y} className={`era-btn ${activeSeason === y ? 'active' : ''}`} onClick={() => setActiveSeason(y)}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      {completed.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: '1 1 160px', minWidth: 0 }}>
            <div className="card-title">Líder de victorias</div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22 }}>{leader?.[0] || '—'}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>
                {leader?.[1] || 0} {leader?.[1] === 1 ? 'victoria' : 'victorias'}
              </div>
            </div>
          </div>
          <div className="card" style={{ flex: '1 1 160px', minWidth: 0 }}>
            <div className="card-title">Equipo más ganador</div>
            <div style={{ marginTop: 6 }}>
              {(() => {
                const tc = {};
                completed.forEach(r => { if (r.winnerTeam) tc[r.winnerTeam] = (tc[r.winnerTeam] || 0) + 1; });
                const top = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
                const team = MODERN_TEAMS.find(t => t.id === top?.[0]);
                return (
                  <>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22 }}>{team?.name || '—'}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, marginTop: 2, color: team?.color || 'var(--text-secondary)' }}>
                      {top?.[1] || 0} {top?.[1] === 1 ? 'victoria' : 'victorias'}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="card" style={{ flex: '1 1 160px', minWidth: 0 }}>
            <div className="card-title">Carreras disputadas</div>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22 }}>{completed.length}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                de {season.races.length} totales
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.1em', marginBottom: 12 }}>
            PRÓXIMAS CARRERAS
          </h3>
          <div className="race-grid" style={{ marginBottom: 24 }}>
            {upcoming.map(r => (
              <RaceCard key={r.round} race={r} season={activeSeason} onClick={(race) => onSelectRace(race, activeSeason)} />
            ))}
          </div>
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.1em', marginBottom: 12 }}>
            RESULTADOS {activeSeason}
          </h3>
          <div className="race-grid">
            {[...completed].reverse().map(r => (
              <RaceCard key={r.round} race={r} season={activeSeason} onClick={(race) => onSelectRace(race, activeSeason)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
