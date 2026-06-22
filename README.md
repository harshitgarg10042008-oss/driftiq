<p align="center">
  <img src="apps/frontend/public/logo.png" alt="DriftIQ" height="80" />
</p>

<h1 align="center">DriftIQ</h1>
<p align="center">
  Secure cloud storage powered by Telegram — upload once, access everywhere.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase" />
  <img src="https://img.shields.io/badge/Telegram-Bot-2AABEE?style=flat-square&logo=telegram" />
</p>

---

## Overview

DriftIQ is a **SaaS-grade file storage app** that uses a private Telegram channel as the actual file storage backend — removing the cost of S3 or cloud storage entirely. Files are uploaded through a NestJS API, forwarded to Telegram via the Bot API, and served back via a secure streaming endpoint.

## Architecture

```
driftiq/
├── apps/
│   ├── backend/          ← NestJS API (port 4000)
│   │   └── src/
│   │       ├── auth/         ← JWT auth, refresh tokens, password reset
│   │       ├── files/        ← Upload, download, star, share, trash
│   │       ├── folders/      ← Folder CRUD + nested folder support
│   │       ├── users/        ← User management
│   │       ├── telegram/     ← Bot webhook + link code flow
│   │       ├── realtime/     ← Socket.IO gateway
│   │       ├── shares/       ← Public share links
│   │       ├── admin/        ← Admin panel API
│   │       └── supabase/     ← Supabase client service
│   │
│   └── frontend/         ← React 19 + Vite (port 3000)
│       └── src/
│           ├── pages/        ← Login, Register, Dashboard, Settings, Admin
│           ├── components/
│           │   ├── FileExplorer/  ← Main drive UI
│           │   └── ui/            ← Modal, Toast primitives
│           ├── store/        ← Zustand state (auth, files)
│           └── lib/          ← Axios instance, utility functions
│
└── database/             ← SQL migration files for Supabase
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS, TypeScript, Passport JWT |
| Frontend | React 19, Vite, Framer Motion, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| File Storage | Telegram Bot API (private channel) |
| Real-time | Socket.IO |
| Auth | JWT access tokens + refresh token rotation |

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project
- A Telegram Bot token + a private storage channel

### 1. Backend

```bash
cd apps/backend
cp .env.example .env   # fill in your values
npm install
npm run start:dev      # runs on http://localhost:4000
```

**Required `.env` variables:**
```
PORT=4000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
JWT_REFRESH_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_STORAGE_CHAT_ID=
FRONTEND_URL=http://localhost:3000
```

### 2. Frontend

```bash
cd apps/frontend
npm install
npm run dev            # runs on http://localhost:3000
```

**Required `.env` variable:**
```
# Leave empty — Vite proxy handles /api → http://localhost:4000/api
VITE_BACKEND_URL=
```

### 3. Database

Run the SQL files in order inside your **Supabase SQL Editor**:

```
database/schema.sql                  ← initial tables
database/missing_columns_migration.sql ← add missing columns
database/add_increment_rpc.sql       ← storage RPC function
```

## Key Features

- 📁 **My Drive** — folders, nested folders, drag & drop upload
- ⭐ **Starred files** — mark files for quick access
- 🗑️ **Trash** — soft delete with restore & permanent delete
- 🔗 **Share links** — password-protected, expiry-limited public links
- 📱 **Telegram sync** — upload files via Telegram bot, they appear in drive
- 🔒 **JWT auth** — 15-minute access tokens + 7-day refresh token rotation
- 🛡️ **Admin panel** — manage users, roles, storage
- 📝 **Quick notes** — floating notepad widget (auto-saved to localStorage)

## Deployment

- **Backend** → Render (see `render.yaml`)
- **Frontend** → Vercel (set Root Directory to `apps/frontend`)

## License

MIT
