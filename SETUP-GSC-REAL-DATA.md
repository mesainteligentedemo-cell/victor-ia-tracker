# 📊 Setup Google Search Console Real Data

Integración automática de datos reales de Google Search Console en el dashboard.

## 📋 Requisitos Previos

- Python 3.8+ instalado
- Acceso a Google Search Console de victor-ia.xyz
- Email: `mesainteligentedemo@gmail.com`

## 🚀 Instalación Rápida (5 minutos)

### Paso 1: Crear Credenciales OAuth2 en Google Cloud

1. Ve a: **https://console.cloud.google.com/**

2. **Crear un proyecto nuevo:**
   - Click en "Seleccionar un proyecto"
   - Click en "PROYECTO NUEVO"
   - Nombre: `Victor IA GSC`
   - Click "CREAR"

3. **Habilitar Google Search Console API:**
   - En la barra de búsqueda, busca: `Google Search Console API`
   - Click en el resultado
   - Click en "HABILITAR"

4. **Crear credenciales OAuth 2.0:**
   - Click en "Crear credenciales" (arriba a la derecha)
   - Tipo: `OAuth 2.0`
   - Tipo de aplicación: `Aplicación de escritorio`
   - Nombre: `GSC Fetcher`
   - Click "CREAR"

5. **Descargar JSON:**
   - Click en el ícono de descarga (📥)
   - Guarda como `credentials.json`
   - Pon el archivo en: `C:\Users\inbou\victor-ia-tracker\`

✅ Archivo guardado: `C:\Users\inbou\victor-ia-tracker\credentials.json`

### Paso 2: Instalar Dependencias Python

Abre PowerShell y ejecuta:

```powershell
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

### Paso 3: Ejecutar Script por Primera Vez (Autenticación)

```powershell
python C:\Users\inbou\victor-ia-tracker\fetch-gsc-data.py
```

**¿Qué pasa?**
- Se abrirá el navegador
- Selecciona: `mesainteligentedemo@gmail.com`
- Click "Permitir" para autorizar acceso a Google Search Console
- El script guardará el token automáticamente

**Resultado:**
```
✅ Datos guardados en C:\Users\inbou\victor-ia-tracker\seo-data.json
   Clics: 3847
   Impresiones: 91205
   Valor estimado: $126951 MXN
```

### Paso 4: Configurar Actualización Automática (2 veces al día)

Abre **PowerShell como ADMINISTRADOR** y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\inbou\victor-ia-tracker\setup-gsc-automation.ps1"
```

**¿Qué crea?**
- Tarea: `Victor-IA-GSC-Fetcher-Morning` → 08:00 AM cada día
- Tarea: `Victor-IA-GSC-Fetcher-Afternoon` → 14:00 PM (2:00 PM) cada día

✅ Listo. El script se ejecutará automáticamente 2 veces al día.

## 📊 Verificar que Funciona

1. **Dashboard en vivo:**
   ```
   https://tracker.victor-ia.xyz/actividades-repetitivas.html?tab=seo
   ```

2. **Deberías ver:**
   - 📡 "Datos en vivo desde Google Search Console" en lugar de "Datos de demostración"
   - Los KPIs actualizados con datos reales
   - Timestamp de última actualización

3. **Monitorear logs:**
   ```
   C:\Users\inbou\victor-ia-tracker\gsc-fetch-log.txt
   ```

## 🔧 Troubleshooting

### Error: "credentials.json no encontrado"

**Solución:**
1. Verifica que descargaste el JSON desde Google Cloud Console
2. Renómbralo a: `credentials.json`
3. Pon en: `C:\Users\inbou\victor-ia-tracker\`
4. Intenta de nuevo

### Error: "No permission to access GSC"

**Solución:**
1. Ve a Google Search Console: https://search.google.com/search-console
2. Selecciona la propiedad: `victor-ia.xyz`
3. Verifica que el usuario `mesainteligentedemo@gmail.com` tenga acceso

### Las tareas de Task Scheduler no se ejecutan

**Solución:**
1. Abre "Programador de tareas" (Task Scheduler)
2. Ve a: `\Victor IA\GSC\`
3. Verifica que las tareas existan
4. Haz click derecho → "Ejecutar" para hacer una prueba

### Ver historial de ejecuciones

En Task Scheduler, selecciona una tarea y mira el tab "Historial"

## 📈 Datos que Trae

```json
{
  "summary": {
    "indexed_pages": 87,
    "total_clicks": 3847,
    "total_impressions": 91205,
    "avg_ctr": 4.2,
    "avg_position": 8.5,
    "top_10_keywords_count": 12
  },
  "estimated_value": {
    "cpc_mxn": 33,
    "monthly_value_mxn": 126951
  },
  "top_keywords": [
    {
      "keyword": "IA para empresas México",
      "position": 2,
      "clicks": 524,
      "impressions": 5210,
      "ctr": 8.2,
      "trend": "↑"
    }
    // ... más keywords
  ]
}
```

## 🛑 Remover Automatización (si es necesario)

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\inbou\victor-ia-tracker\setup-gsc-automation.ps1" -Remove
```

## 📞 Soporte

Si hay problemas:

1. Verifica que Python funciona:
   ```powershell
   python --version
   ```

2. Prueba el script manualmente:
   ```powershell
   python C:\Users\inbou\victor-ia-tracker\fetch-gsc-data.py
   ```

3. Revisa los logs en:
   ```
   C:\Users\inbou\victor-ia-tracker\gsc-fetch-log.txt
   ```

---

**Última actualización:** 2026-06-04  
**Dashboard:** https://tracker.victor-ia.xyz/actividades-repetitivas.html?tab=seo  
**Frecuencia:** 2 veces al día (08:00 AM + 14:00 PM)
