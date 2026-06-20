# DriftIQ

A modern cloud storage solution built with React 19, NestJS, and Supabase, featuring real-time Telegram synchronization.

## Quick Start

1. **Install dependencies:** `npm install`
2. **Environment:** Copy `.env.example` to `.env` in both `apps/frontend` and `apps/backend`.
3. **Run Backend:** `cd apps/backend && npm run start:dev`
4. **Run Frontend:** `cd apps/frontend && npm run dev`

## Tech Stack
- **Frontend:** React 19, Vite, TypeScript, TailwindCSS, Zustand
- **Backend:** NestJS, TypeScript, Supabase, Telegram Bot API

## Known Bugs & Issues

- **[Fixed] UI Rendering Error:** Corrected an issue in `LandingPage.tsx` where escaped backticks (`\``) in template literals caused invalid character errors.
- **[Fixed] Strict Typing:** Resolved TypeScript `any` types and React exhaustive-dependency warnings in the floating particle animations.
- **Telegram Sync:** Syncing large files over Telegram may occasionally experience delays via WebSockets.
- **Dependencies:** The application uses React 19 and Vite; some third-party plugins may still flag peer dependency warnings.
