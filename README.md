# F1 Race Simulator

Simulador de carreras de Fórmula 1 — eras clásica (años 50-70) y moderna (2024-2025).

## Stack

- React 18
- CSS custom (sin librerías UI)
- Anthropic API (comentarios generados por IA)
- Fuentes: Bebas Neue, IBM Plex Mono, Barlow (Google Fonts)

## Instalación

```bash
npm install
npm start
```

## Estructura del proyecto

```
src/
├── App.jsx                    # Shell principal + routing
├── styles.css                 # Design system completo
├── index.js                   # Entry point
├── data/
│   └── drivers.js             # Pilotos, equipos, calendarios 2024-2025
├── hooks/
│   ├── useRaceEngine.js       # Motor de simulación + física
│   └── useCommentary.js       # Integración Anthropic API
├── components/
│   ├── TrackSVG.jsx           # Pista animada SVG
│   ├── Leaderboard.jsx        # Tabla de posiciones en vivo
│   ├── CommentaryFeed.jsx     # Feed de comentarios IA
│   ├── LapHistory.jsx         # Historial de vueltas
│   └── EventBanner.jsx        # Banners de eventos flotantes
└── pages/
    ├── CalendarPage.jsx       # Calendario de temporadas
    ├── SimulatorPage.jsx      # Vista del simulador
    └── StatsPage.jsx          # Estadísticas por piloto/equipo
```

## Páginas

### Calendario
- Temporadas 2024 y 2025
- Resultados reales de carreras completadas
- Click en cualquier carrera → abre el simulador con esa carrera

### Simulador
- **Era moderna**: 20 pilotos reales de la grilla 2024/2025
- **Era clásica**: décadas 1950s, 1960s, 1970s con pilotos históricos
- Motor de física con variación gaussiana por piloto
- Eventos aleatorios: pinchazos, pit stops, abandonos, adelantamientos
- Cambios de clima dinámicos (lluvia, viento)
- Comentarios generados por IA (Anthropic) en eventos clave
- Control de velocidad 1x–10x

### Estadísticas
- Victorias por piloto y equipo (temporadas 2024-2025)
- Barras de progreso con colores de equipo

## Próximas mejoras planeadas

- [ ] Trazados de circuito reales (no solo óvalo)
- [ ] Modo DRS para era moderna
- [ ] Perfil de usuario y favoritos
- [ ] Modo predicción (antes de la carrera)
- [ ] Noticias F1 integradas
- [ ] Gráficos de posición a lo largo de la carrera
- [ ] Múltiples estrategias de pit stop
- [ ] Clasificación previa (Q1/Q2/Q3)

## Límites de la API

La app usa la API de Anthropic solo en eventos importantes (pit stops, accidentes, cambios de clima, inicio y fin de carrera), con un cooldown de 10 segundos entre llamadas. Una carrera de 20 vueltas genera ~6-10 llamadas.
