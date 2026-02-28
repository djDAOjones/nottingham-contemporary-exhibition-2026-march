#!/bin/bash

# Switch Venue - Update Vercel IP for venue changes
# Usage: ./switch-venue.sh [venue]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
SESSIONS_DIR="$PROJECT_ROOT/sessions"
CONFIG_DIR="$PROJECT_ROOT/config"

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

VENUE=${1:-"unknown"}

echo ""
echo "🏢 Switching to Venue: $VENUE"
echo "============================="
echo ""

# Detect current IP
log "Detecting current IP address..."
LOCAL_IP=""

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(route get default | grep interface | awk '{print $2}' | head -1)
    if [[ -n "$LOCAL_IP" ]]; then
        LOCAL_IP=$(ifconfig "$LOCAL_IP" | grep 'inet ' | awk '{print $2}' | head -1)
    fi
else
    # Linux
    LOCAL_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K[^ ]+' 2>/dev/null || hostname -I | awk '{print $1}')
fi

if [[ -z "$LOCAL_IP" ]]; then
    warn "Could not detect IP automatically"
    read -p "Please enter the local IP address: " LOCAL_IP
fi

success "Using IP: $LOCAL_IP"

# Update current session
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_SESSION=$(cat "$CURRENT_SESSION_FILE")
    SESSION_DIR="$SESSIONS_DIR/$CURRENT_SESSION"
    
    if [[ -d "$SESSION_DIR" ]]; then
        # Update session metadata
        if [[ -f "$SESSION_DIR/metadata.json" ]]; then
            jq --arg venue "$VENUE" --arg ip "$LOCAL_IP" \
                '.venue = $venue | .ip = $ip | .lastVenueSwitch = now' \
                "$SESSION_DIR/metadata.json" > "$SESSION_DIR/metadata.tmp" && \
                mv "$SESSION_DIR/metadata.tmp" "$SESSION_DIR/metadata.json"
        fi
        
        # Store IP
        echo "$LOCAL_IP" > "$SESSION_DIR/ip_address"
        
        log "Updated session $CURRENT_SESSION with venue: $VENUE"
    fi
fi

# Update Vercel
HUB_URL="ws://${LOCAL_IP}:3000"
log "Updating Vercel environment variable to: $HUB_URL"

if command -v vercel >/dev/null 2>&1; then
    cd "$PROJECT_ROOT/vercel-app"
    
    # Remove existing variable
    vercel env rm NEXT_PUBLIC_HUB_URL production --yes 2>/dev/null || true
    
    # Add new variable
    if vercel env add NEXT_PUBLIC_HUB_URL "$HUB_URL" production --yes 2>/dev/null; then
        success "Updated NEXT_PUBLIC_HUB_URL"
        
        # Trigger redeployment
        log "Triggering redeployment..."
        if vercel --prod 2>/dev/null; then
            success "Redeployment complete"
        else
            warn "Redeployment failed - please redeploy manually"
        fi
    else
        warn "Failed to update Vercel variable"
    fi
    
    cd "$PROJECT_ROOT"
else
    warn "Vercel CLI not available"
fi

# Save venue configuration for future use
mkdir -p "$CONFIG_DIR"
VENUES_FILE="$CONFIG_DIR/venues.json"

# Create or update venues file
if [[ ! -f "$VENUES_FILE" ]]; then
    echo '{}' > "$VENUES_FILE"
fi

# Add/update this venue
jq --arg venue "$VENUE" --arg ip "$LOCAL_IP" \
    '.[$venue] = {"ip": $ip, "lastUsed": now}' \
    "$VENUES_FILE" > "$CONFIG_DIR/venues.tmp" && \
    mv "$CONFIG_DIR/venues.tmp" "$VENUES_FILE"

success "Venue configuration saved"

echo ""
echo "✅ Venue Switch Complete"
echo ""
echo "Venue:    $VENUE"
echo "IP:       $LOCAL_IP" 
echo "Hub URL:  $HUB_URL"
echo ""
echo "Control Panels:"
echo "• Moderator: http://$LOCAL_IP:3000/moderate"
echo "• Display:   http://$LOCAL_IP:3000/display"
echo ""
echo "Public Access:"
echo "• Vercel:    https://nottingham-contemporary-exhibition.vercel.app"
echo ""
