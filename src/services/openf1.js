// ─── OpenF1 API service ────────────────────────────────────────────────────────
// Historical data (2023+) is free, no auth required.
// Docs: https://openf1.org/docs  |  Rate limit: 3 req/s, 30 req/min
//
// Confirmed endpoints used (from official docs):
//   /sessions       → session_key lookup
//   /laps           → lap_duration, date_start, is_pit_out_lap, driver_number, lap_number
//   /pit            → driver_number, lap_number, pit_duration
//   /drivers        → driver_number, name_acronym, full_name, team_name, team_colour
//   /race_control   → flag, message, lap_number

const BASE = 'https://api.openf1.org/v1';
const cache = new Map();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Fetch with automatic retry on 429 (rate limit exceeded).
async function get(endpoint, params = {}, retries = 3) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${endpoint}${qs ? '?' + qs : ''}`;
  if (cache.has(url)) return cache.get(url);

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`No se pudo conectar con OpenF1. Verificá tu conexión a internet. (${e.message})`);
  }

  if (res.status === 429) {
    if (retries <= 0) throw new Error('OpenF1 está limitando las solicitudes. Esperá unos segundos e intentá de nuevo.');
    await sleep(2000);
    return get(endpoint, params, retries - 1);
  }

  if (!res.ok) {
    throw new Error(`OpenF1 respondió con error ${res.status} para ${endpoint}`);
  }

  const data = await res.json();
  cache.set(url, data);
  return data;
}

// Optional fetch — returns [] instead of throwing on error
async function getOptional(endpoint, params = {}) {
  try {
    return await get(endpoint, params);
  } catch {
    return [];
  }
}

// Sequential fetch with 400ms pause between each to respect 3 req/s limit.
// onStep(label) is called before each fetch for progress UI.
async function getSequential(requests, onStep) {
  const results = [];
  for (const { fn, label } of requests) {
    if (onStep) onStep(label);
    results.push(await fn());
    await sleep(400);
  }
  return results;
}

// ── Sessions ───────────────────────────────────────────────────────────────────
export async function getRaceSession(year, round) {
  const sessions = await get('/sessions', { year, session_name: 'Race' });
  if (!sessions?.length) return null;
  const sorted = sessions.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  return sorted[round - 1] || null;
}

// Resolve session_key: use hardcoded value if provided, else fetch dynamically.
export async function resolveSessionKey(sessionKey, year, round) {
  if (sessionKey) return sessionKey;
  const session = await getRaceSession(year, round);
  return session?.session_key || null;
}

// ─── High-level: fetch everything needed for a replay ────────────────────────
// sessionKey can be null — year+round are used to look it up dynamically.
// onStep(label) is called before each request for loading progress UI.
// Requests are sequential with 400ms pause to respect the 3 req/s rate limit.
//
// Endpoints used (3 required + 2 optional):
//   Required: /laps, /drivers
//   Optional: /pit, /race_control  (return [] if unavailable — don't block load)
//   NOT used: /starting_grid (unreliable for 2023), /position, /intervals (too heavy)
//   Starting grid is derived from lap 1 cumulative times instead.
export async function fetchReplayData(sessionKey, year, round, onStep) {
  try {
    if (onStep) onStep('Buscando sesión...');
    const key = await resolveSessionKey(sessionKey, year, round);
    if (!key) {
      throw new Error(`No se encontró sesión para ${year} ronda ${round} en OpenF1.`);
    }

    const [laps, drivers, pits, raceControl] = await getSequential([
      { label: 'Tiempos de vuelta...',  fn: () => get('/laps', { session_key: key }) },
      { label: 'Pilotos y equipos...', fn: () => get('/drivers', { session_key: key }) },
      { label: 'Pit stops...',          fn: () => getOptional('/pit', { session_key: key }) },
      { label: 'Race control...',        fn: () => getOptional('/race_control', { session_key: key }) },
    ], onStep);

    if (!laps?.length) {
      throw new Error('OpenF1 no tiene datos de vueltas para esta carrera. Puede que los datos no estén disponibles aún.');
    }

    if (onStep) onStep('Procesando datos...');

    // ── Group laps by driver ───────────────────────────────────────────────────
    const lapsByDriver = {};
    for (const lap of laps) {
      const dn = lap.driver_number;
      if (!lapsByDriver[dn]) lapsByDriver[dn] = [];
      lapsByDriver[dn].push(lap);
    }

    const allDriverNums = [...new Set(laps.map(l => l.driver_number))];
    const maxLap = Math.max(...laps.map(l => l.lap_number));

    // ── Build cumulative race time per driver per lap ──────────────────────────
    // Used to rank positions and calculate gaps — no /position endpoint needed.
    const cumTime = {};
    for (const dn of allDriverNums) {
      let total = 0;
      cumTime[dn] = {};
      const sorted = (lapsByDriver[dn] || []).sort((a, b) => a.lap_number - b.lap_number);
      for (const l of sorted) {
        if (l.lap_duration) {
          total += l.lap_duration;
          cumTime[dn][l.lap_number] = total;
        }
      }
    }

    // ── Derive starting grid from lap 1 cumulative times ──────────────────────
    // More reliable than /starting_grid which is missing for many 2023 sessions.
    const lap1Times = allDriverNums
      .map(dn => ({ dn, t: cumTime[dn]?.[1] }))
      .filter(x => x.t != null)
      .sort((a, b) => a.t - b.t);

    const startingGrid = lap1Times.map((x, i) => ({
      driver_number: x.dn,
      position: i + 1,
    }));

    // ── Pit stop map ──────────────────────────────────────────────────────────
    const pitStops = {};
    for (const pit of (pits || [])) {
      const dn = pit.driver_number;
      if (!pitStops[dn]) pitStops[dn] = [];
      pitStops[dn].push(pit.lap_number);
    }

    // ── Race control incidents ─────────────────────────────────────────────────
    // flag values from docs: 'SAFETY CAR', 'VIRTUAL SAFETY CAR', 'RED FLAG', 'YELLOW FLAG'
    const incidents = (raceControl || [])
      .filter(e => ['SAFETY CAR', 'VIRTUAL SAFETY CAR', 'RED FLAG', 'YELLOW FLAG'].includes(e.flag))
      .map(e => ({ flag: e.flag, message: e.message, lap: e.lap_number }));

    // ── Build per-lap position snapshots ──────────────────────────────────────
    // Rank all drivers by cumulative time at each lap.
    // Drivers missing from a lap (retired/not yet classified) get last positions.
    const lapSnapshots = [];
    const lastKnownPos = {};

    for (let lapNum = 1; lapNum <= maxLap; lapNum++) {
      const finished = [];
      const notFinished = [];

      for (const dn of allDriverNums) {
        const t = cumTime[dn]?.[lapNum];
        if (t != null) {
          finished.push({ dn, t });
        } else {
          notFinished.push(dn);
        }
      }

      finished.sort((a, b) => a.t - b.t);
      const leaderTime = finished[0]?.t ?? null;

      const positions = [];
      let pos = 1;

      for (const { dn, t } of finished) {
        const gap = pos === 1 ? 0 : parseFloat((t - leaderTime).toFixed(3));
        const lapped = gap > 120; // >120s gap = at least 1 lap down
        positions.push({ driver_number: dn, position: pos, gap_to_leader: lapped ? null : gap, lapped, retired: false });
        lastKnownPos[dn] = pos;
        pos++;
      }

      for (const dn of notFinished) {
        const driverLaps = lapsByDriver[dn] || [];
        const lastLap = driverLaps.length ? Math.max(...driverLaps.map(l => l.lap_number)) : 0;
        const retired = lastLap > 0 && lastLap < lapNum - 1;
        positions.push({ driver_number: dn, position: pos, gap_to_leader: null, lapped: false, retired });
        lastKnownPos[dn] = pos;
        pos++;
      }

      lapSnapshots.push({ lap: lapNum, positions });
    }

    // ── Driver map ─────────────────────────────────────────────────────────────
    const driverList = (drivers || []).map(d => ({
      driver_number: d.driver_number,
      name_acronym: d.name_acronym,
      full_name: d.full_name,
      team_name: d.team_name,
      // team_colour comes without # from OpenF1
      team_colour: d.team_colour ? '#' + d.team_colour : '#888888',
    }));

    return { sessionKey: key, maxLap, drivers: driverList, startingGrid, lapSnapshots, lapsByDriver, pitStops, incidents };

  } catch (err) {
    console.warn('OpenF1 replay fetch failed:', err.message);
    throw err;
  }
}

// ─── Jolpica-F1 (Ergast replacement) — historical data 1950-2024 ─────────────
const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const jolpicaCache = new Map();

async function jolpicaGet(path) {
  const url = `${JOLPICA_BASE}${path}.json?limit=100`;
  if (jolpicaCache.has(url)) return jolpicaCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Jolpica ${res.status}`);
  const data = await res.json();
  jolpicaCache.set(url, data);
  return data;
}

export async function getSeasonResults(year) {
  try {
    const data = await jolpicaGet(`/${year}/results`);
    return data?.MRData?.RaceTable?.Races || [];
  } catch { return []; }
}

export async function getRaceResult(year, round) {
  try {
    const data = await jolpicaGet(`/${year}/${round}/results`);
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) return null;
    return {
      raceName: race.raceName,
      circuit: race.Circuit?.circuitName,
      date: race.date,
      results: race.Results.map(r => ({
        position: parseInt(r.position),
        driver: `${r.Driver.givenName[0]}. ${r.Driver.familyName}`,
        driverId: r.Driver.driverId,
        team: r.Constructor.name,
        laps: parseInt(r.laps),
        status: r.status,
        fastestLap: r.FastestLap?.Time?.time,
        grid: parseInt(r.grid),
        points: parseFloat(r.points),
      })),
    };
  } catch { return null; }
}

export async function getDriverStandings(year) {
  try {
    const data = await jolpicaGet(`/${year}/driverStandings`);
    return data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  } catch { return []; }
}

export async function getConstructorStandings(year) {
  try {
    const data = await jolpicaGet(`/${year}/constructorStandings`);
    return data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
  } catch { return []; }
}
