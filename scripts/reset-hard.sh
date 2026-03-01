#!/bin/bash

# Hard Reset - Stop everything, clear messages, start fresh session
# Usage: ./scripts/reset-hard.sh [session-name]
# Example: ./scripts/reset-hard.sh "rehearsal"

# No set -e — we handle errors explicitly

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSIONS_DIR="$PROJECT_ROOT/sessions"
PIDS_FILE="$SESSIONS_DIR/.pids"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }

SESSION_NAME="${1:-}"

echo ""
echo "🗑️  Hard Reset - Full system reset with new session"
echo "===================================================="
echo ""

# --- 1. Stop all services ---
log "Stopping all services..."

if [[ -f "$PIDS_FILE" ]]; then
    source "$PIDS_FILE"
    [[ -n "$HUB_PID" ]] && kill "$HUB_PID" 2>/dev/null || true
    [[ -n "$BRIDGE_PID" ]] && kill "$BRIDGE_PID" 2>/dev/null || true
    [[ -n "$NGROK_PID" ]] && kill "$NGROK_PID" 2>/dev/null || true
fi

lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:4000 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2
success "All services stopped"

# --- 2. Archive current session ---
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    OLD_SESSION=$(cat "$CURRENT_SESSION_FILE")
    log "Archiving session: $OLD_SESSION"

    # Move logs to archive
    ARCHIVE_DIR="$SESSIONS_DIR/archive/$OLD_SESSION"
    mkdir -p "$ARCHIVE_DIR"
    mv "$SESSIONS_DIR/hub.log" "$ARCHIVE_DIR/" 2>/dev/null || true
    mv "$SESSIONS_DIR/bridge.log" "$ARCHIVE_DIR/" 2>/dev/null || true
    mv "$SESSIONS_DIR/ngrok.log" "$ARCHIVE_DIR/" 2>/dev/null || true
    success "Archived old session to $ARCHIVE_DIR"
fi

# --- 3. Create new session ---
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
RANDOM_ID=$(openssl rand -hex 3 2>/dev/null || echo "000000")
if [[ -n "$SESSION_NAME" ]]; then
    NEW_SESSION="${TIMESTAMP}-${SESSION_NAME}"
else
    NEW_SESSION="${TIMESTAMP}-${RANDOM_ID}"
fi

echo "$NEW_SESSION" > "$CURRENT_SESSION_FILE"
success "New session created: $NEW_SESSION"

# --- 4. Clean PID file ---
rm -f "$PIDS_FILE"

# --- 5. Restart via boot script ---
log "Starting fresh..."
echo ""
exec "$PROJECT_ROOT/scripts/boot.sh"
