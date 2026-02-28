#!/bin/bash

# Exhibition System Startup Script
# Single command to launch all components with proper ordering

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/.pids"

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

# Create necessary directories
create_dirs() {
    log "Creating directories..."
    mkdir -p "$LOG_DIR" "$PID_DIR"
    mkdir -p "$PROJECT_ROOT/archives"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not found. Please install Node.js"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check ffmpeg (optional for video recording)
    if ! command -v ffmpeg &> /dev/null; then
        warning "FFmpeg not found. Video recording will be disabled"
    else
        success "FFmpeg available for video recording"
    fi
    
    success "Dependencies check completed"
}

# Install npm dependencies
install_dependencies() {
    log "Installing npm dependencies..."
    
    cd "$PROJECT_ROOT"
    npm install
    
    # Install Terminal Critic v2 dependencies
    if [ -d "modules/terminal-critic" ]; then
        cd "modules/terminal-critic"
        npm install
        cd "$PROJECT_ROOT"
    fi
    
    success "Dependencies installed"
}

# Start Hub v2 server
start_hub_server() {
    log "Starting Hub v2 server..."
    
    cd "$PROJECT_ROOT"
    
    # Start in background and save PID
    nohup node server/index.js > "$LOG_DIR/hub-server.log" 2>&1 &
    echo $! > "$PID_DIR/hub-server.pid"
    
    # Wait for server to start
    sleep 3
    
    # Check if server is running
    if ps -p $(cat "$PID_DIR/hub-server.pid") > /dev/null 2>&1; then
        success "Hub v2 server started (PID: $(cat "$PID_DIR/hub-server.pid"))"
    else
        error "Failed to start Hub v2 server"
        exit 1
    fi
}

# Start Terminal Critic v2 module
start_terminal_critic() {
    log "Starting Terminal Critic v2 module..."
    
    if [ ! -d "$PROJECT_ROOT/modules/terminal-critic" ]; then
        warning "Terminal Critic v2 not found, skipping..."
        return
    fi
    
    cd "$PROJECT_ROOT/modules/terminal-critic"
    
    # Start in background and save PID
    nohup node index.js > "$LOG_DIR/terminal-critic.log" 2>&1 &
    echo $! > "$PID_DIR/terminal-critic.pid"
    
    # Wait for module to start
    sleep 2
    
    # Check if module is running
    if ps -p $(cat "$PID_DIR/terminal-critic.pid") > /dev/null 2>&1; then
        success "Terminal Critic v2 started (PID: $(cat "$PID_DIR/terminal-critic.pid"))"
    else
        warning "Failed to start Terminal Critic v2"
    fi
}

# Start external adapters
start_adapters() {
    log "Starting external adapters..."
    
    local adapter_config="$PROJECT_ROOT/adapters/adapter-config.json"
    
    if [ ! -f "$adapter_config" ]; then
        warning "Adapter configuration not found, skipping adapters..."
        return
    fi
    
    cd "$PROJECT_ROOT/adapters"
    
    # Start adapter manager
    nohup node adapter-manager.js "$adapter_config" > "$LOG_DIR/adapters.log" 2>&1 &
    echo $! > "$PID_DIR/adapters.pid"
    
    # Wait for adapters to start
    sleep 2
    
    # Check if adapter manager is running
    if ps -p $(cat "$PID_DIR/adapters.pid") > /dev/null 2>&1; then
        success "External adapters started (PID: $(cat "$PID_DIR/adapters.pid"))"
    else
        warning "Failed to start external adapters"
    fi
}

# Display startup summary
show_startup_summary() {
    echo
    echo "================================================================"
    echo -e "${GREEN}Exhibition System Started Successfully${NC}"
    echo "================================================================"
    echo
    echo "Services running:"
    
    # Check Hub v2 server
    if [ -f "$PID_DIR/hub-server.pid" ] && ps -p $(cat "$PID_DIR/hub-server.pid") > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Hub v2 Server (PID: $(cat "$PID_DIR/hub-server.pid"))"
        echo "    - Web interface: http://localhost:3000"
        echo "    - Moderation UI: http://localhost:3000/moderate"
        echo "    - Archive UI: http://localhost:3000/archive"
    else
        echo -e "  ${RED}✗${NC} Hub v2 Server"
    fi
    
    # Check Terminal Critic v2
    if [ -f "$PID_DIR/terminal-critic.pid" ] && ps -p $(cat "$PID_DIR/terminal-critic.pid") > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Terminal Critic v2 (PID: $(cat "$PID_DIR/terminal-critic.pid"))"
        echo "    - Control panel: http://localhost:8001"
    else
        echo -e "  ${YELLOW}○${NC} Terminal Critic v2 (Not running)"
    fi
    
    # Check External Adapters
    if [ -f "$PID_DIR/adapters.pid" ] && ps -p $(cat "$PID_DIR/adapters.pid") > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} External Adapters (PID: $(cat "$PID_DIR/adapters.pid"))"
    else
        echo -e "  ${YELLOW}○${NC} External Adapters (Not running)"
    fi
    
    echo
    echo "Log files:"
    echo "  - Hub server: $LOG_DIR/hub-server.log"
    echo "  - Terminal Critic: $LOG_DIR/terminal-critic.log"
    echo "  - Adapters: $LOG_DIR/adapters.log"
    echo
    echo "Commands:"
    echo "  - Stop all: ./scripts/stop-exhibition.sh"
    echo "  - Restart: ./scripts/restart-exhibition.sh"
    echo "  - Status: ./scripts/status-exhibition.sh"
    echo
    echo "================================================================"
}

# Main startup function
main() {
    echo
    echo "================================================================"
    echo -e "${BLUE}Starting Nottingham Contemporary AI Exhibition System${NC}"
    echo "================================================================"
    echo
    
    # Check if already running
    if [ -f "$PID_DIR/hub-server.pid" ] && ps -p $(cat "$PID_DIR/hub-server.pid") > /dev/null 2>&1; then
        error "Exhibition system appears to already be running"
        echo "Use './scripts/restart-exhibition.sh' to restart or './scripts/stop-exhibition.sh' to stop first"
        exit 1
    fi
    
    # Startup sequence
    create_dirs
    check_dependencies
    install_dependencies
    start_hub_server
    start_terminal_critic
    start_adapters
    
    # Show summary
    show_startup_summary
    
    success "Exhibition system startup complete!"
}

# Handle script arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "install-only")
        create_dirs
        check_dependencies
        install_dependencies
        success "Dependencies installed. Run without arguments to start the system."
        ;;
    "check-only")
        check_dependencies
        ;;
    *)
        echo "Usage: $0 [start|install-only|check-only]"
        echo "  start (default): Full system startup"
        echo "  install-only: Only install dependencies"
        echo "  check-only: Only check system dependencies"
        exit 1
        ;;
esac
