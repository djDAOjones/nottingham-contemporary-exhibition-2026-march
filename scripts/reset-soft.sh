#!/bin/bash

# Soft Reset - Restart Hub and Bridge while keeping current session messages
# Usage: ./scripts/reset-soft.sh

# No set -e — we handle errors explicitly

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSIONS_DIR="$PROJECT_ROOT/sessions"
PIDS_FILE="$SESSIONS_DIR/.pids"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }

echo ""
echo "🔄 Soft Reset - Restarting services (keeping messages)"
echo "======================================================="
echo ""

# --- 1. Stop running processes ---
log "Stopping services..."

# Kill by PID file if available
if [[ -f "$PIDS_FILE" ]]; then
    source "$PIDS_FILE"
    [[ -n "$HUB_PID" ]] && kill "$HUB_PID" 2>/dev/null && log "Stopped Hub (PID: $HUB_PID)" || true
    [[ -n "$BRIDGE_PID" ]] && kill "$BRIDGE_PID" 2>/dev/null && log "Stopped Bridge (PID: $BRIDGE_PID)" || true
    [[ -n "$NGROK_PID" ]] && kill "$NGROK_PID" 2>/dev/null && log "Stopped ngrok (PID: $NGROK_PID)" || true
fi

# Also kill by port as fallback
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:4000 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 2
success "All services stopped"

# --- 2. Verify session is preserved ---
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_SESSION=$(cat "$CURRENT_SESSION_FILE")
    success "Session preserved: $CURRENT_SESSION"
else
    warn "No active session found"
fi

# --- 3. Restart via boot script ---
log "Restarting via boot script..."
echo ""
exec "$PROJECT_ROOT/scripts/boot.sh"
