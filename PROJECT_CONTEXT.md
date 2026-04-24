# AnyAudio — Project Context & Engineering Brief

## 1. Project Vision
AnyAudio is a high-performance, multi-source media aggregation platform designed to consolidate audio content from diverse sources (Spotify, YouTube, Archive.org, Osho World, and generic websites) into a unified, premium listening experience. It specializes in handling "long-form" content like spiritual discourses and podcasts, alongside music.

## 2. Technical Stack
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Custom Design System), SPA architecture with a custom hash-based router.
- **Backend**: Node.js with Express.
- **Database**: Hybrid architecture using **SQLite** for local persistence/offline and **Supabase** for remote synchronization.
- **Media Engine**: 
    - **yt-dlp**: For high-quality stream resolution and metadata extraction.
    - **Puppeteer**: For dynamic scraping of JavaScript-heavy sites (Spotify, Osho World).
    - **Cheerio**: For fast static HTML parsing and JSON-LD metadata extraction.
- **Audio Core**: Custom Web Audio API wrapper with progress persistence and offline download management (FileSystem API).

## 3. Core Architecture
### Server Side (`/server`)
- `routes/api.js`: Handles collection CRUD, scraping requests, and file streaming.
- `scraper/index.js`: Strategy-based router that detects domains and dispatches to specialized modules.
- `scraper/strategies/`:
    - `spotify.js`: Uses Puppeteer with stealth headers to resolve playlists via YouTube search.
    - `oshoworld.js`: High-latency specialist for legacy spiritual archives; extracts transcripts and multi-part tracks.
    - `streaming.js`: Wrapper for yt-dlp.
    - `generic.js`: "Smart" scraper using OpenGraph, JSON-LD, and DOM heuristics.
- `db/index.js`: Abstracted database layer handling SQLite schema migrations and Supabase sync.

### Client Side (`/client`)
- `app.js`: Main entry point and router.
- `services/audio.js`: Robust audio engine with state management and event emitters.
- `services/downloadManager.js`: Handles background downloads to local storage.
- `pages/`: Component-based view rendering (Landing, Collection, Player).
- `css/index.css`: Comprehensive design system using HSL tokens, glassmorphism, and custom animations.

## 4. Current State of UI/UX
- **Theme**: Premium Dark Amber. Uses deep blues (`#0a0c14`) and warm golds (`#f59e0b`).
- **Layout**: Fixed sidebar for library access, persistent bottom player, and dynamic main viewport.
- **Key Components**:
    - **Premium Covers**: Dynamic CSS fallback covers with textured gradients and high-contrast typography.
    - **Transcripts**: Integrated right-sidebar for long-form content reading during playback.
    - **Progress Tracking**: Per-track and per-collection progress indicators.

## 5. Engineering Focus
- **Robust Scrapers**: Maintaining high-stealth Puppeteer and yt-dlp configurations.
- **Hybrid DB**: Ensuring seamless SQLite-to-Supabase synchronization.
- **Audio Reliability**: Optimizing stream proxy and offline file management.

---
*Prepared by Antigravity (Advanced Agentic Coding).*
