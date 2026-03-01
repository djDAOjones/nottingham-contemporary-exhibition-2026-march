#!/bin/bash

# Status - Show current system status
# Usage: ./scripts/status.sh

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSIONS_DIR="$PROJECT_ROOT/sessions"
PIDS_FILE="$SESSIONS_DIR/.pids"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo ""
echo "📊 Exhibition System Status"
echo "==========================="
echo ""

# Session
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    echo -e "Session:  ${BLUE}$(cat "$CURRENT_SESSION_FILE")${NC}"
else
    echo -e "Session:  ${RED}None${NC}"
fi

# Local IP
LOCAL_IP=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' 2>/dev/null || echo "unknown")
echo -e "Local IP: ${BLUE}$LOCAL_IP${NC}"
echo ""

# Hub server
HUB_PID=$(lsof -ti:3000 2>/dev/null | head -1)
if [[ -n "$HUB_PID" ]]; then
    MEMORY=$(ps -o rss= -p "$HUB_PID" 2>/dev/null | awk '{print int($1/1024)}' || echo "?")
    echo -e "🟢 Hub Server:   Running (PID: $HUB_PID, ${MEMORY}MB)"
    if curl -s http://localhost:3000/api/prompt >/dev/null 2>&1; then
        echo -e "   API:          ${GREEN}Healthy${NC}"
    else
        echo -e "   API:          ${YELLOW}Not responding${NC}"
    fi
else
    echo -e "🔴 Hub Server:   ${RED}Not running${NC}"
fi

# Hub-Bridge
BRIDGE_PID=$(lsof -ti:4000 2>/dev/null | head -1)
if [[ -n "$BRIDGE_PID" ]]; then
    echo -e "🟢 Hub-Bridge:   Running (PID: $BRIDGE_PID)"
else
    echo -e "⚪ Hub-Bridge:   Not running"
fi

# ngrok tunnel
NGROK_PID=""
if [[ -f "$PIDS_FILE" ]]; then
    source "$PIDS_FILE" 2>/dev/null
fi
if [[ -n "$NGROK_PID" ]] && kill -0 "$NGROK_PID" 2>/dev/null; then
    TUNNEL_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "🟢 HTTPS Tunnel: ${GREEN}$TUNNEL_URL${NC}"
else
    echo -e "⚪ HTTPS Tunnel: Not running (install ngrok for Vercel support)"
fi

echo ""
echo "📱 URLs:"
echo "   Submit:    http://$LOCAL_IP:3000/submit"
echo "   Moderate:  http://$LOCAL_IP:3000/moderate"
echo "   Display:   http://$LOCAL_IP:3000/display"
echo "   Test:      http://$LOCAL_IP:3000/test"
echo ""
