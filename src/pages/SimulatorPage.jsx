import React, { useEffect, useRef, useState, useCallback } from 'react';
import TrackSVG from '../components/TrackSVG';
import Leaderboard from '../components/Leaderboard';
import CommentaryFeed from '../components/CommentaryFeed';
import LapHistory from '../components/LapHistory';
import EventBanner from '../components/EventBanner';
import useRaceEngine from '../hooks/useRaceEngine';
import useReplay from '../hooks/useReplay';
import useCommentary from '../hooks/useCommentary';
import { CLASSIC_DRIVERS, MODERN_DRIVERS_2024, MODERN_DRIVERS_2025, MODERN_TEAMS } from '../data/drivers';
import { SESSION_KEYS_2024, SESSION_KEYS_2025 } from '../services/openf1';

const CLASSIC_DECADES = ['1950s', '1960s', '1970s'];

function getSessionKey(race, season) {
  if (!race) return null;
  if (season === 2024) return SESSION_KEYS_2024[race.round] || null;
  if (season === 2025) return SESSION_KEYS_2025[race.round] || null;
  return null;
}

export default function SimulatorPage({ era, season, race }) {
  const bannerRef = useRef(null);
  const [speedMult, setSpeedMult] = useState(3);
  const [decade, setDecade] = useState('1960s');
  const [commentary, setCommentary] = useState([]);

  const sessionKey = era === 'modern' && race?.completed ? getSessionKey(race, season) : null;
  const isReplayMode = !!sessionKey;

  const engine = useRaceEngine();
  const replay = useReplay();
  const { request: requestAI } = useCommentary({ era });

  const handleAIRequest = useCallback((prompt) => {
    const loadingId = Date.now();
    setCommentary(prev => [{ id: loadingId, text: '', type: 'loading', lap: 0 }, ...prev].slice(0, 20));
    requestAI(prompt, ({ loading, text }) => {
      if (!loading) {
        setCommentary(prev => prev.map(c =>
          c.id === loadingId ? { ...c, text, type: 'ai' } : c
        ));
      }
    });
  }, [requestAI]);

  const handleBanner = useCallback((msg) => {
    bannerRef.current?.show(msg);
  }, []);

  const initSimulation = useCallback(() => {
    const drivers = era === 'classic'
      ? (CLASSIC_DRIVERS[decade] || CLASSIC_DRIVERS['1960s'])
      : season === 2024 ? MODERN_DRIVERS_2024 : MODERN_DRIVERS_2025;
    const laps = era === 'modern' ? (race?.laps || 50) : 20;
    engine.init({ drivers, teamsMap: MODERN_TEAMS, laps, onCommentary: handleAIRequest, onBanner: handleBanner });
    setCommentary([{
      id: Date.now(),
      text: era === 'classic'
        ? `Era ${decade} — ${drivers.length} pilotos listos para largar.`
        : `${season} — ${race?.name || 'Gran Premio'} — ${laps} vueltas. Modo simulación.`,
      type: 'system', lap: 0,
    }]);
  }, [era, season, race, decade, engine, handleAIRequest, handleBanner]);

  const initReplay = useCallback(async () => {
    setCommentary([{ id: Date.now(), text: `Cargando datos de OpenF1 para ${race?.name || 'la carrera'}...`, type: 'system', lap: 0 }]);
    const ok = await replay.load({ sessionKey, onBanner: handleBanner, onCommentary: handleAIRequest });
    if (!ok) {
      setCommentary(prev => [{ id: Date.now(), text: 'OpenF1 no disponible — usando simulación.', type: 'system', lap: 0 }, ...prev]);
      initSimulation();
    } else {
      setCommentary(prev => [{ id: Date.now(), text: `Datos reales cargados. ${replay.totalLaps} vueltas. Presioná Reproducir.`, type: 'system', lap: 0 }, ...prev]);
    }
  }, [sessionKey, race, replay, handleBanner, handleAIRequest, initSimulation]);

  useEffect(() => {
    replay.reset();
    if (isReplayMode) initReplay();
    else initSimulation();
  // eslint-disable-next-line
  }, [era, season, race, decade]);

  const replayFailed = replay.phase === 'error';
  const useReplayData = isReplayMode && !replayFailed && replay.phase !== 'idle';

  const activeCars = useReplayData ? replay.cars : engine.cars;
  const activePhase = useReplayData ? replay.phase : engine.phase;
  const activeLap = useReplayData ? replay.currentLap : engine.currentLap;
  const activeTotalLaps = useReplayData ? replay.totalLaps : engine.totalLaps;
  const activeLapHistory = useReplayData ? replay.lapHistory : engine.lapHistory;
  const uiPhase = activePhase === 'replaying' ? 'racing' : activePhase;

  const handleStart = () => { if (useReplayData) replay.start(); else engine.start(); };
  const handlePause = () => { if (useReplayData) replay.togglePause(); else engine.togglePause(); };
  const handleRestart = () => { if (isReplayMode && !replayFailed) initReplay(); else initSimulation(); };
  const handleSpeed = (v) => {
    const n = parseInt(v); setSpeedMult(n);
    if (useReplayData) replay.setSpeed(n); else engine.setSpeed(n);
  };

  const mergedCommentary = [...commentary, ...(useReplayData ? [] : engine.commentaryList)]
    .sort((a, b) => b.id - a.id).slice(0, 20);

  const raceTitle = era === 'classic' ? `Simulación — Era ${decade}` : race?.name || 'Gran Premio';
  const modeLabel = useReplayData ? 'REPLAY REAL' : 'SIMULACIÓN';
  const modeBadgeCls = useReplayData ? 'badge-green' : 'badge-gray';

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: '.02em', lineHeight: 1 }}>
            {raceTitle}
          </h2>
          {era === 'modern' && race && (
            <span className="badge badge-red" style={{ fontSize: 11 }}>{season} · Ronda {race.round}</span>
          )}
          {era === 'classic' && <span className="badge badge-classic">ERA CLÁSICA</span>}
          <span className={`badge ${modeBadgeCls}`} style={{ fontSize: 10 }}>{modeLabel}</span>
        </div>

        {era === 'classic' && uiPhase === 'idle' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {CLASSIC_DECADES.map(d => (
              <button key={d} className={`btn ${decade === d ? 'btn-primary' : ''}`}
                style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setDecade(d)}>{d}</button>
            ))}
          </div>
        )}
        {activePhase === 'loading' && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>Conectando con OpenF1...</div>
        )}
      </div>

      <div className="simulator-layout">
        <div className="sim-left">
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="race-controls">
              {(uiPhase === 'idle' || uiPhase === 'ready') && (
                <button className="btn btn-primary" onClick={handleStart} disabled={activePhase === 'loading'}>
                  {useReplayData ? '▶ Reproducir' : '🏁 Largar'}
                </button>
              )}
              {(uiPhase === 'racing' || uiPhase === 'paused') && (
                <>
                  <button className="btn" onClick={handlePause}>{uiPhase === 'paused' ? '▶ Continuar' : '⏸ Pausa'}</button>
                  <button className="btn btn-ghost" onClick={handleRestart}>↺ Reiniciar</button>
                </>
              )}
              {uiPhase === 'finished' && (
                <button className="btn" onClick={handleRestart}>↺ {useReplayData ? 'Ver de nuevo' : 'Nueva carrera'}</button>
              )}
              <div className="speed-control">
                <span>Vel.</span>
                <input type="range" min="1" max="10" step="1" value={speedMult}
                  onChange={e => handleSpeed(e.target.value)}
                  disabled={uiPhase === 'finished' || activePhase === 'loading'} />
                <span>{speedMult}x</span>
              </div>
              <span className="race-stat">Vuelta <b>{activeLap}</b> / <b>{activeTotalLaps}</b></span>
              {!useReplayData && <span className="race-stat">Clima <b>{engine.weather}</b></span>}
            </div>
          </div>

          <div className="card track-container" style={{ padding: 0 }}>
            <TrackSVG cars={activeCars} phase={uiPhase} />
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Historial de vueltas</span></div>
            <LapHistory rows={activeLapHistory} />
          </div>
        </div>

        <div className="sim-right">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Posiciones</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)' }}>
                {activeCars.filter(c => c.status !== 'retired').length} activos
              </span>
            </div>
            <Leaderboard cars={activeCars} />
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Comentarios</span>
              <span className="badge badge-amber" style={{ fontSize: 9 }}>IA</span>
            </div>
            <CommentaryFeed items={mergedCommentary} />
          </div>

          {useReplayData && replay.incidents?.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Incidentes de carrera</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
                {replay.incidents.slice(0, 10).map((inc, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--text-muted)', marginRight: 8 }}>V{inc.lap}</span>
                    {inc.flag} — {inc.message?.slice(0, 60)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <EventBanner ref={bannerRef} />
    </div>
  );
}
