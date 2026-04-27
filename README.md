# Helmets Clash

Browser-based fantasy strategy game built with React, TypeScript, Vite, and Tailwind CSS.

Helmets Clash is a turn-based hex-map strategy prototype with configurable seats, asymmetric factions, procedural map generation, city development, unit combat, cards, autosave, and local replay support.

The project is built as a self-contained web game and serves as a portfolio example for frontend architecture, game-state modeling, typed domain logic, accessibility-conscious UI, and automated testing.

---

## Status

Active prototype.

Implemented:

- New-game setup flow
- 2-4 configurable seats
- Human, AI, and empty seat modes
- Four faction presets: Aldermere, Grimhold, Sunspire, and Moonwatch
- Procedural hex-map generation
- Multiple map sizes and map types
- Random or deterministic seed support
- Turn-based unit movement and combat
- Cities, buildings, cards, resources, and faction state
- Local autosave and resume
- Replay flow
- Unit/integration testing with Vitest
- E2E testing with Playwright
- Accessibility tooling with axe

Not yet positioned as a finished commercial game. Expect balance changes, UX iteration, and continued gameplay expansion.

---

## Gameplay overview

Players configure a campaign, choose active seats, and start on a procedurally generated hex map. Each faction controls a city, units, resources, buildings, cards, and turn state.

Core loop:

1. Explore the map.
2. Generate gold and food.
3. Move units across terrain.
4. Build city upgrades.
5. Play tactical cards.
6. Attack enemy units and cities.
7. Eliminate rival factions or capture the strategic advantage.

---

## Factions

Helmets Clash includes four faction presets:

| Faction | Style |
|---|---|
| Aldermere | Crown-themed living faction |
| Grimhold | Undead faction with skeleton, wraith, and lich units |
| Sunspire | Sunburst-themed living faction |
| Moonwatch | Crescent-themed living faction |

Each faction has its own name, city identity, color palette, glyph, visual pattern, and unit-pool configuration.

---

## Map system

Supported map sizes:

| Size | Grid |
|---|---|
| Small | 9 x 7 |
| Medium | 13 x 10 |
| Large | 17 x 13 |
| Huge | 22 x 16 |

Supported map types:

| Type | Description |
|---|---|
| Continents | Large landmasses with inland seas |
| Islands | Scattered land with more coast |
| Pangaea | One connected landmass |
| Highlands | Mountainous terrain with narrow passes |
| Random | Randomized map type with connected playability |

Maps support deterministic generation through a seed value. The same seed and same configuration produce the same map.

---

## Domain model

The game uses a typed state model for:

- Hex coordinates and tile maps
- Terrain types and terrain metadata
- Factions and seat configuration
- Units and cities
- Buildings and upgrades
- Cards and targeting
- Turn state
- Combat targets
- Logs and map-linked events
- Autosave-compatible selected-unit and undo state

This keeps game behavior centralized and makes state transitions easier to test.

---

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Testing | Vitest, Testing Library, Playwright |
| Accessibility | axe-core, @axe-core/react |
| Build tooling | ESLint, TypeScript, Vite |

---

## Local development

### Prerequisites

- Node.js
- npm

### Install

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

---

## Test commands

Run unit/integration tests:

```bash
npm run test
```

Watch tests:

```bash
npm run test:watch
```

Open Vitest UI:

```bash
npm run test:ui
```

Install Playwright browser dependency:

```bash
npm run test:e2e:install
```

Run E2E tests:

```bash
npm run test:e2e
```

Lint:

```bash
npm run lint
```

---

## Project structure

```text
src/
  App.tsx              # Top-level setup/game routing and resume handling
  game/
    constants.ts       # Terrain, units, buildings, cards, factions, map config
    types.ts           # Single source of truth for game domain types
    persist.ts         # Local autosave / resume helpers
    state.ts           # Game-state initialization and state flow
  ui/
    NewGameScreen.tsx  # Campaign setup UI
    GameScreen.tsx     # Main game screen
  __tests__/           # Test helpers and coverage
```

---

## Portfolio relevance

This project demonstrates:

- Typed game-state modeling
- UI state management in React
- Procedural configuration and seeded generation
- Local persistence / autosave handling
- Accessible form controls and keyboard-aware UI
- Testable domain logic
- Browser-game architecture without a large external engine

For a recruiter or technical reviewer, the main signal is not just "game development." The stronger signal is the ability to model complex state, constrain UI flows, test behavior, and keep a growing interactive application maintainable.

---

## Current improvement backlog

Planned or recommended next work:

- Rename repository from `web-hc` to `helmets-clash-web` or `HelmetsClash`
- Replace package name `temp` with a project-specific package name
- Add a live deployment URL
- Add screenshots or GIFs of the setup screen and gameplay
- Add a short gameplay rules section
- Add AI behavior notes
- Add balance notes for factions, units, buildings, and cards
- Add CI badge after GitHub Actions is configured
- Expand E2E coverage around setup, autosave/resume, movement, combat, and replay

---

## License

No license declared yet.

Add a license before accepting outside contributions or presenting this as open-source software.
