# Changelog — Victor IA Tracker

## [2026-07-03] — Security Audit & Hardening

### 🔒 Seguridad

#### API Keys (CRÍTICO)
- ❌ REMOVIDO: Keys hardcodeadas en `index.html`
  - `sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67` (ElevenLabs)
  - `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` (OpenRouter)
- ✅ MOVIDO: A variables de entorno en `.env`
- ✅ NUEVO: Endpoint `/api/config` para obtener keys de forma segura
- ✅ PROTEGIDO: `/api/config` requiere autenticación (Bearer token, cookies, custom header)

#### Autenticación
- ✅ NUEVO: `api/_auth-middleware.js` — Utilidades de autenticación reutilizables
- ✅ PROTEGIDO: `/api/email/debug` ahora requiere autenticación
- ✅ MEJORADO: CORS restringido a `https://tracker.victor-ia.xyz` en endpoints protegidos

#### Rutas & Errores
- ✅ NUEVO: `404.html` — Página de error 404 apropiada
- ✅ MEJORADO: `vercel.json` — Rutas inexistentes devuelven 404 real (no 200)

### ✨ Features

#### Login
- ✅ NUEVO: Botón "¿Olvidaste tu contraseña?" — `auth.sendPasswordResetEmail()`
- ✅ NUEVO: OAuth Apple — `OAuthProvider('apple.com')`
- ✅ MEJORADO: OAuth Google — Habilitado en `login.html`

#### Configuración
- ✅ NUEVO: `loadSettings()` ahora es async y carga keys desde `/api/config`
- ✅ MEJORADO: `init()` es async para esperar a `loadSettings()`

### 📝 Documentación

- ✅ NUEVO: `SECURITY.md` — Guía de cambios de seguridad y verificación
- ✅ NUEVO: `CHANGELOG.md` — Este archivo

### 🗂️ Archivos Modificados

```
✏️  index.html
    - Removidas keys hardcodeadas
    - Agregada carga dinámica de keys desde /api/config
    - init() es async

✏️  login.html
    - Agregado botón de recovery de contraseña
    - Agregado botón OAuth Apple
    - Habilitado botón OAuth Google
    - Implementados manejadores de eventos para Apple y Google

✏️  .env
    - OPENROUTER_API_KEY
    - ELEVENLABS_API_KEY
    - ELEVENLABS_VOICE_ID

✏️  vercel.json
    - Agregado manejo de rutas 404
    - Reescrituras para /login

✏️  api/email/debug.js
    - Agregada autenticación (Bearer, cookies, custom header)
    - CORS restringido

➕ api/config.js (nuevo)
   - Endpoint seguro para obtener configuración
   - Requiere autenticación
   - Devuelve keys desde variables de entorno

➕ api/_auth-middleware.js (nuevo)
   - Utilidades reutilizables de autenticación
   - Exporta: isAuthenticated, unauthorizedResponse, forbiddenResponse, etc.

➕ 404.html (nuevo)
   - Página de error 404 estilizada

➕ SECURITY.md (nuevo)
   - Guía completa de cambios de seguridad
   - Instrucciones de verificación post-deploy

➕ CHANGELOG.md (nuevo)
   - Este archivo
```

---

## Verificación

### Pre-Deploy
- ✅ HTML sin keys (removidas)
- ✅ .env con credenciales correctas
- ✅ /api/config implementado
- ✅ /api/email/debug protegido
- ✅ login.html con OAuth Apple + Recovery
- ✅ 404.html creado
- ✅ vercel.json actualizado

### Post-Deploy
Ver checklist en `SECURITY.md`

---

## Notes

**Importante:** Aunque las keys están en `.env`, siguen siendo las mismas claves de producción. Si sospechas que fueron comprometidas mientras estaban expuestas en el HTML:

1. Rota inmediatamente las keys en:
   - OpenRouter (https://openrouter.ai/keys)
   - ElevenLabs (https://elevenlabs.io/app/settings/api-keys)

2. Actualiza `.env` con las nuevas keys

3. Deploy nuevamente

**Recomendación:** Implementar rotación de keys cada 90 días como best practice.
