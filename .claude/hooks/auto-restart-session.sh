#!/bin/bash
# Auto-restart Claude session hook
# Automatically restarts Claude after session ends or when rate limit is reached
# Manages continuous execution with session chaining

set -euo pipefail

# Configuration
CONTINUATION_PROMPT="Continue fixing or next item. Read progress or todo files, understand where we are & continue. If completely done, ideate, improve, refactor, but do not ask me any question. Just get onto work"
LOG_DIR=".claude/auto-restart-logs"
STATE_FILE="${LOG_DIR}/restart-state.json"
LOCK_FILE="/tmp/claude-auto-restart-${PWD//\//_}.lock"

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "${LOG_DIR}/auto-restart.log"
}

log "=== Session End Hook Triggered ==="
log "Working directory: $(pwd)"
log "Session ID: ${CLAUDE_SESSION_ID:-unknown}"

# Get the current directory where Claude is running
CLAUDE_CWD="$(pwd)"
log "Claude CWD: $CLAUDE_CWD"

# Function to detect rate limit from session logs
detect_rate_limit() {
    local limit_reached=false
    local reset_time=""

    # Check the latest session log for rate limit messages
    if [ -n "${CLAUDE_SESSION_LOG:-}" ] && [ -f "$CLAUDE_SESSION_LOG" ]; then
        # Look for rate limit patterns in the log
        if grep -qi "limit reached\|usage limit" "$CLAUDE_SESSION_LOG" 2>/dev/null; then
            limit_reached=true
            log "Rate limit detected in session log"

            # Extract reset time from Claude's actual message formats:
            # "resets Oct 9 at 10:30am"
            # "reset at 12:30 AM"
            # "reset at 7pm (Europe/London)"
            # "resets 6pm"
            # "resets 9pm (Asia/Jerusalem)"

            # Try to find the line with reset information
            local reset_line=$(grep -i "reset" "$CLAUDE_SESSION_LOG" | tail -1)
            log "Reset line found: $reset_line"

            # Extract the time part (handles various formats with optional date)
            reset_time=$(echo "$reset_line" | grep -Eoi "resets? ([A-Za-z]+ [0-9]+ )?(at )?[0-9]{1,2}(:[0-9]{2})?( ?[ap]m)?( \([^)]+\))?" | sed -E 's/^resets? ([A-Za-z]+ [0-9]+ )?(at )?//')
            log "Extracted reset time: $reset_time"
        fi
    fi

    # Also check recent shell snapshots for rate limit messages
    local snapshot_dir="${HOME}/.claude/shell-snapshots"
    if [ -d "$snapshot_dir" ]; then
        local recent_snapshot=$(ls -t "$snapshot_dir" 2>/dev/null | head -1)
        if [ -n "$recent_snapshot" ] && [ -f "$snapshot_dir/$recent_snapshot" ]; then
            if grep -qi "limit reached" "$snapshot_dir/$recent_snapshot" 2>/dev/null; then
                limit_reached=true
                log "Rate limit detected in shell snapshot"

                # Try to extract reset time from snapshot too
                if [ -z "$reset_time" ]; then
                    local reset_line=$(grep -i "reset" "$snapshot_dir/$recent_snapshot" | tail -1)
                    log "Reset line from snapshot: $reset_line"
                    reset_time=$(echo "$reset_line" | grep -Eoi "resets? ([A-Za-z]+ [0-9]+ )?(at )?[0-9]{1,2}(:[0-9]{2})?( ?[ap]m)?( \([^)]+\))?" | sed -E 's/^resets? ([A-Za-z]+ [0-9]+ )?(at )?//')
                    log "Extracted reset time from snapshot: $reset_time"
                fi
            fi
        fi
    fi

    echo "$limit_reached|$reset_time"
}

# Function to parse time and calculate delay
parse_reset_time() {
    local time_str="$1"

    # Remove timezone info in parentheses
    time_str=$(echo "$time_str" | sed 's/ ([^)]*)//g')

    log "Parsing time string: $time_str"

    # Extract hour, minute, and AM/PM
    local hour minute ampm

    # Handle formats like "10:30am", "12:30 AM", "7pm", "6pm"
    if echo "$time_str" | grep -Eq "[0-9]{1,2}:[0-9]{2}"; then
        # Has minutes (10:30am, 12:30 AM)
        hour=$(echo "$time_str" | grep -Eo "[0-9]{1,2}" | head -1)
        minute=$(echo "$time_str" | grep -Eo ":[0-9]{2}" | sed 's/://')
        ampm=$(echo "$time_str" | grep -Eoi "[ap]m" | tr '[:lower:]' '[:upper:]')
    else
        # No minutes (7pm, 6pm)
        hour=$(echo "$time_str" | grep -Eo "[0-9]{1,2}")
        minute="00"
        ampm=$(echo "$time_str" | grep -Eoi "[ap]m" | tr '[:lower:]' '[:upper:]')
    fi

    log "Parsed: hour=$hour, minute=$minute, ampm=$ampm"

    # Convert to 24-hour format
    if [ "$ampm" = "AM" ]; then
        if [ "$hour" -eq 12 ]; then
            hour=0
        fi
    elif [ "$ampm" = "PM" ]; then
        if [ "$hour" -ne 12 ]; then
            hour=$((hour + 12))
        fi
    fi

    log "24-hour format: $hour:$minute"

    # Get current time
    local current_epoch=$(date +%s)
    local current_hour=$(date +%H)
    local current_minute=$(date +%M)

    # Calculate reset time for today
    local reset_today=$(date -j -f "%Y-%m-%d %H:%M" "$(date +%Y-%m-%d) $hour:$minute" +%s 2>/dev/null)

    # Determine if reset is today or tomorrow
    local reset_epoch
    if [ $reset_today -gt $current_epoch ]; then
        # Reset is later today
        reset_epoch=$reset_today
        log "Reset is today at $hour:$minute"
    else
        # Reset is tomorrow
        reset_epoch=$(date -j -v+1d -f "%Y-%m-%d %H:%M" "$(date +%Y-%m-%d) $hour:$minute" +%s 2>/dev/null)
        log "Reset is tomorrow at $hour:$minute"
    fi

    # Calculate delay in seconds
    local delay_seconds=$((reset_epoch - current_epoch))

    # Add 1 minute buffer
    delay_seconds=$((delay_seconds + 60))

    # Convert to minutes
    local delay_minutes=$((delay_seconds / 60))

    log "Delay: $delay_minutes minutes ($delay_seconds seconds)"
    log "Restart scheduled for: $(date -r $((current_epoch + delay_seconds)) '+%Y-%m-%d %H:%M:%S')"

    echo "$delay_minutes"
}

# Function to parse and schedule restart time
schedule_delayed_restart() {
    local reset_hint="$1"
    local delay_minutes=120  # Default: 2 hours

    if [ -z "$reset_hint" ]; then
        log "No reset time provided, using default delay of $delay_minutes minutes"
    else
        # Try to parse the time
        delay_minutes=$(parse_reset_time "$reset_hint")

        # Fallback to default if parsing failed
        if [ -z "$delay_minutes" ] || [ "$delay_minutes" -le 0 ]; then
            log "Failed to parse reset time, using default delay"
            delay_minutes=120
        fi
    fi

    # Use launchd for macOS scheduling
    schedule_with_launchd "$delay_minutes"
}

# Function to create and load launchd job
schedule_with_launchd() {
    local delay_minutes=$1
    local delay_seconds=$((delay_minutes * 60))
    local plist_label="com.claude.auto-restart.$(echo "$CLAUDE_CWD" | md5 | cut -c1-8)"
    local plist_file="${HOME}/Library/LaunchAgents/${plist_label}.plist"
    local helper_script="${LOG_DIR}/restart-helper.sh"

    log "Creating launchd job with delay of $delay_seconds seconds"

    # Create helper script that will actually launch Claude
    cat > "$helper_script" <<HELPER_EOF
#!/bin/bash
# Helper script to restart Claude
WORK_DIR="$CLAUDE_CWD"
LOG_DIR="\${WORK_DIR}/.claude/auto-restart-logs"
STATE_FILE="\${LOG_DIR}/restart-state.json"

# Read state to get prompt
if [ -f "\$STATE_FILE" ]; then
    PROMPT=\$(grep -o '"prompt":"[^"]*"' "\$STATE_FILE" | sed 's/"prompt":"//;s/"//')
else
    PROMPT="$CONTINUATION_PROMPT"
fi

echo "[\$(date)] Restarting Claude in \$WORK_DIR with prompt: \$PROMPT" >> "\${LOG_DIR}/auto-restart.log"

# Kill any existing Claude process
pkill -f "claude" || true
sleep 2

# Launch new Claude session
cd "\$WORK_DIR"
nohup claude "\$PROMPT" >> "\${LOG_DIR}/claude-output.log" 2>&1 &

# Unload this launchd job
launchctl unload ~/Library/LaunchAgents/${plist_label}.plist 2>/dev/null || true
rm -f ~/Library/LaunchAgents/${plist_label}.plist 2>/dev/null || true
HELPER_EOF

    chmod +x "$helper_script"

    # Create launchd plist
    cat > "$plist_file" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${plist_label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${helper_script}</string>
    </array>
    <key>StartInterval</key>
    <integer>${delay_seconds}</integer>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
PLIST_EOF

    # Load the launchd job
    launchctl unload "$plist_file" 2>/dev/null || true
    launchctl load "$plist_file"

    log "Launchd job created and loaded: $plist_file"
}

# Function to restart Claude immediately
restart_claude_now() {
    log "Initiating immediate restart"

    # Save current state
    cat > "$STATE_FILE" <<EOF
{
    "cwd": "$CLAUDE_CWD",
    "prompt": "$CONTINUATION_PROMPT",
    "timestamp": "$(date '+%Y-%m-%d %H:%M:%S')",
    "session_id": "${CLAUDE_SESSION_ID:-unknown}"
}
EOF

    # Kill current Claude process (find by process name)
    log "Killing current Claude session"
    sleep 1  # Give the session end hook time to complete

    # Use a background job to kill and restart after a delay
    (
        sleep 2
        pkill -f "claude" || true
        sleep 1

        # Launch new Claude session in the original directory
        log "Launching new Claude session in $CLAUDE_CWD"
        cd "$CLAUDE_CWD"
        nohup claude "$CONTINUATION_PROMPT" >> "${LOG_DIR}/claude-output.log" 2>&1 &

        log "New Claude session launched (PID: $!)"
    ) &

    log "Background restart job initiated"
}

# Main logic
main() {
    # Prevent concurrent executions
    if [ -f "$LOCK_FILE" ]; then
        local lock_age=$(($(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0)))
        if [ $lock_age -lt 60 ]; then
            log "Lock file exists and is recent, skipping restart"
            exit 0
        fi
    fi
    touch "$LOCK_FILE"

    # Detect if rate limit was hit
    IFS='|' read -r limit_reached reset_hint <<< "$(detect_rate_limit)"

    if [ "$limit_reached" = "true" ]; then
        log "Rate limit detected, scheduling delayed restart"

        # Save state for delayed restart
        cat > "$STATE_FILE" <<EOF
{
    "cwd": "$CLAUDE_CWD",
    "prompt": "$CONTINUATION_PROMPT",
    "timestamp": "$(date '+%Y-%m-%d %H:%M:%S')",
    "session_id": "${CLAUDE_SESSION_ID:-unknown}",
    "rate_limited": true,
    "reset_hint": "$reset_hint"
}
EOF

        schedule_delayed_restart "$reset_hint"
    else
        log "Normal session end, restarting immediately"
        restart_claude_now
    fi

    # Clean up lock file after a delay
    (sleep 5; rm -f "$LOCK_FILE") &
}

# Run main logic
main

log "=== Session End Hook Completed ==="
exit 0
