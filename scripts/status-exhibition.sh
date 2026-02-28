#!/bin/bash

# Exhibition System Status Script
# Shows status of all components

set -e  # Exit on any error

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check service status
check_service_status() {
    local service_name="$1"
    local pid_file="$PID_DIR/$2.pid"
    local log_file="$LOG_DIR/$3.log"
    
    if [ ! -f "$pid_file" ]; then
        echo -e "  ${RED}✗${NC} $service_name - Not running (no PID file)"
        return 1
    fi
    
    local pid=$(cat "$pid_file")
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        echo -e "  ${RED}✗${NC} $service_name - Not running (PID: $pid)"
        return 1
    fi
    
    # Get memory usage
    local memory_mb=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print int($1/1024)}' || echo "0")
    
    # Get CPU usage (approximate)
    local cpu_percent=$(ps -o %cpu= -p "$pid" 2>/dev/null | awk '{print $1}' || echo "0.0")
    
    # Get uptime
    local start_time=$(ps -o lstart= -p "$pid" 2>/dev/null | xargs -I {} date -d "{}" +%s 2>/dev/null || echo "0")
    local current_time=$(date +%s)
    local uptime_seconds=$((current_time - start_time))
    local uptime_formatted=$(format_uptime $uptime_seconds)
    
    echo -e "  ${GREEN}✓${NC} $service_name - Running (PID: $pid)"
    echo -e "    Memory: ${memory_mb}MB | CPU: ${cpu_percent}% | Uptime: $uptime_formatted"
    
    # Check log file for recent errors
    if [ -f "$log_file" ]; then
        local error_count=$(tail -n 100 "$log_file" 2>/dev/null | grep -i "error\|failed\|exception" | wc -l)
        if [ "$error_count" -gt 0 ]; then
            echo -e "    ${YELLOW}⚠${NC} Recent errors in log: $error_count"
        fi
    fi
    
    return 0
}

# Format uptime
format_uptime() {
    local seconds=$1
    local days=$((seconds / 86400))
    local hours=$(((seconds % 86400) / 3600))
    local minutes=$(((seconds % 3600) / 60))
    
    if [ $days -gt 0 ]; then
        echo "${days}d ${hours}h ${minutes}m"
    elif [ $hours -gt 0 ]; then
        echo "${hours}h ${minutes}m"
    else
        echo "${minutes}m"
    fi
}

# Check network connectivity
check_network_status() {
    echo -e "\n${CYAN}Network Status:${NC}"
    
    # Check if Hub server port is open
    if command -v nc &> /dev/null; then
        if nc -z localhost 3000 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Hub server port 3000 - Accessible"
        else
            echo -e "  ${RED}✗${NC} Hub server port 3000 - Not accessible"
        fi
        
        # Check Terminal Critic port
        if nc -z localhost 8001 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Terminal Critic port 8001 - Accessible"
        else
            echo -e "  ${YELLOW}○${NC} Terminal Critic port 8001 - Not accessible"
        fi
    else
        echo -e "  ${YELLOW}○${NC} Network check skipped (nc not available)"
    fi
}

# Check disk usage
check_disk_usage() {
    echo -e "\n${CYAN}Disk Usage:${NC}"
    
    # Check main project directory
    local project_size=$(du -sh "$PROJECT_ROOT" 2>/dev/null | cut -f1)
    echo -e "  Project directory: $project_size"
    
    # Check archive directory if exists
    if [ -d "$PROJECT_ROOT/archives" ]; then
        local archive_size=$(du -sh "$PROJECT_ROOT/archives" 2>/dev/null | cut -f1)
        echo -e "  Archives: $archive_size"
    fi
    
    # Check log directory
    if [ -d "$LOG_DIR" ]; then
        local log_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
        echo -e "  Logs: $log_size"
    fi
    
    # Check available disk space
    local available_space=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    echo -e "  Available space: $available_space"
}

# Show recent log entries
show_recent_logs() {
    local service="$1"
    local log_file="$LOG_DIR/$service.log"
    
    if [ ! -f "$log_file" ]; then
        echo -e "    ${YELLOW}No log file found${NC}"
        return
    fi
    
    echo -e "    ${CYAN}Recent log entries:${NC}"
    tail -n 5 "$log_file" 2>/dev/null | while IFS= read -r line; do
        # Colorize log levels
        if echo "$line" | grep -qi "error\|failed\|exception"; then
            echo -e "      ${RED}$line${NC}"
        elif echo "$line" | grep -qi "warn"; then
            echo -e "      ${YELLOW}$line${NC}"
        elif echo "$line" | grep -qi "success\|started\|completed"; then
            echo -e "      ${GREEN}$line${NC}"
        else
            echo -e "      $line"
        fi
    done
}

# Main status function
main() {
    echo
    echo "================================================================"
    echo -e "${BLUE}Nottingham Contemporary AI Exhibition - System Status${NC}"
    echo "================================================================"
    echo
    
    local all_running=true
    
    echo -e "${CYAN}Core Services:${NC}"
    
    # Check Hub v2 Server
    if ! check_service_status "Hub v2 Server" "hub-server" "hub-server"; then
        all_running=false
    fi
    
    # Check Terminal Critic v2
    if ! check_service_status "Terminal Critic v2" "terminal-critic" "terminal-critic"; then
        all_running=false
    fi
    
    # Check External Adapters
    if ! check_service_status "External Adapters" "adapters" "adapters"; then
        all_running=false
    fi
    
    # Network status
    check_network_status
    
    # Disk usage
    check_disk_usage
    
    echo
    echo -e "${CYAN}System Information:${NC}"
    echo -e "  Node.js version: $(node --version 2>/dev/null || echo 'Not found')"
    echo -e "  npm version: $(npm --version 2>/dev/null || echo 'Not found')"
    echo -e "  Platform: $(uname -s) $(uname -m)"
    echo -e "  Load average: $(uptime | awk -F'load average:' '{print $2}' | xargs)"
    
    echo
    echo "================================================================"
    
    if $all_running; then
        echo -e "${GREEN}All services are running normally${NC}"
        echo
        echo "Web interfaces:"
        echo "  - Main UI: http://localhost:3000"
        echo "  - Moderation: http://localhost:3000/moderate"  
        echo "  - Terminal Critic: http://localhost:8001"
    else
        echo -e "${YELLOW}Some services are not running${NC}"
        echo
        echo "Commands:"
        echo "  - Start system: ./scripts/start-exhibition.sh"
        echo "  - Restart system: ./scripts/restart-exhibition.sh"
    fi
    
    echo "================================================================"
}

# Detailed status with logs
detailed_status() {
    main
    
    echo
    echo -e "${CYAN}Recent Log Entries:${NC}"
    echo
    
    echo -e "${BLUE}Hub v2 Server:${NC}"
    show_recent_logs "hub-server"
    
    echo
    echo -e "${BLUE}Terminal Critic v2:${NC}"
    show_recent_logs "terminal-critic"
    
    echo
    echo -e "${BLUE}External Adapters:${NC}"
    show_recent_logs "adapters"
}

# Monitor mode - continuous status updates
monitor_mode() {
    echo -e "${CYAN}Exhibition System Monitor - Press Ctrl+C to exit${NC}"
    echo
    
    while true; do
        clear
        main
        echo
        echo -e "${YELLOW}Refreshing in 30 seconds...${NC}"
        sleep 30
    done
}

# Quick status check
quick_status() {
    local running_count=0
    local total_services=3
    
    echo -n "Exhibition Status: "
    
    # Check each service
    [ -f "$PID_DIR/hub-server.pid" ] && ps -p $(cat "$PID_DIR/hub-server.pid") > /dev/null 2>&1 && running_count=$((running_count + 1))
    [ -f "$PID_DIR/terminal-critic.pid" ] && ps -p $(cat "$PID_DIR/terminal-critic.pid") > /dev/null 2>&1 && running_count=$((running_count + 1))
    [ -f "$PID_DIR/adapters.pid" ] && ps -p $(cat "$PID_DIR/adapters.pid") > /dev/null 2>&1 && running_count=$((running_count + 1))
    
    if [ $running_count -eq $total_services ]; then
        echo -e "${GREEN}All services running ($running_count/$total_services)${NC}"
        exit 0
    elif [ $running_count -gt 0 ]; then
        echo -e "${YELLOW}Partial ($running_count/$total_services services running)${NC}"
        exit 1
    else
        echo -e "${RED}Not running (0/$total_services services)${NC}"
        exit 2
    fi
}

# Handle script arguments
case "${1:-status}" in
    "status")
        main
        ;;
    "detailed"|"detail"|"logs")
        detailed_status
        ;;
    "monitor"|"watch")
        monitor_mode
        ;;
    "quick"|"brief")
        quick_status
        ;;
    *)
        echo "Usage: $0 [status|detailed|monitor|quick]"
        echo "  status (default): Show current system status"
        echo "  detailed: Show status with recent log entries"
        echo "  monitor: Continuous status monitoring"
        echo "  quick: Brief status check (for scripts)"
        exit 1
        ;;
esac
