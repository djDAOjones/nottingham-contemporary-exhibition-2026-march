# Nottingham Contemporary AI Exhibition 2026

Interactive art installation with real-time audience participation and AI-generated responses.

## Quick Start

### Development (At Home)
```bash
# 1. Start the system
npm start

# 2. Open control panels
# Moderator: http://localhost:3000/moderate  
# Display: http://localhost:3000/display
# Submit: http://localhost:3000/submit
```

### Production (At Gallery)
```bash
# 1. Boot with venue auto-config (coming soon)
./scripts/boot-exhibition.sh

# 2. For now, start manually:
npm start

# 3. Update Vercel IP (manual - automation coming soon)
# Go to: https://vercel.com/tropicalwilsons-projects/nottingham-contemporary-exhibition-2026-march/settings/environment-variables
# Set NEXT_PUBLIC_HUB_URL to ws://[YOUR-GALLERY-IP]:3000
```

## System Overview

**Flow:** QR Code → Phone → Vercel UI → WebSocket → Local Hub → AI Modules → 3×3 Grid Display

**Architecture:**
- **Vercel (Cloud):** Audience submission interface
- **Local Hub:** Central coordination, moderation, routing  
- **8 AI Modules:** Text processing, generation, analysis
- **Display:** 3×3 grid projection with module outputs

## Control Panels

| Panel | URL | Purpose |
|-------|-----|---------|
| **Moderator** | `http://localhost:3000/moderate` | Approve/reject submissions, control modules |
| **Display** | `http://localhost:3000/display` | 3×3 grid for projection |
| **Submit** | `http://localhost:3000/submit` | Local submission testing |
| **Archive** | `http://localhost:3000/archive` | Event history and logs |

**Public Audience:**
- **Vercel Live:** https://nottingham-contemporary-exhibition.vercel.app
- **QR Code:** Generate pointing to Vercel URL for audience access

## Hardware Setup

### Network Requirements
- **Router:** 4+ ethernet ports for laptops
- **Main Laptop:** Runs Hub server (port 3000)
- **Module Laptops:** Connect to ports 3001-3008
- **Projector:** Connected to display laptop

### Recommended Layout
```
Router
├── Main Laptop (Hub + Moderator)
├── Display Laptop (3×3 Grid → Projector)
├── Module Laptop 1 (Terminal Critic + Music)
└── Module Laptop 2 (External modules)
```

## Directory Structure

```
├── server/index.js                 # Hub v2 core
├── public/
│   ├── moderate/                   # Moderator control panel
│   ├── display/                    # 3×3 grid display
│   └── submit/                     # Local submission form
├── modules/
│   ├── terminal-critic/            # Local LLM module
│   ├── music-prompt/               # Music analysis module
│   └── boring-stock/               # Stock response module
├── templates/external-artist-module/  # Module templates
├── vercel-app/                     # Audience submission UI
├── scripts/
│   ├── start-exhibition.sh         # Launch all systems
│   ├── restart-exhibition.sh       # Graceful restart
│   ├── stop-exhibition.sh          # Shutdown
│   └── deploy-vercel.sh            # Deploy audience UI
├── fallback/                       # Resilience systems
└── sessions/                       # Session state storage
```

## Module Development

### Creating a New Module
1. Copy `templates/external-artist-module/base-artist-module.js`
2. Implement your processing logic in `processMessage()`
3. Connect via WebSocket to `ws://[HUB-IP]:3000`
4. Send `identify` event with module details

### External Integration
- **TouchDesigner:** OSC bridge via IP
- **Custom Apps:** WebSocket or HTTP API
- **Hardware:** Serial/USB via Node.js modules

## Session Management

### Current Session Info
```bash
# Check active session
./scripts/session-status.sh

# View session logs
cat sessions/current/session.log
```

### Starting Fresh
```bash
# New session with clean state
./scripts/new-session.sh

# Continue existing session
./scripts/boot-exhibition.sh
```

## Troubleshooting

### Common Issues

**Vercel submissions not reaching Hub:**
- Check `NEXT_PUBLIC_HUB_URL` in Vercel dashboard
- Verify WebSocket connection from phone to local IP
- Test with `http://localhost:3000/submit` first

**Modules not connecting:**
- Check module logs for WebSocket errors
- Verify Hub IP address in module configuration
- Test network connectivity between laptops

**Display not updating:**
- Refresh browser on display laptop
- Check WebSocket connection to Hub
- Verify projector/screen connection

**Archive not recording:**
- Check disk space in `archive/` directory
- Verify write permissions
- Review server logs for errors

### Debug Commands
```bash
# Check system status
npm run status

# View live logs
tail -f logs/hub.log

# Test network connectivity
ping [MODULE-LAPTOP-IP]
curl http://localhost:3000/api/status
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

## Development Notes

### Adding Features
1. Update `dev_notes/dev_plan.md` with requirements
2. Implement in modular, testable components
3. Test locally with `npm start`
4. Update documentation and scripts

### Code Standards
- Follow existing naming conventions
- Add error handling and logging
- Use WebSocket for real-time communication
- Maintain modular architecture for reliability

## Support

For technical issues during development or show day:
- Check `dev_notes/human_do.md` for current action items
- Review server logs in `logs/` directory
- Test individual components in isolation
- Use backup local submission if Vercel fails

---

**Exhibition Date:** February 25, 2026  
**Status:** Development complete, testing phase  
**Last Updated:** February 28, 2026
