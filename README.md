# Victor IA Tracker v2

**Premium Dashboard — Linear.app Dark Mode Style**

## Specs

- **Framework:** HTML5 + Vanilla JS
- **Styling:** CSS Grid + CSS Variables (no build needed)
- **Charts:** Chart.js 4.4.0
- **Animations:** GSAP 3.12.2 + Anime.js + Lenis (smooth scroll)
- **Deployment:** Vercel (static HTML)
- **Status:** Production-ready

## Design System

### Color Palette
```
--black:              #000000
--surface:            #0A0A0A
--surface-light:      #1A1A1A
--accent:             #FFD60A (Amber)
--text-primary:       #FFFFFF
--text-secondary:     #A0A0A0
--border:             rgba(255,255,255,0.05)
--border-light:       rgba(255,255,255,0.08)
```

### Components
- **Topbar:** 58px sticky, gradient background, backdrop blur
- **Filter Bar:** Period selector + custom date range
- **KPI Cards:** Large values (44px), glassmorphism, hover scale
- **Chart Cards:** Line chart (revenue) + Stacked bar chart (projects)
- **Activity Timeline:** Vertical timeline with dots + timestamps
- **Responsive Grid:** 3-col (desktop) → 2-col (tablet) → 1-col (mobile)

## Layout Structure

```
Topbar (sticky, 58px)
├─ Logo + Badge
├─ Nav Tabs (Resumen, Finanzas, Proyectos, Actividad, Agentes)
└─ User Badge

Filter Bar (sticky, 56px)
├─ Period Buttons (Semana, Mes, Trimestre, Año)
└─ Custom Date Range

Content Area (scrollable)
├─ Row 1: 3 KPI Cards (Projects, Revenue, Efficiency)
├─ Row 2: Revenue Chart (2-col) + Activity Timeline (1-col)
├─ Row 3: 3 KPI Cards (Clients, Tasks, Agents)
├─ Row 4: Projects Chart (2-col) + Performance Card (1-col)
└─ Footer: 32px padding
```

## CDN Dependencies

```html
<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800" rel="stylesheet">

<!-- Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0"></script>
<script src="https://unpkg.com/anime@3.2.1/lib/anime.es.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
```

## JavaScript Modules

### `dashboardState`
Tracks current period, active tab, and KPI data.

### `generateActivityTimeline()`
Renders 6 hardcoded activity items with staggered animations.

### `initCharts()`
Initializes two Chart.js instances:
- **revenueChart:** Line chart with dual datasets (Projects + Services)
- **projectsChart:** Stacked horizontal bar chart (On Track vs At Risk)

### Event Listeners
- **Period Buttons:** Update `dashboardState.period` and call `updateCharts()`
- **Nav Tabs:** Update `dashboardState.activeTab` (no tab content switching in v1)

### Lenis Integration
Smooth scroll with custom easing and 1.2s duration.

## Animations

### Cards
- **KPI Cards:** Slide-in left with 0.1–0.35s stagger
- **Chart/Activity Cards:** Fade-in up at 0.4–0.45s
- **Timeline Items:** Fade-in up with 0.08s stagger per item

### Hover States
- **KPI Cards:** Border color change + 2px up scale
- **Period Buttons:** Background + border color on active state
- **Nav Tabs:** Underline accent on active

## Responsive Breakpoints

| Breakpoint | Grid | Changes |
|---|---|---|
| Desktop (> 1400px) | 3-col | Default |
| Tablet (768–1400px) | 2-col | Chart cards span 2 cols |
| Mobile (< 768px) | 1-col | Cards full-width, nav hidden |

## Performance Optimizations

- Zero build process (plain HTML)
- CDN for all dependencies (no npm install)
- CSS Grid for layout (no flexbox container overhead)
- Canvas-based charts (GPU accelerated)
- Hardware-accelerated animations (GSAP, transform+opacity)
- Backdrop blur only on specific elements (performance targeted)

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from this directory
vercel deploy

# Or: git push to connected repo
# Vercel auto-detects static HTML and deploys to edge
```

### Vercel Config (`vercel.json`)
- Static file serving (no API routes)
- SPA fallback (`index.html` for all routes)
- Edge caching enabled by default

## Future Enhancements

- [ ] Tab-based content switching (Finanzas, Proyectos, etc.)
- [ ] Real-time data via WebSocket or API
- [ ] Persistent filters (localStorage)
- [ ] Dark/Light mode toggle
- [ ] Export dashboard to PDF/PNG
- [ ] Mobile sidebar navigation
- [ ] Accessibility audits (WCAG AA)

## File Size

- **index.html:** ~18 KB (minified)
- **Dependencies:** ~500 KB total (chart.js, gsap, lenis via CDN)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Android)

---

**Built with:** Victor IA Dashboard Framework v2  
**Last Updated:** June 3, 2026  
**Status:** Production Ready
