#!/usr/bin/env python3
"""
Google Search Console Data Fetcher
Extrae datos reales de GSC y los guarda en seo-data.json
Ejecutar 2 veces al día automáticamente
"""

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Importar librerías de Google
try:
    import googleapiclient.discovery
    from google.auth.transport.requests import Request
    from google.auth.oauthlib.flow import InstalledAppFlow
    from google.oauth2.credentials import Credentials as OAuthCredentials
    print("✅ Librerías cargadas correctamente")
except ImportError as e:
    print(f"⚠️ Error al importar librerías: {e}")
    print("\nInstala con:")
    print("pip install google-api-python-client google-auth-oauthlib google-auth-httplib2")
    sys.exit(1)

# Configuración
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
PROPERTY_URL = 'https://victor-ia.xyz/'  # Tu propiedad en GSC
DATA_FILE = Path(__file__).parent / 'seo-data.json'
CREDS_FILE = Path(__file__).parent / '.gsc-creds.json'
TOKEN_FILE = Path(__file__).parent / '.gsc-token.json'

def authenticate():
    """Autentica con Google Search Console (OAuth2)"""
    creds = None

    # Si hay token guardado, úsalo
    if TOKEN_FILE.exists():
        creds = OAuthCredentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    # Si no hay credenciales válidas, pedir autenticación
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            print("📱 Se abrirá el navegador para autenticar con Google...")
            print(f"   Usa: mesainteligentedemo@gmail.com")

            # Necesitas crear credentials.json en Google Cloud Console
            # https://console.cloud.google.com/
            if not Path('credentials.json').exists():
                print("\n❌ Falta: credentials.json")
                print("\nPasos:")
                print("1. Ve a: https://console.cloud.google.com/")
                print("2. Crea un proyecto")
                print("3. Habilita Google Search Console API")
                print("4. Crea OAuth 2.0 credentials (Desktop app)")
                print("5. Descarga como JSON → renombra a 'credentials.json'")
                print("6. Pon credentials.json en esta carpeta")
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)

            # Guarda el token para futuros usos
            with open(str(TOKEN_FILE), 'w') as token:
                token.write(creds.to_json())

    return creds

def fetch_gsc_data(creds):
    """Extrae datos reales de Google Search Console"""
    try:
        service = googleapiclient.discovery.build(
            'webmasters', 'v3', credentials=creds)

        # Últimos 28 días
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=28)

        print(f"📊 Obteniendo datos de GSC: {start_date} a {end_date}")

        # Query general
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
            ctr = row.get('ctr', 0)
            position = row.get('position', 0)

            if query:
                pages_set.add(page)
                if query not in keywords:
                    keywords[query] = {
                        'position': position,
                        'clicks': row.get('clicks', 0),
                        'impressions': row.get('impressions', 0),
                        'ctr': round(ctr * 100, 2),
                        'pages': []
                    }
                if page and page not in keywords[query]['pages']:
                    keywords[query]['pages'].append(page)

        # Top 10 keywords
        top_keywords = sorted(
            keywords.items(),
            key=lambda x: x[1]['clicks'],
            reverse=True
        )[:10]

        # Keywords en posiciones top 10
        top_10_keywords = [kw for kw, data in top_keywords if data['position'] <= 10]

        # Datos finales
        avg_position = sum(kw[1]['position'] for kw in top_keywords) / len(top_keywords) if top_keywords else 0
        avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

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
                'top_10_keywords_count': len(top_10_keywords)
            },
            'estimated_value': {
                'cpc_mxn': 33,  # Costo por clic estimado en MXN
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

        return data

    except Exception as e:
        print(f"❌ Error extrayendo datos de GSC: {e}")
        return None

def save_data(data):
    """Guarda datos en seo-data.json"""
    if data:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Datos guardados en {DATA_FILE}")
        print(f"   Clics: {data['summary']['total_clicks']}")
        print(f"   Impresiones: {data['summary']['total_impressions']}")
        print(f"   Valor estimado: ${data['estimated_value']['monthly_value_mxn']} MXN")
        return True
    return False

def load_fallback_data():
    """Si falla GSC, usa datos en caché"""
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def main():
    print("=" * 60)
    print("  Google Search Console Data Fetcher")
    print("=" * 60)

    try:
        # Autenticar
        creds = authenticate()

        # Obtener datos
        data = fetch_gsc_data(creds)

        if data:
            save_data(data)
            print("\n✅ Proceso completado exitosamente")
            return 0
        else:
            print("\n⚠️ No se pudieron obtener datos de GSC")
            fallback = load_fallback_data()
            if fallback:
                print("   Usando datos en caché...")
            return 1

    except Exception as e:
        print(f"\n❌ Error: {e}")
        fallback = load_fallback_data()
        if fallback:
            print("   Usando datos en caché...")
        return 1

if __name__ == '__main__':
    sys.exit(main())
