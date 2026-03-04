## Delete from dev plan

### Old List of Art Modules

| Cell | Module | Input | Output | Implementation |
|------|--------|-------|--------|----------------|
| 1 | **Terminal Critic** | text | green terminal AI critique | Local LLM + 70s styling |
| 2 | **Boring Stock** | text | bland corporate image | Stable Diffusion + prompt engineering |
| 3 | **VJ Stream** | text | live visual feed | TouchDesigner OSC + NDI |
| 4 | **3D Scene** | text + body + audio | dark 3D scene with controlled lighting | Blender MCP + Three.js |
| 5 | **Dancer Cam** | — | live performance feed | Camera + body tracking |
| 6 | **Music Prompt** | text | key/mode/tempo display | LLM + music theory |
| 7 | **Ian's Module** | text | generative AI visuals | External artist interface |
| 8 | **Gravity Sketch** | text | 3D sketch creation | External artist interface |


| Task | Status | Claude Model | Complexity | Description |
|------|--------|--------------|------------|-------------|
| **Terminal Critic v2** | ✅ DONE | Claude 3.5 Sonnet | Medium | Local LLM module + control panel UI, modular design for reuse |
| **Music Prompt** | ✅ DONE | Claude 3 Haiku | Low | Key/mode/tempo generation with variety enforcement |
| **External Template** | ✅ DONE | Claude 3.5 Sonnet | Medium | Generic interface for Ian + Gravity Sketch |
| **VJ Interface** | ⏳ PENDING | Claude 3.5 Sonnet | High | TouchDesigner OSC messaging + NDI video feed |
| **3D Scene Generation** | ⏳ PENDING | Claude 3.5 Sonnet | High | Blender MCP → Three.js viewer with body control |
| **Body Tracking** | ⏳ PENDING | Claude 3.5 Sonnet | High | MediaPipe dancer tracking → 3D light control |
| **Boring Stock Generator** | ⏳ PENDING | Claude 3 Opus | Medium | Stable Diffusion + corporate aesthetic prompting |
| **Audio → Color Mapping** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Music analysis → light color in 3D scene |

## Risk Mitigation Strategy

### Technical Risks
- **Local LLM slowness** → Cloud API fallback + response caching
- **Network congestion** → Ethernet for critical paths, QoS prioritization
- **Module crashes** → Heartbeat monitoring, graceful fallbacks
- **Video pipeline issues** → Multiple formats (NDI/RTSP/OBS), test early

### Artistic Risks
- **Repetitive outputs** → Variety tracking, prompt engineering, manual override
- **Poor audience engagement** → A/B test prompts, real-time adjustment capability
- **Technical complexity overwhelming artists** → Simple interfaces, extensive documentation

### Operational Risks
- **Show day failures** → Rehearsal procedures, backup systems, restart playbooks
- **Artist integration difficulties** → Early collaboration, flexible interfaces

---

## Architecture: Vercel vs Local

**Vercel (Cloud) — Audience-Facing:**
- `/submit` — Submission form with prompt display (connects to local hub via WebSocket)
- **Backup:** Local text input on moderator device (Vercel fallback)
- **Why:** Easy QR code access from anywhere

**Local LAN (192.168.1.252) — Processing & Performance:**
- Central hub server (Node.js + Socket.IO) — **all control flows through here**
- Moderator UI — approve/reject, module drag-and-drop reordering, connection status
- All artistic modules (Terminal Critic, Music Prompt, 3D Scene, etc.)
- Archive system (JSON logging + 4K video recording)
- Module control panels (web-based, single monitoring page)
- **Why:** Reliable, fast, offline-capable, no internet dependency during show

**Communication:**
- Vercel → Local hub via WebSocket (real-time submissions, minimal overhead)
- Modules ↔ Hub via WebSocket (auto-registration + heartbeat)
- External modules via adapter pattern (converts external format → hub protocol)
- Video feeds via NDI/RTSP (local network)

---

## Terminal Critic v2 Design

**Architecture:**
1. **Hub** receives approved message from moderation
2. **Hub** sends message to Terminal Critic module via WebSocket
3. **Terminal Critic module** (local Node.js) processes with Ollama
4. **Terminal Critic control panel** (local web UI) shows:
   - Current processing status
   - Persona selection (manual override)
   - Response preview
   - Configuration (LLM model, temperature, etc.)
5. **Terminal Critic module** sends output back to hub
6. **Hub** routes output to display grid

**Modularity:**
- Terminal Critic can be stopped/restarted without affecting hub
- Hub's WebSocket I/O system reusable for other modules
- Control panel is optional (module works headless if needed)
- Easy to remove or replace with different implementation
---

## Current Status & Next Actions

**✅ Completed - Core System Ready:**
- Hub v2 with complete module coordination and WebSocket protocol
- Moderator UI v2 with drag-drop grid, status dashboard, backup submission
- Terminal Critic v2 with local LLM and modular control panel
- Music Prompt LLM module for musical key/mode generation
- External artist module templates (Ian generative art + Gravity Sketch VR)
- Archive system with JSON logging + 4K video recording capability
- Vercel public submission UI with WebSocket connection (WCAG AAA, IBM Carbon design)
- Boot scripts (`boot.sh`, `reset-soft.sh`, `reset-hard.sh`, `status.sh`) with auto IP, session management, ngrok tunnel
- Fallback systems with circuit breakers, retry queues, safe mode
- HTTPS tunnel (ngrok) with Vercel auto-config, mixed content fix resolved
- Hub-Bridge for art modules (WebSocket↔OSC/HTTP/UDP, webhook input, local config UI)
- Three-phase queue display with gallery-optimized sizing, arrow-key grid presets (2×1 to 7×5)
- Bulk test message generation (API endpoints + test console UI)
- Design principles documentation (IBM Carbon, WCAG AAA, Nielsen heuristics)

**⏳ Testing & Integration Phase:**
1. Load testing (simulate audience burst, module failures)
2. Artist integration (VJ TouchDesigner, Ian's workflow, Gravity Sketch)
3. Hardware setup and network configuration
4. Rehearsal procedures and emergency protocols

**⏳ Pending Features:**
1. Hub Control Center Redesign (paginated moderation, consolidated ops view)
2. Status Progression with Artificial Delays (user feedback on submission progress)
3. Local/Online audience page parity (countdown timer, mirror Vercel behaviour)
4. Video Snapshot Feature (send display screenshot to user after message appears)

## Hub v2 Specifications

**Module System:**
- Auto-discovery via predefined ports (3001, 3002, etc.) + manual kick-start
- WebSocket heartbeat every 30s to detect connection status
- Failed messages queued per module with retry/redistribute controls
- 60-second timeout for module responses
- Visual connection status indicators (online/offline/processing)
- External module adapter pattern for non-native integrations

**Moderator Controls:**
- Drag-and-drop module reordering in 3×3 grid
- Module status dashboard (connection, queue depth, last response)
- Backup local text submission (Vercel fallback)
- Archive browser for rejected messages with reasons
- Safe mode toggle (skip offline modules)

**Archive System:**
- JSON logging: submissions, approvals, routing decisions, module responses
- 4K video recording (format: segments to survive sudden halts)
- Queryable archive interface (future enhancement)
- Rejected messages stored separately with moderator reasons

**Error Handling:**
- Offline modules show placeholder cell (configurable text/image)
- Failed module messages return to queue or redistribute
- Network disconnect graceful handling
- Startup auto-detection via port scanning (3001-3008)
- External module adapters handle protocol translation

---

**🎯 Success Criteria:**
- All 8 modules auto-connect with status indicators
- 3×3 grid displays outputs with drag-drop reordering
- System handles 20+ concurrent audience submissions
- Moderator can control everything from single interface
- Backup local submission works when Vercel fails
- Single `start.sh` command launches entire system
- Graceful restart preserves audience prompts and module states
- Archive captures all interactions + 4K master recording
- Show runs for 3 hours without manual intervention

---

## Development Status Summary

**Completed:**
- ✅ Core Hub v2 architecture with WebSocket communication
- ✅ Modular art module system with external integration support
- ✅ WCAG AAA compliant audience submission UI (IBM Carbon, black bg, dynamic status)
- ✅ Automated venue management with session preservation (`boot.sh`, `reset-soft.sh`, `reset-hard.sh`, `status.sh`)
- ✅ HTTPS tunnel (ngrok) with Vercel auto-config, mixed content fix
- ✅ Hub-Bridge for art modules (WebSocket↔OSC/HTTP/UDP, TouchDesigner & Gravity Sketch compatible)
- ✅ Three-phase queue display with gallery-optimized sizing and arrow-key grid presets
- ✅ Bulk test message generation (API endpoints + test console UI)
- ✅ Design principles documentation (IBM Carbon, WCAG AAA, Nielsen heuristics)

**Pending:**
- ⏳ Hub Control Center Redesign (paginated moderation, recent-first, consolidated ops)
- ⏳ Status Progression with Artificial Delays (user feedback on submission progress)
- ⏳ Local/Online audience page parity (countdown timer, mirror Vercel)
- ⏳ TouchDesigner/Gravity Sketch integration testing
- ⏳ Video snapshot feature (send display screenshot to user)
- ⏳ README link enhancement (clickable markdown links)
- ⏳ Load testing (audience burst, module failure scenarios)

---

## Additional Development Tasks

### 1. WCAG AAA Compliance for Audience UI ✅ DONE

**Completed:** Vercel UI redesigned with black background, dynamic status text, minimal form
- WCAG AAA accessibility compliance
- IBM Carbon design principles
- Nielsen UX heuristics
- Computationally efficient, modular architecture

### 2. Automated Venue Management System ✅ DONE

**Completed:** Full script suite with auto IP detection, session management, ngrok tunnel
- `boot.sh` — Auto IP, session management, Hub+Bridge start, ngrok tunnel, Vercel auto-config
- `reset-soft.sh` — Restart services while keeping session messages
- `reset-hard.sh` — Full reset with new session (archives old)
- `status.sh` — System health check: memory, API, tunnel status
- Session IDs: timestamp-random format (e.g., `20260301-001234-abc123`)

### 3. Hub-Bridge System for Art Modules ✅ DONE

**Completed:** Node.js bridge for art modules
- WebSocket connection to Hub
- OSC/HTTP/UDP output to art software
- Webhook input for responses
- Local web UI for configuration
- TouchDesigner & Gravity Sketch compatible

### 4. Enhanced Submission Progress Tracking ⏳ PENDING

**Problem:** Users submit messages but get no feedback on processing status, making the experience feel unresponsive.

**Solution:** Real-time progress tracking with visual feedback and optional screen snapshots

**User-facing status flow:**
"Connecting..." (3s min) → "Sending..." → "Received" → "Routing" → "Processing" → "Displaying" → "Send a dream..."

- Minimum 3 seconds per status for readability
- Integrate with existing 8-stage Hub progress tracking
- Map backend stages to user-friendly messages
- **TBD**: Message queuing for multiple simultaneous submissions
- **TBD**: Individual vs consolidated status for queued messages
- Implementation: Socket.IO progress events + client-side artificial delays

### 5. Documentation and UX Improvements ⏳ PENDING

**Requirements:**
- Convert README.md URLs to clickable markdown links
- Ensure all documentation reflects hub-bridge architecture
- Update hardware setup diagrams and specifications

**Status:**
- ✅ WCAG AAA UI compliance completed
- ✅ Automated session management completed
- ✅ Hub-bridge system completed
- ⏳ Progress tracking pending
- ⏳ Documentation updates pending

### 6. Hub Control Center Redesign ⏳ PENDING

**Problem:** Current moderation interface shows all pending messages in one scrollable list, not optimised for live show operations.

**Solution:** Redesigned moderation interface
- Add pagination to pending message list
- Display most recent message first, highlight ones needing decision
- Keep core live operations visible, move less common controls to menu
- Move art-module info (LAN address, queue depth) to main display under status
- Remove redundant "Moderation" section underneath

### 7. Local/Online Audience Page Parity ⏳ PENDING

**Problem:** The rate-limit warning countdown timer works on the Vercel version but not the local version.

**Solution:** Make the local audience submission page mirror the online Vercel version
- Countdown timer when user tries to send within 30-second cooldown
- Timer only appears after early send attempt (not by default)
- Consistent behaviour across both local and cloud versions

### 8. Video Snapshot Feature 💭 CONCEPT

**Concept:** Send display screenshot to user after their submission appears on projection
- Capture main screen video output
- Send snapshot to user's browser once message is displayed
- Integration with status progression system (#4)

--

# from to_add

Cascade AI: to update this document move completed features to the completed features section. Keep pending and future where they are unless requested.


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

### 3) HTTPS Tunnel & Mixed Content Fix
✅ **COMPLETED** - ngrok HTTPS tunnel working with Vercel auto-config
- ngrok v3.36.1 installed from provided zip file
- Auto-authentication from .env.local in boot script
- Vercel auto-updates with tunnel URL and redeploys
- Mixed Content blocking completely resolved
- Boot script creates tunnel: `https://xxx.ngrok-free.dev`

### 6) Hub-Bridge Application
✅ **COMPLETED** - Node.js bridge for art modules
- WebSocket connection to Hub
- OSC/HTTP/UDP output to art software
- Webhook input for responses
- Local web UI for configuration
- TouchDesigner & Gravity Sketch compatible

### 9) Audience Queue View (Gallery Display)
✅ **COMPLETED** - Gallery display for public viewing
- Three-phase system: Overview (split) → Queued Detail → Ingested Detail
- `--u` CSS unit (1% of container width) for pixel-identical scaling at any size
- Arrow-key grid presets: ↑ more cards, ↓ fewer cards (12 presets from 2×1 to 7×5)
- Left/Right arrows for manual phase navigation, F for fullscreen
- Optimized for gallery viewing distance (2-5m), large readable typography
- Real-time data from `/api/queue` endpoint, 2s polling
- WCAG AAA compliant with IBM Carbon design tokens
- Location: `/public/queue/index.html`
- Static file serving configured in Hub server

### 10) Design Principles Section
✅ **COMPLETED** - Added comprehensive design principles to Dev Plan
- IBM Carbon Design System guidelines
- WCAG AAA accessibility requirements
- Nielsen's 10 usability heuristics
- Technical implementation standards
- Location: `dev_notes/dev_plan.md` (lines 332-442)

### 11) Bulk Test Message Generation
✅ **COMPLETED** - Dev test functions for populating queues
- **+50 Pending**: Add 50 messages to moderation queue (as if from submit page)
- **+100 Approved**: Add 100 messages to display queue (as if from moderation)
- API endpoints: `POST /api/test/bulk-pending` and `POST /api/test/bulk-approved`
- Custom count inputs with configurable limits (max 200 pending, 500 approved)
- Staggered timestamps for realistic queue ordering
- UI buttons added to test console at `/test`
- Location: `server/index.js` (bulk endpoints), `public/test/index.html` (UI)

### 12) Three-Phase Queue Display Enhancement
✅ **COMPLETED** - Airport departures board-style pagination system
- **Phase 1: Overview** (18s) - Split view showing both queued & ingested sections
- **Phase 2: Queued Details** (8s/page) - Full-screen queued messages with pagination
- **Phase 3: Ingested Details** (5s/page) - Full-screen ingested messages with pagination
- **16:9 Aspect Ratio**: `--u` unit (1% container width) for pixel-identical scaling at any size
- **Grid Presets**: ↑/↓ arrows cycle 12 presets (2×1 to 7×5), toast shows current preset
- **Fullscreen Controls**: F key or button to enter, Escape to exit
- **Phase Navigation**: Left/right arrows for manual phase stepping
- **Gallery Optimized**: Large typography (1.8u), generous card padding (0.7u), 2-5m readability
- Automatic phase cycling with proper state management and visual indicators
- Location: `public/queue/index.html`