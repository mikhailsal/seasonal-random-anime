# Seasonal Random Anime

Single-page app that fetches seasonal anime via the public Jikan (MyAnimeList) v4 API, applies filters, and picks a random title. Initially implemented as a single static HTML file, with tests and CI set up for reliability and future refactoring.

- App entry: `seasonal-random-anime/index.html`
- Live site (after first deploy): `https://mikhailsal.github.io/seasonal-random-anime/`

## Features
- Seasonal listings with filters (type, genres, episodes, etc.)
- Random picker with continuation-awareness (prequel checks via relations)
- Image augmentation for better cards
- Testing-first workflow (unit + integration)

## Tech Stack
- Vanilla HTML/CSS/JS (single file app)
- Vitest + jsdom (unit tests)
- Node test environment for integration tests
- GitHub Actions for CI and Pages deployment

## Getting Started
Requirements:
- Node 22+
- npm 10+

Install:
```bash
npm ci
```

Run unit tests (no network):
```bash
npm run test:unit
```

Run integration tests (hits Jikan API; may be rate limited):
```bash
npm run test:integration
```

Run full suite:
```bash
npm test
```

## Testing Notes
- Unit tests bootstrap the inline script from `seasonal-random-anime/index.html` in a jsdom-backed VM via `test/utils/loadApp.mjs`. DOMContentLoaded handlers are blocked and `fetch` throws by default to ensure explicit mocks.
- Key unit-tested functions include duration parsing, legacy data parsing, DOM rendering, and random selection logic.
- Integration tests use `test/utils/fetchWithRetry.mjs` (timeout + exponential backoff) and a Node environment, covering:
  - `GET /v4/seasons`
  - `GET /v4/seasons/{year}/{season}?page={n}&limit={k}`

## Continuous Integration
- Workflow: `.github/workflows/ci.yml`
  - Unit tests run on push and pull_request.
  - Integration tests are gated to avoid rate limits; they run nightly at 03:00 UTC or manually via workflow_dispatch with input `run_integration = true`.

Scripts:
- `npm run test:unit` → `vitest --run test/unit`
- `npm run test:integration` → `vitest --run test/integration`
- `npm test` → `vitest --run`

## Deployment (GitHub Pages)
- Workflow: `.github/workflows/pages.yml`
- Deploys the static directory `seasonal-random-anime/` without a build step.
- Trigger: push to `main` or run manually via the Actions tab.

After the first successful Pages deployment, the site will be available at:
```
https://mikhailsal.github.io/seasonal-random-anime/
```

## API and Rate Limits
- Public API: Jikan v4 (https://docs.api.jikan.moe)
- Example endpoints:
  - `GET /v4/seasons`
  - `GET /v4/seasons/{year}/{season}?page={n}&limit={k}`
  - `GET /v4/anime/{mal_id}/relations`
  - `GET /v4/anime/{mal_id}/pictures`
- Be mindful of HTTP 429 responses. Integration tests implement retry and timeouts.

## Project Structure (excerpt)
```
seasonal-random-anime/
  index.html
test/
  unit/
    duration.spec.js
    parseAnimeData.spec.js
    rendering.spec.js
    continuity.spec.js
  integration/
    jikan.spec.js
  utils/
    loadApp.mjs
    fetchWithRetry.mjs
.github/
  workflows/
    ci.yml
    pages.yml
vitest.config.js
package.json
```

## Roadmap
- Maintain testing-first approach during refactor to React + Vite (TypeScript)
- Preserve behavior and test coverage; migrate utilities into modules
- Update deployment to build-and-deploy once framework is introduced

## License
MIT