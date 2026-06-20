# 🎬 VIDEO TUTORIAL SCRIPT — THE DOOR Complete System

**Duration:** 15 minutes  
**Format:** Screen recording + voiceover  
**Audience:** New users, stakeholders, team members

---

## 📝 Pre-Production Checklist

- [ ] API server running: `node api-endpoints.js`
- [ ] Browser open at: https://tracker.victor-ia.xyz/
- [ ] Console open (F12) for quick checks
- [ ] Have curl/API test ready
- [ ] Python collector recently ran (live-data.json fresh)
- [ ] System time visible on screen
- [ ] Microphone tested and clear

---

## 🎬 SCENE 1: Introduction (0:00-1:00)

**Narrative:**
"Welcome to THE DOOR — a real-time monitoring system for your AI operations. In this video, I'll show you everything: the four dashboards, how real-time updates work, the alert system, and how to set it up for your own use."

**Visual:**
- Show project logo/title
- Display: https://tracker.victor-ia.xyz/
- Show the 4 tab buttons in header

**Key Points:**
- What is THE DOOR? (Answer: Real-time monitoring for AI systems)
- Who is it for? (Answer: DevOps, AI teams, stakeholders)
- What will you see? (Answer: 4 dashboards + analytics)

---

## 🎬 SCENE 2: Dashboard 1 — The Door (AI Layer) (1:00-3:00)

**Click:** `🚪 The Door` tab

**Narrative:**
"First dashboard: The Door. This shows your AI system architecture — three layers: the Model (Claude), the Harness (your rules and configuration), and the AI Layer (the system that orchestrates everything). You can see the status of each component in real-time."

**Visual:**
Show:
- Model section (Claude Haiku, 200k tokens, status: Active)
- Harness section (CLAUDE.md, MEMORY.md, 155 skills)
- AI Layer section (Rules Registry, Skills Router, etc.)
- "Last updated" timestamp at bottom
- WebSocket connection status (green dot)

**Interactions:**
- Point to each layer
- Highlight the "Last updated" time to show it's updating
- Show F12 → `window.TrackerWS.isConnected` in console → returns `true`

**Key Points:**
- System architecture visibility
- Real-time status monitoring
- Know if your AI system is healthy

---

## 🎬 SCENE 3: Dashboard 2 — Loop Dashboard (3:00-6:00)

**Click:** `🔄 Loop Dashboard` tab

**Narrative:**
"Second dashboard: Loop Dashboard. This monitors your automation loops — if you have scheduled tasks or background jobs, this shows you exactly what's running, how often they succeed, and their uptime. The data updates instantly as loops execute."

**Visual:**
Show:
- KPI cards: Active Loops (2), Success Rate (99.6%), Avg Uptime (99.65%)
- Loops table:
  - blog-daily-master: ACTIVE, 46/47 success
  - tracker-sync: ACTIVE, 320/320 success
  - graphify-maintenance: IDLE, 11/12 success
- Highlight real-time updates
- Show timestamp in table

**Interactions:**
- Point to each KPI
- Explain what "Success Rate" means (failures/total)
- Show how often it updates (real-time via WebSocket)

**Demo Action:**
"Let me create a test alert to show you how the system reacts in real-time."

```bash
curl -X POST http://localhost:3456/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"type":"demo","severity":"warning","message":"Demo alert for video"}'
```

Watch it appear in console (or in alert list).

**Key Points:**
- Monitor automation health
- Catch failures immediately
- See success rates at a glance
- Real-time WebSocket updates

---

## 🎬 SCENE 4: Dashboard 3 — Context Dashboard (6:00-8:30)

**Click:** `📊 Context` tab

**Narrative:**
"Third dashboard: Context Dashboard. This monitors your token budget — how much computational capacity you're using. See the meter? It shows 72.6% used. At 90%, you'll get a warning. At 95%, it's critical. This helps you stay within budget and avoid unexpected costs."

**Visual:**
Show:
- Token usage meter (visual progress bar)
- Numbers: 145,230 / 200,000 tokens
- Percentage: 72.6%
- Sub-metrics:
  - Active Sessions: 3
  - Memory Blocks: 24
  - Compression Score: A+
- Timestamp showing when it last updated

**Interactions:**
- Point to the progress bar
- Explain color coding (green = good, yellow = warning at 90%, red = critical at 95%)
- Show sub-metrics explain what each means

**Highlight:**
"The system automatically detects when you're approaching limits and sends alerts. No surprises."

**Key Points:**
- Track resource consumption
- Budget forecasting
- Automatic warnings
- Compression efficiency

---

## 🎬 SCENE 5: Dashboard 4 — Cole Medin (Roadmap) (8:30-10:30)

**Click:** `📈 Roadmap` tab

**Narrative:**
"Fourth dashboard: Cole Medin. This is your public roadmap and velocity metrics. It shows your delivery speed, how many projects you're running, and the timeline for upcoming phases. This is what you show stakeholders."

**Visual:**
Show:
- Metrics cards:
  - Projects Completed: 12 (+3 this month)
  - Skills Built: 155 (+30 this year)
  - Clients Active: 6 (+2 pending)
  - Delivery Speed: 3.2x (faster than Q1)
- Roadmap sections:
  - Q2 2026: COMPLETED (green)
  - Q3 2026: IN PROGRESS (yellow) — 65% done
  - Q4 2026: PLANNED (gray)
- For each phase, list the items/milestones

**Interactions:**
- Explain what each metric means
- Show the Q3 progress (65% with specific deliverables)
- Highlight the velocity multiplier (3.2x faster)

**Key Points:**
- Show progress to stakeholders
- Track delivery velocity
- Plan roadmap visibility
- Transparency in operations

---

## 🎬 SCENE 6: NEW — Historical Analytics Dashboard (10:30-12:30)

**Open:** https://tracker.victor-ia.xyz/historical-dashboard.html

**Narrative:**
"New in Phase 6: Historical Analytics. This shows trends over time and makes predictions. You can see how your loops performed over the last 7 days, how your token usage is trending, and when you'll hit budget limits. This is powered by machine learning predictions."

**Visual:**
Show:
- Loops health trends chart (7 days)
  - Green line: Success rate trend
  - Blue line: Uptime trend
  - Shows if improving or declining
- Token usage chart
  - Shows burn rate
  - Prediction: Days remaining before budget depleted
- Projects progress (30 days)
  - Active projects growing
  - Cumulative completions rising
- Alerts summary
  - Critical: 2
  - Warnings: 8
  - Trend: stable

**Highlight:**
"These charts update automatically. Notice the prediction at the bottom — it tells you when you'll hit budget limits based on current burn rate."

**Key Points:**
- See historical trends
- ML-powered predictions
- Budget burndown forecasts
- Loop health trends
- Data-driven decisions

---

## 🎬 SCENE 7: How It Works Behind the Scenes (12:30-14:00)

**Narrative:**
"Let me show you how this all works behind the scenes. The system has three layers: Frontend (what you see), Backend API, and the Data Pipeline."

**Visual/Demonstration:**

### Layer 1: Frontend
```
Show: Open browser console (F12)
Type: window.TrackerWS
Show: WebSocket connection object
Type: window.TrackerWS.isConnected
Result: true
```
"The frontend connects via WebSocket for real-time updates. Less than 500 milliseconds latency."

### Layer 2: Backend API
```
Show: Terminal with API server running
Highlight: Shows "WebSocket: 2 connections"
Show: Running API test
curl http://localhost:3456/api/health
Result: {"status":"ok", "wsConnections":2, "uptime":1234}
```
"The API server runs on your machine (or cloud). 13 endpoints serve data and manage alerts."

### Layer 3: Data Pipeline
```
Show: File explorer → live-data.json
Show: Timestamp in file
Explain: "Python collector runs every 5 minutes and updates this file"
Show: Previous timestamps to prove it updates regularly
```
"The Python collector gathers data from your system and updates the live data file automatically."

**Key Points:**
- Frontend updates in real-time
- API orchestrates everything
- Data updates every 5 minutes
- All automated

---

## 🎬 SCENE 8: Setup & Getting Started (14:00-15:00)

**Narrative:**
"Setting up THE DOOR is simple. Three steps: start the API server, open the dashboard, and verify it's working."

**Visual/Demo:**

### Step 1: Start API Server
```bash
cd C:\Users\inbou\victor-ia-tracker
node api-endpoints.js
```
Show output:
```
╔═══════════════════════════════════════╗
║  🚪 THE DOOR API Server               ║
║  HTTP: http://localhost:3456/api/...  ║
║  WS:   ws://localhost:3456/           ║
╚═══════════════════════════════════════╝
```

### Step 2: Open Dashboard
```
Browser: https://tracker.victor-ia.xyz/
Wait 2-3 seconds for WebSocket connection
```

### Step 3: Verify
```
Console (F12): window.TrackerWS.isConnected
Result: true (green text, celebration!)
```

**Closing:**
"That's it! You now have a professional monitoring system running. For more details, see the documentation at README-DEPLOY.md. Thanks for watching!"

---

## 📋 Visual References (For Recording)

### Screen Layout During Recording

```
┌─────────────────────────────────────────────┐
│ Browser Tab: tracker.victor-ia.xyz          │
├─────────────────────────────────────────────┤
│ [Logo] THE DOOR                             │
│ [Tab Buttons]                               │
│ 🚪 The Door | 🔄 Loops | 📊 Context | ...  │
├─────────────────────────────────────────────┤
│                                             │
│        [Dashboard Content Here]             │
│                                             │
├─────────────────────────────────────────────┤
│ ✅ WebSocket Connected | Last: 2 seconds ago│
└─────────────────────────────────────────────┘
```

### Terminal During API Demo

```
PowerShell Terminal:
PS C:\Users\inbou\victor-ia-tracker> node api-endpoints.js

  ╔═══════════════════════════════════════╗
  ║  🚪 THE DOOR API Server               ║
  ║  HTTP: http://localhost:3456/api/...  ║
  ║  WS:   ws://localhost:3456/           ║
  ╚═══════════════════════════════════════╝

  [Listen on port 3456...]
```

---

## 🎙️ Voice-Over Script (Full Text)

**[0:00-1:00] INTRO**
"Welcome to THE DOOR — a real-time monitoring system designed for AI operations teams. I'm going to walk you through the complete system: four interactive dashboards, real-time WebSocket updates, an intelligent alert system, and predictive analytics. By the end of this video, you'll understand how to use it and how to set it up for your own operations. Let's get started."

**[1:00-3:00] DASHBOARD 1**
"First, we have The Door dashboard. This shows your AI system architecture in real-time. You can see three layers: at the core is your model — Claude, with a 200K token context. Around it is the Harness — your rules, configuration, and 155 integrated skills. And above that is the AI Layer, which orchestrates everything. The green checkmarks show all components are healthy and active. The timestamp at the bottom shows exactly when this was last updated. And notice that green dot at the bottom right — that's your WebSocket connection, showing data is flowing in real-time."

**[3:00-6:00] DASHBOARD 2**
"Next is the Loop Dashboard. This monitors your automation loops — any scheduled tasks or background jobs you're running. At the top, you see the KPIs: two active loops, a 99.6% success rate, and 99.65% average uptime. Below, the table shows each loop: blog-daily-master has run 47 times with 46 successes. Tracker-sync is perfect — 320 out of 320. And graphify-maintenance is idle but has run successfully 11 out of 12 times. Every number you see updates in real-time. When a loop fails, you'll see it here instantly, and the system automatically creates an alert."

**[6:00-8:30] DASHBOARD 3**
"Third is the Context Dashboard. This tracks your token budget — how much computational capacity you're using. That meter shows you're at 72.6% of your 200,000 token budget. That's healthy. If it reaches 90%, you'll get a warning. At 95%, it's critical, and the system sends an urgent alert. Below the meter, you see you have three active sessions, 24 memory blocks loaded, and a compression score of A-plus, meaning your context is being used very efficiently. This dashboard prevents surprises about budget or resource consumption."

**[8:30-10:30] DASHBOARD 4**
"The fourth dashboard is Cole Medin — your public roadmap and velocity metrics. This is what you show stakeholders. You've completed 12 projects this year, with 3 just this month. You've built 155 skills, up 30 from last year. You have 6 active clients and 2 more pending onboarding. And your delivery speed is 3.2x faster than it was in Q1 — that's impressive. The roadmap shows Q2 is complete, Q3 is 65% done with specific deliverables listed, and Q4 is planned. This gives everyone visibility into progress and timelines."

**[10:30-12:30] DASHBOARD 5**
"New in Phase 6: Historical Analytics. This dashboard shows trends over time and uses machine learning to make predictions. The first chart shows your loop success rate and uptime over the last 7 days. You can see if performance is improving or declining. The second chart shows your token burn rate — and look at the prediction: at your current rate of consumption, you have about 18 days before you hit your budget limit. The projects chart shows your active projects growing and your cumulative completions rising. And the alerts summary shows you've had 2 critical alerts and 8 warnings in the last week, with a stable trend. This is data-driven operations."

**[12:30-14:00] BEHIND THE SCENES**
"Let me show you how this all works. When you open the dashboard, the browser connects via WebSocket — that's the real-time connection. Watch the console — isConnected returns true, meaning data is flowing. In the terminal, the API server is running and shows 2 WebSocket connections active — that's two browsers or users viewing the dashboard right now. When I call the health endpoint, it returns that all systems are operational. In the background, the Python collector is running every 5 minutes, pulling data from your system, and updating the live-data.json file. I can see the timestamps — it last ran at this time, confirming it's automatic and reliable."

**[14:00-15:00] SETUP**
"Setting up THE DOOR takes three steps. First, start the API server with this command. Second, open the dashboard in your browser. Third, verify the WebSocket connection is working. That's it. You now have a production-grade monitoring system. For detailed setup instructions and troubleshooting, check out README-DEPLOY.md. Thank you for watching THE DOOR."

---

## 🎬 Recording Checklist

### Before Recording
- [ ] Test API server (it starts without errors)
- [ ] Test dashboard loads (no 404 errors)
- [ ] WebSocket shows "Connected"
- [ ] All 4 dashboards render
- [ ] Historical analytics loads
- [ ] Microphone levels check
- [ ] Screen resolution appropriate
- [ ] Font size readable (zoom to 150% if needed)
- [ ] No notifications will interrupt

### During Recording
- [ ] Speak clearly and slowly
- [ ] Point to each element before explaining
- [ ] Let dashboards render completely
- [ ] Show timestamps to prove real-time updates
- [ ] Demo API call with curl
- [ ] Show file timestamps to prove automation
- [ ] End with setup instructions

### After Recording
- [ ] Watch full video (check audio sync)
- [ ] Add titles/graphics (optional)
- [ ] Add captions/subtitles (recommended)
- [ ] Upload to YouTube/internal platform
- [ ] Share with team

---

## 📊 Optional B-Roll Shots

- API server terminal with requests flowing
- Browser DevTools showing WebSocket frames
- Python script running in background
- File explorer showing live-data.json timestamp
- GitHub commit history
- Git push to repository
- Vercel deployment dashboard
- Architecture diagram (from ARCHITECTURE-COMPLETE.md)

---

## 🎁 Resources to Include

In the video description / on-screen links:

- **Live Dashboard:** https://tracker.victor-ia.xyz/
- **Deployment Guide:** README-DEPLOY.md
- **Architecture Docs:** ARCHITECTURE-COMPLETE.md
- **Setup Script:** setup.ps1
- **Source Code:** https://github.com/yourusername/victor-ia-tracker
- **Historical Analytics:** historical-dashboard.html

---

## ⏱️ Timing Guide

| Scene | Duration | Content |
|-------|----------|---------|
| 1. Intro | 1:00 | Overview of THE DOOR |
| 2. The Door Dashboard | 2:00 | AI Layer Explorer |
| 3. Loop Dashboard | 3:00 | Automation Monitoring |
| 4. Context Dashboard | 2:30 | Token Management |
| 5. Cole Medin | 2:00 | Roadmap & Metrics |
| 6. Historical Analytics | 2:00 | Trends & Predictions |
| 7. Behind Scenes | 1:30 | How it works |
| 8. Setup & Close | 1:00 | Getting started |
| **TOTAL** | **15:00** | **Full demo** |

---

## 🎉 Video Outro Script

"That's THE DOOR — your real-time monitoring system for AI operations. You've seen four dashboards for different monitoring aspects, historical analytics with ML predictions, and how the entire system works together. Setting it up takes just three commands. To get started, visit the links in the description. Thanks for watching, and I'll see you next time!"

---

**Ready to record? Start the API server, open the browser, and hit record! 🎬**