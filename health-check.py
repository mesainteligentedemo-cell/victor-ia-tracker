#!/usr/bin/env python3
"""
Victor IA Tracker — Health Check
Verifica el estado del sistema y genera un reporte HTML o JSON.

Uso:
    python health-check.py           # Genera health-report.html + console output
    python health-check.py --json    # Solo JSON en stdout
"""

import sys
import os
import re
import json
import argparse
import subprocess
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# Force UTF-8 output on Windows to avoid cp1252 encoding issues
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass  # Python < 3.7 fallback

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR        = Path(__file__).parent.resolve()
TRACKER_LOCAL     = SCRIPT_DIR / "tracker_live.html"
TRACKER_PRIMARY   = Path(r"C:\Users\inbou\.agents\tracker_live.html")
DASHBOARD_HTML    = SCRIPT_DIR / "dashboard.html"
INDEX_HTML        = SCRIPT_DIR / "index.html"
AUTO_BACKUP_PY    = SCRIPT_DIR / "auto-backup.py"
VALIDATOR_PY      = SCRIPT_DIR / "validator.py"
PARSE_TRACKER_PY  = Path(r"C:\Users\inbou\.agents\parse_tracker.py")
REPORT_OUT        = SCRIPT_DIR / "health-report.html"

GITHUB_REPO_URL   = "https://github.com/mesainteligentedemo-cell/victor-ia-tracker"
TRACKER_LIVE_URL  = "https://tracker.victor-ia.xyz"

# ─── ANSI colors for console ──────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):   return f"{GREEN}✅  {msg}{RESET}"
def fail(msg): return f"{RED}❌  {msg}{RESET}"
def warn(msg): return f"{YELLOW}⚠️   {msg}{RESET}"
def info(msg): return f"{CYAN}ℹ️   {msg}{RESET}"


# ─── Utilities ────────────────────────────────────────────────────────────────

def http_check(url: str, timeout: int = 8) -> tuple[bool, str]:
    """Return (success, detail_string). Gracefully handles all errors."""
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": "VictorIA-HealthCheck/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = resp.getcode()
            return (code == 200, f"HTTP {code}")
    except urllib.error.HTTPError as e:
        return (False, f"HTTP {e.code} {e.reason}")
    except urllib.error.URLError as e:
        return (False, f"URL error: {e.reason}")
    except Exception as e:
        return (False, f"Error: {e}")


def extract_seed_block(html_path: Path) -> str | None:
    """Extract the JS content of const SEED = [...] from HTML."""
    try:
        content = html_path.read_text(encoding="utf-8-sig", errors="replace")
        match = re.search(r'const\s+SEED\s*=\s*(\[)', content)
        if not match:
            return None
        start = match.start(1)
        depth = 0
        end = start
        for i in range(start, len(content)):
            if content[i] == '[':
                depth += 1
            elif content[i] == ']':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        return content[start:end] if depth == 0 else None
    except Exception:
        return None


def count_seed_entries(seed_block: str) -> int:
    """Fast count of entries by counting id:'s patterns."""
    if not seed_block:
        return 0
    return len(re.findall(r"id\s*:\s*['\"]s\d+['\"]", seed_block))


def get_last_entry_id(seed_block: str) -> str | None:
    """Get the last id found in the SEED block."""
    if not seed_block:
        return None
    matches = re.findall(r"id\s*:\s*['\"]([^'\"]+)['\"]", seed_block)
    return matches[-1] if matches else None


def get_date_range(seed_block: str) -> tuple[str | None, str | None]:
    """Get first and last dateKey values from SEED block."""
    if not seed_block:
        return None, None
    dates = re.findall(r"dateKey\s*:\s*['\"](\d{4}-\d{2}-\d{2})['\"]", seed_block)
    if not dates:
        return None, None
    return dates[0], dates[-1]


def python_available() -> tuple[bool, str]:
    """Check if Python 3 is available and return version string."""
    for cmd in ["python", "python3", "py"]:
        try:
            result = subprocess.run(
                [cmd, "--version"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                version = (result.stdout or result.stderr).strip()
                if "Python 3" in version:
                    return True, f"{version} ({cmd})"
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return False, "Python 3 not found in PATH"


# ─── Checks ──────────────────────────────────────────────────────────────────

def run_checks() -> list[dict]:
    """
    Run all health checks. Returns list of dicts:
    {name, status (pass|fail|warn|skip), detail, category}
    """
    results = []

    def add(name, status, detail, category="system"):
        results.append({"name": name, "status": status, "detail": detail, "category": category})

    # ── 1. Primary tracker_live.html (in .agents/) ───────────────────────────
    if TRACKER_PRIMARY.exists():
        size_kb = TRACKER_PRIMARY.stat().st_size // 1024
        add("tracker_live.html (primario)",
            "pass", f"Existe | {size_kb} KB | {TRACKER_PRIMARY}", "archivos")
    else:
        add("tracker_live.html (primario)",
            "fail", f"No encontrado: {TRACKER_PRIMARY}", "archivos")

    # ── 2. Local tracker_live.html (in repo) ─────────────────────────────────
    if TRACKER_LOCAL.exists():
        size_kb = TRACKER_LOCAL.stat().st_size // 1024
        add("tracker_live.html (repo local)",
            "pass", f"Existe | {size_kb} KB | {TRACKER_LOCAL}", "archivos")
    else:
        add("tracker_live.html (repo local)",
            "warn", f"No encontrado en repo: {TRACKER_LOCAL} (se usa el primario)", "archivos")

    # ── 3. SEED array with entries ────────────────────────────────────────────
    tracker_to_use = TRACKER_PRIMARY if TRACKER_PRIMARY.exists() else (
                     TRACKER_LOCAL if TRACKER_LOCAL.exists() else None)

    seed_block   = None
    seed_count   = 0
    last_id      = None
    date_first   = None
    date_last    = None

    if tracker_to_use:
        seed_block = extract_seed_block(tracker_to_use)
        if seed_block:
            seed_count = count_seed_entries(seed_block)
            last_id    = get_last_entry_id(seed_block)
            date_first, date_last = get_date_range(seed_block)
            add("SEED array — datos presentes",
                "pass" if seed_count > 0 else "fail",
                f"{seed_count} entradas | ultimo ID: {last_id} | "
                f"rango: {date_first} a {date_last}",
                "datos")
        else:
            add("SEED array — datos presentes",
                "fail", "No se encontró 'const SEED = [' en el HTML", "datos")
    else:
        add("SEED array — datos presentes",
            "fail", "Sin archivo tracker_live.html para analizar", "datos")

    # ── 4. JSON/data valid (at least parseable count) ─────────────────────────
    if seed_block:
        if seed_count > 0:
            add("JSON/data válido",
                "pass",
                f"{seed_count} entradas detectadas con patrón id:sXXX", "datos")
        else:
            add("JSON/data válido",
                "fail", "SEED array vacío o sin entradas válidas", "datos")
    else:
        add("JSON/data válido", "fail", "No hay SEED block para validar", "datos")

    # ── 5. Required files ─────────────────────────────────────────────────────
    required_files = {
        "dashboard.html": DASHBOARD_HTML,
        "index.html":     INDEX_HTML,
        "auto-backup.py": AUTO_BACKUP_PY,
        "validator.py":   VALIDATOR_PY,
    }
    for fname, fpath in required_files.items():
        if fpath.exists():
            size_kb = fpath.stat().st_size // 1024
            add(f"Archivo: {fname}",
                "pass", f"Existe | {size_kb} KB", "archivos")
        else:
            # auto-backup and validator are optional (new scripts)
            status = "warn" if fname in ("auto-backup.py", "validator.py") else "fail"
            add(f"Archivo: {fname}", status, f"No encontrado: {fpath}", "archivos")

    # ── 6. parse_tracker.py ───────────────────────────────────────────────────
    if PARSE_TRACKER_PY.exists():
        add("parse_tracker.py (.agents/)",
            "pass", f"Existe · {PARSE_TRACKER_PY}", "archivos")
    else:
        add("parse_tracker.py (.agents/)",
            "warn", f"No encontrado: {PARSE_TRACKER_PY}", "archivos")

    # ── 7. Python 3 available ─────────────────────────────────────────────────
    py_ok, py_detail = python_available()
    add("Python 3 disponible",
        "pass" if py_ok else "fail", py_detail, "runtime")

    # ── 8. GitHub repo accessible ─────────────────────────────────────────────
    gh_ok, gh_detail = http_check(GITHUB_REPO_URL)
    if gh_ok:
        add("GitHub repo accesible", "pass", f"{GITHUB_REPO_URL} → {gh_detail}", "red")
    else:
        add("GitHub repo accesible",
            "warn",
            f"{GITHUB_REPO_URL} → {gh_detail} (puede ser rate-limit o red)", "red")

    # ── 9. tracker.victor-ia.xyz ─────────────────────────────────────────────
    live_ok, live_detail = http_check(TRACKER_LIVE_URL)
    if live_ok:
        add("tracker.victor-ia.xyz (live)", "pass",
            f"{TRACKER_LIVE_URL} → {live_detail}", "red")
    else:
        add("tracker.victor-ia.xyz (live)",
            "warn" if "timed out" in live_detail.lower() else "warn",
            f"{TRACKER_LIVE_URL} → {live_detail} (skip si dominio no está activo)", "red")

    # ── 10. Daemon — Python files for daemon initiation ───────────────────────
    daemon_files = [AUTO_BACKUP_PY, PARSE_TRACKER_PY]
    daemon_ready = py_ok and any(f.exists() for f in daemon_files)
    daemon_detail = []
    if not py_ok:
        daemon_detail.append("Python 3 no disponible")
    if not AUTO_BACKUP_PY.exists():
        daemon_detail.append("auto-backup.py no existe aún")
    if daemon_ready:
        add("Daemon puede iniciarse",
            "pass",
            "Python 3 OK + archivos de soporte presentes", "runtime")
    else:
        add("Daemon puede iniciarse",
            "warn",
            "; ".join(daemon_detail) if daemon_detail else "Faltan dependencias", "runtime")

    return results


# ─── Reporting ────────────────────────────────────────────────────────────────

def console_report(results: list[dict], timestamp: str):
    """Print colorful console output."""
    passed = sum(1 for r in results if r["status"] == "pass")
    total  = len(results)

    print(f"\n{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{BOLD}  VICTOR IA TRACKER — HEALTH CHECK{RESET}")
    print(f"  {timestamp}")
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")

    # Group by category
    categories = {}
    for r in results:
        cat = r.get("category", "misc")
        categories.setdefault(cat, []).append(r)

    cat_labels = {
        "archivos": "📁  Archivos del sistema",
        "datos":    "📊  Integridad de datos",
        "runtime":  "⚡  Runtime & Daemon",
        "red":      "🌐  Conectividad",
    }

    for cat, label in cat_labels.items():
        if cat not in categories:
            continue
        print(f"  {BOLD}{label}{RESET}")
        for r in categories[cat]:
            if r["status"] == "pass":
                icon = ok(r["name"])
            elif r["status"] == "fail":
                icon = fail(r["name"])
            elif r["status"] == "warn":
                icon = warn(r["name"])
            else:
                icon = info(r["name"])
            print(f"    {icon}")
            print(f"       {r['detail']}")
        print()

    # Summary
    color = GREEN if passed == total else (YELLOW if passed >= total * 0.7 else RED)
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"  {color}{BOLD}RESULTADO: {passed}/{total} checks pasados{RESET}")
    if passed < total:
        failed = [r for r in results if r["status"] == "fail"]
        warned = [r for r in results if r["status"] == "warn"]
        if failed:
            print(f"  {RED}Errores: {len(failed)}{RESET}")
        if warned:
            print(f"  {YELLOW}Advertencias: {len(warned)}{RESET}")
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def build_html_report(results: list[dict], timestamp: str) -> str:
    """Build a beautiful self-contained HTML report."""
    passed  = sum(1 for r in results if r["status"] == "pass")
    failed  = sum(1 for r in results if r["status"] == "fail")
    warned  = sum(1 for r in results if r["status"] == "warn")
    total   = len(results)

    if failed == 0:
        summary_color = "#22c55e"
        summary_text  = "Sistema saludable"
        summary_icon  = "✅"
    elif failed <= 2:
        summary_color = "#FFAA17"
        summary_text  = "Atención requerida"
        summary_icon  = "⚠️"
    else:
        summary_color = "#ef4444"
        summary_text  = "Errores críticos"
        summary_icon  = "❌"

    def row_html(r):
        if r["status"] == "pass":
            icon = "✅"; color = "#22c55e"; bg = "rgba(34,197,94,0.07)"
        elif r["status"] == "fail":
            icon = "❌"; color = "#ef4444"; bg = "rgba(239,68,68,0.07)"
        elif r["status"] == "warn":
            icon = "⚠️"; color = "#FFAA17"; bg = "rgba(255,170,23,0.07)"
        else:
            icon = "ℹ️"; color = "#60a5fa"; bg = "rgba(96,165,250,0.07)"

        name_esc   = r["name"].replace("<", "&lt;").replace(">", "&gt;")
        detail_esc = r["detail"].replace("<", "&lt;").replace(">", "&gt;")
        status_label = {"pass": "PASS", "fail": "FAIL", "warn": "WARN", "skip": "SKIP"}.get(r["status"], r["status"].upper())

        return f"""
        <tr style="background:{bg}; border-bottom:1px solid rgba(255,255,255,0.04);">
          <td style="padding:12px 16px; text-align:center; font-size:18px;">{icon}</td>
          <td style="padding:12px 16px;">
            <span style="color:#f0f0f0; font-weight:500;">{name_esc}</span>
          </td>
          <td style="padding:12px 8px; text-align:center;">
            <span style="background:{color}22; color:{color}; border:1px solid {color}44;
                         border-radius:4px; padding:2px 8px; font-size:11px;
                         font-weight:600; letter-spacing:.5px;">{status_label}</span>
          </td>
          <td style="padding:12px 16px; color:#9ca3af; font-size:13px; font-family:monospace;">
            {detail_esc}
          </td>
        </tr>"""

    rows_html = "\n".join(row_html(r) for r in results)

    # Category section headers
    cat_order = ["archivos", "datos", "runtime", "red"]
    cat_labels = {
        "archivos": "📁 Archivos del sistema",
        "datos":    "📊 Integridad de datos",
        "runtime":  "⚡ Runtime & Daemon",
        "red":      "🌐 Conectividad",
    }

    # Build rows grouped by category
    cats: dict[str, list] = {}
    for r in results:
        cats.setdefault(r.get("category", "misc"), []).append(r)

    sections_html = ""
    for cat in cat_order:
        if cat not in cats:
            continue
        label = cat_labels.get(cat, cat)
        sections_html += f"""
        <tr>
          <td colspan="4" style="padding:20px 16px 8px; color:#FFAA17;
                                  font-size:11px; font-weight:600;
                                  letter-spacing:1.5px; text-transform:uppercase;
                                  border-bottom:1px solid rgba(255,170,23,0.2);">
            {label}
          </td>
        </tr>"""
        for r in cats[cat]:
            sections_html += row_html(r)

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Victor IA Tracker — Health Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #070809;
      color: #e5e7eb;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      min-height: 100vh;
      padding: 40px 20px;
    }}
    .container {{
      max-width: 900px;
      margin: 0 auto;
    }}
    .header {{
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255,170,23,0.2);
    }}
    .header-logo {{
      width: 48px; height: 48px;
      background: linear-gradient(135deg, #FFAA17, #ff6b00);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
    }}
    .header-title {{ font-size: 22px; font-weight: 600; color: #fff; }}
    .header-sub   {{ font-size: 13px; color: #6b7280; margin-top: 2px; }}
    .summary-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }}
    .summary-card {{
      background: #0d0f10;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 20px;
    }}
    .summary-card .label {{
      font-size: 11px; font-weight: 600;
      letter-spacing: 1px; text-transform: uppercase;
      color: #6b7280; margin-bottom: 8px;
    }}
    .summary-card .value {{
      font-size: 32px; font-weight: 700;
    }}
    .summary-card .sub {{
      font-size: 12px; color: #6b7280; margin-top: 4px;
    }}
    .status-card {{
      background: #0d0f10;
      border: 1px solid {summary_color}44;
      border-left: 4px solid {summary_color};
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }}
    .status-icon {{ font-size: 32px; }}
    .status-text {{ font-size: 20px; font-weight: 600; color: {summary_color}; }}
    .status-sub  {{ font-size: 13px; color: #6b7280; margin-top: 2px; }}
    .table-wrapper {{
      background: #0d0f10;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      overflow: hidden;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
    }}
    th {{
      padding: 12px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #6b7280;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }}
    tr:last-child td {{ border-bottom: none !important; }}
    .footer {{
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #374151;
    }}
    .timestamp {{
      display: inline-block;
      background: rgba(255,170,23,0.1);
      color: #FFAA17;
      border: 1px solid rgba(255,170,23,0.2);
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 500;
    }}
  </style>
</head>
<body>
  <div class="container">

    <div class="header">
      <div class="header-logo">⚡</div>
      <div>
        <div class="header-title">Victor IA Tracker — Health Report</div>
        <div class="header-sub">Diagnóstico completo del sistema de tracking</div>
      </div>
      <div style="margin-left:auto;">
        <span class="timestamp">{timestamp}</span>
      </div>
    </div>

    <div class="status-card">
      <div class="status-icon">{summary_icon}</div>
      <div>
        <div class="status-text">{summary_text}</div>
        <div class="status-sub">{passed}/{total} verificaciones completadas correctamente</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total checks</div>
        <div class="value" style="color:#f0f0f0;">{total}</div>
        <div class="sub">Verificaciones realizadas</div>
      </div>
      <div class="summary-card">
        <div class="label">Passed</div>
        <div class="value" style="color:#22c55e;">{passed}</div>
        <div class="sub">Sin errores</div>
      </div>
      <div class="summary-card">
        <div class="label">Warnings</div>
        <div class="value" style="color:#FFAA17;">{warned}</div>
        <div class="sub">Requieren atención</div>
      </div>
      <div class="summary-card">
        <div class="label">Failed</div>
        <div class="value" style="color:#ef4444;">{failed}</div>
        <div class="sub">Errores críticos</div>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width:48px;"></th>
            <th>Verificación</th>
            <th style="width:80px;">Estado</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {sections_html}
        </tbody>
      </table>
    </div>

    <div class="footer" style="margin-top:32px;">
      <p style="color:#374151;">
        Generado por <strong style="color:#FFAA17;">health-check.py</strong> · Victor IA Tracker System
      </p>
    </div>

  </div>
</body>
</html>"""


def build_json_output(results: list[dict], timestamp: str) -> dict:
    """Build JSON-compatible dict for --json output."""
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    warned = sum(1 for r in results if r["status"] == "warn")
    return {
        "timestamp":  timestamp,
        "summary": {
            "total":   len(results),
            "passed":  passed,
            "failed":  failed,
            "warnings": warned,
            "healthy": failed == 0,
        },
        "checks": results,
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Victor IA Tracker — Health Check"
    )
    parser.add_argument(
        "--json", action="store_true",
        help="Output JSON to stdout instead of generating HTML report"
    )
    args = parser.parse_args()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"{CYAN}Ejecutando health checks...{RESET}", file=sys.stderr)
    results = run_checks()

    if args.json:
        output = build_json_output(results, timestamp)
        print(json.dumps(output, indent=2, ensure_ascii=False))
        # Exit with failure code if any critical checks failed
        failed = sum(1 for r in results if r["status"] == "fail")
        sys.exit(1 if failed > 0 else 0)
    else:
        # Console output
        console_report(results, timestamp)

        # HTML report
        html = build_html_report(results, timestamp)
        try:
            REPORT_OUT.write_text(html, encoding="utf-8")
            print(f"{GREEN}Reporte HTML guardado:{RESET} {REPORT_OUT}")
            print(f"{CYAN}Abre en el navegador para ver el reporte completo.{RESET}\n")
        except Exception as e:
            print(f"{RED}No se pudo guardar el reporte HTML: {e}{RESET}", file=sys.stderr)

        failed = sum(1 for r in results if r["status"] == "fail")
        sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()