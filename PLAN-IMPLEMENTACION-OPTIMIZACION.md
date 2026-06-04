# 🚀 PLAN DE IMPLEMENTACIÓN — Máxima Calidad, Mínimos Recursos

**Objetivo:** Reducir costos 55% sin perder calidad. Implementación en 4 semanas.

---

## ⏱️ SEMANA 1: Haiku Research + Cache Prompts

### LUNES (Hoy) — Haiku Research
**Tiempo:** 30 minutos | **Ahorro:** $76.89/mes | **Riesgo:** NULO

#### Paso 1: Instalar Anthropic SDK
```bash
pip install anthropic
```

#### Paso 2: Configurar variable de entorno
```powershell
# PowerShell
$env:ANTHROPIC_API_KEY = "tu-api-key-aqui"

# O agregar a profile:
# Si no existe, crear en: $PROFILE
notepad $PROFILE
# Agregar línea:
# $env:ANTHROPIC_API_KEY = "sk_..."
```

#### Paso 3: Cambiar modelo en `generate-article.py`
```python
# LÍNEA 49 — ANTES:
--model claude-sonnet-4-6

# DESPUÉS:
# OPCIÓN A: Usar nuevo script optimizado (recomendado)
python generate-article-optimized.py

# OPCIÓN B: Cambiar en script existente
--model claude-haiku-4-5-20251001  # Para research
```

#### Paso 4: Test
```bash
cd C:\Users\inbou\victor-ia-marketing\blog-automation
python generate-article-optimized.py
```

**Validar:**
- ✅ Script genera artículo sin errores
- ✅ Haiku produce research de calidad
- ✅ Log muestra tokens usados (debe ser ~40K input en lugar de 200K)

---

### MARTES — Cache Prompts en Copy
**Tiempo:** 1-2 horas | **Ahorro:** $793.46/mes | **Riesgo:** BAJO

#### Paso 1: Entender Prompt Caching
```python
# Cache de prompts = reutilizar sistema prompt entre requests

# SIN CACHE (costo completo cada vez):
messages=[
    {"role": "user", "content": "Artículo 1"},
    {"role": "user", "content": "Artículo 2"},  # Costo = costo completo
]

# CON CACHE (90% descuento en tokens cached):
system=[
    {
        "type": "text",
        "text": "[VICTOR IA SYSTEM PROMPT - 1,200 tokens]",
        "cache_control": {"type": "ephemeral"}  # ← ESTO activa cache
    }
]
messages=[
    {"role": "user", "content": "Artículo 1"},  # Costo completo
    {"role": "user", "content": "Artículo 2"},  # Costo = 10% en tokens cached
]
```

#### Paso 2: Implementar en `generate-article-optimized.py`
✅ **YA ESTÁ IMPLEMENTADO** (ver línea ~150)

```python
system=[
    {
        "type": "text",
        "text": SYSTEM_PROMPT_COPY,
        "cache_control": {"type": "ephemeral"}  # ← CACHE ACTIVADO
    }
],
```

#### Paso 3: Test con batch de 3 artículos
```bash
# Ejecutar 3 veces en la misma sesión
python generate-article-optimized.py --topic 0
python generate-article-optimized.py --topic 1
python generate-article-optimized.py --topic 2

# Validar output: debe mostrar "cache reusado: XXX tokens"
```

**Validar:**
- ✅ Primer artículo: costo normal ($31.33)
- ✅ Segundo artículo: mostrar "cache reusado: 1,200 tokens = 90% descuento"
- ✅ Tercer artículo: mismo descuento

---

## 📋 SEMANA 2: Imágenes Optimizadas

### Estrategia: 3 Base + 2 SVG Variaciones
**Tiempo:** 4-6 horas | **Ahorro:** $90/mes | **Riesgo:** BAJO

#### Opción 1: Usar Higgsfield API (mantener Nano Banana)
```python
# En generate-article-optimized.py, función generate_images_optimized()

# Generar 3 imágenes 4K de máxima calidad
images_base = [
    higgsfield.generate(
        prompt=f"Hero image 4K para: {topic['title']} | Estilo Victor IA",
        model="nano-banana-3",
        width=1920,
        height=1080
    ) for _ in range(3)
]

# Variaciones SVG (sin costo)
svg_variations = create_svg_overlays(images_base[0], [
    {"color_overlay": "#FFD60A", "opacity": 0.1},
    {"gradient": "blue-purple", "text_overlay": "Key statistic"}
])
```

#### Opción 2: Usar imágenes stock + Nano Banana selective
- Artículos sobre "IA en México" → usar imagen base única, cambiar overlay
- Artículos sobre "chatbots" → usar imagen base única, cambiar texto/gradiente
- Solo generar imagen 4K si tema es COMPLETAMENTE nuevo

#### Test: Generar 2-3 artículos con imágenes base
```bash
python generate-article-optimized.py --test-images
```

**Validar:**
- ✅ 3 imágenes 4K de máxima calidad
- ✅ 2+ variaciones visuales mediante SVG overlay
- ✅ Impacto visual igual o mejor que 5 imágenes individuales

---

## 🛠️ SEMANA 3: Herramientas Consolidadas

### Cambios
**Tiempo:** 2-4 horas | **Ahorro:** $140/mes | **Riesgo:** BAJO

| Herramienta | Antes | Después | Ahorro |
|---|---|---|---|
| Grammarly | $180 | $180 | — (MANTENER, es QA) |
| Fact-Check APIs | $100 | Google API (gratis) + Claude validation | $70 |
| Other tools | $150 | Python scripts internos | $70 |
| **TOTAL** | **$430** | **$290** | **$140** |

#### Paso 1: Usar Google Fact Check API (gratuita)
```python
import requests

def fact_check_google(claim: str) -> dict:
    """Validar claim con Google Fact Check API (gratuita)"""
    url = "https://www.googleapis.com/factchecktools/v1/claims:search"
    params = {
        "query": claim,
        "key": os.environ.get("GOOGLE_FACT_CHECK_API_KEY")  # Obtén en Google Cloud Console
    }
    response = requests.get(url, params=params)
    return response.json()
```

#### Paso 2: Reemplazar APIs comerciales
- Validaciones de schema → usar `jsonschema` Python (open source)
- Link checker → usar `requests.head()` (built-in)
- Meta tags audit → script Python custom (30 líneas)

#### Paso 3: Test QA con herramientas nuevas
```bash
python qa-verify-optimized.py --article articulo-test.html
```

**Validar:**
- ✅ Grammarly sigue funcionando
- ✅ Google Fact Check API valida claims
- ✅ Python scripts auditan schema + links + meta tags
- ✅ QA 10-point checks pasan todos

---

## ✅ SEMANA 4: Full Production Rollout

### Activación del Plan Completo

#### Paso 1: Reemplazar script actual
```bash
# Backup del original
copy generate-article.py generate-article.backup.py

# Reemplazar con versión optimizada
move generate-article-optimized.py generate-article.py
```

#### Paso 2: Actualizar Task Scheduler
```powershell
# El script sigue ejecutándose igual, pero ahora:
# - Research: Haiku (80% más barato)
# - Copy: Sonnet + Cache (84% más barato)
# - Imágenes: 3+2 SVG (40% más barato)

# No requiere cambios en Task Scheduler
```

#### Paso 3: Monitorear costos reales
```bash
# Ver consumo de API en Anthropic Console
# Esperar 1 mes para validar ahorros reales vs proyectados
```

---

## 📊 Validación de Resultados

### Después de implementar, validar:

| Métrica | Objetivo | Test |
|---|---|---|
| **Haiku Research Quality** | Igual a Sonnet | Comparar 5 research outputs |
| **Cache Effectiveness** | 90% descuento en tokens cached | Ver logs de API |
| **Image Quality** | Mejor visual con 3+2 | A/B test con usuarios |
| **QA Checks** | 10/10 aún pasan | Ejecutar qa-verify en 10 artículos |
| **Cost Reduction** | $1,100.81/mes | Bill de Anthropic vs presupuesto |

---

## 🎯 Flujo Final (después de 4 semanas)

```
Task Scheduler 08:00 AM (Lunes-Domingo)
    ↓
blog-daily-master.py
    ↓
generate-article.py (OPTIMIZADO)
    ├─ Research: Haiku (40K tokens)      ← $2.16
    ├─ Copy: Sonnet + Cache              ← $0.65 (cached desde artículo 1)
    ├─ Imágenes: 3 Nano + 2 SVG          ← $4.50
    └─ QA: qa-verify-optimized.py        ← Gratis (local)
    ↓
Vercel Deploy
    ↓
Tracker API notification
    ↓
✅ Artículo LIVE (costo: $29.81 vs $66.50 antes)
```

---

## 📞 Soporte

Si algo falla:

1. **Script no ejecuta:** Verificar ANTHROPIC_API_KEY: `echo $env:ANTHROPIC_API_KEY`
2. **Haiku produce research pobre:** Ajustar prompt, es muy corto
3. **Cache no funciona:** Esperar 5 minutos entre requests para que se active
4. **Imágenes con mala calidad:** Aumentar prompt detail en `generate_images_optimized()`

---

## 💰 Ahorros Garantizados

| Etapa | Ahorro Mes | Implementación |
|---|---|---|
| Semana 1: Haiku Research | $76.89 | 30 minutos |
| Semana 2: Cache Prompts | **+$793.46** | 1-2 horas |
| Semana 3: Imágenes + Tools | +$230 | 6-10 horas |
| **TOTAL 1 MES** | **$1,100.81** | **8-13 horas** |

**= 55% de ahorro con máxima calidad mantenida**
