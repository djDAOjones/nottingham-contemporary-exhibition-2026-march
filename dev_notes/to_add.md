# Development Plan - Exhibition System

## COMPLETED FEATURES ✅

### 1) Audience Submission UI Redesign
✅ **COMPLETED** - Vercel UI redesigned with black background, dynamic status text, minimal form
- WCAG AAA accessibility compliance
- IBM Carbon design principles 
- Nielsen UX heuristics
- Computationally efficient, modular architecture

### 2) Automated Boot Scripts & Session Management  
✅ **COMPLETED** - Full script suite created
- `boot.sh` - Auto IP detection, session management, starts Hub+Bridge, ngrok tunnel, Vercel auto-config
- `reset-soft.sh` - Restart services while keeping session messages
- `reset-hard.sh` - Full reset with new session (archives old)
- `status.sh` - System health check with memory, API, tunnel status
- Session IDs: timestamp-random format (e.g., `20260301-001234-abc123`)

### 6) Hub-Bridge Application
✅ **COMPLETED** - Node.js bridge for art modules
- WebSocket connection to Hub
- OSC/HTTP/UDP output to art software
- Webhook input for responses
- Local web UI for configuration
- TouchDesigner & Gravity Sketch compatible

## PENDING FEATURES 🚧

### CRITICAL: ngrok Installation
🚧 **IN PROGRESS** - Required for Vercel HTTPS tunnel
- Issue: Xcode license not accepted (blocking brew install)
- Solution: `sudo xcodebuild -license accept` then `brew install ngrok`
- Purpose: Fixes Mixed Content blocking between Vercel HTTPS → local HTTP Hub

### 3/4) Status Progression with Artificial Delays
📋 **PLANNED** - Enhanced user feedback system
- Status flow: "Connecting..." (3s min) → "Sending..." → "Received" → "Routing" → "Processing" → "Displaying" → "Send a dream..."
- Minimum 3 seconds per status for readability
- Integrate with existing 8-stage Hub progress tracking
- Map backend stages to user-friendly messages
- **TBD**: Message queuing for multiple simultaneous submissions
- **TBD**: Individual vs consolidated status for queued messages
- Implementation: Socket.IO progress events + client-side artificial delays

### 5) README Link Enhancement  
📋 **PLANNED** - Make documentation links clickable
- Convert plain text URLs to markdown links
- Improve navigation within README

### 7) Video Snapshot Feature
💭 **CONCEPT** - Send display screenshot to user after their submission appears
- Capture main screen video output
- Send snapshot to user's browser once message is displayed
- Integration with status progression system

## TECHNICAL NOTES

### System Architecture Status
- **Hub Server**: ✅ Running (port 3000) with CORS enabled
- **Hub-Bridge**: ✅ Running (port 4000) connecting as "Artist Bridge"
- **Vercel UI**: ✅ Deployed with dynamic status text
- **Progress Tracking**: ✅ 8-stage system implemented on Hub
- **Session Management**: ✅ Persistent sessions with archive system

### Current Blocking Issues
1. **ngrok installation** (Xcode license) - prevents HTTPS tunnel for Vercel
2. **Status progression UI** - needs frontend implementation
3. **Message queuing strategy** - design decision needed 