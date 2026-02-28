#!/bin/bash

# New Session - Create a fresh session with clean state
# Usage: ./new-session.sh [session-name]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
SESSIONS_DIR="$PROJECT_ROOT/sessions"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"
}

echo ""
echo "🔄 Creating New Exhibition Session"
echo "================================="
echo ""

# Stop current session if running
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_SESSION=$(cat "$CURRENT_SESSION_FILE")
    CURRENT_DIR="$SESSIONS_DIR/$CURRENT_SESSION"
    
    if [[ -f "$CURRENT_DIR/hub_pid" ]]; then
        HUB_PID=$(cat "$CURRENT_DIR/hub_pid")
        if kill -0 "$HUB_PID" 2>/dev/null; then
            log "Stopping current session: $CURRENT_SESSION"
            kill "$HUB_PID" 2>/dev/null || true
            sleep 2
            
            # Update metadata
            if [[ -f "$CURRENT_DIR/metadata.json" ]]; then
                jq '.status = "stopped" | .stoppedAt = now' \
                    "$CURRENT_DIR/metadata.json" > "$CURRENT_DIR/metadata.tmp" && \
                    mv "$CURRENT_DIR/metadata.tmp" "$CURRENT_DIR/metadata.json"
            fi
            
            success "Previous session stopped"
        fi
    fi
fi

# Create new session ID
if [[ -n "$1" ]]; then
    # Use provided name with timestamp
    TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    NEW_SESSION="${TIMESTAMP}-${1}"
else
    # Generate automatic ID
    TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    RANDOM_ID=$(openssl rand -hex 3)
    NEW_SESSION="${TIMESTAMP}-${RANDOM_ID}"
fi

NEW_SESSION_DIR="$SESSIONS_DIR/$NEW_SESSION"
mkdir -p "$NEW_SESSION_DIR"

# Create session metadata
cat > "$NEW_SESSION_DIR/metadata.json" << EOF
{
  "sessionId": "$NEW_SESSION",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "venue": "unknown",
  "status": "created",
  "stats": {
    "submissions": 0,
    "responses": 0,
    "modules": 0
  },
  "description": "${2:-New exhibition session}"
}
EOF

# Set as current session
echo "$NEW_SESSION" > "$CURRENT_SESSION_FILE"

# Create session directories
mkdir -p "$NEW_SESSION_DIR/logs"
mkdir -p "$NEW_SESSION_DIR/archive"
mkdir -p "$NEW_SESSION_DIR/backups"

# Initialize empty state files
echo "[]" > "$NEW_SESSION_DIR/submissions.json"
echo "[]" > "$NEW_SESSION_DIR/responses.json"
echo "{}" > "$NEW_SESSION_DIR/modules.json"

success "New session created: $NEW_SESSION"

echo ""
echo "📁 Session Details:"
echo "   ID: $NEW_SESSION"
echo "   Path: $NEW_SESSION_DIR"
echo "   Status: Created (not started)"
echo ""
echo "Next steps:"
echo "   • Run './scripts/boot-exhibition.sh' to start"
echo "   • Or run './scripts/session-status.sh' to check status"
echo ""
