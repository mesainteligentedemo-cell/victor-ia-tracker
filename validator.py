#!/usr/bin/env python3
"""
Victor IA Tracker — Data Validator
Valida la integridad del array SEED en tracker_live.html.

Usa parse_tracker.py (C:\\Users\\inbou\\.agents\\parse_tracker.py) cuando
está disponible; de lo contrario usa su propio parser JS integrado.

Uso:
    python validator.py                  # Valida y muestra reporte en consola
    python validator.py --output json    # JSON en stdout
    python validator.py --fix            # Auto-corrige durSec y guarda
    python validator.py --fix --output json   # Corrige + JSON
"""

import sys
import os
import re
import json
import argparse
import importlib.util
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Force UTF-8 output on Windows to avoid cp1252 encoding issues
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

# ─── Paths ────────────────────────────────────────────────────────────────────
TRACKER_PRIMARY  = Path(r"C:\Users\inbou\.agents\tracker_live.html")
TRACKER_REPO     = Path(__file__).parent / "tracker_live.html"
PARSE_TRACKER_PY = Path(r"C:\Users\inbou\.agents\parse_tracker.py")

# ─── ANSI ─────────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
DIM    = "\033[2m"

# ─── Validation constants ─────────────────────────────────────────────────────
VALID_STATUSES  = {"Completado", "En progreso", "En Progreso", "Revisión", "Bloqueado"}
VALID_PRIORITIES = {"Alta", "Media", "Baja"}
REQUIRED_FIELDS  = ["id", "dateKey", "hora", "desc", "cat", "project", "status", "dur", "durSec"]
ID_PATTERN       = re.compile(r'^s\d+$')
DATE_PATTERN     = re.compile(r'^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12]\d|3[01])$')
TIME_PATTERN     = re.compile(r'^(?:[01]\d|2[0-3]):[0-5]\d$')
DURSEC_TOLERANCE = 0.01   # 1% tolerance


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Built-in JS-like parser (fallback if parse_tracker.py not found)
# ═══════════════════════════════════════════════════════════════════════════════

class _Token:
    __slots__ = ("type", "value", "pos")
    def __init__(self, t: str, v: str, p: int = 0):
        self.type, self.value, self.pos = t, v, p

def _tokenize(js: str) -> List[_Token]:
    tokens = []
    i = 0
    n = len(js)
    while i < n:
        c = js[i]
        if c in " \t\n\r":
            i += 1
            continue
        if c == "'":
            j = i + 1
            while j < n and js[j] != "'":
                if js[j] == "\\" and j + 1 < n:
                    j += 2
                else:
                    j += 1
            tokens.append(_Token("STRING", js[i+1:j], i))
            i = j + 1
        elif c == '"':
            j = i + 1
            while j < n and js[j] != '"':
                if js[j] == "\\" and j + 1 < n:
                    j += 2
                else:
                    j += 1
            tokens.append(_Token("STRING", js[i+1:j], i))
            i = j + 1
        elif c == '{': tokens.append(_Token("LBRACE", "{", i));   i += 1
        elif c == '}': tokens.append(_Token("RBRACE", "}", i));   i += 1
        elif c == '[': tokens.append(_Token("LBRACKET", "[", i)); i += 1
        elif c == ']': tokens.append(_Token("RBRACKET", "]", i)); i += 1
        elif c == ':': tokens.append(_Token("COLON", ":", i));    i += 1
        elif c == ',': tokens.append(_Token("COMMA", ",", i));    i += 1
        elif c.isdigit() or (c == '-' and i+1 < n and js[i+1].isdigit()):
            j = i
            if js[j] == '-': j += 1
            while j < n and (js[j].isdigit() or js[j] == '.'): j += 1
            tokens.append(_Token("NUMBER", js[i:j], i)); i = j
        elif c.isalpha() or c == '_':
            j = i
            while j < n and (js[j].isalnum() or js[j] == '_'): j += 1
            v = js[i:j]
            tokens.append(_Token("BOOL" if v in ("true","false","null") else "IDENT", v, i))
            i = j
        else:
            i += 1  # skip unknown chars gracefully
    return tokens

class _Parser:
    def __init__(self, tokens: List[_Token]):
        self.tokens = tokens
        self.pos = 0

    def peek(self) -> Optional[_Token]:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def consume(self, expected: str = None) -> _Token:
        t = self.peek()
        if not t:
            raise ValueError("Unexpected EOF")
        if expected and t.type != expected:
            raise ValueError(f"Expected {expected}, got {t.type}({t.value!r}) @ pos {t.pos}")
        self.pos += 1
        return t

    def parse_value(self) -> Any:
        t = self.peek()
        if not t:
            raise ValueError("Unexpected EOF in value")
        if t.type == "STRING":
            self.consume(); return t.value
        elif t.type == "NUMBER":
            self.consume(); return float(t.value) if "." in t.value else int(t.value)
        elif t.type == "BOOL":
            self.consume()
            return {"true": True, "false": False}.get(t.value)
        elif t.type == "LBRACKET":
            return self._parse_array()
        elif t.type == "LBRACE":
            return self._parse_object()
        elif t.type == "IDENT":
            self.consume(); return t.value
        else:
            raise ValueError(f"Unexpected token {t.type}({t.value!r})")

    def _parse_array(self) -> list:
        self.consume("LBRACKET")
        arr = []
        while True:
            t = self.peek()
            if t and t.type == "RBRACKET": self.consume(); break
            if arr:
                if t and t.type == "COMMA": self.consume()
                else: break
            arr.append(self.parse_value())
        return arr

    def _parse_object(self) -> dict:
        self.consume("LBRACE")
        obj = {}
        while True:
            t = self.peek()
            if t and t.type == "RBRACE": self.consume(); break
            if obj:
                if t and t.type == "COMMA": self.consume()
                else: break
            kt = self.peek()
            if not kt: break
            if kt.type in ("STRING", "IDENT"):
                key = self.consume().value
            else:
                break
            self.consume("COLON")
            obj[key] = self.parse_value()
        return obj


def _parse_js_value(js_str: str) -> Any:
    tokens = _tokenize(js_str)
    parser = _Parser(tokens)
    return parser.parse_value()


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — HTML extraction & parse_tracker.py integration
# ═══════════════════════════════════════════════════════════════════════════════

def load_parse_tracker_module():
    """
    Try to import parse_tracker.py from .agents/.
    Returns the module if successful, None otherwise.
    """
    if not PARSE_TRACKER_PY.exists():
        return None
    try:
        spec = importlib.util.spec_from_file_location("parse_tracker", str(PARSE_TRACKER_PY))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    except Exception as e:
        print(f"{YELLOW}[warn] No se pudo cargar parse_tracker.py: {e}{RESET}", file=sys.stderr)
        return None


def extract_seed_block(html_path: Path) -> str:
    """Extract the [...] content of const SEED = [...]; from HTML."""
    content = html_path.read_text(encoding="utf-8-sig", errors="replace")
    match = re.search(r'const\s+SEED\s*=\s*(\[)', content)
    if not match:
        raise ValueError(f"'const SEED = [' no encontrado en {html_path}")
    start = match.start(1)
    depth = 0
    end = start
    for i in range(start, len(content)):
        if content[i] == '[':   depth += 1
        elif content[i] == ']':
            depth -= 1
            if depth == 0: end = i + 1; break
    if depth != 0:
        raise ValueError("Brackets desbalanceados en el SEED array")
    return content[start:end], content


def parse_entries(html_path: Path) -> Tuple[List[Dict], str, str]:
    """
    Parse all SEED entries from html_path.
    Returns (entries, seed_block_str, raw_html)
    Tries parse_tracker.py first; falls back to built-in parser.
    """
    seed_block, raw_html = extract_seed_block(html_path)

    # Try parse_tracker.py
    pt = load_parse_tracker_module()
    if pt:
        try:
            seed_array = pt.parse_json_like(seed_block)
            entries = pt.extract_all_entries(seed_array)
            print(f"{CYAN}[parser] Usando parse_tracker.py ({len(entries)} entradas){RESET}",
                  file=sys.stderr)
            return entries, seed_block, raw_html
        except Exception as e:
            print(f"{YELLOW}[warn] parse_tracker.py falló ({e}), usando parser integrado{RESET}",
                  file=sys.stderr)

    # Built-in parser
    seed_array = _parse_js_value(seed_block)
    # Flatten nested arrays
    entries = []
    def _flatten(obj):
        if isinstance(obj, list):
            for x in obj: _flatten(x)
        elif isinstance(obj, dict):
            entries.append(obj)
    _flatten(seed_array)
    print(f"{CYAN}[parser] Parser integrado ({len(entries)} entradas){RESET}", file=sys.stderr)
    return entries, seed_block, raw_html


def locate_tracker() -> Path:
    """Find the tracker HTML file: primary (.agents/) then repo copy."""
    if TRACKER_PRIMARY.exists():
        return TRACKER_PRIMARY
    if TRACKER_REPO.exists():
        return TRACKER_REPO
    raise FileNotFoundError(
        f"tracker_live.html no encontrado en:\n"
        f"  {TRACKER_PRIMARY}\n"
        f"  {TRACKER_REPO}"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Validation logic
# ═══════════════════════════════════════════════════════════════════════════════

class ValidationIssue:
    __slots__ = ("level", "entry_id", "field", "message")
    def __init__(self, level: str, entry_id: str, field: str, message: str):
        self.level    = level      # "error" | "warning"
        self.entry_id = entry_id
        self.field    = field
        self.message  = message

    def __repr__(self):
        return f"[{self.level.upper()}] {self.entry_id}.{self.field}: {self.message}"


def validate_entries(entries: List[Dict]) -> List[ValidationIssue]:
    """Run all validation rules. Returns list of issues."""
    issues: List[ValidationIssue] = []
    seen_ids: Dict[str, int] = {}   # id -> first index
    numeric_ids: List[int]   = []   # extracted numeric parts for seq check

    for idx, entry in enumerate(entries):
        eid = entry.get("id", f"<entry#{idx}>")

        # ── Required fields ───────────────────────────────────────────────────
        for field in REQUIRED_FIELDS:
            if field not in entry or entry[field] is None or entry[field] == "":
                issues.append(ValidationIssue(
                    "error", eid, field,
                    f"Campo requerido ausente o vacío"
                ))

        # ── ID format ─────────────────────────────────────────────────────────
        entry_id_val = entry.get("id", "")
        if entry_id_val:
            if not ID_PATTERN.match(str(entry_id_val)):
                issues.append(ValidationIssue(
                    "error", eid, "id",
                    f"Formato inválido '{entry_id_val}' (debe ser sXXX, ej: s001)"
                ))
            else:
                # Extract numeric part
                try:
                    numeric_ids.append(int(str(entry_id_val)[1:]))
                except ValueError:
                    pass

            # Duplicate check
            if entry_id_val in seen_ids:
                issues.append(ValidationIssue(
                    "error", eid, "id",
                    f"ID duplicado (primera aparición: entrada #{seen_ids[entry_id_val]})"
                ))
            else:
                seen_ids[entry_id_val] = idx

        # ── dateKey format ────────────────────────────────────────────────────
        date_val = entry.get("dateKey", "")
        if date_val and not DATE_PATTERN.match(str(date_val)):
            issues.append(ValidationIssue(
                "error", eid, "dateKey",
                f"Formato inválido '{date_val}' (debe ser YYYY-MM-DD)"
            ))

        # ── hora format ───────────────────────────────────────────────────────
        hora_val = entry.get("hora", "")
        if hora_val and not TIME_PATTERN.match(str(hora_val)):
            issues.append(ValidationIssue(
                "error", eid, "hora",
                f"Formato inválido '{hora_val}' (debe ser HH:MM)"
            ))

        # ── dur positive number ───────────────────────────────────────────────
        dur_val = entry.get("dur")
        if dur_val is not None:
            try:
                dur_num = float(dur_val)
                if dur_num <= 0:
                    issues.append(ValidationIssue(
                        "error", eid, "dur",
                        f"Debe ser número positivo (got {dur_val})"
                    ))
            except (ValueError, TypeError):
                issues.append(ValidationIssue(
                    "error", eid, "dur",
                    f"No es un número válido: '{dur_val}'"
                ))

        # ── durSec ≈ dur * 3600 ───────────────────────────────────────────────
        dursec_val = entry.get("durSec")
        if dur_val is not None and dursec_val is not None:
            try:
                dur_num    = float(dur_val)
                dursec_num = float(dursec_val)
                expected   = dur_num * 3600
                if expected > 0:
                    diff_pct = abs(dursec_num - expected) / expected
                    if diff_pct > DURSEC_TOLERANCE:
                        issues.append(ValidationIssue(
                            "warning", eid, "durSec",
                            f"Mismatch: durSec={dursec_num} pero dur*3600={expected:.0f} "
                            f"(diferencia {diff_pct*100:.1f}%)"
                        ))
            except (ValueError, TypeError):
                pass

        # ── status valid ──────────────────────────────────────────────────────
        status_val = entry.get("status", "")
        if status_val and str(status_val) not in VALID_STATUSES:
            issues.append(ValidationIssue(
                "error", eid, "status",
                f"Valor inválido '{status_val}'. Válidos: {sorted(VALID_STATUSES)}"
            ))

        # ── priority (optional) ───────────────────────────────────────────────
        priority_val = entry.get("priority")
        if priority_val and str(priority_val) not in VALID_PRIORITIES:
            issues.append(ValidationIssue(
                "error", eid, "priority",
                f"Valor inválido '{priority_val}'. Válidos: {sorted(VALID_PRIORITIES)}"
            ))

        # ── tags is array ─────────────────────────────────────────────────────
        tags_val = entry.get("tags")
        if "tags" in entry and not isinstance(tags_val, list):
            issues.append(ValidationIssue(
                "error", eid, "tags",
                f"Debe ser array, es {type(tags_val).__name__}"
            ))

        # ── sw is array ───────────────────────────────────────────────────────
        sw_val = entry.get("sw")
        if "sw" in entry and not isinstance(sw_val, list):
            issues.append(ValidationIssue(
                "error", eid, "sw",
                f"Debe ser array, es {type(sw_val).__name__}"
            ))

        # ── desc not empty (warning) ──────────────────────────────────────────
        desc_val = entry.get("desc", "")
        if not str(desc_val).strip():
            issues.append(ValidationIssue(
                "warning", eid, "desc",
                "Descripción vacía"
            ))

    # ── Sequential IDs (no gaps > 5) ─────────────────────────────────────────
    if len(numeric_ids) >= 2:
        numeric_ids_sorted = sorted(numeric_ids)
        for i in range(1, len(numeric_ids_sorted)):
            gap = numeric_ids_sorted[i] - numeric_ids_sorted[i-1]
            if gap > 5:
                issues.append(ValidationIssue(
                    "warning", "GLOBAL", "id",
                    f"Gap en IDs: s{numeric_ids_sorted[i-1]:03d} → s{numeric_ids_sorted[i]:03d} "
                    f"(gap={gap}, más de 5)"
                ))

    return issues


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Auto-fix: durSec correction
# ═══════════════════════════════════════════════════════════════════════════════

def fix_dursec(entries: List[Dict], raw_html: str, html_path: Path) -> Tuple[int, str]:
    """
    Auto-correct durSec values in the raw HTML.
    Returns (number_of_fixes_applied, new_html_content).
    """
    fixes = 0
    new_html = raw_html

    for entry in entries:
        eid      = entry.get("id", "")
        dur_val  = entry.get("dur")
        dursec_val = entry.get("durSec")
        if dur_val is None or dursec_val is None:
            continue

        try:
            dur_num    = float(dur_val)
            dursec_num = float(dursec_val)
            expected   = round(dur_num * 3600)
        except (ValueError, TypeError):
            continue

        if int(dursec_num) == expected:
            continue  # Already correct

        # Pattern to replace durSec value for this specific entry's id
        # We match the entry block containing this id and fix durSec
        # Strategy: replace durSec:OLD_VAL near the id:eid occurrence
        old_dursec_str = int(dursec_num) if dursec_num == int(dursec_num) else dursec_num

        # Find the entry block by id
        id_patterns = [
            f"id:'{eid}'",
            f'id:"{eid}"',
            f"id: '{eid}'",
            f'id: "{eid}"',
        ]

        for id_pat in id_patterns:
            pos = new_html.find(id_pat)
            if pos == -1:
                continue

            # Find the bounds of this entry (next { before, next } after)
            # Safer: look for durSec: within 1000 chars after the id
            search_region = new_html[pos: pos + 800]
            dursec_match = re.search(
                r'(durSec\s*:\s*)(' + re.escape(str(old_dursec_str)) + r')(\b)',
                search_region
            )
            if dursec_match:
                old_str = dursec_match.group(0)
                new_str = f"durSec:{expected}"
                new_html = new_html[:pos] + search_region.replace(old_str, new_str, 1) + new_html[pos + 800:]
                fixes += 1
                break

    return fixes, new_html


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — Reporting
# ═══════════════════════════════════════════════════════════════════════════════

def console_report(entries: List[Dict], issues: List[ValidationIssue],
                   html_path: Path, timestamp: str):
    """Colorful console report."""
    errors   = [i for i in issues if i.level == "error"]
    warnings = [i for i in issues if i.level == "warning"]
    passed   = len(issues) == 0

    print(f"\n{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f"{BOLD}  VICTOR IA TRACKER — VALIDATOR{RESET}")
    print(f"  {DIM}{timestamp}{RESET}")
    print(f"  Archivo: {DIM}{html_path}{RESET}")
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")

    # Stats
    ids = [e.get("id","?") for e in entries]
    dates = sorted(set(e.get("dateKey","") for e in entries if e.get("dateKey")))
    total_hours = sum(float(e.get("dur", 0)) for e in entries)
    projects = sorted(set(e.get("project","") for e in entries if e.get("project")))

    print(f"  {BOLD}📊 Resumen de datos{RESET}")
    print(f"     Entradas:     {CYAN}{len(entries)}{RESET}")
    print(f"     Último ID:    {CYAN}{ids[-1] if ids else 'N/A'}{RESET}")
    print(f"     Rango fechas: {CYAN}{dates[0] if dates else 'N/A'} → {dates[-1] if len(dates)>1 else 'N/A'}{RESET}")
    print(f"     Total horas:  {CYAN}{total_hours:.1f}h{RESET}")
    print(f"     Proyectos:    {CYAN}{len(projects)}{RESET}")
    print()

    if passed:
        print(f"  {GREEN}{BOLD}✅  PASS — Todas las entradas son válidas{RESET}\n")
    else:
        if errors:
            print(f"  {BOLD}{RED}❌ Errores ({len(errors)}){RESET}")
            for issue in errors[:30]:
                print(f"     {RED}•{RESET} [{issue.entry_id}] {issue.field}: {issue.message}")
            if len(errors) > 30:
                print(f"     {DIM}... y {len(errors)-30} errores más{RESET}")
            print()

        if warnings:
            print(f"  {BOLD}{YELLOW}⚠️  Advertencias ({len(warnings)}){RESET}")
            for issue in warnings[:20]:
                print(f"     {YELLOW}•{RESET} [{issue.entry_id}] {issue.field}: {issue.message}")
            if len(warnings) > 20:
                print(f"     {DIM}... y {len(warnings)-20} advertencias más{RESET}")
            print()

    # Final verdict
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    if passed:
        print(f"  {GREEN}{BOLD}RESULTADO: PASS{RESET} — {len(entries)} entradas OK")
    else:
        status_color = RED if errors else YELLOW
        label = "FAIL" if errors else "WARN"
        print(f"  {status_color}{BOLD}RESULTADO: {label}{RESET} — "
              f"{len(errors)} errores, {len(warnings)} advertencias")
    print(f"{BOLD}{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")


def json_report(entries: List[Dict], issues: List[ValidationIssue],
                html_path: Path, timestamp: str,
                fixes_applied: int = 0) -> dict:
    """Build JSON report dict."""
    errors   = [i for i in issues if i.level == "error"]
    warnings = [i for i in issues if i.level == "warning"]

    ids = [e.get("id","") for e in entries]
    dates = sorted(set(e.get("dateKey","") for e in entries if e.get("dateKey")))
    total_hours = sum(float(e.get("dur", 0)) for e in entries)

    return {
        "timestamp":    timestamp,
        "source":       str(html_path),
        "result":       "PASS" if not errors else "FAIL",
        "stats": {
            "total_entries": len(entries),
            "last_id":       ids[-1] if ids else None,
            "date_first":    dates[0] if dates else None,
            "date_last":     dates[-1] if dates else None,
            "total_hours":   round(total_hours, 2),
            "projects":      sorted(set(e.get("project","") for e in entries if e.get("project"))),
        },
        "summary": {
            "errors":    len(errors),
            "warnings":  len(warnings),
            "fixes_applied": fixes_applied,
        },
        "errors":   [{"id": i.entry_id, "field": i.field, "msg": i.message} for i in errors],
        "warnings": [{"id": i.entry_id, "field": i.field, "msg": i.message} for i in warnings],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — Main
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(
        description="Victor IA Tracker — Data Validator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    ap.add_argument(
        "--fix", action="store_true",
        help="Auto-corregir valores durSec incorrectos y guardar"
    )
    ap.add_argument(
        "--output", choices=["json"], default=None,
        help="Formato de salida (por defecto: consola; --output json: JSON)"
    )
    args = ap.parse_args()

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Locate tracker ────────────────────────────────────────────────────────
    try:
        html_path = locate_tracker()
    except FileNotFoundError as e:
        print(f"{RED}Error: {e}{RESET}", file=sys.stderr)
        sys.exit(2)

    if args.output != "json":
        print(f"{CYAN}Cargando tracker desde: {html_path}{RESET}", file=sys.stderr)

    # ── Parse entries ─────────────────────────────────────────────────────────
    try:
        entries, seed_block, raw_html = parse_entries(html_path)
    except Exception as e:
        msg = f"Error parseando tracker_live.html: {e}"
        if args.output == "json":
            print(json.dumps({"error": msg, "result": "FAIL"}, indent=2))
        else:
            print(f"{RED}{msg}{RESET}", file=sys.stderr)
        sys.exit(2)

    if not entries:
        msg = "No se encontraron entradas en el SEED array"
        if args.output == "json":
            print(json.dumps({"error": msg, "result": "FAIL"}, indent=2))
        else:
            print(f"{RED}{msg}{RESET}", file=sys.stderr)
        sys.exit(2)

    # ── Validate ──────────────────────────────────────────────────────────────
    issues = validate_entries(entries)
    fixes_applied = 0

    # ── Auto-fix ──────────────────────────────────────────────────────────────
    if args.fix:
        dursec_warnings = [i for i in issues if i.level == "warning" and i.field == "durSec"]
        if dursec_warnings:
            if args.output != "json":
                print(f"{CYAN}Corrigiendo {len(dursec_warnings)} valores durSec...{RESET}",
                      file=sys.stderr)
            fixes_applied, new_html = fix_dursec(entries, raw_html, html_path)
            if fixes_applied > 0:
                try:
                    html_path.write_text(new_html, encoding="utf-8")
                    if args.output != "json":
                        print(f"{GREEN}✅  {fixes_applied} correcciones guardadas en {html_path}{RESET}",
                              file=sys.stderr)
                    # Re-validate after fix
                    entries, seed_block, raw_html = parse_entries(html_path)
                    issues = validate_entries(entries)
                except Exception as e:
                    if args.output != "json":
                        print(f"{RED}Error guardando: {e}{RESET}", file=sys.stderr)
            else:
                if args.output != "json":
                    print(f"{YELLOW}No se aplicaron correcciones (valores no localizados en texto){RESET}",
                          file=sys.stderr)
        else:
            if args.output != "json":
                print(f"{GREEN}Sin durSec a corregir.{RESET}", file=sys.stderr)

    # ── Output ────────────────────────────────────────────────────────────────
    if args.output == "json":
        report = json_report(entries, issues, html_path, timestamp, fixes_applied)
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        console_report(entries, issues, html_path, timestamp)

    # Exit code
    errors = [i for i in issues if i.level == "error"]
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
