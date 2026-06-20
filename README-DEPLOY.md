# 🚀 DEPLOYMENT GUIDE — THE DOOR Production

**Status:** Ready for Production ✅  
**Date:** 2026-06-19  
**Last Updated:** 2026-06-19

---

## 🎯 What You'll Deploy

```
✅ Frontend Dashboard (tracker.victor-ia.xyz)
✅ Real-time API Server (WebSocket + REST)
✅ Data Collector (Python + Task Scheduler)
✅ Alert System (n8n integration)
✅ Monitoring Dashboard (4 dashboards)
```

---

## ⚡ Quick Start (5 minutes)

### Windows (Recommended for Local/Dev)

```powershell
# Step 1: Go to tracker directory
cd C:\Users\inbou\victor-ia-tracker

# Step 2: Run complete setup
.\setup-complete.ps1
# This will:
#  - Install npm dependencies
#  - Create .env file
#  - Setup Task Scheduler
#  - Run Python collector once

# Step 3: Start API Server (New Terminal/PowerShell)
node api-endpoints.js
# Keep this running 24/7 in production

# Step 4: Verify everything works
.\verify-deployment.ps1
```

### Linux/Mac

```bash
# Step 1
cd ~/victor-ia-tracker

# Step 2: Install dependencies
npm install express cors ws dotenv nodemon

# Step 3: Setup cron (every 5 minutes)
echo "*/5 * * * * cd $(pwd) && python collect-live-data.py" | crontab -

# Step 4: Create .env
cat > .env << EOF
PORT=3456
N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data
NODE_ENV=production
EOF

# Step 5: Start API Server
node api-endpoints.js
```

---

## 📍 3-Step Deployment

### Step 1: Deploy Frontend (Vercel)

```bash
cd C:\Users\inbou\victor-ia-tracker
git push origin main
# Vercel auto-deploys
# → Live at: https://tracker.victor-ia.xyz/
```

**Time:** ~2 minutes  
**Result:** Frontend dashboard accessible worldwide

### Step 2: Deploy API Server (Railway/Heroku)

#### Option A: Railway (Recommended)

```bash
# 1. Create account at railway.app
# 2. Connect GitHub repo
# 3. Set start command:
#    node api-endpoints.js
# 4. Set environment variables:
#    PORT=3456
#    N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data
# 5. Deploy
```

#### Option B: Heroku

```bash
heroku login
heroku create the-door-api
heroku config:set PORT=3456
heroku config:set N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data
git push heroku main
```

#### Option C: VPS (Digital Ocean / Linode)

```bash
# SSH to your VPS
ssh root@your.vps.ip

# Clone repo
git clone https://github.com/YOUR_REPO/victor-ia-tracker.git
cd victor-ia-tracker

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install dependencies
npm install

# Create .env
cat > .env << EOF
PORT=3456
N8N_WEBHOOK_URL=https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data
NODE_ENV=production
EOF

# Start with PM2
pm2 start api-endpoints.js --name "the-door"
pm2 startup
pm2 save

# Install Python collector cron
pip install -r requirements.txt  # if needed
echo "*/5 * * * * cd /path/to/tracker && python collect-live-data.py" | crontab -

# Setup nginx reverse proxy
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/default
# Add:
# server {
#     listen 80;
#     server_name your.domain.com;
#     location / {
#         proxy_pass http://localhost:3456;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection "upgrade";
#     }
# }

sudo systemctl restart nginx
```

**Time:** ~10 minutes  
**Result:** API server accessible at your-api-domain.com

### Step 3: Configure Python Collector (Automated)

Already done by `setup-complete.ps1`!

**Check status:**
```powershell
Get-ScheduledTask -TaskName "Victor-IA-Collector"
```

---

## 🔧 Post-Deployment Checklist

After deploying, verify everything:

```powershell
# 1. Check API Server
.\verify-deployment.ps1

# 2. Open Dashboard
# https://tracker.victor-ia.xyz/
# (Wait 2-3 seconds for WebSocket connection)

# 3. Browser Console (F12)
window.TrackerWS.isConnected  # → should be true

# 4. Check Loop Dashboard
# Should show active loops with real data

# 5. Check Alerts
# POST http://api.your-domain/api/alerts (test alert)
# Should appear in dashboard instantly

# 6. Check n8n Integration
# Create critical alert
# Should receive email + Telegram notification
```

---

## 📊 Monitoring & Health

### Daily Checks

```powershell
# API Server Status
curl http://localhost:3456/api/health

# Data Freshness
$file = Get-Item .\live-data.json
$age = (Get-Date) - $file.LastWriteTime
Write-Host "live-data.json age: $($age.TotalSeconds)s"
# → Should be < 300 seconds (5 minutes)

# WebSocket Connections
curl http://localhost:3456/api/health | jq .wsConnections
# → Should be > 0 in production
```

### Weekly Tasks

- [ ] Check Task Scheduler still running
- [ ] Verify n8n alerts working (send test alert)
- [ ] Monitor API server logs for errors
- [ ] Check Python collector output (live-data.json)

### Monthly Tasks

- [ ] Review alert history (/api/alerts)
- [ ] Check data storage size (live-data.json)
- [ ] Update dependencies (npm update)
- [ ] Performance analysis (response times, connections)

---

## 🚨 Troubleshooting

### Problem: Dashboard shows "undefined"
**Cause:** WebSocket not connected  
**Fix:**
```powershell
# 1. Check API server is running
netstat -an | grep 3456

# 2. Restart if needed
Stop-Process -Name node -Force
node api-endpoints.js
```

### Problem: Data not updating
**Cause:** Python collector not running  
**Fix:**
```powershell
# Test manually
python collect-live-data.py

# Check output
Get-Content .\live-data.json

# Reschedule if needed
.\setup-complete.ps1
```

### Problem: Alerts not sending
**Cause:** n8n webhook URL wrong  
**Fix:**
```bash
# Check .env
cat .env

# Verify URL is correct
curl -X POST https://n8n.srv1013903.hstgr.cloud/webhook/tracker-data \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Update if needed
node -e "process.env.N8N_WEBHOOK_URL='YOUR_URL'" api-endpoints.js
```

### Problem: High API latency
**Cause:** Too many connections, stale cache  
**Fix:**
```powershell
# Restart API server (quick restart)
Stop-Process -Name node
node api-endpoints.js

# Check cache age
curl http://localhost:3456/api/health | jq .cacheLastUpdated

# Force cache refresh
python collect-live-data.py
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] .env file created with secure secrets
- [ ] n8n webhook URL is secret (not in git)
- [ ] API server runs behind reverse proxy (nginx/AWS)
- [ ] HTTPS enabled on all URLs
- [ ] Firewall configured (only port 443 for HTTPS)
- [ ] Rate limiting enabled (to prevent abuse)
- [ ] Auth added (optional, for sensitive access)
- [ ] Logs rotated to prevent disk full
- [ ] Backups of live-data.json

---

## 📈 Scale to Production

### Current Capacity (Phase 3)

```
- ~100 concurrent WebSocket connections
- 5-second cache refresh
- In-memory storage (no persistence)
- Single server deployment
- Best for: Team of 5-20 people
```

### Phase 4 (Scale)

When you outgrow Phase 3:

```
✅ Add PostgreSQL database
✅ Add Redis for distributed cache
✅ Multi-region deployment
✅ Load balancer (AWS ALB)
✅ CloudFront CDN
✅ Automated backups
✅ Database replication
```

---

## 🎬 After Deployment

### Day 1
- Monitor dashboard for issues
- Verify data updates correctly
- Test alert system

### Week 1
- Monitor performance metrics
- Check Task Scheduler logs
- Verify n8n alerts working

### Month 1
- Analyze usage patterns
- Optimize cache timing if needed
- Consider scaling if needed

---

## 📞 Support

**Issues?** Check:

1. `verify-deployment.ps1` — automated health check
2. API logs: `http://localhost:3456/api/health`
3. Browser console: `window.TrackerWS.isConnected`
4. Task Scheduler: `Get-ScheduledTask -TaskName Victor-IA-Collector`
5. Python output: `live-data.json` timestamp

---

## 📋 Deployment Checklist

- [ ] Run `setup-complete.ps1`
- [ ] Start API server locally
- [ ] Verify with `verify-deployment.ps1`
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway/Heroku/VPS
- [ ] Configure custom domain (optional)
- [ ] Test dashboard access
- [ ] Test WebSocket connection
- [ ] Test alert system
- [ ] Monitor first 24 hours
- [ ] Setup backups
- [ ] Document for team

---

## 🎉 Deployment Complete!

```
✅ Frontend: tracker.victor-ia.xyz
✅ API Server: Running 24/7
✅ Data Collector: Automatic (every 5 min)
✅ Alerts: Real-time
✅ Monitoring: Complete

Status: PRODUCTION READY
```

---

**Questions?** See `ARCHITECTURE-COMPLETE.md` for technical details.  
**Need help?** Review the specific deployment option above.

**Deployed:** [Current Date]  
**Status:** 🟢 LIVE