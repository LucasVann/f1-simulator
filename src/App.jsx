import React, { useState } from 'react';
import SeasonPage from './pages/SeasonPage';
import ReplayPage from './pages/ReplayPage';
import StatsPage from './pages/StatsPage';

const PAGES = [
  { id: 'temporadas', label: 'Temporadas' },
  { id: 'replay',     label: 'Replay' },
  { id: 'stats',      label: 'Estadísticas' },
];

export default function App() {
  const [page, setPage]               = useState('temporadas');
  const [selectedRace, setSelectedRace]   = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(2025);

  const goToReplay = (race) => {
    setSelectedRace(race);
    setPage('replay');
  };

  const goToSeason = (race, season) => {
    setSelectedRace(race);
    setSelectedSeason(season);
    setPage('temporadas');
  };

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <a
          className="nav-logo"
          href="#"
          onClick={e => { e.preventDefault(); setPage('temporadas'); }}
        >
          F1<span>HUB</span>
        </a>

        <ul className="nav-links">
          {PAGES.map(p => (
            <li key={p.id}>
              <button
                className={`nav-link ${page === p.id ? 'active' : ''}`}
                onClick={() => setPage(p.id)}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Context info in nav */}
        {page === 'replay' && selectedRace && (
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            2023 · R{selectedRace.round} · {selectedRace.circuit}
          </div>
        )}
        {page === 'temporadas' && (
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            2024 – 2025
          </div>
        )}
      </nav>

      <main>
        {page === 'temporadas' && (
          <SeasonPage
            selectedRace={selectedRace}
            selectedSeason={selectedSeason}
            onSelectRace={goToSeason}
          />
        )}
        {page === 'replay' && (
          <ReplayPage race={selectedRace} />
        )}
        {page === 'stats' && (
          <StatsPage />
        )}
      </main>
    </div>
  );
}
