# DriftIQ Cloud Storage

A modern, high-performance cloud storage solution built with React 19, NestJS, and Supabase. Features real-time bidirectional syncing with Telegram to securely manage and store your files.

## Project Structure

This is a monorepo setup utilizing npm workspaces:

- `apps/frontend/`: The React 19 + Vite frontend application.
- `apps/backend/`: The NestJS API and Telegram webhook listener.
- `database/`: Supabase PostgreSQL schema and RPC functions.

## Tech Stack

### Frontend
- React 19 & Vite
- TypeScript
- TailwindCSS & Framer Motion
- Zustand (State Management)
- Axios & TanStack Query
- Socket.IO-client (Real-time updates)

### Backend
- NestJS
- TypeScript
- JWT & Refresh Token Rotation
- Supabase (Database & Storage)
- Telegram Bot API Webhooks

## Getting Started

1. **Install dependencies:**
   From the root folder, run:
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Configure your environment variables in both `apps/backend/.env` and `apps/frontend/.env` using the provided `.env.example` templates.

3. **Start the backend:**
   ```bash
   cd apps/backend
   npm run start:dev
   ```

4. **Start the frontend:**
   ```bash
   cd apps/frontend
   npm run dev
   ```

## Key Features
- **File Explorer**: Advanced grid/list views, drag-and-drop uploads, context menus, starring, moving, and trash/restore functionality.
- **Telegram Sync**: Upload files directly via Telegram and watch them appear on the web instantly using real-time WebSockets.
- **Secure File Sharing**: Generate public or password-protected share links with set download limits and expirations.
- **Admin Dashboard**: Gain deep insights into platform usage, track storage limits, and manage user roles securely.
