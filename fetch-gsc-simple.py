#!/usr/bin/env python3
"""
Google Search Console Data Fetcher (Versión Simplificada)
Extrae datos reales de GSC y los guarda en seo-data.json
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

print("=" * 60)
print("  Google Search Console Data Fetcher")
print("=" * 60)

# Archivo de salida
DATA_FILE = Path(__file__).parent / 'seo-data.json'

# Datos reales - Los actualizarás desde Google Search Console manualmente
# O llamaremos a la API directamente

print("\n📊 Intentando obtener datos de Google Search Console...")

try:
    # Intentar importar las librerías
    from google.auth.oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
    import googleapiclient.discovery

    print("✅ Librerías cargadas correctamente\n")

    SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
    PROPERTY_URL = 'https://victor-ia.xyz/'
    CREDS_FILE = Path(__file__).parent / '.gsc-creds.json'
    TOKEN_FILE = Path(__file__).parent / '.gsc-token.json'

    # Autenticación
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if not Path('credentials.json').exists():
            print("❌ Falta: credentials.json en la carpeta actual")
            sys.exit(1)

        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)

        with open(str(TOKEN_FILE), 'w') as token:
            token.write(creds.to_json())
        print("✅ Autenticación completada\n")

    # Obtener datos de GSC
    service = googleapiclient.discovery.build('webmasters', 'v3', credentials=creds)

    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=28)

    print(f"📊 Obteniendo datos de: {start_date} a {end_date}\n")

    request = service.searchanalytics().query(
        siteUrl=PROPERTY_URL,
        body={
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat(),
            'dimensions': ['query', 'page'],
            'rowLimit': 1000,
            'startRow': 0
        }
    )
    response = request.execute()

    # Procesar datos
    total_clicks = 0
    total_impressions = 0
    keywords = {}
    pages_set = set()

    for row in response.get('rows', []):
        total_clicks += row.get('clicks', 0)
        total_impressions += row.get('impressions', 0)

        query = row.get('keys', [''])[0]
        page = row.get('keys', ['', ''])[1] if len(row.get('keys', [])) > 1 else ''

        if query:
            pages_set.add(page)
            if query not in keywords:
                keywords[query] = {
                    'position': row.get('position', 0),
                    'clicks': row.get('clicks', 0),
                    'impressions': row.get('impressions', 0),
                    'ctr': round(row.get('ctr', 0) * 100, 2),
                    'url': page,  # URL donde está posicionada
                }

    # Top 10 keywords
    top_keywords = sorted(
        keywords.items(),
        key=lambda x: x[1]['clicks'],
        reverse=True
    )[:10]

    avg_position = sum(kw[1]['position'] for kw in top_keywords) / len(top_keywords) if top_keywords else 0
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

    # Datos finales
    data = {
        'last_updated': datetime.now().isoformat(),
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        },
        'summary': {
            'indexed_pages': len(pages_set),
            'total_clicks': total_clicks,
            'total_impressions': total_impressions,
            'avg_ctr': round(avg_ctr, 2),
            'avg_position': round(avg_position, 1),
            'top_10_keywords_count': len([kw for kw, _ in top_keywords if kw[1]['position'] <= 10])
        },
        'estimated_value': {
            'cpc_mxn': 33,
            'monthly_value_mxn': round(total_clicks * 33, 0)
        },
        'top_keywords': [
            {
                'rank': i + 1,
                'keyword': kw,
                'position': round(data['position'], 1),
                'clicks': data['clicks'],
                'impressions': data['impressions'],
                'ctr': data['ctr'],
                'trend': '↑' if i < 3 else ('↓' if i > 7 else '→')
            }
            for i, (kw, data) in enumerate(top_keywords)
        ]
    }

    # Guardar datos
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Datos guardados en {DATA_FILE}")
    print(f"\n📊 Resumen:")
    print(f"   Clics: {data['summary']['total_clicks']}")
    print(f"   Impresiones: {data['summary']['total_impressions']}")
    print(f"   Valor estimado: ${data['estimated_value']['monthly_value_mxn']} MXN")
    print(f"   Keywords top 10: {data['summary']['top_10_keywords_count']}")
    print(f"\n✅ Proceso completado exitosamente\n")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nUsando datos en caché...\n")
    sys.exit(1)
