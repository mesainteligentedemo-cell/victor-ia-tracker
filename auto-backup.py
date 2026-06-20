#!/usr/bin/env python3
"""
Victor IA Tracker — Auto Backup Script
Backs up tracker_live.html and dashboard.html with gzip compression.

Usage:
  python auto-backup.py               Run backup once right now
  python auto-backup.py --schedule    Register Windows Task Scheduler task (daily 02:00 AM)
  python auto-backup.py --list        List all existing backups
  python auto-backup.py --restore YYYY-MM-DD  Restore most recent backup from that date
  python auto-backup.py --status      Show backup stats and next scheduled run
"""

import os
import sys
import gzip
import shutil
import argparse
import datetime
import glob
import subprocess
import re

# ─── Color Support ────────────────────────────────────────────────────────────
try:
    from colorama import init as colorama_init, Fore, Style
    colorama_init(autoreset=True)
    GREEN   = Fore.GREEN
    YELLOW  = Fore.YELLOW
    RED     = Fore.RED
    CYAN    = Fore.CYAN
    MAGENTA = Fore.MAGENTA
    BOLD    = Style.BRIGHT
    RESET   = Style.RESET_ALL
    _COLORS = True
except ImportError:
    # Fallback: try raw ANSI (works on Windows 10+ with VT enabled)
    import ctypes
    try:
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        GREEN   = "\033[92m"
        YELLOW  = "\033[93m"
        RED     = "\033[91m"
        CYAN    = "\033[96m"
        MAGENTA = "\033[95m"
        BOLD    = "\033[1m"
        RESET   = "\033[0m"
        _COLORS = True
    except Exception:
        GREEN = YELLOW = RED = CYAN = MAGENTA = BOLD = RESET = ""
        _COLORS = False

def c(color, text):
    return f"{color}{text}{RESET}"

def ok(msg):    print(c(GREEN,   f"  [OK]  {msg}"))
def warn(msg):  print(c(YELLOW,  f"  [!!]  {msg}"))
def err(msg):   print(c(RED,     f"  [XX]  {msg}"), file=sys.stderr)
def info(msg):  print(c(CYAN,    f"  [>>]  {msg}"))
def head(msg):  print(c(BOLD + MAGENTA, f"\n{'='*55}\n  {msg}\n{'='*55}"))

# ─── Paths ────────────────────────────────────────────────────────────────────
SOURCES = {
    "tracker_live.html": [
        r"C:\Users\inbou\.agents\tracker_live.html",
        r"C:\Users\inbou\victor-ia-tracker\tracker_live.html",
    ],
    "dashboard.html": [
        r"C:\Users\inbou\victor-ia-tracker\dashboard.html",
        r"C:\Users\inbou\.agents\dashboard.html",
    ],
}

BACKUP_DIR   = r"C:\Users\inbou\victor-ia-tracker\backups"
LOG_FILE     = os.path.join(BACKUP_DIR, "backup.log")
MAX_BACKUPS  = 30          # per file name prefix
TASK_NAME    = "VictorIA-Tracker-Backup"
SCRIPT_PATH  = os.path.abspath(__file__)

# ─── Helpers ──────────────────────────────────────────────────────────────────
def ensure_backup_dir():
    os.makedirs(BACKUP_DIR, exist_ok=True)

def log(msg: str):
    """Append a timestamped line to backup.log."""
    ensure_backup_dir()
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def human_size(n_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n_bytes < 1024:
            return f"{n_bytes:.1f} {unit}"
        n_bytes /= 1024
    return f"{n_bytes:.1f} TB"

def timestamp_str() -> str:
    return datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")

def resolve_source(candidates: list[str]) -> str | None:
    """Return the first existing path from candidates list."""
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None

def backup_filename(stem: str, ts: str) -> str:
    """tracker_live_YYYY-MM-DD_HHMMSS.html.gz"""
    name, ext = os.path.splitext(stem)   # ('tracker_live', '.html')
    return f"{name}_{ts}{ext}.gz"

def compress_file(src_path: str, dest_path: str):
    """Gzip-compress src → dest with a simple progress dots indicator."""
    src_size = os.path.getsize(src_path)
    chunk = 65536  # 64 KB chunks
    read_bytes = 0
    last_pct = -1

    print(f"    Compressing {os.path.basename(src_path)} ...", end=" ", flush=True)
    with open(src_path, "rb") as f_in, gzip.open(dest_path, "wb", compresslevel=9) as f_out:
        while True:
            data = f_in.read(chunk)
            if not data:
                break
            f_out.write(data)
            read_bytes += len(data)
            pct = int(read_bytes / src_size * 10) if src_size else 10
            if pct > last_pct:
                print(".", end="", flush=True)
                last_pct = pct
    print(" done")

def verify_backup(gz_path: str, original_stem: str) -> bool:
    """Decompress in-memory and check for SEED array (tracker) or basic HTML."""
    try:
        with gzip.open(gz_path, "rb") as f:
            # Read first 512 KB — enough to find SEED or </html>
            content = f.read(524288).decode("utf-8", errors="replace")
        if "tracker_live" in original_stem.lower():
            if "SEED" not in content:
                return False
        if "<html" not in content.lower() and "<!DOCTYPE" not in content:
            return False
        return True
    except Exception:
        return False

def prune_old_backups(stem: str):
    """Keep only the last MAX_BACKUPS backups for a given stem prefix."""
    name, ext = os.path.splitext(stem)   # e.g. 'tracker_live', '.html'
    pattern = os.path.join(BACKUP_DIR, f"{name}_*.html.gz")
    files = sorted(glob.glob(pattern))   # lexicographic = chronological (ISO ts)
    excess = files[:max(0, len(files) - MAX_BACKUPS)]
    for old in excess:
        try:
            os.remove(old)
            info(f"Pruned old backup: {os.path.basename(old)}")
            log(f"PRUNED {old}")
        except OSError as e:
            warn(f"Could not prune {old}: {e}")

# ─── Core: Run Backup ─────────────────────────────────────────────────────────
def run_backup() -> int:
    """Execute one full backup cycle. Returns number of files backed up."""
    head("Victor IA Tracker — Backup")
    ensure_backup_dir()
    ts = timestamp_str()
    backed_up = 0

    for stem, candidates in SOURCES.items():
        src = resolve_source(candidates)
        if src is None:
            warn(f"{stem} — source not found (checked: {candidates})")
            log(f"SKIP {stem} — source not found")
            continue

        dest_name = backup_filename(stem, ts)
        dest_path = os.path.join(BACKUP_DIR, dest_name)

        info(f"Source : {src}")
        info(f"Dest   : {dest_path}")

        try:
            src_size = os.path.getsize(src)
            compress_file(src, dest_path)
            gz_size = os.path.getsize(dest_path)
            ratio   = (1 - gz_size / src_size) * 100 if src_size else 0

            print(f"    {c(CYAN,'Original:')} {human_size(src_size)}  "
                  f"{c(GREEN,'Compressed:')} {human_size(gz_size)}  "
                  f"{c(YELLOW,'Saved:')} {ratio:.1f}%")

            # Verify
            if verify_backup(dest_path, stem):
                ok(f"Backup verified: {dest_name}")
                log(f"OK {dest_name} | orig={human_size(src_size)} gz={human_size(gz_size)} ratio={ratio:.1f}%")
                backed_up += 1
            else:
                err(f"Verification FAILED for {dest_name}")
                log(f"FAIL_VERIFY {dest_name}")
                os.remove(dest_path)
                continue

        except Exception as exc:
            err(f"Backup failed for {stem}: {exc}")
            log(f"ERROR {stem}: {exc}")
            if os.path.exists(dest_path):
                os.remove(dest_path)
            continue

        prune_old_backups(stem)

    log(f"CYCLE backed_up={backed_up}/{len(SOURCES)}")
    head(f"Done — {backed_up} file(s) backed up")
    return backed_up

# ─── List Backups ─────────────────────────────────────────────────────────────
def list_backups():
    ensure_backup_dir()
    head("Existing Backups")
    pattern = os.path.join(BACKUP_DIR, "*.html.gz")
    files = sorted(glob.glob(pattern), reverse=True)

    if not files:
        warn("No backups found.")
        return

    # Group by stem prefix
    groups: dict[str, list] = {}
    for f in files:
        base = os.path.basename(f)
        # Extract stem: everything before the date part _YYYY-MM-DD_
        m = re.match(r"^(.+?)_(\d{4}-\d{2}-\d{2}_\d{6})\.html\.gz$", base)
        if m:
            prefix = m.group(1)
            groups.setdefault(prefix, []).append(f)
        else:
            groups.setdefault("other", []).append(f)

    total_size = 0
    for prefix, paths in groups.items():
        print(f"\n  {c(BOLD + CYAN, prefix)} ({len(paths)} backups)")
        for p in paths:
            sz = os.path.getsize(p)
            total_size += sz
            mtime = datetime.datetime.fromtimestamp(os.path.getmtime(p))
            print(f"    {c(GREEN, os.path.basename(p))}  "
                  f"{c(YELLOW, human_size(sz))}  "
                  f"{c(MAGENTA, mtime.strftime('%Y-%m-%d %H:%M:%S'))}")

    print(f"\n  {c(BOLD, 'Total:')} {len(files)} backups, {human_size(total_size)}")

# ─── Restore ──────────────────────────────────────────────────────────────────
def restore_backup(date_str: str):
    """Restore the most recent backup matching YYYY-MM-DD."""
    head(f"Restore — {date_str}")
    # Validate date format
    try:
        datetime.datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        err(f"Invalid date format: '{date_str}'. Use YYYY-MM-DD.")
        sys.exit(1)

    restored = 0
    for stem, candidates in SOURCES.items():
        name, ext = os.path.splitext(stem)
        pattern = os.path.join(BACKUP_DIR, f"{name}_{date_str}_*.html.gz")
        matches = sorted(glob.glob(pattern), reverse=True)

        if not matches:
            warn(f"No backup found for {stem} on {date_str}")
            continue

        gz_path = matches[0]   # most recent on that date
        info(f"Restoring from: {os.path.basename(gz_path)}")

        # Determine restore target (primary source path)
        restore_to = candidates[0]

        # Safety: make a quick backup of current file before overwriting
        if os.path.isfile(restore_to):
            safety = restore_to + f".pre-restore-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}.bak"
            shutil.copy2(restore_to, safety)
            info(f"Pre-restore backup saved: {safety}")

        try:
            with gzip.open(gz_path, "rb") as f_in, open(restore_to, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
            ok(f"Restored to: {restore_to}")
            log(f"RESTORE {gz_path} -> {restore_to}")
            restored += 1
        except Exception as exc:
            err(f"Restore failed for {stem}: {exc}")
            log(f"RESTORE_ERROR {stem}: {exc}")

    if restored == 0:
        err(f"Nothing was restored for date {date_str}.")
        sys.exit(1)
    else:
        ok(f"{restored} file(s) restored.")

# ─── Status ───────────────────────────────────────────────────────────────────
def show_status():
    head("Backup Status")
    ensure_backup_dir()
    pattern = os.path.join(BACKUP_DIR, "*.html.gz")
    files = sorted(glob.glob(pattern))

    total_size = sum(os.path.getsize(f) for f in files)
    oldest = datetime.datetime.fromtimestamp(os.path.getmtime(files[0])).strftime("%Y-%m-%d %H:%M:%S") if files else "n/a"
    newest = datetime.datetime.fromtimestamp(os.path.getmtime(files[-1])).strftime("%Y-%m-%d %H:%M:%S") if files else "n/a"

    print(f"  {c(BOLD,'Backup dir  :')} {BACKUP_DIR}")
    print(f"  {c(BOLD,'Total files :')} {len(files)} / {MAX_BACKUPS} max per stem")
    print(f"  {c(BOLD,'Space used  :')} {human_size(total_size)}")
    print(f"  {c(BOLD,'Oldest      :')} {oldest}")
    print(f"  {c(BOLD,'Newest      :')} {newest}")

    # Source file sizes
    print()
    for stem, candidates in SOURCES.items():
        src = resolve_source(candidates)
        if src:
            print(f"  {c(CYAN, stem)} source: {human_size(os.path.getsize(src))} | {src}")
        else:
            print(f"  {c(YELLOW, stem)} source: NOT FOUND")

    # Check Task Scheduler
    print()
    try:
        result = subprocess.run(
            ["schtasks", "/Query", "/TN", TASK_NAME, "/FO", "LIST"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            # Extract "Next Run Time" line
            for line in result.stdout.splitlines():
                if "Next Run Time" in line or "Próxima hora" in line or "Status" in line or "Estado" in line:
                    print(f"  {c(GREEN,'Scheduler   :')} {line.strip()}")
        else:
            warn(f"Scheduled task '{TASK_NAME}' not found. Run --schedule to create it.")
    except Exception as e:
        warn(f"Could not query Task Scheduler: {e}")

    # Recent log lines
    if os.path.isfile(LOG_FILE):
        print(f"\n  {c(BOLD,'Recent log entries:')}")
        with open(LOG_FILE, encoding="utf-8") as f:
            lines = f.readlines()
        for line in lines[-10:]:
            print(f"    {line.rstrip()}")

# ─── Schedule ─────────────────────────────────────────────────────────────────
def setup_schedule():
    head("Setup Windows Task Scheduler")
    python_exe = sys.executable
    cmd = (
        f'schtasks /Create /TN "{TASK_NAME}" '
        f'/TR "\"{python_exe}\" \"{SCRIPT_PATH}\"" '
        f'/SC DAILY /ST 02:00 /F'
    )
    info(f"Creating task: {TASK_NAME}")
    info(f"Command: {cmd}")

    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        ok(f"Task '{TASK_NAME}' created — runs daily at 02:00 AM")
        log(f"SCHEDULE_CREATED task={TASK_NAME}")
    else:
        err(f"Failed to create task: {result.stderr.strip()}")
        sys.exit(1)

    print(f"""
  {c(BOLD + CYAN, 'Task created successfully!')}

  {c(BOLD, 'To verify:')}
    schtasks /Query /TN "{TASK_NAME}" /FO LIST

  {c(BOLD, 'To remove the task:')}
    schtasks /Delete /TN "{TASK_NAME}" /F

  {c(BOLD, 'To run it manually right now:')}
    schtasks /Run /TN "{TASK_NAME}"
""")

# ─── Entry Point ──────────────────────────────────────────────────────────────
def main():
    # Ensure stdout/stderr use UTF-8 on Windows so any stray Unicode doesn't crash
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    parser = argparse.ArgumentParser(
        description="Victor IA Tracker — Auto Backup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--schedule",
        action="store_true",
        help="Register a Windows Task Scheduler daily task at 02:00 AM",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all existing backups",
    )
    parser.add_argument(
        "--restore",
        metavar="YYYY-MM-DD",
        help="Restore the most recent backup from a specific date",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show backup stats, space used, and next scheduled run",
    )
    args = parser.parse_args()

    if args.schedule:
        setup_schedule()
    elif args.list:
        list_backups()
    elif args.restore:
        restore_backup(args.restore)
    elif args.status:
        show_status()
    else:
        # Default: run backup now
        backed_up = run_backup()
        sys.exit(0 if backed_up > 0 else 1)


if __name__ == "__main__":
    main()