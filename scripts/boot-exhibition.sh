#!/bin/bash

# Boot Exhibition - Auto-configure and start with session management
# Detects IP, updates Vercel, preserves session state
# Usage: ./boot-exhibition.sh [venue]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
SESSIONS_DIR="$PROJECT_ROOT/sessions"
CONFIG_DIR="$PROJECT_ROOT/config"

# Color output
RED='\033[0;31m'
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

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"
}

# Create directories if they don't exist
mkdir -p "$SESSIONS_DIR" "$CONFIG_DIR"

echo ""
echo "🚀 Booting AI Exhibition System"
echo "================================"
echo ""

# Get current session or create new one
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_SESSION=$(cat "$CURRENT_SESSION_FILE")
    log "Found existing session: $CURRENT_SESSION"
    SESSION_DIR="$SESSIONS_DIR/$CURRENT_SESSION"
    
    if [[ ! -d "$SESSION_DIR" ]]; then
        warn "Session directory missing, creating new session"
        CURRENT_SESSION=""
    fi
else
    log "No current session found"
    CURRENT_SESSION=""
fi

# Create new session if needed
if [[ -z "$CURRENT_SESSION" ]]; then
    TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    RANDOM_ID=$(openssl rand -hex 3)
    CURRENT_SESSION="${TIMESTAMP}-${RANDOM_ID}"
    SESSION_DIR="$SESSIONS_DIR/$CURRENT_SESSION"
    
    log "Creating new session: $CURRENT_SESSION"
    mkdir -p "$SESSION_DIR"
    echo "$CURRENT_SESSION" > "$CURRENT_SESSION_FILE"
    
    # Initialize session metadata
    cat > "$SESSION_DIR/metadata.json" << EOF
{
  "sessionId": "$CURRENT_SESSION",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "venue": "${1:-unknown}",
  "status": "active",
  "stats": {
    "submissions": 0,
    "responses": 0,
    "modules": 0
  }
}
EOF
    
    success "Session $CURRENT_SESSION initialized"
else
    SESSION_DIR="$SESSIONS_DIR/$CURRENT_SESSION"
    log "Continuing session: $CURRENT_SESSION"
fi

# Detect local IP address
log "Detecting local IP address..."
if command -v hostname >/dev/null 2>&1; then
    # Try multiple methods to get IP
    LOCAL_IP=""
    
    # Method 1: Use route command (most reliable)
    if command -v route >/dev/null 2>&1 && [[ "$OSTYPE" == "darwin"* ]]; then
        LOCAL_IP=$(route get default | grep interface | awk '{print $2}' | head -1)
        if [[ -n "$LOCAL_IP" ]]; then
            LOCAL_IP=$(ifconfig "$LOCAL_IP" | grep 'inet ' | awk '{print $2}' | head -1)
        fi
    fi
    
    # Method 2: Use ip command (Linux)
    if [[ -z "$LOCAL_IP" ]] && command -v ip >/dev/null 2>&1; then
        LOCAL_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K[^ ]+' 2>/dev/null || true)
    fi
    
    # Method 3: Use ifconfig (fallback)
    if [[ -z "$LOCAL_IP" ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            LOCAL_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
        else
            LOCAL_IP=$(hostname -I | awk '{print $1}')
        fi
    fi
    
    if [[ -n "$LOCAL_IP" ]]; then
        success "Detected IP: $LOCAL_IP"
    else
        error "Could not detect local IP address"
        exit 1
    fi
else
    error "hostname command not available"
    exit 1
fi

# Store IP in session
echo "$LOCAL_IP" > "$SESSION_DIR/ip_address"

# Update Vercel environment variable
log "Updating Vercel environment variable..."
HUB_URL="ws://${LOCAL_IP}:3000"

# Check if Vercel CLI is available
if command -v vercel >/dev/null 2>&1; then
    cd "$PROJECT_ROOT/vercel-app"
    
    # Set environment variable
    if vercel env add NEXT_PUBLIC_HUB_URL "$HUB_URL" production --yes 2>/dev/null; then
        success "Updated NEXT_PUBLIC_HUB_URL to $HUB_URL"
    else
        # Try to remove and re-add if it already exists
        vercel env rm NEXT_PUBLIC_HUB_URL production --yes 2>/dev/null || true
        if vercel env add NEXT_PUBLIC_HUB_URL "$HUB_URL" production --yes 2>/dev/null; then
            success "Updated NEXT_PUBLIC_HUB_URL to $HUB_URL"
        else
            warn "Failed to update Vercel environment variable automatically"
            warn "Please manually set NEXT_PUBLIC_HUB_URL to $HUB_URL in Vercel dashboard"
        fi
    fi
    
    # Trigger redeployment
    log "Triggering Vercel redeployment..."
    if vercel --prod 2>/dev/null; then
        success "Vercel redeployment triggered"
    else
        warn "Failed to trigger automatic redeployment"
        warn "Please redeploy manually from Vercel dashboard"
    fi
    
    cd "$PROJECT_ROOT"
else
    warn "Vercel CLI not available, skipping automatic Vercel update"
    warn "Please manually set NEXT_PUBLIC_HUB_URL to $HUB_URL in Vercel dashboard"
fi

# Start the Hub system
log "Starting Hub v2 system..."
cd "$PROJECT_ROOT"

# Check if node modules are installed
if [[ ! -d "node_modules" ]]; then
    log "Installing dependencies..."
    npm install
fi

# Start in background and capture PID
npm start &
HUB_PID=$!
echo "$HUB_PID" > "$SESSION_DIR/hub_pid"

# Wait a moment for startup
sleep 3

# Check if Hub started successfully
if kill -0 "$HUB_PID" 2>/dev/null; then
    success "Hub v2 started (PID: $HUB_PID)"
    
    # Update session metadata
    jq --arg ip "$LOCAL_IP" --arg pid "$HUB_PID" '.ip = $ip | .hubPid = ($pid | tonumber) | .lastStarted = now | .status = "running"' \
        "$SESSION_DIR/metadata.json" > "$SESSION_DIR/metadata.tmp" && \
        mv "$SESSION_DIR/metadata.tmp" "$SESSION_DIR/metadata.json"
    
    echo ""
    echo "🎉 Exhibition System Ready!"
    echo "=========================="
    echo ""
    echo "Session ID: $CURRENT_SESSION"
    echo "Local IP:   $LOCAL_IP"
    echo "Hub URL:    $HUB_URL"
    echo ""
    echo "Control Panels:"
    echo "• Moderator: http://$LOCAL_IP:3000/moderate"
    echo "• Display:   http://$LOCAL_IP:3000/display"  
    echo "• Archive:   http://$LOCAL_IP:3000/archive"
    echo ""
    echo "Public Access:"
    echo "• Vercel:    https://nottingham-contemporary-exhibition.vercel.app"
    echo ""
    echo "Use './scripts/session-status.sh' to monitor"
    echo "Use './scripts/stop-exhibition.sh' to shutdown"
    echo ""
    
else
    error "Hub failed to start"
    exit 1
fi
