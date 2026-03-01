# Development Plan — Interactive Art Installation

**Timeline:** ~4 weeks (target: late March 2026)  
**Team:** Joe (artist/developer), Jen (artist/producer), Ian (artist/developer), Krisitan (artist/developer), Juju (artist/dancer), Lars (artist/musician), Priten (3D artist/developer)
**Hardware:** Multiple laptops, projector + screens, domestic router (4× ethernet)  
**Approach:** Vibe coding with Claude AI models — iterative, experimental, human-AI collaborative

---

---
## System Overview
**Core loop:**
1. Visitor scans QR → opens web page on phone
2. Responds to prompt (e.g., "send a dream") → submits text
3. Moderator approves/rejects on separate screen
4. Approved message appears in **center cell** of 3×3 grid projection
5. Message animates → travels to one of **8 surrounding module cells**
6. Module processes message → outputs visual/text to its cell
7. Archive captures everything (including master AV recording)

**Secondary display:** History feed showing recent submissions


---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CENTRAL HUB                              │
│  (Node.js server on main laptop)                                │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Submit   │  │ Moderate │  │ Router/  │  │ Display  │        │
│  │ Web App  │  │ UI       │  │ Queue    │  │ Composer │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    [Phones]      [Mod laptop]    [Modules]     [Projector]
                                      │
         ┌────────────────────────────┴────────────────────────┐
         │                8 ART MODULES                        │
         │  (connect via WebSocket, some on separate laptops)  │
         │                                                     │
         │  LOCAL:                    EXTERNAL (video feed):   │
         │  • Terminal Critic         • VJ (TouchDesigner)     │
         │  • Boring Stock            • Ian's Module           │
         │  • Music Prompt            • Gravity Sketch         │
         │  • 3D Scene + Body Track   • Dancer Cam             │
         └─────────────────────────────────────────────────────┘
```

**Core loop:** QR scan → submit → moderate → route → process → display (3×3 grid)  
**Communication:** WebSocket + NDI/RTSP for video feeds  
**Network Architecture:**
- **Vercel (Cloud):** Audience submission UI, moderation UI, history feed (easy access, no latency concerns)
- **Local LAN (192.168.1.252:3000):** Central hub, all artistic modules, archive system, module control panels
- **Rationale:** Audience interaction is web-accessible; all processing/AI/video stays local for reliability, speed, and offline capability

---

## The 8 Module Cells

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

**Center cell:** Incoming messages with routing animation

---

## Development Tasks

### 🎯 Critical Path (Must Work First)

| Task | Status | Claude Model | Description |
|------|--------|--------------|-------------|
| **Core Spine** | ✅ DONE | Claude 3.5 Sonnet | Submit → moderate → route → display pipeline |
| **Module Protocol** | ✅ DONE | Claude 3.5 Sonnet | WebSocket interface for art modules |
| **3×3 Display Grid** | ✅ DONE | Claude 3.5 Sonnet | Projection compositor with routing animation |

*These form the foundation. Everything else plugs into this.*

---

### 🎭 Art Modules (Priority Order)

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

*Build in this order to maximize artistic value early.*

---

### 🛠 Technical Infrastructure

| Task | Status | Claude Model | Complexity | Description |
|------|--------|--------------|------------|-------------|
| **Hub v2 Rework** | ✅ DONE | Claude 3.5 Sonnet | High | Auto module registration, connection status, drag-drop reordering, 60s timeout |
| **Moderator UI v2** | ✅ DONE | Claude 3.5 Sonnet | Medium | Module status dashboard, drag-drop grid, backup local submission |
| **Archive + Recording** | ✅ DONE | Claude 3.5 Sonnet | Medium | JSON logging (submissions/approvals/routing) + 4K video recording |
| **Module Control Panels** | ✅ DONE | Claude 3 Haiku | Low | Web-based unified monitoring page for all modules |
| **Fallback Systems** | ✅ DONE | Claude 3.5 Sonnet | Medium | Offline placeholder cells, safe mode, module retry queue |

*Infrastructure that keeps the show running smoothly.*

---

### 🌐 Deployment & Operations

| Task | Status | Claude Model | Complexity | Description |
|------|--------|--------------|------------|-------------|
| **Vercel Deployment** | ✅ DONE | Claude 3.5 Sonnet | Low | Cloud deployment for audience submission/moderation UIs |
| **Startup Script** | ✅ DONE | Claude 3 Haiku | Low | Single command to spin up all modules (server → modules → archive) |
| **Restart Script** | ✅ DONE | Claude 3 Haiku | Low | Graceful restart preserving queue state and audience prompts |
| **Reset Script** | ✅ DONE | Claude 3 Haiku | Low | Full system reset (clears queue, restarts everything) |
| **Load Testing** | ⏳ PENDING | Claude 3 Haiku | Low | Simulate audience burst, module failure scenarios |
| **Artist Integration** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Work with team to integrate their workflows |
| **Rehearsal Support** | ⏳ PENDING | Claude 3.5 Sonnet | Low | Monitoring, quick fixes, restart procedures |

*Getting ready for showtime.*

---

## Claude Model Selection Guide

**Claude 3.5 Sonnet** — Most tasks. Best balance of capability, speed, and cost. Excellent at code generation, system architecture, and complex logic.

**Claude 3 Opus** — High-complexity creative tasks. Better at nuanced artistic direction, complex prompt engineering, aesthetic judgment.

**Claude 3 Haiku** — Simple, well-defined tasks. Fast and cheap for basic implementations, straightforward UI work.

---

## Technical Architecture

### Core Stack
- **Node.js + Express + Socket.IO** — Central hub, WebSocket handling
- **HTML/CSS/JS** — All UIs (submission, moderation, display, history)
- **Ollama + Mistral/Llama** — Local LLM for text modules
- **WebSocket + NDI/RTSP** — Module communication + video routing

### Art Module Stack
- **Stable Diffusion** (ComfyUI) — Image generation
- **MediaPipe** — Body tracking
- **Blender MCP + Three.js** — 3D scene generation + display
- **TouchDesigner + OSC** — VJ integration
- **OBS Studio** — Video capture and archival

### Network Architecture
- **Primary:** LAN at 192.168.1.252:3000 (exhibition)
- **Secondary:** Vercel deployment (pre-show testing only)
- **Video:** NDI over ethernet, WiFi for audience phones
- **Storage:** Local JSON logs + 4K video recording

---

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

## Startup & Restart Strategy

**`start.sh`** — Full system startup
```bash
# 1. Start central hub
# 2. Wait for hub to be ready
# 3. Start all modules (Terminal Critic, Music Prompt, etc.)
# 4. Start archive system
# 5. Report status
```

**`restart.sh`** — Graceful restart (preserves queue)
```bash
# 1. Pause new submissions
# 2. Flush in-flight messages
# 3. Restart modules one by one
# 4. Resume submissions
# 5. No data loss
```

**`reset.sh`** — Full reset
```bash
# 1. Kill all processes
# 2. Clear queue database
# 3. Clear archive (optional flag)
# 4. Run start.sh
```

---

## Current Status & Next Actions

**✅ Completed - Core System Ready:**
- Hub v2 with complete module coordination and WebSocket protocol
- Moderator UI v2 with drag-drop grid, status dashboard, backup submission
- Terminal Critic v2 with local LLM and modular control panel
- Music Prompt LLM module for musical key/mode generation
- External artist module templates (Ian generative art + Gravity Sketch VR)
- Archive system with JSON logging + 4K video recording capability
- Vercel public submission UI with WebSocket connection
- Startup/restart/reset scripts for single-command system management
- Fallback systems with circuit breakers, retry queues, safe mode

**⏳ Testing & Integration Phase:**
1. Load testing (simulate audience burst, module failures)
2. Artist integration (VJ TouchDesigner, Ian's workflow, Gravity Sketch)
3. Hardware setup and network configuration
4. Rehearsal procedures and emergency protocols

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
- ✅ WCAG AAA compliant audience submission UI
- ✅ Automated venue management with session preservation
- ✅ Boot scripts for seamless deployment transitions

**In Progress:**
- 🔄 Hub-bridge system for art module video streaming
- 🔄 Enhanced submission progress tracking
- 🔄 Documentation updates for new architecture

**Pending:**
- ⏳ Hub-bridge Node.js application implementation
- ⏳ TouchDesigner/Gravity Sketch integration testing
- ⏳ Video streaming and 3×3 composition system
- ⏳ Screen snapshot capabilities for user feedback

---

## Additional Development Tasks

### 1. WCAG AAA Compliance for Audience UI ⏳ PENDING

**Requirements:**
- Strip audience submission page to essential text only
- Achieve WCAG AAA accessibility compliance
- Follow IBM Carbon design system principles
- Implement Nielsen's 10 usability heuristics
- Maintain computational efficiency and modular architecture

**Implementation:**
- Simplify text prompts to core message only
- Add proper ARIA labels and semantic HTML
- Ensure color contrast ratios meet AAA standards
- Implement keyboard navigation
- Add screen reader support
- Test with accessibility tools

### 2. Automated Venue Management System ⏳ PENDING

**Problem:** Manual IP configuration when moving between locations breaks audience access.

**Solution:** Full automation of venue transitions with session management
- **Boot Script:** Auto-detects IP, updates Vercel, maintains current session
- **Session System:** Unique session IDs with date stamps (format: `YYYYMMDD-HHMMSS-random`)
- **Venue Transitions:** Zero-downtime switches between home/gallery/rehearsal
- **State Preservation:** Maintains audience input queue across reboots

**Scripts to create:**
- `boot-exhibition.sh` - Starts system with current session preservation
- `new-session.sh` - Creates fresh session with new ID
- `switch-venue.sh [venue]` - Updates Vercel IP for venue change
- `session-status.sh` - Shows current session info and stats

**Technical approach:**
- Use Vercel API for automated environment variable updates
- Store session data in `sessions/` directory with timestamped folders
- IP detection via network interface queries
- Venue presets stored in `config/venues.json`
- Session state backup/restore for queue preservation

**Benefits:**
- One-command setup for any location
- No manual Vercel dashboard interaction needed
- Seamless transitions between development and show environments
- Session continuity across system restarts

### 3. Hub-Bridge System for Art Modules ⏳ PENDING

**Problem:** Art modules (TouchDesigner, Gravity Sketch, custom software) need seamless integration with Hub for bidirectional communication.

**Solution:** Lightweight Node.js helper application on each art module laptop
- **Name:** `hub-bridge`
- **Role:** Bridge between Hub server and local art software
- **Configuration:** Web-based UI for easy setup

**Architecture:**
```
Hub (WebSocket) ↔ Hub-Bridge ↔ Art Software ↔ Hub-Bridge ↔ Hub (Video Stream)
                    (OSC/HTTP/UDP)              (WebRTC/RTMP/NDI)
```

**Hub-Bridge Responsibilities:**
1. **Receive messages** from Hub via WebSocket
2. **Send to art software** via OSC, HTTP, or UDP protocols
3. **Capture video stream** from art software (WebRTC/RTMP/NDI)
4. **Send video back** to Hub for 3×3 grid composition
5. **Web configuration UI** at `http://localhost:8080/config`

**Software Integration:**
- **TouchDesigner:** OSC input, RTMP/NDI video output
- **Gravity Sketch:** HTTP API input, video capture output
- **Custom VJ Software:** Configurable protocol support

**Benefits:**
- Decouples Hub from specific art software
- Standardized integration protocol
- Easy configuration per module
- Handles reconnection and error recovery
- Supports any creative software with network I/O

### 4. Enhanced Submission Progress Tracking ⏳ PENDING

**Problem:** Users submit messages but get no feedback on processing status, making the experience feel unresponsive.

**Solution:** Real-time progress tracking with visual feedback and optional screen snapshots

**Progress States:**
1. **Sending** - Message leaving user device
2. **Processing** - Hub receiving and validating
3. **Waiting for Response** - Queued for moderation
4. **Waiting for Approval** - Under moderator review
5. **Approved/Rejected** - Moderation decision made
6. **Routing to Display** - Approved message being routed
7. **Displaying** - Message visible on main projection
8. **Archived** - Message saved to permanent archive

**Implementation:**
- Minimum 3-second display time per stage for readability
- Optional screen snapshot when message appears on projection
- Real-time WebSocket updates to user's browser
- Visual progress indicator with clear state labels
- Error handling for failed states

**Technical Approach:**
- Extend WebSocket events for progress updates
- Add screen capture capability to display system
- Store progress state in user session
- Implement timeout handling for stalled states

### 5. Documentation and UX Improvements ⏳ PENDING

**Requirements:**
- Convert README.md URLs to clickable markdown links
- Ensure all documentation reflects new hub-bridge architecture
- Update hardware setup diagrams and specifications
- Create comprehensive hub-bridge installation guide

**Status:** 
- ✅ WCAG AAA UI compliance completed
- ✅ Automated session management completed  
- ⏳ Hub-bridge system pending
- ⏳ Progress tracking pending
- ⏳ Documentation updates pending
