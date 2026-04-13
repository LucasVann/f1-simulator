import { useState, useRef, useCallback } from 'react';
import { getTeamColor } from '../data/drivers';

// ── Track path: parametric oval position ──────────────────────────────────────
export function trackPos(t, cx = 280, cy = 150, rx = 230, ry = 118) {
  const a = t * Math.PI * 2 - Math.PI / 2;
  return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
}

// ── Gaussian noise ─────────────────────────────────────────────────────────────
function gauss(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Build car state from driver data ──────────────────────────────────────────
function buildCars(drivers, teamsMap) {
  return drivers.map((d, i) => {
    const color = d.color || (teamsMap ? getTeamColor(d.team) : '#888');
    const baseSpeed = 0.0020 + (d.skill || 0.85) * 0.0006;
    return {
      id: d.id || i,
      name: d.name,
      num: d.num,
      team: d.team || null,
      color,
      skill: d.skill || 0.85,
      // track position (0–1 around oval), staggered
      t: (i * (1 / drivers.length)) % 1,
      tLap: 0,           // completed laps
      baseSpeed,
      speed: baseSpeed,
      status: 'racing',  // 'racing' | 'pit' | 'slow' | 'retired'
      gap: '—',
      pos: i + 1,
      prevPos: i + 1,
      incidents: 0,
      lapTimes: [],
      pitLap: Math.floor(8 + Math.random() * 10),
      pitDone: false,
      inPit: false,
      pitTimer: 0,
    };
  });
}

// ── Deterministic first-lap ordering ─────────────────────────────────────────
function rankCars(cars) {
  return [...cars].sort((a, b) => {
    if (b.tLap !== a.tLap) return b.tLap - a.tLap;
    // compare track position (wrap-around safe)
    const ta = a.t, tb = b.t;
    return tb - ta;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
export default function useRaceEngine() {
  const [cars, setCars] = useState([]);
  const [phase, setPhase] = useState('idle');   // idle | racing | paused | finished
  const [currentLap, setCurrentLap] = useState(0);
  const [totalLaps, setTotalLaps] = useState(20);
  const [weather, setWeather] = useState('Soleado');
  const [commentaryList, setCommentaryList] = useState([]);
  const [lapHistory, setLapHistory] = useState([]);
  const [events, setEvents] = useState([]);

  const carsRef = useRef([]);
  const tickRef = useRef(null);
  const lapTimersRef = useRef([]);
  const weatherTimerRef = useRef(60000);
  const commentaryCooldownRef = useRef(0);
  const speedMsRef = useRef(180);
  const weatherRef = useRef('Soleado');
  const phaseRef = useRef('idle');
  const totalLapsRef = useRef(20);
  const onCommentaryRef = useRef(null);    // callback: (prompt, type) => void
  const bannerCallbackRef = useRef(null);  // callback: (msg) => void

  // ── Sync refs ──────────────────────────────────────────────────────────────
  const syncCars = (updated) => {
    carsRef.current = updated;
    setCars([...updated]);
  };

  // ── Init / Restart ─────────────────────────────────────────────────────────
  const init = useCallback(({ drivers, teamsMap, laps = 20, onCommentary, onBanner }) => {
    clearInterval(tickRef.current);
    const built = buildCars(drivers, teamsMap);
    carsRef.current = built;
    lapTimersRef.current = built.map(() => 0);
    weatherTimerRef.current = 60000;
    commentaryCooldownRef.current = 0;
    weatherRef.current = 'Soleado';
    phaseRef.current = 'idle';
    totalLapsRef.current = laps;
    onCommentaryRef.current = onCommentary || null;
    bannerCallbackRef.current = onBanner || null;

    setCars([...built]);
    setPhase('idle');
    setCurrentLap(0);
    setTotalLaps(laps);
    setWeather('Soleado');
    setCommentaryList([{
      id: Date.now(),
      text: 'Los motores están listos. La grilla aguarda la señal de largada.',
      type: 'system',
      lap: 0,
    }]);
    setLapHistory([]);
    setEvents([]);
  }, []);

  // ── Add commentary ─────────────────────────────────────────────────────────
  const addComment = useCallback((text, type = 'system') => {
    setCommentaryList(prev => [{
      id: Date.now() + Math.random(),
      text,
      type,
      lap: Math.max(...(carsRef.current.map(c => c.tLap) || [0])),
    }, ...prev].slice(0, 20));
  }, []);

  // ── Request AI commentary ──────────────────────────────────────────────────
  const requestAI = useCallback((prompt, type = 'event') => {
    if (commentaryCooldownRef.current > 0) return;
    commentaryCooldownRef.current = 10000;
    if (onCommentaryRef.current) {
      onCommentaryRef.current(prompt, type);
    }
  }, []);

  // ── Add lap history row ────────────────────────────────────────────────────
  const addLapRow = useCallback((car, timeMs, event) => {
    setLapHistory(prev => [{
      id: Date.now() + Math.random(),
      lap: car.tLap,
      driver: car.name,
      num: car.num,
      color: car.color,
      timeMs,
      event: event || '',
    }, ...prev].slice(0, 60));
  }, []);

  // ── Show banner ────────────────────────────────────────────────────────────
  const showBanner = useCallback((msg) => {
    if (bannerCallbackRef.current) bannerCallbackRef.current(msg);
  }, []);

  // ── Weather tick ──────────────────────────────────────────────────────────
  const tickWeather = useCallback((dt) => {
    weatherTimerRef.current -= dt;
    if (weatherTimerRef.current > 0) return;
    const opts = ['Soleado', 'Soleado', 'Soleado', 'Nublado', 'Lluvia', 'Viento'];
    const prev = weatherRef.current;
    const next = opts[Math.floor(Math.random() * opts.length)];
    weatherRef.current = next;
    weatherTimerRef.current = 35000 + Math.random() * 55000;
    setWeather(next);
    if (next !== prev && next !== 'Soleado' && next !== 'Nublado') {
      const msg = next === 'Lluvia' ? '🌧️ ¡Comienza la lluvia!' : '💨 ¡Viento fuerte en la pista!';
      showBanner(msg);
      requestAI(
        `El clima cambia a ${next} en vuelta ${Math.max(...carsRef.current.map(c => c.tLap))}. Comentario breve al estilo locutor F1 clásico.`,
        'weather'
      );
    }
  }, [showBanner, requestAI]);

  // ── Random events ─────────────────────────────────────────────────────────
  const tickEvents = useCallback(() => {
    const active = carsRef.current.filter(c => c.status === 'racing');
    if (!active.length || Math.random() > 0.997) return;

    const car = active[Math.floor(Math.random() * active.length)];
    const roll = Math.random();
    let eventMsg = '';

    if (roll < 0.35) {
      // Pinchazo
      car.speed = car.baseSpeed * 0.35;
      car.status = 'slow';
      car.incidents++;
      eventMsg = `🔴 Pinchazo: #${car.num} ${car.name}`;
      setTimeout(() => {
        if (car.status === 'slow') { car.speed = car.baseSpeed; car.status = 'racing'; }
      }, 7000);
    } else if (roll < 0.6) {
      // Adelantamiento
      car.t += 0.025;
      if (car.t >= 1) car.t -= 1;
      eventMsg = `⚡ Adelantamiento brillante: #${car.num} ${car.name}`;
    } else if (roll < 0.8) {
      // Motor problemático → posible abandono
      if (Math.random() > 0.55) {
        car.status = 'retired';
        car.speed = 0;
        car.baseSpeed = 0;
        eventMsg = `🔥 Abandono: motor de #${car.num} ${car.name}`;
        addLapRow(car, 0, '🔥 Abandono');
      } else {
        eventMsg = `💨 Humo en el #${car.num} ${car.name}`;
      }
    } else {
      // Vuelta rápida
      eventMsg = `⏱ Vuelta rápida: #${car.num} ${car.name}`;
      car.speed = car.baseSpeed * 1.04;
      setTimeout(() => { car.speed = car.baseSpeed; }, 3000);
    }

    showBanner(eventMsg);
    addLapRow(car, 0, eventMsg);
    requestAI(
      `${eventMsg} en la vuelta ${Math.max(...carsRef.current.map(c => c.tLap))} de ${totalLapsRef.current}. Dos oraciones dramáticas al estilo locutor F1 clásico.`,
      'event'
    );
  }, [addLapRow, showBanner, requestAI]);

  // ── Main tick ─────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    if (phaseRef.current !== 'racing') return;
    const dt = speedMsRef.current;
    commentaryCooldownRef.current = Math.max(0, commentaryCooldownRef.current - dt);
    lapTimersRef.current = lapTimersRef.current.map(t => t + dt);

    tickWeather(dt);
    tickEvents();

    const weatherMod = weatherRef.current === 'Lluvia' ? 0.84 : weatherRef.current === 'Viento' ? 0.93 : 1;
    let newLapCompleted = false;

    carsRef.current.forEach((car, i) => {
      if (car.status === 'retired') return;
      if (car.inPit) {
        car.pitTimer -= dt;
        if (car.pitTimer <= 0) { car.inPit = false; car.status = 'racing'; }
        return;
      }
      const noise = gauss(0, 0.00025);
      car.t += (car.speed + noise) * weatherMod;
      if (car.t >= 1) {
        car.t -= 1;
        car.tLap++;
        const lapTime = lapTimersRef.current[i];
        car.lapTimes.push(lapTime);
        lapTimersRef.current[i] = 0;
        addLapRow(car, lapTime, '');
        newLapCompleted = true;

        // Pit stop
        if (car.tLap === car.pitLap && !car.pitDone) {
          car.pitDone = true;
          car.inPit = true;
          car.status = 'pit';
          car.pitTimer = 3200 + Math.random() * 2200;
          showBanner(`🔧 #${car.num} ${car.name} → BOXES`);
          addLapRow(car, 0, '🔧 Pit stop');
          requestAI(
            `El auto #${car.num} de ${car.name} entra a boxes en vuelta ${car.tLap}. Comentario al estilo locutor F1 clásico.`,
            'pit'
          );
        }
      }
    });

    // Rank & gap
    const ranked = rankCars(carsRef.current);
    ranked.forEach((car, i) => {
      car.prevPos = car.pos;
      car.pos = i + 1;
      if (i > 0) {
        const leader = ranked[0];
        const lapDiff = leader.tLap - car.tLap;
        if (lapDiff > 0) {
          car.gap = `+${lapDiff}v`;
        } else {
          const raw = Math.abs(leader.t - car.t);
          const tDiff = Math.min(raw, 1 - raw);
          car.gap = `+${(tDiff * 42).toFixed(1)}s`;
        }
      } else {
        car.gap = '—';
      }
    });

    const maxLap = Math.max(...carsRef.current.map(c => c.tLap));
    setCurrentLap(maxLap);
    syncCars(carsRef.current);

    if (newLapCompleted && maxLap >= totalLapsRef.current) {
      phaseRef.current = 'finished';
      setPhase('finished');
      clearInterval(tickRef.current);
      const winner = carsRef.current.filter(c => c.status !== 'retired').sort((a, b) => a.pos - b.pos)[0];
      if (winner) {
        showBanner(`🏁 ¡${winner.name} (#${winner.num}) GANA!`);
        addComment(`🏁 CARRERA TERMINADA — Ganador: ${winner.name} (Auto #${winner.num})`, 'system');
        requestAI(
          `${winner.name} con el auto #${winner.num} gana la carrera después de ${totalLapsRef.current} vueltas. Comentario emocionado de cierre al estilo locutor F1 clásico.`,
          'finish'
        );
      }
    }
  }, [tickWeather, tickEvents, addLapRow, showBanner, requestAI, addComment]);

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (phaseRef.current !== 'idle') return;
    phaseRef.current = 'racing';
    setPhase('racing');
    addComment('¡LARGADA! Los motores rugen al unísono.', 'system');
    requestAI(
      `Acaba de darse la largada con ${carsRef.current.length} autos. Comentario dramático de bienvenida al estilo locutor F1 clásico.`,
      'start'
    );
    commentaryCooldownRef.current = 12000;
    tickRef.current = setInterval(tick, speedMsRef.current);
  }, [tick, addComment, requestAI]);

  // ── Pause / Resume ────────────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    if (phaseRef.current === 'racing') {
      phaseRef.current = 'paused';
      setPhase('paused');
      clearInterval(tickRef.current);
    } else if (phaseRef.current === 'paused') {
      phaseRef.current = 'racing';
      setPhase('racing');
      tickRef.current = setInterval(tick, speedMsRef.current);
    }
  }, [tick]);

  // ── Set speed ─────────────────────────────────────────────────────────────
  const setSpeed = useCallback((mult) => {
    speedMsRef.current = Math.round(220 / mult);
    if (phaseRef.current === 'racing') {
      clearInterval(tickRef.current);
      tickRef.current = setInterval(tick, speedMsRef.current);
    }
  }, [tick]);

  return {
    cars,
    phase,
    currentLap,
    totalLaps,
    weather,
    commentaryList,
    lapHistory,
    init,
    start,
    togglePause,
    setSpeed,
    addComment,
    onCommentaryRef,
  };
}
