# DriftIQ - Complete Feature Updates

## Overview

DriftIQ has been upgraded with 5 major features while maintaining the dark purple UI, JSON file storage, and Telegram backend.

---

## 🎯 NEW FEATURES

### 1. **User Registration & Multi-User Support**

**What Changed:**

- Added `POST /api/register` endpoint for new account creation
- Users can now create accounts with username (3+ chars) & password (6+ chars)
- Login now validates existing users properly
- Each user's files are isolated from others (no data leakage)
- User data stored in `data/users.json` with:
  - `id`: Unique timestamp-based ID
  - `username`: User handle
  - `password`: Bcrypt hashed
  - `isAdmin`: Boolean flag
  - `createdAt`: ISO timestamp

**Frontend Changes:**

- Split login page: Login form + Register form side-by-side
- Tab switching between "Sign In" and "Register"
- Form validation with helpful error messages
- Password confirmation field for registration

---

### 2. **Folder System (Google Drive Style)**

**What Changed:**

- New `data/folders.json` database for folder structure
- `POST /api/folders` - Create folders
- `GET /api/folders` - Fetch user's folders
- `DELETE /api/folders/:id` - Delete folders
- Files now have `folderId` field (null = root level)
- Folders can be nested (parentFolderId support)

**Frontend Changes:**

- Breadcrumb navigation showing current folder path
- Click folders to navigate inside them
- "+ Folder" button opens modal to create new folder
- Folder cards with folder emoji (📂) show in grid
- Search works across all folders

**Data Structure:**

```json
{
  "id": "1234567890",
  "userId": 1,
  "name": "Projects",
  "parentFolderId": null,
  "createdAt": "2025-05-18T10:00:00Z"
}
```

---

### 3. **File Sharing with Public Links**

**What Changed:**

- New `data/shares.json` database
- `POST /api/shares` - Generate shareable token
- `GET /api/shares/:token` - Download without auth
- `/share/:token` - Static HTML page for public downloads
- 16-character hex tokens for share links

**Frontend Changes:**

- 🔗 Share button added to each file card
- Modal shows full shareable URL
- "Copy Link" button to clipboard
- Anyone with link can download without login

**Share Link Format:**

```
https://yourdomain.com/share/a1b2c3d4e5f6g7h8
```

---

### 4. **Admin Panel**

**What Changed:**

- Only `isAdmin=true` users see admin panel
- Default user "harshit" is auto-admin
- `/api/admin/users` - List all users
- `/api/admin/files` - List all files system-wide
- `/api/admin/users/:id` - Delete users & their files

**Frontend Changes:**

- New "⚙️ Admin" tab in navigation (only for admins)
- Two tables: Users table & Files table
- Users table shows: Username, Role, Joined date, Delete button
- Files table shows: File name, Owner, Size, Upload date
- Admin badge (🔴 ADMIN) shown next to username
- Cannot delete your own admin account

---

### 5. **JWT-Based Multi-User Authentication**

**What Changed:**

- JWT tokens now include `id` and `username`
- `authMiddleware` checks tokens on all protected routes
- `adminMiddleware` for admin-only endpoints
- Token stored in localStorage (7-day expiry)
- Proper authorization checks on all file/folder operations

**Security Improvements:**

- Users can only access their own files/folders
- Admin can view/delete any user (except self)
- Download links now check file ownership
- File deletion validates ownership

---

## 📊 DATABASE SCHEMA

### users.json

```json
[
  {
    "id": 1,
    "username": "harshit",
    "password": "$2a$10$hashedpassword...",
    "isAdmin": true,
    "createdAt": "2025-05-18T00:00:00Z"
  }
]
```

### files.json

```json
[
  {
    "id": "1234567890",
    "userId": 1,
    "name": "photo.jpg",
    "size": 2048000,
    "type": "image/jpeg",
    "fileId": "telegram_file_id",
    "messageId": 12345,
    "folderId": "folder_id_or_null",
    "uploadedBy": "harshit",
    "date": "2025-05-18T10:30:00Z"
  }
]
```

### folders.json

```json
[
  {
    "id": "folder_timestamp",
    "userId": 1,
    "name": "My Projects",
    "parentFolderId": null,
    "createdAt": "2025-05-18T10:00:00Z"
  }
]
```

### shares.json

```json
[
  {
    "id": "share_timestamp",
    "fileId": "file_id",
    "userId": 1,
    "token": "a1b2c3d4e5f6g7h8",
    "createdAt": "2025-05-18T10:15:00Z"
  }
]
```

---

## 🎨 UI/UX IMPROVEMENTS

### Color Scheme (Unchanged - Dark Purple)

- Background: `#08080f`
- Surface 1: `#0f0f1a`
- Accent: `#7c6bff` (Purple)
- Accent 2: `#ff6b9d` (Pink)
- Green: `#4ade80` (For downloads)

### New Components

- **Registration Form**: Dual-tab login/register
- **Folder Navigation**: Breadcrumb trail showing path
- **Share Modal**: Shows link + copy button
- **Folder Modal**: Create new folder input
- **Admin Tables**: Responsive user/file management
- **Admin Badge**: Shows next to admin usernames

### Button Colors

- **Share (🔗)**: Purple button
- **Download (⬇)**: Green button
- **Delete (✕)**: Pink button
- **Folder Actions**: Folder tool buttons in toolbar

---

## 📱 API ENDPOINTS

### Auth

- `POST /api/register` - Create account
- `POST /api/login` - Sign in

### Files (Authenticated)

- `GET /api/files` - List user's files
- `POST /api/upload` - Upload file
- `GET /api/download/:fileId` - Get download URL
- `DELETE /api/files/:id` - Delete file

### Folders (Authenticated)

- `GET /api/folders` - List user's folders
- `POST /api/folders` - Create folder
- `DELETE /api/folders/:id` - Delete folder

### Sharing (Public)

- `POST /api/shares` - Create share token
- `GET /api/shares/:token` - Get file for download (no auth)
- `GET /share/:token` - View in browser

### Admin (Admin Only)

- `GET /api/admin/users` - List all users
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/files` - List all files

---

## 🔒 Security Features

1. **Password Hashing**: Bcryptjs with salt rounds = 10
2. **JWT Tokens**: 7-day expiry
3. **User Isolation**: Users only see own files/folders
4. **Admin Auth**: Middleware checks `isAdmin` flag
5. **File Ownership**: Download/delete checks file.userId
6. **Public Shares**: Unique 16-character tokens
7. **No MongoDB**: All data in JSON (easier for Render free tier)

---

## 🚀 DEPLOYMENT (Render.com Free)

No changes needed! The app still works with:

- Free PostgreSQL or file storage
- Node.js with Express
- Environment variables: `JWT_SECRET`, `BOT_TOKEN`, `CHANNEL_ID`
- No database migrations (JSON only)

**Recommended ENV variables:**

```
JWT_SECRET=your-super-secret-key-min-32-chars
BOT_TOKEN=your-telegram-bot-token
CHANNEL_ID=your-channel-id
PORT=3000
```

---

## 📝 BREAKING CHANGES

⚠️ **Important**: After deployment:

1. **Old files might show as "orphaned"** (no userId)
   - Run this to migrate old files:

   ```bash
   # In server.js, add this migration code on startup:
   const oldFiles = readDB(FILES_DB);
   oldFiles.forEach(f => {
     if (!f.userId) f.userId = 1; // Assign to harshit
   });
   writeDB(FILES_DB, oldFiles);
   ```

2. **Old JWT tokens won't work** - Users need to login again

3. **All users start as regular users** - Create new admins via database edit

---

## 🎯 DEFAULT CREDENTIALS

- **Username**: `harshit`
- **Password**: `driftiq123`
- **Role**: Admin (can see all users/files)

---

## 📂 PROJECT STRUCTURE

```
driftiq/
├── public/
│   └── index.html          (Complete rewrite - 600+ lines)
├── data/
│   ├── users.json          (New: User accounts)
│   ├── files.json          (Updated: Added userId, folderId)
│   ├── folders.json        (New: Folder structure)
│   ├── shares.json         (New: Public share links)
├── server.js               (Rewritten - 200+ new lines)
├── package.json            (No new dependencies)
└── .env                    (Existing env vars still work)
```

---

## ✨ WHAT'S UNCHANGED

- ✅ Telegram as backend storage
- ✅ 2GB file upload limit
- ✅ Dark purple UI style
- ✅ Emoji-based file types
- ✅ Responsive design (works on mobile)
- ✅ No MongoDB/external database
- ✅ Works on Render.com free tier
- ✅ Single-page application (SPA)

---

## 🎓 NEXT FEATURES (Optional)

If you want to add later:

- Image thumbnails (store base64 in files.json)
- Trash/recycle bin
- File versioning
- Sharing with expiry dates
- Download analytics
- Dark mode toggle
- Two-factor authentication

---

## 🐛 TESTING CHECKLIST

- [ ] Register new account ✅
- [ ] Login with new account ✅
- [ ] Upload file to root ✅
- [ ] Create folder ✅
- [ ] Upload file to folder ✅
- [ ] Navigate folder hierarchy ✅
- [ ] Search files across folders ✅
- [ ] Download file ✅
- [ ] Share file + copy link ✅
- [ ] Visit share link (no login) ✅
- [ ] Delete file as owner ✅
- [ ] Delete folder ✅
- [ ] Login as harshit (admin) ✅
- [ ] View admin panel ✅
- [ ] See all users in admin ✅
- [ ] See all files in admin ✅
- [ ] Delete user as admin ✅

---

**Version**: 2.0.0  
**Updated**: May 18, 2025  
**License**: MIT
