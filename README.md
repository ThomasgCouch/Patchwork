# Patchwork

Apart of 2026 Hacktoberfest @ the University of Surrey 

> **Stitch your first patch.** Patchwork reads your GitHub username, finds open `good first issue` tickets that fit your skills, and uses Gemma 4 to explain each one and where to start.

[![Powered by Gemma 4](https://img.shields.io/badge/Powered%20by-Gemma%204-blue.svg)](https://ai.google.dev/)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Part of Hacktoberfest 2026 at the University of Surrey.

---

## Overview

Finding a first open-source issue to work on during Hacktoberfest can be overwhelming. Patchwork maps your GitHub profile to real, open tickets that match your top programming languages.

Instead of raw issue descriptions, each ticket becomes a "patch card" with a plain-English summary, a difficulty estimate, first steps and the files to look at.

> **Status:** The AI explanation step is in progress. Until it lands, cards show the issue title as the summary and leave difficulty, steps and files empty.

---

## How it works

1. **Language analysis.** Queries the GitHub REST API for the languages used across your public repositories.
2. **Issue discovery.** Searches for open `good first issue` tickets in each of your top languages.
3. **Ranking.** Scores each issue and keeps the top 5, with at most 2 per repository and duplicates removed. The score weighs:
   - language match, with your top language counting most (30%)
   - freshness of the last update (20%)
   - how few comments there are, so you are not joining a pile-on (15%)
   - the repository having the Hacktoberfest topic (15%)
   - repository popularity (10%)
   - the issue having a useful description (10%)
4. **AI guidance.** Sends each top issue through Gemma 4 for a summary, difficulty estimate, first steps and relevant files.
5. **UI.** Shows the results as patch cards.

---

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** CSS Modules
- **AI model:** Gemma 4 through the Google GenAI API, with a local model as an option (`USE_LOCAL=1`)
- **Data:** GitHub REST API
- **Hosting:** Vercel

---

## Getting started locally

### Prerequisites

- Node.js 20.9 or newer, and `npm`
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/) (only needed once the AI step lands)
- Optional: a GitHub personal access token. A token with no scopes is enough for public data. Without one, GitHub's lower unauthenticated rate limit applies.

### Install

```bash
git clone https://github.com/ThomasgCouch/Patchwork.git
cd Patchwork
npm install
```

### Configure environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio key for Gemma |
| `GITHUB_TOKEN` | Optional GitHub token, raises the API rate limit |
| `GEMMA_MODEL` | Model name to call |
| `USE_LOCAL` | `0` for the hosted API, `1` for a local model |
| `USE_MOCK` | `1` makes `/api/match` return bundled sample data and call no external API |

`.env.local` is git-ignored. Never put real keys in `.env.example` or commit them. GitHub will block a push that contains a recognised key.

Restart the dev server after changing `.env.local`.

### Run

```bash
npm run dev
```

Open <http://localhost:3000>, enter a GitHub username and press **Find my patches**.

No keys yet? Set `USE_MOCK=1` in `.env.local` to try the UI with sample data.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx next typegen && npx tsc --noEmit` | Type-check (`typegen` creates Next's route types first) |

---

## Contributing

- Branch from `main`, named `yourname/topic`, for example `owen/docs`.
- Open a pull request into `main`. Direct pushes are blocked.
- CI runs lint, type-check and build on every pull request. The `check` job must pass before merging.
- Run the same commands locally before you push.

---

## License

MIT. See [LICENSE](LICENSE).
````
