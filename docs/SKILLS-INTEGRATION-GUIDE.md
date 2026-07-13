# Skills Integration Guide — Victor IA Tracker

**Version:** 1.0.0  
**Updated:** 2026-07-12  
**Status:** ✅ Active  

---

## 🎯 Overview

The tracker now integrates with the complete 155-skills ecosystem audit. When you:
- Create a task in the tracker
- Mention a keyword (e.g., "sube fotos", "diseña sitio", "dashboard")
- The tracker automatically suggests relevant skills

This works **seamlessly from the tracker UI** without breaking your workflow.

---

## 📁 Integration Files

### 1. **api/skills-manifest.json**
```
Endpoint: https://tracker.victor-ia.xyz/api/skills-manifest.json
Purpose: Contains complete skills database (155 skills, metadata, triggers)
Auto-loaded: Every time tracker loads
Cache: 1 hour
```

**Includes:**
- All 155 skills with descriptions
- Orchestrators + sub-skills mapping
- Triggers (user keywords → skills)
- 3 new skills (content-audit-seo, design-system-builder, analytics-dashboard-builder)
- Dependencies (Levels 0-3)
- Consolidations (deployment clarity)

### 2. **config/skills-integration.js**
```
Location: /config/skills-integration.js
Purpose: Frontend logic for skills suggestions + workflows
Auto-loaded: With tracker UI
Functionality: Auto-suggest, workflows, validation
```

**Provides:**
- Auto-suggestion engine (user types → skills pop up)
- Workflow definitions (3-step: upload → integrate → deploy)
- Orchestrator handling (auto-invoke sub-skills)
- Sub-skills validation (prevent direct invocation)

### 3. **docs/SKILLS-INTEGRATION-GUIDE.md**
This file. Instructions for using skills in tracker.

---

## 🚀 How to Use in Tracker

### Scenario 1: Upload Photos to Website

**In the tracker, you create a task:**
```
Task: "Sube estas 5 fotos al sitio web"
```

**Tracker automatically:**
1. ✅ Detects trigger: "sube fotos"
2. ✅ Suggests workflow: cloudinary-cdn-media → web-assets-deploy → vercel-deploy-perfecto
3. ✅ Proposes: "Apply 3-step workflow?"
4. ✅ Creates sub-tasks for each step

**Result:** All 3 skills invoked in correct order.

---

### Scenario 2: Design a Landing Page

**In the tracker, you create a task:**
```
Task: "Diseña una landing page luxury para X cliente"
```

**Tracker automatically:**
1. ✅ Detects trigger: "diseña" + "landing"
2. ✅ Identifies orchestrator: web-4o
3. ✅ Suggests: "Use web-4o? (includes copy + design + polish)"
4. ✅ Expands to full workflow

**Result:** web-4o automatically invokes copy-web-pnl → svg-motion → pixel-perfecto.

---

### Scenario 3: Create Analytics Dashboard

**In the tracker, you create a task:**
```
Task: "Crea dashboard de métricas en vivo para Victor IA"
```

**Tracker automatically:**
1. ✅ Detects trigger: "dashboard" + "métricas en vivo"
2. ✅ Suggests: analytics-dashboard-builder (NEW skill 2026-07-12)
3. ✅ Proposes full workflow: GA4 → Dashboard → Deploy

**Result:** All 3 steps created as subtasks.

---

## 📋 Trigger Keywords (Auto-Recognized)

### Video
- "crea video" → motion-design
- "sube video" → cloudinary-cdn-media
- "spot comercial" → motion-design
- "video commercial" → motion-design

### Web
- "diseña sitio" → web-4o
- "crea landing" → web-4o + copy-web-pnl
- "landing page" → web-4o
- "web 4.0" → web-4o

### SEO
- "audita SEO" → content-audit-seo (NEW)
- "rankings" → content-audit-seo
- "Core Web Vitals" → content-audit-seo
- "posicionamiento" → content-audit-seo

### Analytics
- "crea dashboard" → analytics-dashboard-builder (NEW)
- "métricas en vivo" → analytics-dashboard-builder
- "KPI" → analytics-dashboard-builder
- "retention" → analytics-dashboard-builder + cohort-retention-analysis

### Deployment
- "sube fotos" → 3-step workflow (CDN → React → Vercel)
- "deploy" → vercel-deploy-perfecto
- "publica" → vercel-deploy-perfecto

### Design System
- "design system" → design-system-builder (NEW)
- "tokens CSS" → design-system-builder
- "Storybook" → design-system-builder

### Automation
- "automatiza" → n8n-ia-local
- "workflow" → n8n-ia-local
- "scrape" → web-scrape-complete

---

## 🎯 Pre-Defined Workflows

The tracker includes 5 pre-defined workflows. Click to apply all steps at once:

### 1. Photos Upload Workflow
```
Step 1: cloudinary-cdn-media → Upload to CDN
Step 2: web-assets-deploy → Integrate in React
Step 3: vercel-deploy-perfecto → Publish to Vercel
```
**Use when:** Photos need to go from local → website

### 2. Website Design Workflow
```
Step 1: copy-web-pnl → Persuasive copy
Step 2: web-4o → Design + code (auto-includes svg-motion + pixel-perfecto)
Step 3: vercel-deploy-perfecto → Deploy
```
**Use when:** Building landing pages or new sections

### 3. SEO Audit Workflow
```
Step 1: content-audit-seo → 9D audit + roadmap
Step 2: page-speed-optimizer → Core Web Vitals fixes
Step 3: internal-linking-builder → Link strategy
```
**Use when:** Optimizing for search rankings

### 4. Analytics Dashboard Workflow
```
Step 1: ga4-connector → Connect GA4
Step 2: analytics-dashboard-builder → Build dashboard (NEW)
Step 3: vercel-deploy-perfecto → Deploy
```
**Use when:** Setting up KPI dashboards

### 5. Video Production Workflow
```
Step 1: higgsfield-supercomputer → Generate assets
Step 2: motion-design → Create video
Step 3: vercel-deploy-perfecto → Publish
```
**Use when:** Creating commercial or promotional videos

---

## ⚙️ API Usage (For Developers)

### Endpoint: GET /api/skills-manifest.json
```bash
curl https://tracker.victor-ia.xyz/api/skills-manifest.json
```

**Returns:**
```json
{
  "metadata": {...},
  "summary": {...},
  "newSkills": [...],
  "consolidations": {...},
  "architecture": {...},
  "triggers": {...}
}
```

### Frontend Integration Example

```javascript
// Import skills config
const SKILLS_CONFIG = require('./config/skills-integration.js');

// Auto-suggest skills when user types in task description
const taskInput = "Sube estas fotos al sitio";
const suggestedSkills = SKILLS_CONFIG.suggestSkills(taskInput);
// Returns: ['cloudinary-cdn-media', 'web-assets-deploy', 'vercel-deploy-perfecto']

// Get full workflow
const workflow = SKILLS_CONFIG.getWorkflow('photos upload');
// Returns: { steps: [...], description: '3-step media workflow' }

// Check if orchestrator
if (SKILLS_CONFIG.isOrchestrator('web-4o')) {
  // Get ordered workflow
  const order = SKILLS_CONFIG.getOrchestratorWorkflow('web-4o');
  // Returns: ['copy-web-pnl', 'svg-motion', 'web-4o', 'vercel-deploy-perfecto']
}
```

---

## 🔄 Sync & Updates

### Automatic Sync
- **Frequency:** Daily at 08:00 UTC
- **Source:** `~/.claude/projects/c--Users-inbou/memory/skills_master_matrix_155.md`
- **Destination:** `/api/skills-manifest.json`
- **Status:** ✅ Enabled

### Manual Sync (When Needed)
```bash
# Regenerate skills manifest
npm run sync:skills

# Or via CLI
python /scripts/sync-skills-tracker.py
```

### Last Sync
**Date:** 2026-07-12 19:07 UTC  
**Next Sync:** 2026-07-13 08:00 UTC

---

## 📊 Statistics in Tracker

The tracker displays skills metrics:

```
Total Skills Tracked: 155
├─ Orchestrators: 8
├─ Sub-skills: 12
└─ Independent: 135

Status Breakdown:
├─ Functioning: 70% (107)
├─ Ambiguous: 20% (31)
├─ Dead: 5% (10)
└─ Duplicate: 5% (7)

New Skills (2026-07-12):
├─ content-audit-seo
├─ design-system-builder
└─ analytics-dashboard-builder

Audit Score: 9/10 ⭐
```

---

## ⚠️ Important Rules

### ✅ DO:
- ✅ Invoke orchestrators (web-4o, motion-design, etc.)
- ✅ Use auto-suggested workflows
- ✅ Trust tracker's keyword detection
- ✅ Apply multi-step workflows for complex tasks

### ❌ DON'T:
- ❌ Invoke sub-skills directly (copy-web-pnl, pixel-perfecto, svg-motion)
  - These are auto-included in their orchestrator
- ❌ Mix deployment steps (e.g., don't skip cloudinary if you're uploading photos)
- ❌ Use old names (perfect-media-deployment → cloudinary-cdn-media)
- ❌ Ignore tracker's suggestions for better workflows

---

## 📚 Documentation Links (In Tracker)

When viewing a skill in the tracker, these links are available:

1. **Master Matrix** (465 lines)
   - Full audit of all 155 skills
   - See: `skills_master_matrix_155.md`

2. **Deployment Consolidation** (170 lines)
   - Clarifies: CDN vs React vs Vercel
   - See: `skills_deployment_consolidation.md`

3. **Architecture** (in CLAUDE.md)
   - Orchestrators & sub-skills explained
   - Line: 310+ in `~/.claude/CLAUDE.md`

4. **Quick Access Guide**
   - All you need to know in 1 page
   - See: `ACCESO-RAPIDO-SKILLS.md`

5. **Audit Entry** (This Session)
   - Complete record of work done
   - See: `AUDIT-SKILLS-155-2026-07-12.md`

---

## 🆘 Troubleshooting

### Q: I typed "diseña" but skills didn't suggest
**A:** 
- Check if you typed the full trigger (e.g., "diseña sitio")
- Single-word triggers have lower priority
- Try: "diseña sitio web" or "crea landing page"

### Q: Can I invoke svg-motion directly?
**A:** No, it's a sub-skill. Use web-4o instead (which auto-includes svg-motion).
- ❌ "Usa svg-motion"
- ✅ "Usa web-4o" (auto-includes svg-motion)

### Q: What's the difference between cloudinary and web-assets?
**A:** 
- **cloudinary-cdn-media:** Uploads photos to CDN (generates URLs)
- **web-assets-deploy:** Integrates URLs in React (lazy-load, responsive, dark mode)
- Always: cloudinary THEN web-assets THEN vercel

### Q: Where's the old "perfect-media-deployment" skill?
**A:** 
- Renamed to **cloudinary-cdn-media** for clarity
- Old name still works (alias) but use new name for new tasks

### Q: How do I update skills in the tracker?
**A:** 
- Automatic sync daily at 08:00 UTC
- Manual sync: `npm run sync:skills`
- Changes auto-appear in next task creation

---

## 🔗 Quick Links

| Resource | Location |
|---|---|
| Master Matrix | ~/.claude/projects/c--Users-inbou/memory/skills_master_matrix_155.md |
| Deployment Consolidation | ~/.claude/projects/c--Users-inbou/memory/skills_deployment_consolidation.md |
| Quick Access Guide | ~/.claude/proyectos/ACCESO-RAPIDO-SKILLS.md |
| Skills Manifest (API) | /api/skills-manifest.json |
| Config (Frontend) | /config/skills-integration.js |
| Audit Entry | ~/victor-ia-tracker/AUDIT-SKILLS-155-2026-07-12.md |
| Architecture (Global) | ~/.claude/CLAUDE.md (line 310+) |

---

## ✅ Checklist Before Publishing

- [x] skills-manifest.json created
- [x] skills-integration.js created
- [x] Triggers mapped (50+ keywords)
- [x] Workflows defined (5 common tasks)
- [x] API endpoint ready (/api/skills-manifest.json)
- [x] Frontend logic ready (auto-suggest, workflows)
- [x] Documentation complete (this guide)
- [x] Auto-sync configured (daily 08:00 UTC)
- [x] Cache configured (1 hour TTL)

**STATUS: ✅ READY FOR PRODUCTION**

---

## 📞 Support

For issues or questions:
1. Check "Troubleshooting" section above
2. Review documentation links
3. Check tracker's skill tooltips
4. Refer to audit entry: AUDIT-SKILLS-155-2026-07-12.md

**Last Updated:** 2026-07-12  
**Next Review:** 2026-07-19
