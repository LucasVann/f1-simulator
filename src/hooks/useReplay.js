import { useState, useRef, useCallback } from 'react';
import { fetchReplayData } from '../services/openf1';

// Maps race position (1–20) to oval t (0–1), leader at front
function posToT(position, total) {
  return ((position - 1) / Math.max(total, 1)) * 0.82;
}

// Format lap duration (seconds float) → "1:32.456"
function formatLapTime(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}

// Format gap in seconds → "+3.241s" or "+1 lap"
function formatGap(seconds) {
  if (seconds == null) return '—';
  if (seconds < 0) return '—';
  if (seconds >= 90) return `+${Math.round(seconds / 90)} v`;
  return `+${seconds.toFixed(3)}s`;
}

export default function useReplay() {
  const [state, setState] = useState({
    phase: 'idle',   // idle | loading | ready | replaying | paused | finished | error
    loadingStep: '',
    cars: [],
    currentLap: 0,
    totalLaps: 0,
    lapHistory: [],  // one row per driver per lap
    incidents: [],
    fastestLap: null,
    errorMsg: null,
  });

  const dataRef = useRef(null);
  const tickRef = useRef(null);
  const lapRef = useRef(0);
  const speedMsRef = useRef(900);
  const phaseRef = useRef('idle');
  const bannerRef = useRef(null);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async ({ sessionKey, year, round, onBanner }) => {
    bannerRef.current = onBanner || null;
    phaseRef.current = 'loading';
    setState(s => ({ ...s, phase: 'loading', loadingStep: 'Iniciando...', errorMsg: null, cars: [], lapHistory: [] }));

    let data;
    try {
      data = await fetchReplayData(sessionKey, year, round, (step) => {
        setState(s => ({ ...s, loadingStep: step }));
      });
    } catch (err) {
      phaseRef.current = 'error';
      setState(s => ({ ...s, phase: 'error', loadingStep: '', errorMsg: err.message }));
      return false;
    }

    dataRef.current = data;
    lapRef.current = 0;

    // Build initial car list from starting grid
    const driverMap = {};
    data.drivers.forEach(d => { driverMap[d.driver_number] = d; });

    const total = data.startingGrid.length;
    const initialCars = data.startingGrid
      .sort((a, b) => a.position - b.position)
      .map(g => {
        const d = driverMap[g.driver_number] || {};
        return {
          id: g.driver_number,
          num: g.driver_number,
          name: d.name_acronym || `#${g.driver_number}`,
          fullName: d.full_name || '',
          team: d.team_name || '',
          color: d.team_colour || '#888888',
          pos: g.position,
          prevPos: g.position,
          t: posToT(g.position, total),
          status: 'racing',
          gap: g.position === 1 ? '—' : '',
          inPit: false,
          lastLapTime: null,
        };
      });

    phaseRef.current = 'ready';
    setState(s => ({
      ...s,
      phase: 'ready',
      loadingStep: '',
      cars: initialCars,
      currentLap: 0,
      totalLaps: data.maxLap,
      lapHistory: [],
      incidents: data.incidents || [],
      fastestLap: null,
    }));

    return true;
  }, []);

  // ── Apply one lap snapshot ─────────────────────────────────────────────────
  const applyLap = useCallback((lapNum) => {
    const data = dataRef.current;
    if (!data) return;

    const snapshot = data.lapSnapshots.find(s => s.lap === lapNum);
    if (!snapshot) return;

    const driverMap = {};
    data.drivers.forEach(d => { driverMap[d.driver_number] = d; });

    const total = snapshot.positions.length || 20;
    const posMap = {};
    snapshot.positions.forEach(p => { posMap[p.driver_number] = p; });

    // Pit stops this lap
    const pitsThisLap = new Set(
      Object.entries(data.pitStops)
        .filter(([, laps]) => laps.includes(lapNum))
        .map(([dn]) => parseInt(dn))
    );

    // Race control this lap
    const incidentsThisLap = data.incidents.filter(e => e.lap === lapNum);
    incidentsThisLap.forEach(e => {
      bannerRef.current?.(`🚩 ${e.flag}${e.message ? ': ' + e.message.slice(0, 50) : ''}`);
    });

    // Pit banners
    pitsThisLap.forEach(dn => {
      const d = driverMap[dn];
      bannerRef.current?.(`🔧 #${dn} ${d?.name_acronym || ''} → BOXES`);
    });

    // Build lap history rows — every driver with real lap time
    // lapsByDriver[dn] is array of lap objects from OpenF1
    const newRows = [];
    let fastestThisLap = null;

    snapshot.positions
      .sort((a, b) => a.position - b.position)
      .forEach(p => {
        const d = driverMap[p.driver_number] || {};
        const driverLaps = data.lapsByDriver[p.driver_number] || [];
        const lapData = driverLaps.find(l => l.lap_number === lapNum);
        const lapSec = lapData?.lap_duration || null;

        if (lapSec && (!fastestThisLap || lapSec < fastestThisLap.time)) {
          fastestThisLap = { time: lapSec, driver: d.name_acronym, dn: p.driver_number };
        }

        newRows.push({
          id: `${lapNum}-${p.driver_number}`,
          lap: lapNum,
          pos: p.position,
          driverNum: p.driver_number,
          name: d.name_acronym || `#${p.driver_number}`,
          team: d.team_name || '',
          color: d.team_colour || '#888',
          lapTime: lapSec,
          gap: p.position === 1 ? '—' : (p.gap_to_leader != null ? formatGap(p.gap_to_leader) : ''),
          inPit: pitsThisLap.has(p.driver_number),
          status: p.retired ? 'retired' : pitsThisLap.has(p.driver_number) ? 'pit' : 'racing',
        });
      });

    if (fastestThisLap) {
      bannerRef.current?.(`⚡ Vuelta rápida: ${fastestThisLap.driver} — ${formatLapTime(fastestThisLap.time)}`);
    }

    setState(prev => {
      const updatedCars = prev.cars.map(car => {
        const p = posMap[car.id];
        if (!p) return car;
        const driverLaps = data.lapsByDriver[car.id] || [];
        const lapData = driverLaps.find(l => l.lap_number === lapNum);
        return {
          ...car,
          prevPos: car.pos,
          pos: p.position,
          t: posToT(p.position, total),
          inPit: pitsThisLap.has(car.id),
          status: p.retired ? 'retired' : pitsThisLap.has(car.id) ? 'pit' : 'racing',
          gap: p.position === 1 ? '—' : (p.gap_to_leader != null ? formatGap(p.gap_to_leader) : prev.cars.find(c=>c.id===car.id)?.gap || ''),
          lastLapTime: lapData?.lap_duration || car.lastLapTime,
        };
      });

      const newFastest = fastestThisLap
        ? (prev.fastestLap == null || fastestThisLap.time < prev.fastestLap.time
          ? { time: fastestThisLap.time, driver: fastestThisLap.driver }
          : prev.fastestLap)
        : prev.fastestLap;

      return {
        ...prev,
        cars: updatedCars,
        currentLap: lapNum,
        fastestLap: newFastest,
        // prepend new lap rows (most recent first), keep last 200
        lapHistory: [...newRows, ...prev.lapHistory].slice(0, 200),
      };
    });
  }, []);

  // ── Tick ───────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const data = dataRef.current;
    if (!data || phaseRef.current !== 'replaying') return;

    lapRef.current += 1;
    const lapNum = lapRef.current;

    if (lapNum > data.maxLap) {
      clearInterval(tickRef.current);
      phaseRef.current = 'finished';
      setState(s => ({ ...s, phase: 'finished' }));
      bannerRef.current?.('🏁 Carrera finalizada');
      return;
    }

    applyLap(lapNum);
  }, [applyLap]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    phaseRef.current = 'replaying';
    setState(s => ({ ...s, phase: 'replaying' }));
    tickRef.current = setInterval(tick, speedMsRef.current);
  }, [tick]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'replaying') {
      clearInterval(tickRef.current);
      phaseRef.current = 'paused';
      setState(s => ({ ...s, phase: 'paused' }));
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'replaying';
      setState(s => ({ ...s, phase: 'replaying' }));
      tickRef.current = setInterval(tick, speedMsRef.current);
    }
  }, [tick]);

  const setSpeed = useCallback((mult) => {
    speedMsRef.current = Math.round(1400 / mult);
    if (phaseRef.current === 'replaying') {
      clearInterval(tickRef.current);
      tickRef.current = setInterval(tick, speedMsRef.current);
    }
  }, [tick]);

  // Jump to specific lap
  const seekToLap = useCallback((targetLap) => {
    const data = dataRef.current;
    if (!data) return;
    const wasPlaying = phaseRef.current === 'replaying';
    if (wasPlaying) clearInterval(tickRef.current);
    lapRef.current = targetLap - 1;
    applyLap(targetLap);
    if (wasPlaying) {
      tickRef.current = setInterval(tick, speedMsRef.current);
    }
  }, [applyLap, tick]);

  const reset = useCallback(() => {
    clearInterval(tickRef.current);
    phaseRef.current = 'idle';
    lapRef.current = 0;
    dataRef.current = null;
    setState({ phase: 'idle', loadingStep: '', cars: [], currentLap: 0, totalLaps: 0, lapHistory: [], incidents: [], fastestLap: null, errorMsg: null });
  }, []);

  return { ...state, load, start, togglePause, setSpeed, seekToLap, reset };
}
