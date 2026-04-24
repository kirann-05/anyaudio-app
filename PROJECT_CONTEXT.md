# AnyAudio — Project Context & Engineering Brief

## 1. Project Vision
AnyAudio is a high-performance, multi-source media aggregation platform designed to consolidate audio content from diverse sources (Spotify, YouTube, Archive.org, Osho World, and generic websites) into a unified, premium listening experience. It specializes in handling "long-form" content like spiritual discourses and podcasts, alongside music.

## 2. Technical Stack
- **Frontend**: **React (Vite)** with Tailwind CSS and Framer Motion. 
    - Architecture: Component-based SPA with state-driven UI.
    - Design: High-fidelity visual design generated via Google AI Studio.
- **Backend**: Node.js with Express.
- **Database**: Hybrid architecture using **SQLite** for local persistence/offline and **Supabase** for remote synchronization.
- **Media Engine**: 
    - **yt-dlp**: For high-quality stream resolution and metadata extraction.
    - **youtube-sr**: For fetching native YouTube recommendation algorithms.
    - **Puppeteer**: For dynamic scraping of JavaScript-heavy sites (Spotify, Osho World).
    - **Cheerio**: For fast static HTML parsing and JSON-LD metadata extraction.
- **Audio Core**: Custom Web Audio API wrapper with progress persistence, offline download management (FileSystem API), and **Algorithmic Endless Play**.

## 3. Core Architecture
### Server Side (`/server`)
- `routes/api.js`: Handles collection CRUD, scraping requests, and file streaming.
- `scraper/index.js`: Strategy-based router that detects domains and dispatches to specialized modules.
- `scraper/strategies/`:
    - `spotify.js`: Uses Puppeteer with stealth headers to resolve playlists via YouTube search.
    - `oshoworld.js`: High-latency specialist for legacy spiritual archives.
    - `streaming.js`: Wrapper for yt-dlp.
    - `generic.js`: "Smart" scraper using OpenGraph, JSON-LD, and DOM heuristics.
- `db/index.js`: Abstracted database layer handling SQLite schema migrations and Supabase sync.

### Client Side (`/client`)
- **Modern React App**: Located in `/client`. Built using Vite.
- **Legacy Client**: Original vanilla JS implementation moved to `/client_legacy` for reference.
- `src/services/audioEngine.ts`: Robust audio engine with state management, event emitters, and YouTube recommendation integration.
- `src/services/api.ts`: Centralized API bridge between React UI and Node.js backend.
- `src/screens/`: React components for Library, Discovery, Collection Details, and Player.

## 4. Key Features & Integrations
- **YouTube Endless Play**: Uses `youtube-sr` on the backend to fetch true "Up Next" recommendations. When a track ends, the engine automatically scrapes and queues the next algorithmic recommendation for a seamless radio experience.
- **Resilient Deployment**: Server logic in `index.js` automatically detects whether to serve from a production `dist` build or raw source, preventing `ENOENT` crashes on platforms like Render.
- **Hybrid DB Persistence**: Automatically saves scraping results to Supabase/SQLite so your library grows with every new URL you listen to.

## 5. Engineering Focus
- **UI Integrity**: Strict "no-touch" policy on AI-generated CSS/Layout to preserve design fidelity.
- **Algorithmic Flow**: Optimizing the handoff between "Track End" and "Next Recommendation Scrape" to minimize latency.
- **Scraper Stealth**: Maintaining high-stealth Puppeteer and yt-dlp configurations.

---
*Updated by Antigravity (Advanced Agentic Coding) — 2026-04-24.*
