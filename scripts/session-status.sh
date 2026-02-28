#!/bin/bash

# Session Status - Show current session information and system status
# Usage: ./session-status.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
SESSIONS_DIR="$PROJECT_ROOT/sessions"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if sessions directory exists
if [[ ! -d "$SESSIONS_DIR" ]]; then
    echo -e "${RED}No sessions directory found${NC}"
    echo "Run './scripts/new-session.sh' to create your first session"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 Exhibition System Status${NC}"
echo "============================"
echo ""

# Get current session
CURRENT_SESSION_FILE="$SESSIONS_DIR/current_session"
if [[ -f "$CURRENT_SESSION_FILE" ]]; then
    CURRENT_SESSION=$(cat "$CURRENT_SESSION_FILE")
    SESSION_DIR="$SESSIONS_DIR/$CURRENT_SESSION"
    
    if [[ -d "$SESSION_DIR" ]]; then
        echo -e "${CYAN}Current Session:${NC} $CURRENT_SESSION"
        
        # Load metadata
        if [[ -f "$SESSION_DIR/metadata.json" ]]; then
            METADATA=$(cat "$SESSION_DIR/metadata.json")
            
            CREATED=$(echo "$METADATA" | jq -r '.created // "unknown"' | sed 's/T/ /' | sed 's/Z//')
            STATUS=$(echo "$METADATA" | jq -r '.status // "unknown"')
            VENUE=$(echo "$METADATA" | jq -r '.venue // "unknown"')
            
            echo -e "${CYAN}Created:${NC}         $CREATED"
            echo -e "${CYAN}Venue:${NC}           $VENUE"
            
            # Status with color
            case "$STATUS" in
                "running") echo -e "${CYAN}Status:${NC}          ${GREEN}$STATUS ●${NC}" ;;
                "stopped") echo -e "${CYAN}Status:${NC}          ${RED}$STATUS ○${NC}" ;;
                *) echo -e "${CYAN}Status:${NC}          ${YELLOW}$STATUS${NC}" ;;
            esac
            
            # Get statistics
            SUBMISSIONS=$(echo "$METADATA" | jq -r '.stats.submissions // 0')
            RESPONSES=$(echo "$METADATA" | jq -r '.stats.responses // 0')
            MODULES=$(echo "$METADATA" | jq -r '.stats.modules // 0')
            
            echo ""
            echo -e "${CYAN}Statistics:${NC}"
            echo "   Submissions: $SUBMISSIONS"
            echo "   Responses:   $RESPONSES"
            echo "   Modules:     $MODULES"
        fi
        
        # Check if Hub is running
        if [[ -f "$SESSION_DIR/hub_pid" ]]; then
            HUB_PID=$(cat "$SESSION_DIR/hub_pid")
            
            if kill -0 "$HUB_PID" 2>/dev/null; then
                echo ""
                echo -e "${GREEN}🟢 Hub v2 Running${NC} (PID: $HUB_PID)"
                
                # Get IP address
                if [[ -f "$SESSION_DIR/ip_address" ]]; then
                    IP_ADDRESS=$(cat "$SESSION_DIR/ip_address")
                    echo -e "${CYAN}Local IP:${NC}        $IP_ADDRESS"
                    echo -e "${CYAN}Hub URL:${NC}         ws://$IP_ADDRESS:3000"
                fi
            else
                echo ""
                echo -e "${RED}🔴 Hub v2 Stopped${NC} (PID $HUB_PID not running)"
            fi
        else
            echo ""
            echo -e "${YELLOW}🟡 Hub v2 Status Unknown${NC} (no PID file)"
        fi
        
        # Show control panel URLs
        if [[ -f "$SESSION_DIR/ip_address" ]]; then
            IP_ADDRESS=$(cat "$SESSION_DIR/ip_address")
            echo ""
            echo -e "${CYAN}Control Panels:${NC}"
            echo "   • Moderator: http://$IP_ADDRESS:3000/moderate"
            echo "   • Display:   http://$IP_ADDRESS:3000/display"
            echo "   • Archive:   http://$IP_ADDRESS:3000/archive"
            echo ""
            echo -e "${CYAN}Public Access:${NC}"
            echo "   • Vercel:    https://nottingham-contemporary-exhibition.vercel.app"
        fi
        
        # Show recent log entries
        if [[ -f "$SESSION_DIR/logs/hub.log" ]]; then
            echo ""
            echo -e "${CYAN}Recent Activity:${NC}"
            tail -5 "$SESSION_DIR/logs/hub.log" 2>/dev/null | while read line; do
                echo "   $line"
            done
        fi
        
    else
        echo -e "${RED}Current session directory not found: $SESSION_DIR${NC}"
    fi
    
else
    echo -e "${YELLOW}No current session${NC}"
fi

# List all sessions
echo ""
echo -e "${CYAN}All Sessions:${NC}"

if ls "$SESSIONS_DIR"/*/ >/dev/null 2>&1; then
    for session_path in "$SESSIONS_DIR"/*/; do
        session_name=$(basename "$session_path")
        
        # Skip the current_session file
        if [[ "$session_name" == "current_session" ]]; then
            continue
        fi
        
        if [[ -f "$session_path/metadata.json" ]]; then
            metadata=$(cat "$session_path/metadata.json")
            created=$(echo "$metadata" | jq -r '.created // "unknown"' | cut -d'T' -f1)
            status=$(echo "$metadata" | jq -r '.status // "unknown"')
            submissions=$(echo "$metadata" | jq -r '.stats.submissions // 0')
            
            # Mark current session
            if [[ "$session_name" == "$CURRENT_SESSION" ]]; then
                echo -e "   ${GREEN}● $session_name${NC} ($created, $status, $submissions submissions)"
            else
                echo -e "   ○ $session_name ($created, $status, $submissions submissions)"
            fi
        else
            echo -e "   ○ $session_name (no metadata)"
        fi
    done
else
    echo "   (no sessions found)"
fi

# Show quick commands
echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo "   • Start system:   ./scripts/boot-exhibition.sh"
echo "   • New session:    ./scripts/new-session.sh [name]"
echo "   • Stop system:    ./scripts/stop-exhibition.sh"
echo "   • Switch venue:   ./scripts/switch-venue.sh [venue]"

echo ""
