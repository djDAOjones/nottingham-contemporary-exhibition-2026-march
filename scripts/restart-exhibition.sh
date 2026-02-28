#!/bin/bash

# Exhibition System Restart Script
# Gracefully restarts all components

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Main restart function
main() {
    echo
    echo "================================================================"
    echo -e "${BLUE}Restarting Nottingham Contemporary AI Exhibition System${NC}"
    echo "================================================================"
    echo
    
    log "Initiating system restart..."
    
    # Stop all services first
    log "Stopping existing services..."
    if [ -x "$SCRIPTS_DIR/stop-exhibition.sh" ]; then
        "$SCRIPTS_DIR/stop-exhibition.sh" stop
    else
        error "Stop script not found or not executable"
        exit 1
    fi
    
    echo
    log "Waiting 3 seconds before restart..."
    sleep 3
    
    # Start all services
    log "Starting services..."
    if [ -x "$SCRIPTS_DIR/start-exhibition.sh" ]; then
        "$SCRIPTS_DIR/start-exhibition.sh" start
    else
        error "Start script not found or not executable"
        exit 1
    fi
    
    echo
    success "Exhibition system restart complete!"
}

# Quick restart (no dependency check)
quick_restart() {
    echo
    echo "================================================================"
    echo -e "${YELLOW}Quick Restart - Exhibition System${NC}"
    echo "================================================================"
    echo
    
    log "Quick restart (skipping dependency checks)..."
    
    # Stop services
    if [ -x "$SCRIPTS_DIR/stop-exhibition.sh" ]; then
        "$SCRIPTS_DIR/stop-exhibition.sh" stop
    fi
    
    sleep 2
    
    # Start services with minimal checks
    cd "$PROJECT_ROOT"
    
    # Start Hub server
    log "Quick starting Hub v2 server..."
    nohup node server/index.js > logs/hub-server.log 2>&1 &
    echo $! > .pids/hub-server.pid
    sleep 2
    
    # Start Terminal Critic if available
    if [ -d "modules/terminal-critic" ]; then
        log "Quick starting Terminal Critic v2..."
        cd modules/terminal-critic
        nohup node index.js > ../../logs/terminal-critic.log 2>&1 &
        echo $! > ../../.pids/terminal-critic.pid
        cd "$PROJECT_ROOT"
        sleep 1
    fi
    
    # Start adapters if available
    if [ -f "adapters/adapter-config.json" ]; then
        log "Quick starting external adapters..."
        cd adapters
        nohup node adapter-manager.js adapter-config.json > ../logs/adapters.log 2>&1 &
        echo $! > ../.pids/adapters.pid
        cd "$PROJECT_ROOT"
    fi
    
    success "Quick restart complete!"
    echo "Use './scripts/status-exhibition.sh' to check system status"
}

# Restart individual service
restart_service() {
    local service="$1"
    
    case "$service" in
        "hub"|"server")
            log "Restarting Hub v2 server..."
            "$SCRIPTS_DIR/stop-exhibition.sh" cleanup
            cd "$PROJECT_ROOT"
            nohup node server/index.js > logs/hub-server.log 2>&1 &
            echo $! > .pids/hub-server.pid
            success "Hub v2 server restarted"
            ;;
        "critic"|"terminal-critic")
            log "Restarting Terminal Critic v2..."
            if [ -f ".pids/terminal-critic.pid" ]; then
                kill -TERM $(cat .pids/terminal-critic.pid) 2>/dev/null || true
                sleep 2
            fi
            if [ -d "modules/terminal-critic" ]; then
                cd modules/terminal-critic
                nohup node index.js > ../../logs/terminal-critic.log 2>&1 &
                echo $! > ../../.pids/terminal-critic.pid
                cd "$PROJECT_ROOT"
                success "Terminal Critic v2 restarted"
            else
                warning "Terminal Critic v2 not found"
            fi
            ;;
        "adapters"|"adapter")
            log "Restarting external adapters..."
            if [ -f ".pids/adapters.pid" ]; then
                kill -TERM $(cat .pids/adapters.pid) 2>/dev/null || true
                sleep 2
            fi
            if [ -f "adapters/adapter-config.json" ]; then
                cd adapters
                nohup node adapter-manager.js adapter-config.json > ../logs/adapters.log 2>&1 &
                echo $! > ../.pids/adapters.pid
                cd "$PROJECT_ROOT"
                success "External adapters restarted"
            else
                warning "Adapter configuration not found"
            fi
            ;;
        *)
            error "Unknown service: $service"
            echo "Available services: hub, critic, adapters"
            exit 1
            ;;
    esac
}

# Handle script arguments
case "${1:-restart}" in
    "restart")
        main
        ;;
    "quick")
        quick_restart
        ;;
    "hub"|"server"|"critic"|"terminal-critic"|"adapters"|"adapter")
        restart_service "$1"
        ;;
    *)
        echo "Usage: $0 [restart|quick|service]"
        echo "  restart (default): Full graceful restart"
        echo "  quick: Fast restart without dependency checks"
        echo "  service: Restart individual service"
        echo ""
        echo "Individual services:"
        echo "  hub, server: Hub v2 server"
        echo "  critic, terminal-critic: Terminal Critic v2"
        echo "  adapters, adapter: External adapters"
        exit 1
        ;;
esac
