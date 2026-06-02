# DriftIQ - Deployment Guide

## Pre-Deployment Checklist

- [ ] All environment variables set in `.env`
- [ ] Database schema created in Supabase
- [ ] Telegram bot token valid and bot in channel
- [ ] All API endpoints tested locally
- [ ] Frontend pages created and integrated
- [ ] Security headers configured
- [ ] CORS origins updated
- [ ] Git repository created and committed

---

## Option 1: Deploy on Render (Recommended for Free)

### Why Render?

✅ **Free tier available** - Perfect for starting
✅ **Auto-deploys from GitHub** - Just push and it runs
✅ **PostgreSQL included** - We use Supabase instead
✅ **Environment variables** - Easy configuration
✅ **SSL/HTTPS** - Free and automatic
✅ **Custom domains** - Add your domain
✅ **Good uptime** - Production-grade infrastructure

### Step-by-Step Deployment

#### 1. Prepare GitHub Repository

```bash
# Initialize git if not done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - DriftIQ SaaS"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/driftiq.git

# Push to GitHub
git branch -M main
git push -u origin main
```

#### 2. Create Render Account

1. Go to **render.com**
2. Sign up with GitHub account
3. Grant permissions to access your repos

#### 3. Create Web Service

1. In Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Choose your `driftiq` repository
4. Click **"Connect"**

#### 4. Configure Service

Fill in the following:

**Name**: `driftiq-api` (or your preferred name)

**Environment**: `Node`

**Region**: Choose closest to your users

**Branch**: `main`

**Build Command**:

```bash
npm install
```

**Start Command**:

```bash
npm start
```

**Instance Type**: Free (or paid if you want more resources)

#### 5. Add Environment Variables

Click **"Environment"** and add these variables:

```
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
ENCRYPTION_KEY=your_encryption_key

JWT_SECRET=your_jwt_secret
BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHANNEL_ID=-1001234567890
CORS_ORIGIN=https://yourdomain.com

FRONTEND_URL=https://yourdomain.com
```

#### 6. Deploy

1. Click **"Create Web Service"**
2. Render automatically starts building
3. Wait 2-3 minutes for deployment
4. Get your public URL: `https://yourdomain-xxxxx.onrender.com`

#### 7. Test Deployment

```bash
curl https://yourdomain-xxxxx.onrender.com/health
```

Should return: `{"status":"ok","timestamp":"..."}`

#### 8. Add Custom Domain

1. In Render dashboard, go to **"Settings"**
2. Click **"Add Custom Domain"**
3. Enter your domain (e.g., `api.driftiq.com`)
4. Update DNS records as shown:
   - Add CNAME record pointing to Render URL
   - Wait for DNS propagation (5-30 minutes)

#### 9. Update Frontend URLs

In frontend code, update API base URL:

```javascript
// frontend/assets/js/api.js
const API_URL = "https://yourdomain.com/api";
```

---

## Option 2: Deploy on Heroku

### Why Heroku?

✅ Easy deployment
✅ Free tier (limited)
✅ Good documentation
⚠️ Costs after free tier

### Steps

1. **Install Heroku CLI**

   ```bash
   brew install heroku/brew/heroku
   ```

2. **Login to Heroku**

   ```bash
   heroku login
   ```

3. **Create App**

   ```bash
   heroku create your-app-name
   ```

4. **Set Environment Variables**

   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SUPABASE_URL=your_url
   # ... add all variables
   ```

5. **Deploy**

   ```bash
   git push heroku main
   ```

6. **View Logs**
   ```bash
   heroku logs --tail
   ```

---

## Option 3: Self-Hosted (DigitalOcean, AWS, etc.)

### Why Self-Host?

✅ Full control
✅ Potentially cheaper at scale
✅ Custom configurations
⚠️ More maintenance required

### Steps (DigitalOcean Example)

1. **Create Droplet**
   - OS: Ubuntu 22.04
   - Size: $6/month (2GB RAM)
   - Region: Near your users

2. **SSH into Droplet**

   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Dependencies**

   ```bash
   apt update && apt upgrade
   apt install nodejs npm nginx
   ```

4. **Clone Repository**

   ```bash
   cd /var/www
   git clone https://github.com/yourusername/driftiq.git
   cd driftiq
   npm install
   ```

5. **Setup Nginx Reverse Proxy**

   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

6. **Setup PM2 for Process Management**

   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name driftiq
   pm2 startup
   pm2 save
   ```

7. **Setup SSL with Let's Encrypt**

   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

8. **Start Services**
   ```bash
   systemctl start nginx
   systemctl enable nginx
   ```

---

## Production Best Practices

### 1. Environment Configuration

**Never commit `.env` file!**

```bash
# .gitignore should include:
.env
.env.local
.env.*.local
```

Use environment variables for all secrets:

- Database credentials
- JWT secret
- Telegram token
- API keys

### 2. Database Backups

Supabase automatically backs up your database. To manually backup:

```bash
# Export from Supabase dashboard
# Settings → Backups
```

For production, enable automatic daily backups.

### 3. Monitoring & Logging

**In production, check logs regularly:**

- Render: Dashboard → Logs
- Heroku: `heroku logs --tail`
- Self-hosted: `pm2 logs`

**Monitor for:**

- Error spikes
- Performance degradation
- Failed API calls
- Database connection issues

### 4. Performance Optimization

**Already implemented:**

- ✅ Compression with gzip
- ✅ Rate limiting
- ✅ Database indexes
- ✅ Caching headers
- ✅ Input validation

**Additional optimizations:**

- Enable Redis caching for frequently accessed data
- Implement pagination for large datasets
- Compress image uploads
- Use CDN for static assets

### 5. Security Hardening

**Already implemented:**

- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ Input validation & sanitization

**Additional steps:**

- Enable 2FA for admin accounts
- Regular security audits
- Keep dependencies updated
- Monitor for CVEs

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 6. Scaling

When you hit limits:

**Database**

- Upgrade Supabase plan
- Add read replicas
- Optimize queries

**Server**

- Upgrade Render instance
- Add more servers with load balancing
- Implement job queues for heavy tasks

**Storage**

- Implement S3-style storage alongside Telegram
- Archive old files
- Implement cleanup policies

---

## SSL/HTTPS Setup

### On Render

✅ Automatic - included free with custom domain

### On Heroku

✅ Free - included automatically

### On Self-Hosted (DigitalOcean)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew (automatic if installed via apt)
systemctl status certbot.timer
```

---

## Database Setup for Production

### Supabase Configuration

1. **Enable Row-Level Security (RLS)**
   - Already done in schema.sql
   - Verify in Supabase dashboard

2. **Setup Backups**
   - Go to Settings → Database
   - Enable daily automatic backups
   - Set backup retention

3. **Monitor Performance**
   - Check slow queries
   - Optimize N+1 queries
   - Add missing indexes

### Telegram Bot Configuration

1. **Set Webhook** (optional, for receiving messages)

   ```bash
   curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -d "url=https://yourdomain.com/api/telegram/webhook"
   ```

2. **Verify Bot Settings**
   - Check bot is in channel as admin
   - Verify privacy settings allow file access
   - Test file upload/download

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check every 5 minutes
curl -I https://yourdomain.com/health
```

Expected response: `200 OK`

### Database Monitoring

Check these metrics regularly:

- Connection count
- Query performance
- Storage usage
- Backup status

### Application Monitoring

Use these tools:

- **Sentry** (error tracking): Free tier available
- **New Relic** (performance): Free tier available
- **DataDog** (full monitoring): Comprehensive

### Regular Maintenance

- **Weekly**: Review error logs
- **Monthly**: Check for dependency updates
- **Quarterly**: Security audit
- **Annually**: Full system review

---

## Disaster Recovery

### Backup Strategy

1. **Database**: Supabase auto-backups (5+ versions kept)
2. **Code**: GitHub is your backup
3. **Telegram Files**: Stored in Telegram servers

### Recovery Procedures

**If database fails:**

1. Restore latest backup from Supabase
2. Loss: Up to 5 minutes of data

**If application crashes:**

1. Render auto-restarts on failure
2. Check logs for error cause
3. Fix and redeploy

**If Telegram bot token is leaked:**

1. Go to @BotFather
2. Send `/token` and select bot
3. Get new token
4. Update `.env` on Render
5. Restart application

---

## Scaling Checklist

As user base grows:

- [ ] Monitor database connection pool
- [ ] Consider read replicas for Supabase
- [ ] Implement Redis caching
- [ ] Setup CDN for static files
- [ ] Load balance multiple instances
- [ ] Implement job queue for heavy operations
- [ ] Archive old data
- [ ] Monitor and optimize slow queries

---

## Cost Estimation

### Monthly Costs (Estimate)

**Free Tier** (first few users):

- Render: Free
- Supabase: Free ($0)
- Telegram: Free
- **Total: $0**

**Small Users** (100-1000 users):

- Render: $12/month (startup plan)
- Supabase: $25/month (pro plan)
- Domain: $12/year
- **Total: ~$38/month**

**Growing** (1000-10000 users):

- Render: $50/month (add more instances)
- Supabase: $50+/month (scale as needed)
- Domain: $12/year
- Monitoring: $10/month
- **Total: ~$110/month**

---

## Support & Resources

- **Documentation**: Check ARCHITECTURE.md and IMPLEMENTATION.md
- **API Docs**: Available in code comments
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join community for help
- **Email**: support@driftiq.com

---

**Last Updated**: June 2026
**Current Version**: 3.0.0
