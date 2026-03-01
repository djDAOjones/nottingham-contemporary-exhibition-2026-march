# Nottingham Contemporary AI Exhibition 2026

Interactive art installation with real-time audience participation and AI<>human-generated responses.

## Overview

**Flow:** QR Code → Phone → Vercel UI → WebSocket → Local Hub → Art Modules → Gallery Display

**Architecture:**
- **Vercel (Cloud):** Audience submission interface
- **Hub:** Coordination, moderation, and routing of messages and media
- **Art Modules:** AI-human analysis, processing, and generation
- **Display:** 3×3 grid projection of art module outputs and audience view of routing

## UI Pages

| Panel | URL | Purpose |
|-------|-----|---------|
| **Submit** | [Audience Submission](https://nottingham-contemporary-exhibition.vercel.app/) | Public submissions |
| **Test Submit** | [Local Submission Testing](http://localhost:3000/submit) | Local submission testing |
| **Moderation** | [Moderation Panel](http://localhost:3000/moderate) | Approve/reject submissions, control modules |
| **Display** | [Display Panel](http://localhost:3000/display) | 3×3 grid for projection |
| **Archive** | [Event Archive](http://localhost:3000/archive) | Event history and logs |
| **Config** | [Art Module Config](http://localhost:3000/art-module-config-{module}) | Control panel for each Hub-Bridge helper app on each Art Module Laptop |

## QR Code

[insert QR here]

## Hardware Setup

### Equipment
- **Router:** Ethernet connection for each laptop
- **Main Laptop:** Runs Hub server (port 3000)
- **Module Laptops:** Connect to ports 3001, 3002, etc
- **Projectors / Screens:** Connected to display laptops

###  Layout
```
Router
├── Moderator Laptop (Hub + Moderation)
├── Primary Display Laptop (3×3 Grid)
├── Secondary Display Laptop (Audience view of queue)
├── Art Module Laptop 1
├── Art Module Laptop 2
├── Art Module Laptop 3 etc
```

## Software Setup

- **Hub:**
- **Hub-Bridge(s):**
- **Art Module Custom Software:**

## Art Module Config

### Install helper app
1. 

### Configure custom tools to send/recieve via helper
- **TouchDesigner:** OSC bridge via IP
- **Custom Apps:** WebSocket or HTTP API
- **Hardware:** Serial/USB via Node.js modules

### Verify everything working with Hub and Displays

## Scripts

All operational scripts are in the `scripts/` directory. Run them from the project root.

### `boot.sh`
**Purpose:** Full system boot with auto-configuration  
**When to use:** Every time you start the exhibition  
**What it does:**
- Kills stale processes on ports 3000/4000
- Detects local IP address
- Continues existing session or creates new one
- Starts Hub server (port 3000) and Hub-Bridge (port 4000)
- If ngrok installed, creates HTTPS tunnel and updates Vercel automatically
- Prints all URLs for QR codes, moderation, display

**Usage:**
```bash
./scripts/boot.sh
```

### `reset-soft.sh`
**Purpose:** Restart services while keeping current session messages  
**When to use:** When something goes wrong but you want to keep audience submissions  
**What it does:**
- Stops all running services
- Preserves current session and message history
- Restarts via boot.sh

**Usage:**
```bash
./scripts/reset-soft.sh
```

### `reset-hard.sh`
**Purpose:** Full reset with new session  
**When to use:** Before a new exhibition day or to clear all submissions  
**What it does:**
- Stops all services
- Archives current session logs
- Creates fresh session with new ID
- Restarts via boot.sh

**Usage:**
```bash
./scripts/reset-hard.sh [session-name]
# Example: ./scripts/reset-hard.sh "rehearsal"
```

### `status.sh`
**Purpose:** Quick system health check  
**When to use:** Verify services are running and responsive  
**What it does:**
- Checks Hub server and Hub-Bridge status
- Reports memory usage and API health
- Shows ngrok tunnel status (if running)
- Lists all access URLs

**Usage:**
```bash
./scripts/status.sh
```

### `deploy-vercel.sh`
**Purpose:** Manual Vercel deployment  
**When to use:** When you need to redeploy the audience submission UI  
**What it does:**
- Deploys vercel-app/ to Vercel production

**Usage:**
```bash
./scripts/deploy-vercel.sh
```

## Operating Hub

### Start / Resume Session
```bash
./scripts/boot.sh
```
Keeps prior messages and continues existing session.

### Soft Reset (keep messages)
```bash
./scripts/reset-soft.sh
```
Restarts services without losing submissions.

### Hard Reset (new session)
```bash
./scripts/reset-hard.sh
```
Archives old session and starts fresh.

### Check Status
```bash
./scripts/status.sh
```

### View Logs
```bash
tail -f sessions/hub.log
tail -f sessions/bridge.log
```

## Production Checklist

### Before Show
- [ ] All laptops connected to router
- [ ] Hub starts without errors (`npm start`)
- [ ] All 8 modules connect and show "online"
- [ ] Moderator UI loads and shows module grid
- [ ] Display projects 3×3 grid correctly
- [ ] Vercel URL accessible from phones
- [ ] QR codes generated and printed
- [ ] Archive recording starts automatically
- [ ] Backup submission method tested

### During Show
- [ ] Monitor moderator panel for submissions
- [ ] Check archive recording every 30 minutes
- [ ] Watch for module disconnections
- [ ] Use safe mode if modules become unstable

### After Show
- [ ] Stop services (kill processes on ports 3000/4000 or close terminal)
- [ ] Archive session data to external drive
- [ ] Export final video from archive/
- [ ] Backup configuration for future shows

## Troubleshooting

### Common Issues

**Enter issue:**
- Steps to solve

## API Reference

### REST Endpoints
- `GET /api/status` - System health check
- `GET /api/modules` - Connected module list
- `GET /api/submissions` - Pending submissions
- `POST /api/moderate` - Approve/reject submission
- `GET /api/archive` - Event history

### WebSocket Events
- `identify` - Module registration
- `new-submission` - Audience input received
- `new-message` - Approved message for routing
- `module-output` - Module response ready
- `module-status` - Connection state change
