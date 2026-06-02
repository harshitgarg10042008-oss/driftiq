# DriftIQ SaaS - Complete Architecture

## Project Overview

DriftIQ is a production-grade cloud storage SaaS built with:

- **Frontend**: Modern HTML/CSS/Vanilla JS with Glassmorphism UI
- **Backend**: Modular Node.js/Express with Controllers, Services, Middleware
- **Database**: Supabase PostgreSQL with RLS and proper relationships
- **Storage**: Telegram Bot API + Telegram Channel

## Directory Structure

```
driftiq/
├── backend/
│   ├── config/
│   │   ├── database.js          # Supabase client initialization
│   │   ├── telegram.js          # Telegram bot configuration
│   │   └── constants.js         # App constants
│   │
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── roleGuard.js         # Role-based access control
│   │   ├── validation.js        # Input validation middleware
│   │   ├── errorHandler.js      # Global error handler
│   │   └── cors.js              # CORS configuration
│   │
│   ├── controllers/
│   │   ├── authController.js    # Login, register, password reset
│   │   ├── fileController.js    # File operations
│   │   ├── folderController.js  # Folder operations
│   │   ├── shareController.js   # Share link management
│   │   ├── userController.js    # User profile
│   │   ├── telegramController.js# Telegram integration
│   │   └── adminController.js   # Admin dashboard
│   │
│   ├── services/
│   │   ├── authService.js       # Auth logic (JWT, password hashing)
│   │   ├── fileService.js       # File metadata, operations
│   │   ├── folderService.js     # Folder logic
│   │   ├── shareService.js      # Share link creation/validation
│   │   ├── telegramService.js   # Telegram upload/download logic
│   │   ├── emailService.js      # Email notifications (password reset)
│   │   └── adminService.js      # Analytics and reporting
│   │
│   ├── utils/
│   │   ├── logger.js            # Winston logging
│   │   ├── validators.js        # Validation functions
│   │   ├── helpers.js           # Utility functions
│   │   ├── encryption.js        # Encryption utilities
│   │   └── fileHelpers.js       # File type validation
│   │
│   ├── routes/
│   │   ├── auth.js              # /api/auth routes
│   │   ├── files.js             # /api/files routes
│   │   ├── folders.js           # /api/folders routes
│   │   ├── shares.js            # /api/shares routes
│   │   ├── users.js             # /api/users routes
│   │   ├── telegram.js          # /api/telegram routes
│   │   └── admin.js             # /api/admin routes
│   │
│   ├── server.js                # Express app setup
│   └── index.js                 # Entry point
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── main.css         # Main styles
│   │   │   ├── dark-mode.css    # Dark mode
│   │   │   └── animations.css   # Animations
│   │   ├── js/
│   │   │   ├── api.js           # API client
│   │   │   ├── auth.js          # Auth logic
│   │   │   ├── storage.js       # Local storage helpers
│   │   │   ├── ui.js            # UI interactions
│   │   │   ├── notifications.js # Toast notifications
│   │   │   ├── upload.js        # Upload handling
│   │   │   └── dashboard.js     # Dashboard logic
│   │   └── images/              # Icons and images
│   │
│   ├── pages/
│   │   ├── index.html           # Login page
│   │   ├── dashboard.html       # Main dashboard
│   │   ├── shared.html          # Shared file access
│   │   ├── admin.html           # Admin panel
│   │   ├── profile.html         # User profile
│   │   └── settings.html        # Account settings
│   │
│   └── public/                  # Static files served
│
├── database/
│   ├── schema.sql               # Complete SQL schema
│   └── migrations/              # Future migrations
│
├── .env.example                 # Environment variables template
├── .env                         # Local environment variables
├── package.json                 # Dependencies
├── ARCHITECTURE.md              # This file
├── DEPLOYMENT.md                # Deployment guide
├── IMPLEMENTATION.md            # Step-by-step guide
└── README.md                    # User documentation

```

## Database Schema Overview

### Core Tables

- **users** - User accounts with roles
- **files** - File metadata and Telegram message IDs
- **folders** - Folder hierarchy with parent references
- **shares** - Public share links with expiry
- **sessions** - Active user sessions
- **telegram_accounts** - Telegram bot connections per user
- **admin_logs** - System audit logs
- **storage_stats** - Usage statistics cache

### Security

- Row Level Security (RLS) enabled on all tables
- Foreign keys with cascade delete
- Proper indexes on frequently queried columns
- Encrypted passwords with bcrypt

## API Routes

### Authentication (`/api/auth`)

- `POST /register` - Create new account
- `POST /login` - Login with credentials
- `POST /logout` - Logout (client-side token removal)
- `POST /refresh-token` - Get new JWT
- `POST /password-reset/request` - Request password reset
- `POST /password-reset/confirm` - Confirm with token
- `POST /password-change` - Change password (authenticated)

### Files (`/api/files`)

- `GET /` - List user's files
- `POST /upload` - Upload file
- `GET /:id` - Get file details
- `GET /:id/download` - Download file from Telegram
- `GET /:id/preview` - Get file preview
- `PUT /:id` - Rename file
- `DELETE /:id` - Delete file
- `POST /:id/move` - Move file to folder
- `GET /search` - Search files
- `GET /stats` - Storage statistics

### Folders (`/api/folders`)

- `GET /` - List folders (tree structure)
- `POST /` - Create folder
- `GET /:id` - Get folder details
- `PUT /:id` - Rename folder
- `DELETE /:id` - Delete folder (cascade)
- `POST /:id/move` - Move folder

### Shares (`/api/shares`)

- `POST /create` - Create share link
- `GET /my-shares` - List user's shares
- `GET /public/:token` - Get shared file (public)
- `DELETE /:id` - Delete share link
- `PUT /:id` - Update share settings (expiry, password)

### Users (`/api/users`)

- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `POST /upload-avatar` - Upload profile picture
- `GET /telegram-status` - Check Telegram connection

### Telegram (`/api/telegram`)

- `GET /connect` - Get Telegram bot QR/link
- `POST /webhook` - Telegram webhook handler
- `GET /status` - Connection status
- `POST /reconnect` - Reconnect Telegram

### Admin (`/api/admin`)

- `GET /dashboard` - Analytics data
- `GET /users` - List all users
- `DELETE /users/:id` - Delete user
- `GET /files` - Moderate files
- `DELETE /files/:id` - Delete file (admin)
- `GET /logs` - System logs
- `GET /storage` - Storage usage

## Authentication Flow

1. **Registration**: User submits email, password → Hashed with bcrypt → Stored in users table
2. **Login**: User submits credentials → Compare password hash → Generate JWT (24h expiry) → Return token
3. **Protected Routes**: Token in Authorization header → Verified with JWT secret → User context set
4. **Password Reset**: Email → Random token → Store in DB with expiry → Click link → New password
5. **Session**: Token stored in localStorage (secure HttpOnly for production)

## File Upload Flow

1. User selects file
2. Frontend validates (size, type, format)
3. POST /api/files/upload with multipart form data
4. Backend validates again
5. Upload to Telegram channel via bot
6. Get Telegram message ID
7. Store metadata in Supabase with Telegram ID
8. Return file record to frontend

## File Download Flow

1. User clicks download
2. GET /api/files/:id/download
3. Backend queries Telegram via message ID
4. Stream file from Telegram to user
5. Log download in admin panel

## Sharing Flow

1. User creates share link
2. Generate random token with crypto
3. Store in shares table with metadata (expiry, password, download limit)
4. Public URL: `/shared?token=xxx`
5. Visitor accesses link → Verify token → Check expiry → Validate password
6. Download counter increments
7. If limit reached, link expires

## Admin Analytics

Real-time dashboard showing:

- Total users (count)
- Active users (last 24h)
- Total files stored
- Total storage used
- Revenue (if SaaS with pricing)
- Recent activity logs
- User growth chart

## Security Features

1. **Input Validation**: express-validator on all endpoints
2. **Rate Limiting**: Express rate limit on auth/upload endpoints
3. **CORS**: Whitelist allowed origins
4. **CSRF**: Custom token validation
5. **XSS Protection**: Helmet headers + HTML escaping
6. **JWT**: HS256 algorithm with strong secret
7. **Password**: bcrypt with 10 salt rounds
8. **Telegram**: Verify bot token secret in webhooks
9. **RLS**: Supabase row-level security policies
10. **HTTPS**: Enforce in production (via reverse proxy)

## Error Handling

- Centralized error middleware
- Consistent error response format
- Winston logging for all errors
- User-friendly error messages
- Proper HTTP status codes

## Performance Optimizations

1. Database indexes on frequently queried columns
2. Pagination on list endpoints
3. File streaming instead of buffering
4. Cache storage stats (refresh every 5 minutes)
5. Compress API responses
6. Lazy load frontend JavaScript
7. Minimize database calls per request
8. Connection pooling for Supabase

## Deployment

Target: **Render.com** (free tier available)

- Environment variables in .env
- Production database (Supabase.com)
- Bot token stored in .env
- Auto-deploy from GitHub
- Health check endpoint at GET /health

---

## Next Steps

1. Review and update `.env.example`
2. Create Supabase SQL schema
3. Implement backend services
4. Build frontend components
5. Set up local development
6. Test all endpoints
7. Deploy to Render
