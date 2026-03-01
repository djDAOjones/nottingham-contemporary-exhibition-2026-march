#!/bin/bash

# Boot Exhibition - Start Hub, Hub-Bridge, and configure networking
# Usage: ./scripts/boot.sh
#
# What it does:
#   1. Kills any stale processes on ports 3000/4000
#   2. Detects local IP address
#   3. Starts Hub server (port 3000)
#   4. Starts Hub-Bridge if present (port 4000)
#   5. If ngrok is installed, creates HTTPS tunnel and updates Vercel
#   6. Prints all URLs including QR-ready local submit URL

# No set -e — we handle errors explicitly to avoid silent failures

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSIONS_DIR="$PROJECT_ROOT/sessions"
PIDS_FILE="$SESSIONS_DIR/.pids"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; }

mkdir -p "$SESSIONS_DIR"

echo ""
echo "🚀 Booting AI Exhibition System"
echo "================================"
echo ""

# --- 1. Kill stale processes ---
log "Clearing ports 3000 and 4000..."
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:4000 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
success "Ports cleared"

# --- 2. Detect local IP ---
log "Detecting local IP address..."
LOCAL_IP=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

if [[ -z "$LOCAL_IP" ]]; then
    error "Could not detect local IP address"
    exit 1
fi
success "Detected IP: $LOCAL_IP"

# --- 3. Session management ---
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_SESSION=$(cat "$CURRENT_SESSION_FILE")
    log "Continuing session: $CURRENT_SESSION"
else
    TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    RANDOM_ID=$(openssl rand -hex 3 2>/dev/null || echo "000000")
    CURRENT_SESSION="${TIMESTAMP}-${RANDOM_ID}"
    echo "$CURRENT_SESSION" > "$CURRENT_SESSION_FILE"
    success "Created new session: $CURRENT_SESSION"
fi

# --- 4. Install dependencies if needed ---
cd "$PROJECT_ROOT"
if [[ ! -d "node_modules" ]]; then
    log "Installing Hub dependencies..."
    npm install
fi

if [[ -d "$PROJECT_ROOT/hub-bridge" && ! -d "$PROJECT_ROOT/hub-bridge/node_modules" ]]; then
    log "Installing Hub-Bridge dependencies..."
    cd "$PROJECT_ROOT/hub-bridge"
    npm install
    cd "$PROJECT_ROOT"
fi

# --- 5. Start Hub server ---
log "Starting Hub server on port 3000..."
cd "$PROJECT_ROOT"
nohup node server/index.js > "$SESSIONS_DIR/hub.log" 2>&1 &
HUB_PID=$!

sleep 3

if kill -0 "$HUB_PID" 2>/dev/null; then
    success "Hub server started (PID: $HUB_PID)"
else
    error "Hub server failed to start. Check $SESSIONS_DIR/hub.log"
    cat "$SESSIONS_DIR/hub.log" | tail -20
    exit 1
fi

# --- 6. Start Hub-Bridge (if it exists) ---
BRIDGE_PID=""
if [[ -d "$PROJECT_ROOT/hub-bridge" ]]; then
    log "Starting Hub-Bridge on port 4000..."
    cd "$PROJECT_ROOT/hub-bridge"
    nohup env HUB_URL="ws://localhost:3000" node index.js > "$SESSIONS_DIR/bridge.log" 2>&1 &
    BRIDGE_PID=$!
    sleep 2

    if kill -0 "$BRIDGE_PID" 2>/dev/null; then
        success "Hub-Bridge started (PID: $BRIDGE_PID)"
    else
        warn "Hub-Bridge failed to start. Check $SESSIONS_DIR/bridge.log"
        BRIDGE_PID=""
    fi
    cd "$PROJECT_ROOT"
fi

# --- 7. Save PIDs for reset scripts ---
echo "HUB_PID=$HUB_PID" > "$PIDS_FILE"
echo "BRIDGE_PID=$BRIDGE_PID" >> "$PIDS_FILE"

# --- 8. HTTPS tunnel for Vercel (if ngrok available) ---
TUNNEL_URL=""
if command -v ngrok >/dev/null 2>&1; then
    # Configure ngrok auth token from .env.local if present
    ENV_FILE="$PROJECT_ROOT/vercel-app/.env.local"
    if [[ -f "$ENV_FILE" ]]; then
        NGROK_TOKEN=$(grep "^NGROK_AUTH_TOKEN=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
        if [[ -n "$NGROK_TOKEN" ]]; then
            log "Configuring ngrok authentication..."
            ngrok config add-authtoken "$NGROK_TOKEN" >/dev/null 2>&1
        fi
    fi
    
    log "Starting ngrok HTTPS tunnel..."
    ngrok http 3000 --log=stdout > "$SESSIONS_DIR/ngrok.log" 2>&1 &
    NGROK_PID=$!
    echo "NGROK_PID=$NGROK_PID" >> "$PIDS_FILE"
    sleep 3

    # Extract public URL from ngrok API
    TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

    if [[ -n "$TUNNEL_URL" ]]; then
        success "HTTPS tunnel: $TUNNEL_URL"

        # Update Vercel environment variable
        log "Updating Vercel with HTTPS tunnel URL..."
        cd "$PROJECT_ROOT/vercel-app"
        # Remove old env var and add new one
        vercel env rm NEXT_PUBLIC_HUB_URL production --yes 2>/dev/null || true
        echo "$TUNNEL_URL" | vercel env add NEXT_PUBLIC_HUB_URL production 2>/dev/null

        if [ $? -eq 0 ]; then
            success "Vercel env updated to $TUNNEL_URL"
            log "Redeploying Vercel..."
            vercel deploy --prod 2>/dev/null
            success "Vercel redeployed with HTTPS tunnel"
        else
            warn "Failed to update Vercel env. Set NEXT_PUBLIC_HUB_URL manually to: $TUNNEL_URL"
        fi
        cd "$PROJECT_ROOT"
    else
        warn "ngrok started but tunnel URL not found. Check $SESSIONS_DIR/ngrok.log"
    fi
else
    warn "ngrok not installed — Vercel page cannot connect to local Hub (HTTPS→HTTP blocked)"
    warn "Install ngrok: brew install ngrok"
    warn "Or use the local submit page for audience QR codes instead"
fi

# --- 9. Summary ---
echo ""
echo "============================================"
echo -e "${GREEN}🎉 Exhibition System Ready!${NC}"
echo "============================================"
echo ""
echo "Session: $CURRENT_SESSION"
echo "Hub IP:  $LOCAL_IP"
echo ""
echo "📱 Local Pages (same WiFi):"
echo "   Submit:    http://$LOCAL_IP:3000/submit"
echo "   Moderate:  http://$LOCAL_IP:3000/moderate"
echo "   Display:   http://$LOCAL_IP:3000/display"
echo "   Test:      http://$LOCAL_IP:3000/test"
echo "   Archive:   http://$LOCAL_IP:3000/archive"

if [[ -n "$BRIDGE_PID" ]]; then
    echo "   Bridge:    http://$LOCAL_IP:4000"
fi

echo ""
if [[ -n "$TUNNEL_URL" ]]; then
    echo "🌐 Vercel (public HTTPS):"
    echo "   Submit:    https://nottingham-contemporary-exhibition.vercel.app"
    echo "   Hub (tunnel): $TUNNEL_URL"
else
    echo "🌐 Audience QR Code URL (use this for QR codes):"
    echo "   http://$LOCAL_IP:3000/submit"
    echo ""
    echo "   ⚠️  Vercel page won't work without ngrok (HTTPS→HTTP blocked)"
    echo "   Install: brew install ngrok"
fi

echo ""
echo "Commands:"
echo "   Soft reset (keep messages): ./scripts/reset-soft.sh"
echo "   Hard reset (new session):   ./scripts/reset-hard.sh"
echo "   Status:                     ./scripts/status.sh"
echo "   Logs:  tail -f $SESSIONS_DIR/hub.log"
echo ""
