# 🔒 Cambios de Seguridad — Victor IA Tracker

## Auditoría (2026-07-03)

Se realizó una auditoría de seguridad completa usando Fable 5. Este documento documenta todos los hallazgos críticos y las correcciones implementadas.

---

## 🔴 Hallazgos Críticos (REMEDIADOS)

### 1. API Keys Expuestas en HTML Cliente
**Problema:** Las claves de ElevenLabs y OpenRouter estaban hardcodeadas en `index.html`.
- `sk_87d5a7899d6c489c94232248c4880a0c4fe317adb3701e67` (ElevenLabs)
- `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` (OpenRouter)

**Solución:**
- ✅ Movidas a variables de entorno `.env`
- ✅ Creado endpoint `/api/config` que devuelve keys de forma segura (requiere autenticación)
- ✅ `index.html` ahora carga las keys desde `/api/config` en lugar de tenerlas hardcodeadas

### 2. Endpoint `/api/email/debug` Público
**Problema:** El endpoint no requería autenticación y exponía metadata del entorno.

**Solución:**
- ✅ Agregada validación de autenticación (Bearer token, cookies, custom header)
- ✅ CORS restringido a `https://tracker.victor-ia.xyz`
- ✅ Endpoint ahora devuelve 401 si no está autenticado

### 3. Auth Solo Client-Side
**Problema:** El HTML completo (1.18 MB) se entregaba sin validación de sesión en servidor.

**Solución:**
- ✅ Protegidas las rutas de API con middleware de autenticación
- ✅ El cliente debe validarse antes de acceder a `/api/config`
- ✅ Las claves solo se devuelven a usuarios autenticados

### 4. Rutas Inexistentes Devolviendo 200
**Problema:** Cualquier ruta inexistente (`/xyz`, `/pagina-que-no-existe`) devolvía HTTP 200 con el HTML completo.

**Solución:**
- ✅ Creada página `404.html`
- ✅ Configurado `vercel.json` para devolver 404 real en rutas inexistentes
- ✅ Las claves API no se sirven en rutas random

---

## ✨ Features Nuevas

### 1. Recovery de Contraseña
- ✅ Botón "¿Olvidaste tu contraseña?" en `login.html`
- ✅ Implementado `auth.sendPasswordResetEmail()` de Firebase
- ✅ Usuario recibe enlace para resetear contraseña

### 2. OAuth Apple
- ✅ Botón "Acceso con Apple" en `login.html`
- ✅ Implementado `OAuthProvider('apple.com')` de Firebase
- ✅ Maneja popup y redirect flows

### 3. OAuth Google (Mejorado)
- ✅ Botón "Acceso con Google" habilitado en `login.html`
- ✅ Configurado con `GoogleAuthProvider`
- ✅ Maneja popup y redirect flows

---

## 📋 Archivos Modificados

### index.html
- ❌ Removidas keys hardcodeadas (línea 8129, 8238-8239)
- ✅ Función `loadSettings()` ahora carga keys desde `/api/config`
- ✅ Función `init()` hecha async para esperar a `loadSettings()`

### login.html
- ✅ Agregado botón "¿Olvidaste tu contraseña?"
- ✅ Agregado botón OAuth Apple
- ✅ Habilitado botón OAuth Google
- ✅ Implementados manejadores de eventos para reset, Apple y Google

### .env
- ✅ `OPENROUTER_API_KEY=sk-or-v1-...`
- ✅ `ELEVENLABS_API_KEY=sk_87d5a...`
- ✅ `ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL`

### Nuevos Archivos
- ✅ `api/config.js` — Endpoint seguro para obtener configuración
- ✅ `api/_auth-middleware.js` — Utilidades de autenticación reutilizables
- ✅ `404.html` — Página de error 404
- ✅ `SECURITY.md` — Este documento

### Archivos Modificados (Seguridad)
- ✅ `api/email/debug.js` — Ahora requiere autenticación
- ✅ `vercel.json` — Agregado manejo de rutas 404

---

## 🔐 Best Practices Implementadas

1. **Keys en Variables de Entorno**
   - Las claves solo existen en `.env` (nunca en código)
   - Se cargan en Vercel como secrets
   - El cliente nunca ve las keys en el HTML

2. **Endpoint de Configuración Seguro**
   - `/api/config` requiere autenticación
   - Solo devuelve la información necesaria
   - CORS restringido

3. **Autenticación Consistente**
   - Middleware centralizado en `api/_auth-middleware.js`
   - Todos los endpoints protegidos validan sesión
   - Soporta múltiples métodos: Bearer, cookies, custom header

4. **Errores Controlados**
   - Rutas inexistentes devuelven 404 real
   - No exponen detalles del sistema
   - Mensajes de error amigables

---

## 🚀 Deploy

Para aplicar estos cambios en producción:

```bash
# 1. Asegura que .env tenga las variables:
# OPENROUTER_API_KEY=...
# ELEVENLABS_API_KEY=...
# ELEVENLABS_VOICE_ID=...

# 2. En Vercel Dashboard:
#    - Vé a Settings > Environment Variables
#    - Agrega las 3 variables anteriores
#    - Guardar

# 3. Deploy
git add .
git commit -m "security: Remover keys hardcodeadas, agregar OAuth Apple, recovery contraseña"
git push origin main

# 4. Vercel automáticamente:
#    - Reconstruye el sitio
#    - Inyecta las variables de entorno
#    - Despliega
```

---

## ✅ Verificación Post-Deploy

Después de desplegar, verifica:

1. **Keys no expuestas**
   ```bash
   curl -s https://tracker.victor-ia.xyz/ | grep "sk_"
   # Debe estar vacío (sin keys)
   ```

2. **Endpoint /api/config protegido**
   ```bash
   curl https://tracker.victor-ia.xyz/api/config
   # Debe devolver 401 Unauthorized

   curl -H "Authorization: Bearer token" https://tracker.victor-ia.xyz/api/config
   # Debe devolver la configuración
   ```

3. **404 real**
   ```bash
   curl -I https://tracker.victor-ia.xyz/pagina-que-no-existe-xyz
   # Debe devolver HTTP 404 (no 200)
   ```

4. **Login funciona**
   - Prueba email/password
   - Prueba "¿Olvidaste tu contraseña?"
   - Prueba OAuth Google
   - Prueba OAuth Apple

---

## 📚 Referencias

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
