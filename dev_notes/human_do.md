# Human Actions Required

## ✅ COMPLETED FEATURES

**Development Status:**
- ✅ **WCAG AAA UI**: Audience submission interface redesigned for accessibility
- ✅ **Automated Session Management**: Boot scripts with IP detection and Vercel automation
- ✅ **Vercel Deployment**: Fixed root directory and environment variable issues
- ✅ **Core Hub v2**: WebSocket communication and modular architecture

## 🔧 IMMEDIATE TASKS (Development)

### 1. Hub-Bridge System Implementation
**Priority: HIGH** - Required for art module video streaming

**What to build:**
- Node.js application for each art module laptop
- Receives messages from Hub via WebSocket
- Sends to TouchDesigner/Gravity Sketch via OSC/HTTP/UDP
- Captures video streams from art software
- Returns video to Hub for 3×3 composition
- Web config UI at `http://localhost:8080/config`

**Development tasks:**
- [ ] Create `hub-bridge/` directory and Node.js app
- [ ] Implement WebSocket client to connect to Hub
- [ ] Add OSC output for TouchDesigner integration
- [ ] Add HTTP API for Gravity Sketch integration
- [ ] Implement video capture (WebRTC/RTMP/NDI)
- [ ] Create web-based configuration interface
- [ ] Package for easy deployment to art module laptops

### 2. Enhanced Progress Tracking
**Priority: MEDIUM** - Improves user experience

**Features to implement:**
- Real-time submission progress states (8 stages)
- Minimum 3-second display time per stage
- Optional screen snapshots when message appears
- WebSocket progress updates to user browsers
- Visual progress indicators with clear labels

**Development tasks:**
- [ ] Extend WebSocket events for progress updates
- [ ] Add screen capture capability to display system
- [ ] Update audience UI with progress indicators
- [ ] Implement timeout handling for stalled states

## 🔧 IMMEDIATE TASKS (Setup & Testing)

### System Deployment

**Automated deployment now available:**
- [ ] Run `./scripts/boot-exhibition.sh` to auto-start with session management
- [ ] Verify Vercel environment variable auto-updates
- [ ] Test session continuity across system restarts
- [ ] Use `./scripts/session-status.sh` to monitor system

### Hardware & Network Setup

**Equipment needed:**
- [ ] 8-port Gigabit Ethernet switch (TP-Link TL-SG108E recommended ~$40)
- [ ] Ethernet cables for each laptop
- [ ] 2-3 laptops for displays (Hub, Primary Display, Audience Queue)
- [ ] 2-4 laptops for art modules with hub-bridge
- [ ] 4K projector + HDMI cables

**Network configuration:**
- [ ] Connect all laptops to switch via Ethernet
- [ ] Configure router for gallery network access
- [ ] Test WebSocket connections across all devices
- [ ] Verify video streaming bandwidth (need ~400 Mbps for 8×4K streams)

### System Integration Testing

**Hub testing (Main laptop):**
- [ ] Run `./scripts/boot-exhibition.sh` to start with auto-configuration
- [ ] Verify all interfaces load:
  - [Moderator](http://localhost:3000/moderate) — approve/reject submissions
  - [Display](http://localhost:3000/display) — 3×3 grid for projection
  - [Archive](http://localhost:3000/archive) — event history
  - [Submit](http://localhost:3000/submit) — local testing

**Display laptop testing:**
- [ ] Connect laptop to 4K projector via HDMI
- [ ] Open `http://[HUB-IP]:3000/display` in fullscreen
- [ ] Verify 3×3 grid scales properly to 4K
- [ ] Test module video streams appear in grid cells

**Art module laptop testing:**
- [ ] Install hub-bridge on each art module laptop
- [ ] Configure connection to Hub server
- [ ] Test TouchDesigner receives OSC messages from hub-bridge
- [ ] Test Gravity Sketch receives HTTP messages from hub-bridge
- [ ] Verify video stream returns to Hub display
- [ ] Test graceful reconnection on network interruptions

### Performance & Load Testing

**Audience submission testing:**
- [ ] Test Vercel UI from mobile devices on different networks
- [ ] Verify WCAG AAA accessibility with screen readers
- [ ] Test multiple simultaneous submissions (target: 20+ concurrent)
- [ ] Validate session management preserves queue during restarts

**Video streaming testing:**
- [ ] Test 8 concurrent 4K video streams to Hub
- [ ] Monitor network bandwidth utilization (should stay <80%)
- [ ] Verify smooth 60fps composition in 3×3 grid
- [ ] Test graceful degradation when modules disconnect

**System reliability:**
- [ ] Test sudden power loss recovery with session preservation
- [ ] Verify archive file integrity after unexpected shutdowns
- [ ] Test venue transitions with `./scripts/switch-venue.sh`
- [ ] Validate automated Vercel IP updates work correctly

### Artist Workflow Integration

**TouchDesigner integration (VJ laptop):**
- [ ] Install hub-bridge on VJ laptop
- [ ] Configure OSC input in TouchDesigner (default port 7000)
- [ ] Set up video output (RTMP/NDI) back to Hub
- [ ] Test message → OSC → visual generation → video stream pipeline
- [ ] Create TouchDesigner project template for other artists

**Gravity Sketch integration:**
- [ ] Install hub-bridge on Gravity Sketch laptop
- [ ] Configure HTTP API endpoints for message input
- [ ] Set up video capture of Gravity Sketch output
- [ ] Test message → HTTP → 3D creation → video stream pipeline
- [ ] Document workflow for artist handoff

**Custom art module integration:**
- [ ] Test hub-bridge with Ian's custom software
- [ ] Configure protocol (OSC/HTTP/UDP) based on software capabilities
- [ ] Set up video streaming from custom applications
- [ ] Create configuration templates for additional artists

## 📋 PRE-SHOW CHECKLIST

### Gallery Setup (1 day before)
- [ ] Set up hardware layout per README.md specifications
- [ ] Install and test all Ethernet connections
- [ ] Configure gallery network and test internet access
- [ ] Install hub-bridge on all art module laptops
- [ ] Position projectors and test 4K display output
- [ ] Run full system integration test with all artists

### Show Day Preparation
- [ ] Generate QR codes pointing to: `https://nottingham-contemporary-exhibition.vercel.app`
- [ ] Run `./scripts/boot-exhibition.sh [venue-name]` to start system
- [ ] Verify session status with `./scripts/session-status.sh`
- [ ] Test submission flow: QR → Vercel → Hub → Art Modules → Display
- [ ] Brief moderator on approval/rejection controls
- [ ] Test emergency restart procedures (`./scripts/stop-exhibition.sh` + `./scripts/boot-exhibition.sh`)

### Backup Plans
- [ ] Local submission via moderator panel if Vercel fails
- [ ] Static content display if art modules disconnect
- [ ] Session restore procedure if system crashes mid-show
- [ ] Manual IP configuration if auto-detection fails
- [ ] Alternative display laptop if primary fails

---

**Key URLs:**
- **Public:** [https://nottingham-contemporary-exhibition.vercel.app](https://nottingham-contemporary-exhibition.vercel.app)
- **Vercel Dashboard:** [https://vercel.com/tropicalwilsons-projects/nottingham-contemporary-exhibition-2026-march](https://vercel.com/tropicalwilsons-projects/nottingham-contemporary-exhibition-2026-march)
- **GitHub:** [https://github.com/djDAOjones/nottingham-contemporary-exhibition-2026-march](https://github.com/djDAOjones/nottingham-contemporary-exhibition-2026-march)