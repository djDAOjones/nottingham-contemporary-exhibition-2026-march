# Nottingham Contemporary AI Exhibition 2026

Interactive art installation with real-time audience participation and AI<>human-generated responses.

## Overview

**Flow:** QR Code → Phone → Vercel UI → WebSocket → Local Hub → Art Modules → Gallery Display

**Architecture:**
- **Vercel (Cloud):** Audience submission interface
- **Hub:** Coordination, moderation, and routing of messages and media
- **Art Modules:** AI-human analysis, processing, and generation
- **Display:** 3×3 grid projection of art module outputs and audience view of routing

## UIPages

| Panel | URL | Purpose |
|-------|-----|---------|
| **Submit** | `https://nottingham-contemporary-exhibition.vercel.app/` | Public submissions |
| **Test Submit** | `http://localhost:3000/submit` | Local submission testing |
| **Moderation** | `http://localhost:3000/moderate` | Approve/reject submissions, control modules |
| **Display** | `http://localhost:3000/display` | 3×3 grid for projection |
| **Archive** | `http://localhost:3000/archive` | Event history and logs |
| **Config** | `http://localhost:3000/art-module-config-<module number>` | Control panel for each Hub-Bridge helper app on each Art Module Laptop |

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

### Current Session Info
```bash
# Check active session
./scripts/session-status.sh

# View session logs
cat sessions/current/session.log
```

## Operating Hub

### Start Session
./scripts/boot-exhibition.sh (keeps prior messages)

### Reset Session
./scripts/new-session.sh (clears prior messages)

### Hub Config
- Moderation
- Screen layout

## Troubleshooting

### Common Issues

**Enter issue:**
- Steps to solve

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
- [ ] Stop recording gracefully (`./scripts/stop-exhibition.sh`)
- [ ] Archive session data to external drive
- [ ] Export final video from archive/
- [ ] Backup configuration for future shows

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
