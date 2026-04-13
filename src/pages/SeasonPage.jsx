import React, { useState } from 'react';
import { SEASONS, MODERN_TEAMS, getTeamColor, FLAGS } from '../data/drivers';

// 2024 and 2025 only — pure information, no replay
const INFO_SEASONS = [2025, 2024];

function RaceCard({ race, season, onClick }) {
  const teamColor = race.winnerTeam ? getTeamColor(race.winnerTeam) : 'var(--red)';
  const flag = FLAGS[race.country] || '';
  const date = new Date(race.date);
  const dateStr = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const today = new Date();
  const isNext = !race.completed && date >= today && date <= new Date(today.getTime() + 30 * 86400000);

  return (
    <div
      className={`race-card ${race.completed ? 'completed' : ''} ${isNext ? 'next' : ''}`}
      style={{ '--team-color': teamColor, cursor: race.completed ? 'pointer' : 'default' }}
      onClick={() => race.completed && onClick(race)}
    >
      <div className="race-round">
        {flag} RONDA {race.round} · {dateStr}
        {isNext && <span className="badge badge-red" style={{ marginLeft: 8, fontSize: 9 }}>PRÓXIMA</span>}
      </div>
      <div className="race-name">
        {race.name.replace('Gran Premio de ', '').replace('Gran Premio del ', '')}
      </div>
      <div className="race-meta">
        <span>{race.circuit}</span>
        <span>{race.laps} vueltas</span>
      </div>
      {race.completed && race.winner && (
        <div className="race-winner">
          🏆 <b>{race.winner}</b> — {MODERN_TEAMS.find(t => t.id === race.winnerTeam)?.name || ''}
        </div>
      )}
      {!race.completed && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
          Pendiente
        </div>
      )}
    </div>
  );
}

function RaceDetail({ race, season, onClose }) {
  const team = MODERN_TEAMS.find(t => t.id === race.winnerTeam);
  const date = new Date(race.date).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="card" style={{ marginBottom: 20, borderColor: getTeamColor(race.winnerTeam) + '55' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, lineHeight: 1, marginBottom: 6 }}>
            {race.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onClose}>✕ Cerrar</button>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 140px', padding: '10px 14px' }}>
          <div className="card-title">Ganador</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 4 }}>{race.winner}</div>
          <div style={{ fontSize: 12, color: team?.color || 'var(--text-secondary)', marginTop: 2 }}>{team?.name}</div>
        </div>
        <div className="card" style={{ flex: '1 1 140px', padding: '10px 14px' }}>
          <div className="card-title">Circuito</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 4 }}>{race.circuit}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{FLAGS[race.country]} {race.country}</div>
        </div>
        <div className="card" style={{ flex: '1 1 140px', padding: '10px 14px' }}>
          <div className="card-title">Vueltas</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 4 }}>{race.laps}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Temporada {season}</div>
        </div>
      </div>
    </div>
  );
}

export default function SeasonPage({ selectedRace, selectedSeason, onSelectRace }) {
  const [activeSeason, setActiveSeason] = useState(selectedSeason || 2025);
  const [detailRace, setDetailRace] = useState(null);

  const season = SEASONS[activeSeason];
  const completed = season.races.filter(r => r.completed);
  const upcoming  = season.races.filter(r => !r.completed);

  const winCount = {};
  completed.forEach(r => { if (r.winner) winCount[r.winner] = (winCount[r.winner] || 0) + 1; });
  const leader = Object.entries(winCount).sort((a, b) => b[1] - a[1])[0];

  const teamCount = {};
  completed.forEach(r => { if (r.winnerTeam) teamCount[r.winnerTeam] = (teamCount[r.winnerTeam] || 0) + 1; });
  const topTeam = Object.entries(teamCount).sort((a, b) => b[1] - a[1])[0];
  const topTeamData = MODERN_TEAMS.find(t => t.id === topTeam?.[0]);

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <h1 className="season-title">Temporada {activeSeason}</h1>
            <span className="badge badge-gray">F1</span>
          </div>
          <p className="season-subtitle">
            {season.races.length} Grandes Premios · {completed.length} completados · {upcoming.length} por disputar
          </p>
        </div>
        <div className="era-toggle">
          {INFO_SEASONS.map(y => (
            <button key={y} className={`era-btn ${activeSeason === y ? 'active' : ''}`} onClick={() => { setActiveSeason(y); setDetailRace(null); }}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Race detail panel */}
      {detailRace && (
        <RaceDetail race={detailRace} season={activeSeason} onClose={() => setDetailRace(null)} />
      )}

      {/* Quick stats */}
      {completed.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: '1 1 150px', minWidth: 0 }}>
            <div className="card-title">Líder victorias</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 6 }}>{leader?.[0] || '—'}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>
              {leader?.[1] || 0} {leader?.[1] === 1 ? 'victoria' : 'victorias'}
            </div>
          </div>
          <div className="card" style={{ flex: '1 1 150px', minWidth: 0 }}>
            <div className="card-title">Equipo dominante</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 6 }}>{topTeamData?.shortName || '—'}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: topTeamData?.color || 'var(--text-muted)', marginTop: 2 }}>
              {topTeam?.[1] || 0} victorias
            </div>
          </div>
          <div className="card" style={{ flex: '1 1 150px', minWidth: 0 }}>
            <div className="card-title">Completadas</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, marginTop: 6 }}>{completed.length}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              de {season.races.length} totales
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.1em', marginBottom: 12 }}>
            PRÓXIMAS CARRERAS
          </h3>
          <div className="race-grid" style={{ marginBottom: 24 }}>
            {upcoming.map(r => (
              <RaceCard key={r.round} race={r} season={activeSeason} onClick={() => {}} />
            ))}
          </div>
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <h3 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.1em', marginBottom: 12 }}>
            RESULTADOS {activeSeason}
          </h3>
          <div className="race-grid">
            {[...completed].reverse().map(r => (
              <RaceCard
                key={r.round}
                race={r}
                season={activeSeason}
                onClick={(race) => setDetailRace(detailRace?.round === race.round ? null : race)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
