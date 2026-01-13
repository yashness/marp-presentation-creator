#!/usr/bin/env -S uv run --script
"""Auto-restart Claude session hook."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import time
from collections import deque
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
os.chdir(REPO_ROOT)

CONTINUATION_PROMPT = (
    "Continue fixing or next item. Read progress or todo files, understand where we are "
    "& continue. If completely done, ideate, improve, refactor, but do not ask me any question. "
    "Just get onto work. Must keep updating todo & task file as we progress & readme whenever required."
)
LOG_DIR = REPO_ROOT / ".claude" / "auto-restart-logs"
STATE_FILE = LOG_DIR / "restart-state.json"
PID_FILE = LOG_DIR / "claude.pid"
LOCK_FILE = Path(f"/tmp/claude-auto-restart-{str(REPO_ROOT).replace('/', '_')}.lock")
RATE_LIMIT_WINDOW_MINUTES = 10
CLAUDE_BIN = shutil.which("claude") or "/opt/homebrew/bin/claude"

LOG_DIR.mkdir(parents=True, exist_ok=True)


def log(message: str) -> None:
    timestamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with (LOG_DIR / "auto-restart.log").open("a", encoding="utf-8") as handle:
        handle.write(f"[{timestamp}] {message}\n")


def get_config_dir() -> Path:
    env_value = os.environ.get("CLAUDE_CONFIG_DIR")
    if env_value:
        return Path(env_value).expanduser()
    personal = Path.home() / ".claude-personal"
    if personal.exists():
        return personal
    return Path.home() / ".claude"


def read_tail_lines(path: Path, limit: int = 600) -> list[str]:
    lines: deque[str] = deque(maxlen=limit)
    try:
        with path.open("r", encoding="utf-8", errors="ignore") as handle:
            for line in handle:
                lines.append(line.rstrip("\n"))
    except OSError:
        return []
    return list(lines)


def extract_reset_time(text: str) -> str:
    cleaned = re.sub(r"\s*\([^)]*\)", "", text)
    match = re.search(
        r"resets?\s+(?:[A-Za-z]+\s+\d+\s+)?(?:at\s+)?"
        r"(\d{1,2}(?::\d{2})?\s*[ap]m)",
        cleaned,
        re.IGNORECASE,
    )
    if match:
        return match.group(1).replace(" ", "")
    return ""


def parse_reset_time(reset_hint: str) -> int:
    if not reset_hint:
        return 120

    cleaned = re.sub(r"\s*\([^)]*\)", "", reset_hint).strip()
    now = dt.datetime.now()

    date_match = re.search(r"([A-Za-z]+)\s+(\d{1,2})", cleaned)
    time_match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*([ap]m)", cleaned, re.IGNORECASE)
    if not time_match:
        return 120

    hour = int(time_match.group(1))
    minute = int(time_match.group(2) or 0)
    ampm = time_match.group(3).lower()
    if ampm == "pm" and hour != 12:
        hour += 12
    if ampm == "am" and hour == 12:
        hour = 0

    if date_match:
        month_name = date_match.group(1).lower()
        day = int(date_match.group(2))
        month_map = {
            "jan": 1,
            "feb": 2,
            "mar": 3,
            "apr": 4,
            "may": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "oct": 10,
            "nov": 11,
            "dec": 12,
        }
        month = month_map.get(month_name[:3])
        if not month:
            return 120
        reset_time = dt.datetime(now.year, month, day, hour, minute)
    else:
        reset_time = dt.datetime(now.year, now.month, now.day, hour, minute)
        if reset_time <= now:
            reset_time += dt.timedelta(days=1)

    delay_seconds = int((reset_time - now).total_seconds()) + 60
    delay_minutes = max(delay_seconds // 60, 1)
    return delay_minutes


def project_log_dir(config_dir: Path) -> Path:
    encoded = f"-{str(REPO_ROOT).strip('/').replace('/', '-')}"
    return config_dir / "projects" / encoded


def parse_timestamp(value: str) -> dt.datetime | None:
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        parsed = dt.datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=dt.timezone.utc)
        return parsed
    except ValueError:
        return None


def find_rate_limit_in_jsonl(path: Path, cutoff: dt.datetime) -> tuple[bool, str]:
    lines = read_tail_lines(path)
    file_mtime = dt.datetime.fromtimestamp(path.stat().st_mtime, tz=dt.timezone.utc)
    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue

        timestamp_value = payload.get("timestamp")
        if timestamp_value:
            parsed = parse_timestamp(str(timestamp_value))
            if parsed and parsed < cutoff:
                continue
        else:
            if file_mtime < cutoff:
                continue

        text_parts: list[str] = []
        if payload.get("error") == "rate_limit":
            message = payload.get("message", {})
            for part in message.get("content", []) or []:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(str(part.get("text", "")))
        if payload.get("type") == "summary" and payload.get("summary"):
            text_parts.append(str(payload.get("summary")))

        for text in text_parts:
            if re.search(r"limit reached|usage limit|hit your limit", text, re.IGNORECASE):
                return True, extract_reset_time(text)

    return False, ""


def detect_rate_limit() -> tuple[bool, str]:
    reset_hint = ""

    session_log = os.environ.get("CLAUDE_SESSION_LOG")
    if session_log:
        session_path = Path(session_log)
        if session_path.exists():
            log(f"Checking CLAUDE_SESSION_LOG: {session_path}")
            cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
            matched, reset_hint = find_rate_limit_in_jsonl(session_path, cutoff)
            if matched:
                log("Rate limit detected in CLAUDE_SESSION_LOG")
                return True, reset_hint
        else:
            log(f"CLAUDE_SESSION_LOG not found: {session_path}")
    else:
        log("CLAUDE_SESSION_LOG not set; skipping session log check")

    config_dir = get_config_dir()
    log(f"Claude config dir: {config_dir}")
    project_dir = project_log_dir(config_dir)
    if not project_dir.exists():
        log(f"Project log dir not found: {project_dir}")
        return False, ""

    jsonl_files = sorted(project_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not jsonl_files:
        log(f"No project jsonl logs in {project_dir}")
        return False, ""

    for attempt in range(3):
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
        for jsonl_path in jsonl_files[:5]:
            log(f"Checking project log: {jsonl_path}")
            matched, reset_hint = find_rate_limit_in_jsonl(jsonl_path, cutoff)
            if matched:
                log("Rate limit detected in project logs")
                return True, reset_hint
        if attempt < 2:
            time.sleep(1)

    return False, ""


def write_state(rate_limited: bool, reset_hint: str | None = None) -> None:
    state = {
        "cwd": str(REPO_ROOT),
        "prompt": CONTINUATION_PROMPT,
        "timestamp": dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "session_id": os.environ.get("CLAUDE_SESSION_ID", "unknown"),
    }
    if rate_limited:
        state.update({"rate_limited": True, "reset_hint": reset_hint or ""})
    with STATE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(state, handle)


def run_launchctl(command: list[str]) -> tuple[bool, str]:
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
    except OSError as exc:
        return False, str(exc)
    output = (result.stdout or "") + (result.stderr or "")
    return result.returncode == 0, output.strip()


def get_claude_pids(config_dir: Path) -> list[int]:
    pids: set[int] = set()

    stored_pid: int | None = None
    if PID_FILE.exists():
        try:
            stored_pid = int(PID_FILE.read_text(encoding="utf-8").strip())
        except (ValueError, OSError):
            stored_pid = None
        if stored_pid:
            pids.add(stored_pid)

    result = subprocess.run(["pgrep", "-f", "claude"], capture_output=True, text=True)
    if result.stdout:
        for value in result.stdout.split():
            try:
                pids.add(int(value))
            except ValueError:
                continue

    matches: list[int] = []
    for pid in sorted(pids):
        ps_result = subprocess.run(
            ["ps", "eww", "-p", str(pid)],
            capture_output=True,
            text=True,
        )
        ps_output = ps_result.stdout or ""
        if "claude" not in ps_output:
            continue
        if pid == stored_pid:
            matches.append(pid)
            continue
        if f"CLAUDE_CONFIG_DIR={config_dir}" in ps_output:
            matches.append(pid)
    return matches


def run_launchd_helper(plist_path: Path) -> None:
    log("Launchd helper invoked")
    config_dir = get_config_dir()

    legacy_helper = LOG_DIR / "restart-helper.sh"
    if legacy_helper.exists():
        legacy_helper.unlink(missing_ok=True)
        log("Removed legacy restart-helper.sh")

    prompt = CONTINUATION_PROMPT
    if STATE_FILE.exists():
        try:
            payload = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            prompt = payload.get("prompt") or prompt
        except (json.JSONDecodeError, OSError):
            log("Failed to parse restart state; using default prompt")

    log(f"Restarting Claude in {REPO_ROOT} with prompt: {prompt}")

    if PID_FILE.exists():
        try:
            pid_value = int(PID_FILE.read_text(encoding="utf-8").strip())
        except (ValueError, OSError):
            pid_value = None
        if pid_value:
            ps_result = subprocess.run(
                ["ps", "-p", str(pid_value), "-o", "command="],
                capture_output=True,
                text=True,
            )
            if "claude" in (ps_result.stdout or ""):
                log(f"Killing Claude PID: {pid_value}")
                subprocess.run(["kill", str(pid_value)], check=False)
            else:
                log("PID file found but process not running")
        else:
            log("PID file found but invalid")
    else:
        log("No PID file found; skipping kill")

    time.sleep(2)
    env = os.environ.copy()
    env["CLAUDE_CONFIG_DIR"] = str(config_dir)
    with (LOG_DIR / "claude-output.log").open("a", encoding="utf-8") as output:
        process = subprocess.Popen(
            [CLAUDE_BIN, "--dangerously-skip-permissions", prompt],
            cwd=str(REPO_ROOT),
            env=env,
            stdout=output,
            stderr=output,
            start_new_session=True,
        )
    PID_FILE.write_text(str(process.pid), encoding="utf-8")
    log(f"Launchd started new Claude PID: {process.pid}")

    launchctl_domain = f"gui/{os.getuid()}"
    success, _ = run_launchctl(["launchctl", "bootout", launchctl_domain, str(plist_path)])
    if not success:
        run_launchctl(["launchctl", "unload", str(plist_path)])
    plist_path.unlink(missing_ok=True)
    log(f"Launchd helper removed plist: {plist_path}")


def schedule_with_launchd(delay_minutes: int) -> None:
    delay_seconds = delay_minutes * 60
    label_hash = hashlib.md5(str(REPO_ROOT).encode("utf-8")).hexdigest()[:8]
    plist_label = f"com.claude.auto-restart.{label_hash}"
    launch_agents_dir = Path.home() / "Library" / "LaunchAgents"
    plist_path = launch_agents_dir / f"{plist_label}.plist"
    launchctl_domain = f"gui/{os.getuid()}"

    log(f"Creating launchd job with delay of {delay_seconds} seconds")
    log(f"Launchd label: {plist_label}")
    log(f"Launchd plist: {plist_path}")
    log(f"Launchd domain: {launchctl_domain}")

    launch_agents_dir.mkdir(parents=True, exist_ok=True)
    script_path = Path(__file__).resolve()
    uv_path = Path("/opt/homebrew/bin/uv")
    if not uv_path.exists():
        uv_path = Path("/usr/local/bin/uv")
    if not uv_path.exists():
        log("uv not found in standard locations; relying on PATH")
        uv_path = Path("uv")

    plist_contents = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>{plist_label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{uv_path}</string>
        <string>run</string>
        <string>--script</string>
        <string>{script_path}</string>
        <string>--launchd-run</string>
        <string>{plist_path}</string>
    </array>
    <key>StartInterval</key>
    <integer>{delay_seconds}</integer>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
"""
    plist_path.write_text(plist_contents, encoding="utf-8")

    success, output = run_launchctl(["launchctl", "bootout", launchctl_domain, str(plist_path)])
    if not success:
        run_launchctl(["launchctl", "unload", str(plist_path)])

    success, output = run_launchctl(["launchctl", "bootstrap", launchctl_domain, str(plist_path)])
    if success:
        log(f"Launchd job created and bootstrapped: {plist_path}")
        return

    log(f"launchctl bootstrap failed: {output}")
    success, output = run_launchctl(["launchctl", "load", str(plist_path)])
    if success:
        log(f"Launchd job created and loaded (legacy): {plist_path}")
    else:
        log(f"launchctl load failed: {output}")


def schedule_delayed_restart(reset_hint: str) -> None:
    delay_minutes = parse_reset_time(reset_hint)
    log(f"Scheduling delayed restart in {delay_minutes} minutes")
    schedule_with_launchd(delay_minutes)


def restart_now() -> None:
    log("Initiating immediate restart")
    write_state(rate_limited=False)

    log("Killing current Claude session")
    time.sleep(1)

    config_dir = get_config_dir()
    personal_pids = get_claude_pids(config_dir)
    if personal_pids:
        log(f"Target Claude PIDs: {' '.join(str(pid) for pid in personal_pids)}")
    else:
        log("No personal Claude process found; skipping kill")
    log_path = LOG_DIR / "auto-restart.log"
    command = "\n".join(
        [
            "sleep 2",
            (
                "if [ -n \"${PERSONAL_PIDS:-}\" ]; then "
                f"echo \"[$(date '+%Y-%m-%d %H:%M:%S')] Killing Claude PIDs: $PERSONAL_PIDS\" "
                f">> {shlex.quote(str(log_path))}; "
                "kill $PERSONAL_PIDS; "
                "else "
                f"echo \"[$(date '+%Y-%m-%d %H:%M:%S')] No personal Claude process found; skipping kill\" "
                f">> {shlex.quote(str(log_path))}; "
                "fi"
            ),
            "sleep 1",
            f"cd {shlex.quote(str(REPO_ROOT))}",
            (
                "CLAUDE_CONFIG_DIR="
                + shlex.quote(str(config_dir))
                + " nohup "
                + shlex.quote(CLAUDE_BIN)
                + " --dangerously-skip-permissions "
                + shlex.quote(CONTINUATION_PROMPT)
                + " >> "
                + shlex.quote(str(LOG_DIR / "claude-output.log"))
                + " 2>&1 &"
            ),
            f"echo $! > {shlex.quote(str(PID_FILE))}",
            f"echo \"[$(date '+%Y-%m-%d %H:%M:%S')] New Claude session launched\" >> {shlex.quote(str(log_path))}",
        ]
    )
    env = os.environ.copy()
    env["PERSONAL_PIDS"] = " ".join(str(pid) for pid in personal_pids)
    subprocess.Popen(["/bin/bash", "-c", command], start_new_session=True, env=env)
    log("Background restart job initiated")


def main() -> None:
    log("=== Stop Hook Triggered ===")
    log(f"Working directory: {REPO_ROOT}")
    log(f"Session ID: {os.environ.get('CLAUDE_SESSION_ID', 'unknown')}")
    log(f"Session log: {os.environ.get('CLAUDE_SESSION_LOG', 'unset')}")

    if LOCK_FILE.exists():
        lock_age = time.time() - LOCK_FILE.stat().st_mtime
        if lock_age < 60:
            log("Lock file exists and is recent, skipping restart")
            return
    LOCK_FILE.write_text(str(time.time()), encoding="utf-8")

    limit_reached, reset_hint = detect_rate_limit()
    if limit_reached:
        log("Rate limit detected, scheduling delayed restart")
        write_state(rate_limited=True, reset_hint=reset_hint)
        schedule_delayed_restart(reset_hint)
    else:
        log("Normal session end, restarting immediately")
        restart_now()

    subprocess.Popen(["/bin/bash", "-c", f"sleep 5; rm -f {shlex.quote(str(LOCK_FILE))}"])  # cleanup lock
    log("=== Stop Hook Completed ===")


if __name__ == "__main__":
    if "--launchd-run" in sys.argv:
        try:
            idx = sys.argv.index("--launchd-run")
            plist_arg = sys.argv[idx + 1]
        except (ValueError, IndexError):
            plist_arg = ""
        if plist_arg:
            run_launchd_helper(Path(plist_arg))
        else:
            log("Launchd run missing plist path")
    else:
        main()
