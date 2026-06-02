# DriftIQ - Step-by-Step Implementation Guide

## Phase 1: Setup & Configuration (1-2 hours)

### Step 1: Clone & Install Dependencies

```bash
# Navigate to project
cd driftiq

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### Step 2: Get Telegram Bot Token

1. Go to Telegram and message **@BotFather**
2. Send `/newbot` command
3. Follow instructions, name it "DriftIQ Bot"
4. Copy the bot token and paste in `.env`

### Step 3: Create Telegram Channel

1. Create a private Telegram channel (for storing files)
2. Add your DriftIQ Bot to the channel as admin
3. Get the channel ID (with minus sign, e.g., `-1001234567890`)
4. Paste in `.env` as `TELEGRAM_CHANNEL_ID`

### Step 4: Setup Supabase Database

1. Go to **supabase.com** and create free account
2. Create new project
3. In **SQL Editor**, paste contents of `database/schema.sql`
4. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY`
5. Paste in `.env`

### Step 5: Generate Secrets

```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate encryption key (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy these into `.env` as `JWT_SECRET` and `ENCRYPTION_KEY`

### Step 6: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to test

---

## Phase 2: Frontend Development (2-3 hours)

### Create Dashboard Page

The dashboard is the main file management interface. Create `frontend/pages/dashboard.html`:

Key sections needed:

- **Sidebar**: File tree, folders, quick navigation
- **Main Area**: File list with search, sort, filter
- **Top Bar**: User menu, storage stats, upload button
- **Modals**: Create folder, share file, settings

### Create Authentication Pages

**Login Page** (`public/index.html`):

- Email and password fields
- "Forgot password" link
- "Sign up" link
- Remember me checkbox
- Dark themed form

**Register Page** (`frontend/pages/register.html`):

- Email, username, password fields
- Password strength indicator
- Terms & conditions
- Redirect to dashboard on success

**Password Reset Pages**:

- Request form (email input)
- Confirm form (token validation, new password)

### Create Admin Panel (`frontend/pages/admin.html`)

Dashboard sections:

- **Analytics Cards**: Total users, files, storage, active users
- **User Management Table**: List, search, delete
- **System Logs**: Activity feed
- **Storage Analytics**: Usage chart

### Create Shared File Access (`frontend/pages/shared.html`)

For public file downloads:

- File preview if possible
- Download button
- Password input (if protected)
- Share info (expiry, downloads remaining)

---

## Phase 3: Backend API Testing (1-2 hours)

### Test Each Endpoint

Use **curl** or **Postman**:

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"Password123!"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Get profile (replace TOKEN with actual JWT)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"

# Upload file
curl -X POST http://localhost:3000/api/files/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@/path/to/file.txt"

# Create folder
curl -X POST http://localhost:3000/api/folders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Folder"}'
```

### Common Issues & Solutions

**"Invalid JWT"**: Check `JWT_SECRET` in `.env`
**Database errors**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
**Telegram errors**: Check bot token and channel ID
**File upload fails**: Check file size limit and allowed types

---

## Phase 4: Frontend Integration (2-3 hours)

### Connect API to Frontend

1. **Auth Flow**:
   - On login, save token to `localStorage`
   - Add token to all API requests
   - Redirect to dashboard on success
   - Show error messages on failure

2. **File Operations**:
   - Load files on dashboard init
   - Implement drag-drop upload
   - Add loading spinners
   - Show upload progress bar

3. **Folder Navigation**:
   - Build folder tree in sidebar
   - Navigate between folders
   - Show current folder path

4. **UI Interactions**:
   - Right-click context menu on files
   - Confirmation dialogs before delete
   - Edit in-place for renaming
   - Toast notifications for success/error

### Example: Login Implementation

```javascript
// Handle login form submit
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const response = await api.login(email, password);
    notify.success("Login successful");
    window.location.href = "/dashboard.html";
  } catch (error) {
    notify.error(error.data?.error || "Login failed");
  }
});
```

---

## Phase 5: Security Hardening (1 hour)

### Implement Security Features

1. **CORS**: Update in `.env`

   ```
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Rate Limiting**: Already configured in backend
   - 100 requests per 15 min (general)
   - 5 login attempts per 15 min

3. **Input Validation**: Already in place via express-validator

4. **HTTPS**: Enable in production (Render handles this)

5. **Secure Headers**: Helmet middleware active

6. **XSS Protection**:
   - Sanitize user input
   - Use innerText instead of innerHTML
   - Escape JSON in templates

---

## Phase 6: Testing & QA (1-2 hours)

### Manual Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] JWT token refreshes
- [ ] File upload successful
- [ ] File download works
- [ ] Create/rename/delete folders
- [ ] Share links work with/without password
- [ ] Storage stats update correctly
- [ ] Admin dashboard shows correct data
- [ ] Error messages are helpful
- [ ] UI works on mobile
- [ ] Dark mode works
- [ ] Loading states visible

### Browser Testing

Test on:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

## Phase 7: Deployment (1-2 hours)

### Deploy to Render

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Production ready build"
   git push origin main
   ```

2. **Create Render Service**
   - Go to `render.com`
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Select `driftiq` repo

3. **Configure**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Copy from `.env`
   - **Instance**: Free or Paid depending on needs

4. **Add Custom Domain**
   - In Render dashboard
   - Add your domain
   - Update DNS records

5. **Setup Database**
   - Supabase stays as cloud service
   - No migration needed
   - All data already in Supabase

6. **Test Production**
   - Visit your deployed URL
   - Test login/upload/download
   - Check error logs

---

## Phase 8: Post-Deployment (Ongoing)

### Monitoring

1. **Check Logs**

   ```bash
   # In Render dashboard
   # Settings → Logs
   ```

2. **Monitor Supabase**
   - Supabase dashboard shows query stats
   - Check storage usage
   - Review auth logs

3. **Performance**
   - Use Chrome DevTools Lighthouse
   - Monitor API response times
   - Check database queries

### Maintenance

- **Backups**: Supabase auto-backs up
- **Updates**: Keep dependencies current
  ```bash
  npm update
  npm audit fix
  ```
- **Logs**: Regularly review for errors
- **Security**: Monitor for vulnerabilities

### Scale as Needed

- **Free tier limits**: Adjust when hitting limits
- **Upgrade Render**: Move to paid instance if needed
- **Upgrade Supabase**: Increase storage/connections
- **Add features**: Implement from FEATURES.md

---

## Troubleshooting Guide

### Common Issues

**Can't login**

- Check `PASSWORD_HASH` is bcrypt format
- Verify JWT_SECRET matches
- Check user exists in database

**File upload fails**

- Check Telegram bot token
- Verify bot has channel access
- Check file size limit

**Slow performance**

- Add indexes to database (done in schema)
- Implement pagination (done in API)
- Cache frequently accessed data
- Compress responses (done with helmet)

**Database errors**

- Check Supabase status
- Verify connection credentials
- Check RLS policies
- Look at Supabase logs

---

## Next Steps After Deployment

1. **Marketing**: Create landing page, share on social media
2. **Monetization**: Add pricing plans, payment processing
3. **Analytics**: Track user behavior, feature usage
4. **Support**: Set up help docs, contact form
5. **Mobile App**: Build iOS/Android apps
6. **Integrations**: Add Google Drive, OneDrive, Dropbox sync

---

For questions or issues, check GitHub issues or create support ticket.
