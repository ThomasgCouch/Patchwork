# Patchwork
Patchwork reads your GitHub, finds open good-first-issues that fit your skills, and uses Gemma 4 to explain each one and where to start.

Apart of 2026 Hacktoberfest @ the University of Surrey 
# Patchwork

> **Stitch your first patch.** Patchwork reads your GitHub username, finds open `good first issue` tickets that fit your skills, and uses Gemma 4 to explain each one and where to start.

[![Powered by Gemma 4](https://img.shields.io/badge/Powered%20by-Gemma%204-blue.svg)](https://ai.google.dev/)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2014-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Overview

Finding your first open-source issue to work on during Hacktoberfest can be overwhelming. **Patchwork** solves this by mapping your GitHub profile to real, actionable tickets tailored to your top programming languages.

Instead of overwhelming you with raw issue descriptions, Patchwork uses **Gemma 4** to break down each ticket into plain English summaries, difficulty estimates, clear step-by-step entry points, and specific codebase files to inspect.

---

## 🛠️ How It Works
1. **Language Analysis:** Queries the GitHub REST API to aggregate language usage from your public repositories.
2. **Issue Discovery & Ranking:** Finds unassigned, open `good first issue` tickets in those languages and ranks them based on repository popularity, issue age, comment activity, and Hacktoberfest participation.
3. **AI Guidance:** Sends the top 5 raw issues through **Gemma 4** to generate concise summaries, difficulty assessments, actionable step-by-step guides, and relevant file paths.
4. **Interactive UI:** Presents recommendations as quilt-inspired "Patch Cards" ready for you to pick up and start contributing.

---

## 🚀 Tech Stack

* **Frontend & Backend:** Next.js (App Router, TypeScript), Tailwind CSS
* **AI Model:** Gemma 4 (`gemma-4-26b-a4b-it`) via Google GenAI API (with Ollama `gemma4:e4b-it-qat` as a local fallback)
* **API Integration:** GitHub REST API
* **Deployment:** Vercel

---

## 💻 Getting Started Locally

### Prerequisites

* Node.js 18+ and `npm`
* A GitHub Personal Access Token (PAT)
* A Gemini API Key from Google AI Studio (or a local Ollama instance running Gemma 4)

### Installation

1. **Clone the repository:**
   ```bashgit
   git clone [https://github.com/ThomasgCouch/Patchwork.](https://github.com/ThomasgCouch/Patchwork.git)
   cd patchwork
