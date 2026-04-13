import React, { useState, useEffect, useRef, useCallback } from 'react';
import TrackSVG from '../components/TrackSVG';
import Leaderboard from '../components/Leaderboard';
import LapHistory from '../components/LapHistory';
import EventBanner from '../components/EventBanner';
import useReplay from '../hooks/useReplay';
import { SEASONS, FLAGS } from '../data/drivers';

// 2023 is the only replay season available via OpenF1 free tier
const REPLAY_SEASON = 2023;

const STEP_PCT = {
  'Iniciando...':         5,
  'Buscando sesión...':  12,
  'Tiempos de vuelta...': 35,
  'Pilotos y equipos...': 58,
  'Pit stops...':         72,
  'Race control...':      85,
  'Procesando datos...':  95,
};

function formatLapTime(s) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`;
}

function RaceListItem({ race, active, onClick }) {
  const flag = FLAGS[race.country] || '';
  const date = new Date(race.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return (
    <div
      onClick={() => onClick(race)}
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: active ? 'var(--bg-elevated)' : 'transparent',
        borderLeft: active ? '2px solid var(--red)' : '2px solid transparent',
        transition: 'background .15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>
          {flag} {race.name.replace('Gran Premio de ', '').replace('Gran Premio del ', '')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
          R{race.round}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        {race.winner && `🏆 ${race.winner}`} · {date}
      </div>
    </div>
  );
}

export default function ReplayPage({ race: initialRace }) {
  const season = SEASONS[REPLAY_SEASON];
  const [selectedRace, setSelectedRace] = useState(initialRace || null);
  const [speedMult, setSpeedMult] = useState(4);
  const bannerRef = useRef(null);
  const replay = useReplay();

  const handleBanner = useCallback((msg) => {
    bannerRef.current?.show(msg);
  }, []);

  // Load when race changes
  useEffect(() => {
    if (!selectedRace) return;
    replay.reset();
    replay.load({
      sessionKey: selectedRace.sessionKey || null,
      year: REPLAY_SEASON,
      round: selectedRace.round,
      onBanner: handleBanner,
    });
  }, [selectedRace?.round]); // eslint-disable-line

  const handleSelectRace = (race) => {
    setSelectedRace(race);
  };

  const handleSpeed = (v) => {
    const n = parseInt(v);
    setSpeedMult(n);
    replay.setSpeed(n);
  };

  const isPlaying = replay.phase === 'replaying';
  const canStart  = replay.phase === 'ready';
  const canSeek   = replay.phase === 'replaying' || replay.phase === 'paused' || replay.phase === 'finished';

  return (
    <div className="page" style={{ maxWidth: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: '.02em', lineHeight: 1 }}>
            Replay · Temporada 2023
          </h1>
          <span className="badge badge-gray" style={{ fontSize: 10 }}>OpenF1</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Seleccioná una carrera para ver la animación vuelta a vuelta con datos reales.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, alignItems: 'start' }}>
        {/* Race list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <span className="card-title">Carreras 2023</span>
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {season.races.map(r => (
              <RaceListItem
                key={r.round}
                race={r}
                active={selectedRace?.round === r.round}
                onClick={handleSelectRace}
              />
            ))}
          </div>
        </div>

        {/* Main content */}
        <div>
          {!selectedRace && (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '60px 0', textAlign: 'center' }}>
              ← Elegí una carrera de la lista
            </div>
          )}

          {/* Loading */}
          {selectedRace && replay.phase === 'loading' && (
            <div className="card" style={{ padding: 28 }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.04em', marginBottom: 16, color: 'var(--text-secondary)' }}>
                Cargando {selectedRace.name}
              </div>
              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{
                  height: '100%', background: 'var(--red)', borderRadius: 2,
                  width: (STEP_PCT[replay.loadingStep] ?? 5) + '%',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                {replay.loadingStep || 'Iniciando...'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Solicitudes secuenciales · límite 3 req/s
              </div>
            </div>
          )}

          {/* Error */}
          {selectedRace && replay.phase === 'error' && (
            <div className="card" style={{ borderColor: 'var(--red)', padding: 20 }}>
              <div style={{ color: 'var(--red)', fontWeight: 500, marginBottom: 6 }}>Error al cargar los datos</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{replay.errorMsg}</div>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => {
                replay.reset();
                replay.load({ sessionKey: selectedRace.sessionKey || null, year: REPLAY_SEASON, round: selectedRace.round, onBanner: handleBanner });
              }}>
                Reintentar
              </button>
            </div>
          )}

          {/* Replay UI */}
          {selectedRace && replay.phase !== 'error' && replay.phase !== 'loading' && replay.phase !== 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Race header */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24 }}>{selectedRace.name}</span>
                <span className="badge badge-red" style={{ fontSize: 10 }}>2023 · R{selectedRace.round}</span>
                {selectedRace.winner && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🏆 {selectedRace.winner}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10 }}>
                {/* Left: track + controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Controls */}
                  <div className="card" style={{ padding: '10px 14px' }}>
                    <div className="race-controls">
                      {canStart && (
                        <button className="btn btn-primary" onClick={() => replay.start()}>▶ Reproducir</button>
                      )}
                      {(isPlaying || replay.phase === 'paused') && (
                        <button className="btn" onClick={() => replay.togglePause()}>
                          {isPlaying ? '⏸ Pausa' : '▶ Continuar'}
                        </button>
                      )}
                      {(replay.phase === 'paused' || replay.phase === 'finished') && (
                        <button className="btn btn-ghost" onClick={() => {
                          replay.reset();
                          replay.load({ sessionKey: selectedRace.sessionKey || null, year: REPLAY_SEASON, round: selectedRace.round, onBanner: handleBanner });
                        }}>↺ Reiniciar</button>
                      )}
                      {replay.phase === 'finished' && (
                        <span className="badge badge-green">🏁 Finalizada</span>
                      )}
                      <div className="speed-control">
                        <span>Vel.</span>
                        <input type="range" min="1" max="20" step="1" value={speedMult}
                          onChange={e => handleSpeed(e.target.value)} />
                        <span>{speedMult}x</span>
                      </div>
                      <span className="race-stat">
                        Vuelta <b>{replay.currentLap}</b> / <b>{replay.totalLaps}</b>
                      </span>
                      {replay.fastestLap && (
                        <span className="race-stat" style={{ color: 'var(--amber)' }}>
                          ⚡ <b>{replay.fastestLap.driver}</b> {formatLapTime(replay.fastestLap.time)}
                        </span>
                      )}
                    </div>
                    {canSeek && replay.totalLaps > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>V1</span>
                        <input type="range" min="1" max={replay.totalLaps} value={replay.currentLap}
                          onChange={e => replay.seekToLap(parseInt(e.target.value))} style={{ flex: 1 }} />
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>V{replay.totalLaps}</span>
                      </div>
                    )}
                  </div>

                  {/* Track */}
                  <div className="card track-container" style={{ padding: 0 }}>
                    <TrackSVG cars={replay.cars} phase={isPlaying ? 'racing' : replay.phase} />
                  </div>

                  {/* Incidents */}
                  {replay.incidents?.length > 0 && (
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">Incidentes</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {replay.incidents.length}
                        </span>
                      </div>
                      <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                        {replay.incidents.map((inc, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'baseline' }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>V{inc.lap}</span>
                            <span style={{ color: inc.flag === 'RED FLAG' ? 'var(--red)' : 'var(--amber)' }}>{inc.flag}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{inc.message?.slice(0, 60)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: leaderboard + lap times */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Posiciones · V{replay.currentLap}</span>
                    </div>
                    <Leaderboard cars={replay.cars} />
                  </div>
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">Tiempos de vuelta</span>
                    </div>
                    <LapHistory rows={replay.lapHistory} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EventBanner ref={bannerRef} />
    </div>
  );
}
