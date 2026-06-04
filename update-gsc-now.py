#!/usr/bin/env python3
"""
Actualiza datos de GSC AHORA usando el credentials.json
"""

import json
import requests
import sys
from pathlib import Path
from datetime import datetime, timedelta

try:
    from google.auth.oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials
except ImportError:
    print("❌ Instala librerías: pip install google-auth-oauthlib google-api-python-client")
    sys.exit(1)

SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
PROPERTY_URL = 'https://victor-ia.xyz/'
TOKEN_FILE = Path(__file__).parent / '.gsc-token.json'

print("=" * 60)
print("  Actualizando datos de GSC AHORA")
print("=" * 60)

try:
    # Obtener access token
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if not Path('credentials.json').exists():
            print("❌ Falta credentials.json")
            sys.exit(1)

        from google.auth.transport.requests import Request
        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)

        with open(str(TOKEN_FILE), 'w') as token:
            token.write(creds.to_json())
        print("✅ Autenticación completada\n")

    # Obtener datos de GSC
    access_token = creds.token
    print(f"📊 Token obtenido, solicitando datos...")

    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=28)

    url = 'https://www.googleapis.com/webmasters/v3/sites/' + \
          requests.utils.quote(PROPERTY_URL, safe='') + '/searchAnalytics/query'

    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    body = {
        'startDate': start_date.isoformat(),
        'endDate': end_date.isoformat(),
        'dimensions': ['query', 'page'],
        'rowLimit': 1000
    }

    response = requests.post(url, headers=headers, json=body)

    if response.status_code != 200:
        print(f"❌ Error GSC: {response.status_code}")
        print(response.text)
        sys.exit(1)

    data = response.json()
    rows = data.get('rows', [])

    print(f"✅ Obtenidos {len(rows)} resultados de GSC\n")

    # Procesar datos
    total_clicks = 0
    total_impressions = 0
    keywords = {}
    pages_set = set()

    for row in rows:
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
                    'url': page
                }

    # Top 10 keywords
    top_keywords = sorted(
        keywords.items(),
        key=lambda x: x[1]['clicks'],
        reverse=True
    )[:10]

    avg_position = sum(kw[1]['position'] for kw in top_keywords) / len(top_keywords) if top_keywords else 0
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

    gsc_data = {
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
            'monthly_value_mxn': round(total_clicks * 33)
        },
        'top_keywords': [
            {
                'rank': i + 1,
                'keyword': kw,
                'position': round(data['position'], 1),
                'clicks': data['clicks'],
                'impressions': data['impressions'],
                'ctr': data['ctr'],
                'url': data['url'],
                'trend': '↑' if i < 3 else ('↓' if i > 7 else '→')
            }
            for i, (kw, data) in enumerate(top_keywords)
        ]
    }

    # Guardar
    with open('seo-data.json', 'w', encoding='utf-8') as f:
        json.dump(gsc_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Datos guardados en seo-data.json\n")
    print(f"📊 Resumen:")
    print(f"   Clics: {gsc_data['summary']['total_clicks']}")
    print(f"   Impresiones: {gsc_data['summary']['total_impressions']}")
    print(f"   Valor estimado: ${gsc_data['estimated_value']['monthly_value_mxn']} MXN")
    print(f"   Páginas indexadas: {gsc_data['summary']['indexed_pages']}")
    print(f"   Keywords Top 10: {gsc_data['summary']['top_10_keywords_count']}")
    print(f"\n✅ Proceso completado\n")

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
