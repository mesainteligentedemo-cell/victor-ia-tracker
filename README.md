# Victor IA Tracker

**Sistema de tracking de actividad IA para agencias de alto impacto**

![Status](https://img.shields.io/badge/Status-Operativo-green) ![Entradas](https://img.shields.io/badge/Entradas-165+-blue) ![Proyectos](https://img.shields.io/badge/Proyectos-10+-orange) ![Made with Claude Code](https://img.shields.io/badge/Made%20with-Claude%20Code-purple)

Victor IA Tracker es un SaaS de productividad personal que registra y analiza cada hora de trabajo de la agencia: proyectos, clientes, agentes de IA y sesiones. Centraliza 165+ entradas de actividad en tres dashboards (Principal, Analytics, Finanzas) con filtros avanzados, KPIs en tiempo real y exportación de datos. Lo usa Pablo Uribe en Victor IA para tomar decisiones operativas basadas en datos propios, no en estimaciones.

---

## Quick Start

| Opción | Tiempo | Descripción |
|--------|--------|-------------|
| ⚡ **Modo offline** | 2 min | Abre `tracker_live.html` directamente en el navegador. Sin servidor, sin dependencias. |
| 🚀 **Con backend** | 20 min | Clona el repo, configura Firebase ([ver sección](#configuración-de-firebase)) y levanta el servidor local. |
| 🏗️ **Deploy completo** | 30 min | Deploy en Vercel con dominio personalizado ([ver sección](#deploy-en-vercel)). |

---

## Estructura del Proyecto

```
victor-ia-tracker/
│
├── tracker_live.html          # App principal — ~12,000 líneas, todo en uno
├── dashboard.html             # Dashboard analytics con Chart.js (KPIs, tendencias)
├── index.html                 # Landing / login page
│
├── api-endpoints.js           # Endpoints REST para lectura/escritura de entradas
├── api-data-collectors.js     # Recolectores de datos (GSC, analytics, métricas)
├── db-client.js               # Cliente de base de datos (Firestore / local)
├── auth-firebase.js           # Autenticación con Firebase Auth
├── auth-middleware.js         # Middleware de validación de sesión
│
├── schema.sql                 # Schema de base de datos (PostgreSQL compatible)
├── firestore-schema.json      # Schema Firestore para modo cloud
│
├── health-check.py            # Verificación de salud del sistema
├── collect-live-data.py       # Recolector de datos en tiempo real
│
├── OPERACION.md               # Guía operativa 24/7
├── ARCHITECTURE-COMPLETE.md   # Arquitectura técnica completa
├── FIREBASE-AUTH-SETUP.md     # Configuración detallada de Firebase
│
├── vercel.json                # Config de deploy en Vercel
├── package.json               # Dependencias Node
└── .env.local                 # Variables de entorno (no commitear)
```

---

## Features

- **🔍 Filtros avanzados** — por proyecto, cliente, estado, prioridad, fechas y software usado
- **📊 Analytics** — KPIs en tiempo real, tendencias semanales, distribución de categorías
- **🤖 Tracking de 155+ agentes de IA** — cada entrada registra qué agentes participaron
- **📈 3 dashboards** — Principal (actividad), Analytics (tendencias), Finanzas (ingresos/egresos)
- **🔄 Daemon de sesión automático** — registra inicio y fin de sesión sin intervención manual
- **📤 Export** — descarga a CSV y JSON con un clic
- **🔐 Auth con Firebase** — acceso protegido por email/contraseña
- **🌐 PWA-ready** — funciona offline con service worker (`sw.js`)
- **⚡ Sin build** — HTML + JS vanilla, cero proceso de compilación

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| UI | HTML5 + CSS Variables + JS Vanilla |
| Charts | Chart.js 4.4 + Three.js r128 |
| Animaciones | GSAP 3.12.2 + Lenis (smooth scroll) |
| Auth | Firebase Auth |
| Base de datos | Firestore (cloud) / localStorage (offline) |
| Deploy | Vercel (edge, estático) |
| Fuentes | Space Grotesk · Inter · Cormorant |
| Colores | `#070809` fondo · `#FFAA17` acento ámbar |

---

## Configuración de Firebase

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com)
2. Activa **Authentication > Email/Password**
3. Activa **Firestore Database** (modo producción)
4. Copia las credenciales del SDK web en `.env.local`:

```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

Ver guía completa en [`FIREBASE-AUTH-SETUP.md`](FIREBASE-AUTH-SETUP.md).

---

## Cómo agregar entradas

Todas las entradas viven en el array `SEED` dentro de `tracker_live.html`. Para agregar una nueva, inserta un objeto antes del `];` de cierre:

```js
{
  id: 's148',              // ID secuencial (s + número)
  dateKey: '2026-06-20',  // Fecha ISO
  hora: '09:00',          // Hora de inicio HH:MM
  desc: 'Descripción de la actividad',
  cat: 'Desarrollo',      // Categoría
  project: 'Victor IA',   // Nombre del proyecto
  client: 'Interno',      // Cliente o "Interno"
  status: 'Completado',   // Completado | En progreso | Pausado
  priority: 'Alta',       // Alta | Media | Baja
  dur: 1.5,               // Duración en horas decimales
  durSec: 5400,           // dur * 3600 (obligatorio para cálculos)
  tags: ['tag1', 'tag2'], // Tags libres
  rework: 0,              // 1 si fue retrabajo, 0 si no
  obs: '',                // Observaciones cortas
  notes: '',              // Notas internas más largas
  sw: ['claude', 'vscode'],   // Software/herramientas usados
  agentes: ['web-4o']         // Agentes de IA que participaron
}
```

**Regla de ID:** el último ID registrado en el protocolo es `s117`. El siguiente es `s118`, y así sucesivamente.

**Categorías disponibles:** `Desarrollo`, `Diseño`, `Video`, `Marketing`, `Estrategia`, `Administración`, `Reunión`, `Investigación`, `Automatización`, `Contenido`.

---

## Deploy en Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Desde la carpeta del proyecto
vercel deploy

# 3. Asignar dominio personalizado (opcional)
vercel domains add tracker.victor-ia.xyz
```

El proyecto ya incluye `vercel.json` configurado con rutas y headers correctos. Vercel detecta el proyecto como sitio estático y lo despliega en edge automáticamente.

**URL live:** [tracker.victor-ia.xyz](https://tracker.victor-ia.xyz)  
**Repo:** [github.com/mesainteligentedemo-cell/victor-ia-tracker](https://github.com/mesainteligentedemo-cell/victor-ia-tracker)

---

## Compatibilidad

- Chrome 90+ · Firefox 88+ · Safari 14+ · Edge 90+
- Mobile: iOS Safari 14+, Chrome Android
- Sin dependencias de npm para el modo offline (`tracker_live.html` es autocontenido)

---

## Créditos

Built with [Claude Code](https://claude.ai/claude-code) by Anthropic · Victor IA Agency, México · 2026
