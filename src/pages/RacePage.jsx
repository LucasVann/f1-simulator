import React, { useEffect, useRef, useState, useCallback } from 'react';
import TrackSVG from '../components/TrackSVG';
import Leaderboard from '../components/Leaderboard';
import LapHistory from '../components/LapHistory';
import EventBanner from '../components/EventBanner';
import useReplay from '../hooks/useReplay';

export default function RacePage({ race, season }) {
  const bannerRef = useRef(null);
  const [speedMult, setSpeedMult] = useState(3);

  const replay = useReplay();

  const handleBanner = useCallback((msg) => {
    bannerRef.current?.show(msg);
  }, []);

  // Load whenever race/season changes
  useEffect(() => {
    if (!race) return;
    replay.reset();
    replay.load({
      sessionKey: race.sessionKey || null,
      year: season,
      round: race.round,
      onBanner: handleBanner,
    });
  }, [race?.round, season]); // eslint-disable-line

  const handleSpeed = (v) => {
    const n = parseInt(v);
    setSpeedMult(n);
    replay.setSpeed(n);
  };

  const isPlaying = replay.phase === 'replaying';
  const canStart  = replay.phase === 'ready';
  const canSeek   = replay.phase === 'replaying' || replay.phase === 'paused' || replay.phase === 'finished';

  // Maps each loading step label to a progress percentage for the bar
  const STEP_PCT = {
    'Iniciando...':        5,
    'Buscando sesión...': 12,
    'Tiempos de vuelta...': 35,
    'Pilotos y equipos...': 58,
    'Pit stops...':        72,
    'Race control...':     85,
    'Procesando datos...': 95,
  };
  function loadingPct(step) {
    return STEP_PCT[step] ?? 5;
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: '.02em', lineHeight: 1 }}>
          {race?.name || 'Seleccioná una carrera'}
        </h2>
        {race && (
          <>
            <span className="badge badge-red" style={{ fontSize: 11 }}>
              {season} · Ronda {race.round}
            </span>
            <span className="badge badge-gray" style={{ fontSize: 10 }}>
              {race.circuit}
            </span>
          </>
        )}
      </div>

      {/* No race selected */}
      {!race && (
        <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '40px 0' }}>
          Elegí una carrera desde el Calendario para ver su replay.
        </div>
      )}

      {/* Loading state */}
      {race && replay.phase === 'loading' && (
        <div className="card" style={{ padding: 28, maxWidth: 420 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '.04em', marginBottom: 16, color: 'var(--text-secondary)' }}>
            Cargando datos de OpenF1
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{
              height: '100%',
              background: 'var(--red)',
              borderRadius: 2,
              width: loadingPct(replay.loadingStep) + '%',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            {replay.loadingStep || 'Iniciando...'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>
            Las solicitudes se envían de a una para respetar el límite de OpenF1 (3 req/s).
          </div>
        </div>
      )}

      {/* Error state */}
      {replay.phase === 'error' && (
        <div className="card" style={{ borderColor: 'var(--red)', padding: 20, maxWidth: 420 }}>
          <div style={{ color: 'var(--red)', fontWeight: 500, marginBottom: 6 }}>No se pudieron cargar los datos</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{replay.errorMsg}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            OpenF1 tiene datos desde la temporada 2023. Si el error persiste, esperá unos segundos y volvé a intentar.
          </div>
          <button
            className="btn"
            style={{ marginTop: 14, fontSize: 12 }}
            onClick={() => replay.load({ sessionKey: race.sessionKey || null, year: season, round: race.round, onBanner: handleBanner })}
          >
            Reintentar
          </button>
        </div>
      )}

      {race && replay.phase !== 'error' && replay.phase !== 'loading' && replay.phase !== 'idle' && (
        <div className="simulator-layout">
          {/* LEFT */}
          <div className="sim-left">
            {/* Controls */}
            <div className="card" style={{ padding: '10px 14px' }}>
              <div className="race-controls">
                {/* Loading */}
                {replay.phase === 'loading' && (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Cargando datos de OpenF1...
                  </span>
                )}

                {/* Play button */}
                {canStart && (
                  <button className="btn btn-primary" onClick={() => replay.start()}>
                    ▶ Reproducir
                  </button>
                )}

                {/* Pause / resume */}
                {(isPlaying || replay.phase === 'paused') && (
                  <button className="btn" onClick={() => replay.togglePause()}>
                    {isPlaying ? '⏸ Pausa' : '▶ Continuar'}
                  </button>
                )}

                {/* Restart */}
                {(replay.phase === 'paused' || replay.phase === 'finished') && (
                  <button className="btn btn-ghost" onClick={() => {
                    replay.reset();
                    replay.load({ sessionKey: race.sessionKey || null, year: season, round: race.round, onBanner: handleBanner });
                  }}>
                    ↺ Reiniciar
                  </button>
                )}

                {/* Finished */}
                {replay.phase === 'finished' && (
                  <span className="badge badge-green">🏁 Finalizada</span>
                )}

                {/* Speed */}
                <div className="speed-control">
                  <span>Vel.</span>
                  <input
                    type="range" min="1" max="20" step="1" value={speedMult}
                    onChange={e => handleSpeed(e.target.value)}
                    disabled={replay.phase === 'loading' || replay.phase === 'idle'}
                  />
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

              {/* Lap scrubber */}
              {canSeek && replay.totalLaps > 0 && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>V1</span>
                  <input
                    type="range" min="1" max={replay.totalLaps} value={replay.currentLap}
                    onChange={e => replay.seekToLap(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>V{replay.totalLaps}</span>
                </div>
              )}
            </div>

            {/* Track */}
            <div className="card track-container" style={{ padding: 0 }}>
              <TrackSVG cars={replay.cars} phase={replay.phase === 'replaying' ? 'racing' : replay.phase} />
            </div>

            {/* Incidents panel */}
            {replay.incidents?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Incidentes de carrera</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)' }}>
                    {replay.incidents.length} eventos
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 140, overflowY: 'auto' }}>
                  {replay.incidents.map((inc, i) => (
                    <div key={i} style={{
                      fontSize: 12, color: 'var(--text-secondary)',
                      padding: '5px 2px',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', gap: 10, alignItems: 'baseline',
                    }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        V{inc.lap}
                      </span>
                      <span style={{ color: inc.flag === 'RED FLAG' ? 'var(--red)' : inc.flag === 'SAFETY CAR' ? 'var(--amber)' : 'var(--text-secondary)' }}>
                        {inc.flag}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {inc.message?.slice(0, 70)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="sim-right">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Posiciones — Vuelta {replay.currentLap}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)' }}>
                  {replay.cars.filter(c => c.status !== 'retired').length} en carrera
                </span>
              </div>
              <Leaderboard cars={replay.cars} showLapTime />
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Tiempos de vuelta</span>
              </div>
              <LapHistory rows={replay.lapHistory} />
            </div>
          </div>
        </div>
      )}

      <EventBanner ref={bannerRef} />
    </div>
  );
}

function formatLapTime(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}
