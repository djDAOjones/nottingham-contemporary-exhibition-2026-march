#!/bin/bash

# Exhibition System Stop Script
# Gracefully stops all components

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

# Stop a service by PID file
stop_service() {
    local service_name="$1"
    local pid_file="$PID_DIR/$2.pid"
    
    if [ ! -f "$pid_file" ]; then
        warning "$service_name: No PID file found"
        return 0
    fi
    
    local pid=$(cat "$pid_file")
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        warning "$service_name: Process not running (PID: $pid)"
        rm -f "$pid_file"
        return 0
    fi
    
    log "Stopping $service_name (PID: $pid)..."
    
    # Send SIGTERM for graceful shutdown
    kill -TERM "$pid" 2>/dev/null || true
    
    # Wait up to 10 seconds for graceful shutdown
    local count=0
    while [ $count -lt 10 ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        warning "$service_name: Forcing shutdown..."
        kill -KILL "$pid" 2>/dev/null || true
        sleep 1
    fi
    
    # Verify shutdown
    if ps -p "$pid" > /dev/null 2>&1; then
        error "$service_name: Failed to stop process (PID: $pid)"
        return 1
    else
        success "$service_name stopped successfully"
        rm -f "$pid_file"
        return 0
    fi
}

# Stop all services in reverse order of startup
stop_all_services() {
    log "Stopping exhibition system services..."
    
    local failed_services=()
    
    # Stop external adapters first
    if ! stop_service "External Adapters" "adapters"; then
        failed_services+=("External Adapters")
    fi
    
    # Stop Terminal Critic v2
    if ! stop_service "Terminal Critic v2" "terminal-critic"; then
        failed_services+=("Terminal Critic v2")
    fi
    
    # Stop Hub v2 server last
    if ! stop_service "Hub v2 Server" "hub-server"; then
        failed_services+=("Hub v2 Server")
    fi
    
    # Report any failures
    if [ ${#failed_services[@]} -gt 0 ]; then
        error "Failed to stop: ${failed_services[*]}"
        return 1
    fi
    
    return 0
}

# Kill any remaining Node.js processes related to the exhibition
cleanup_remaining_processes() {
    log "Cleaning up any remaining processes..."
    
    # Find Node.js processes that might be part of the exhibition
    local exhibition_processes=$(pgrep -f "node.*server/index.js\|node.*terminal-critic\|node.*adapter" 2>/dev/null || true)
    
    if [ -n "$exhibition_processes" ]; then
        warning "Found remaining exhibition processes, cleaning up..."
        echo "$exhibition_processes" | while read -r pid; do
            if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
                log "Killing remaining process (PID: $pid)"
                kill -TERM "$pid" 2>/dev/null || true
                sleep 2
                if ps -p "$pid" > /dev/null 2>&1; then
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            fi
        done
    else
        success "No remaining processes found"
    fi
}

# Clean up PID directory
cleanup_pid_files() {
    log "Cleaning up PID files..."
    
    if [ -d "$PID_DIR" ]; then
        rm -f "$PID_DIR"/*.pid
        success "PID files cleaned up"
    fi
}

# Display shutdown summary
show_shutdown_summary() {
    echo
    echo "================================================================"
    echo -e "${GREEN}Exhibition System Stopped${NC}"
    echo "================================================================"
    echo
    echo "All services have been shut down:"
    echo -e "  ${GREEN}✓${NC} Hub v2 Server"
    echo -e "  ${GREEN}✓${NC} Terminal Critic v2"
    echo -e "  ${GREEN}✓${NC} External Adapters"
    echo
    echo "To restart the system, run: ./scripts/start-exhibition.sh"
    echo "================================================================"
}

# Force stop all (more aggressive)
force_stop() {
    log "Force stopping all exhibition processes..."
    
    # Kill all Node.js processes that might be related
    pkill -f "node.*server/index.js" 2>/dev/null || true
    pkill -f "node.*terminal-critic" 2>/dev/null || true
    pkill -f "node.*adapter" 2>/dev/null || true
    
    # Clean up PID files
    cleanup_pid_files
    
    success "Force stop completed"
    show_shutdown_summary
}

# Main stop function
main() {
    echo
    echo "================================================================"
    echo -e "${BLUE}Stopping Nottingham Contemporary AI Exhibition System${NC}"
    echo "================================================================"
    echo
    
    # Check if anything is actually running
    local running_services=0
    
    if [ -f "$PID_DIR/hub-server.pid" ] && ps -p $(cat "$PID_DIR/hub-server.pid") > /dev/null 2>&1; then
        running_services=$((running_services + 1))
    fi
    
    if [ -f "$PID_DIR/terminal-critic.pid" ] && ps -p $(cat "$PID_DIR/terminal-critic.pid") > /dev/null 2>&1; then
        running_services=$((running_services + 1))
    fi
    
    if [ -f "$PID_DIR/adapters.pid" ] && ps -p $(cat "$PID_DIR/adapters.pid") > /dev/null 2>&1; then
        running_services=$((running_services + 1))
    fi
    
    if [ $running_services -eq 0 ]; then
        warning "No exhibition services appear to be running"
        cleanup_pid_files
        echo "Use './scripts/start-exhibition.sh' to start the system"
        return 0
    fi
    
    # Stop all services
    if stop_all_services; then
        success "All services stopped gracefully"
    else
        warning "Some services failed to stop gracefully, cleaning up..."
        cleanup_remaining_processes
    fi
    
    # Final cleanup
    cleanup_pid_files
    
    # Show summary
    show_shutdown_summary
    
    success "Exhibition system shutdown complete!"
}

# Handle script arguments
case "${1:-stop}" in
    "stop")
        main
        ;;
    "force")
        echo
        echo "================================================================"
        echo -e "${RED}Force Stopping Exhibition System${NC}"
        echo "================================================================"
        echo
        force_stop
        ;;
    "cleanup")
        log "Cleaning up processes and PID files..."
        cleanup_remaining_processes
        cleanup_pid_files
        success "Cleanup complete"
        ;;
    *)
        echo "Usage: $0 [stop|force|cleanup]"
        echo "  stop (default): Graceful shutdown of all services"
        echo "  force: Forcefully kill all exhibition processes"
        echo "  cleanup: Clean up any remaining processes and PID files"
        exit 1
        ;;
esac
