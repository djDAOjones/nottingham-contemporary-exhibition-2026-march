# Development Plan — Interactive Art Installation

**Show date:** March 29th 2026  

**Concept:** [AI Jam](DADA%20KE%20fund%20template_25_26%20K%20Jones.docx)  

**Team:**  
- Jen (artist/producer)  
- Krisitan (artist/developer)  
- Lars (artist/musician)  
- Ian (artist/developer)  
- Priten (3D artist/developer)  
- Juju (artist/dancer)  
- Joe (artist/developer)  

---

**Core flow:**  

QR code  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
Visitor submits text  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
Moderator approves / rejects  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
Approved Message routes to 1..N Art Modules  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
Public displays update  
&nbsp;&nbsp;&nbsp;&nbsp;↓  
Archive logs + 4K records Art Display

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CENTRAL HUB                              │
│  (Node.js server on main laptop)                                │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Submit   │  │ Moderate │  │ Router/  │  │ Display  │         │
│  │ Web App  │  │ UI       │  │ Queue    │  │ Composer │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
    [Phones]      [Mod laptop]    [Modules]     [Projectors]
                                      │
         ┌────────────────────────────┴────────────────────────┐
         │                8 ART MODULES                        │
         │       (connection TBC, separate laptops etc)        │
         └─────────────────────────────────────────────────────┘
```

**Core loop:** QR scan → submit → moderate → route → process → display (3×3 grid)  
**Communication:** TBC (websockets?)
**Network Architecture:**
- **Vercel (Cloud):** Audience submission UI, moderation UI, history feed (easy access, no latency concerns)
- **Local LAN (192.168.1.252:3000):** Central hub, art modules, archive, module control panels
- **Rationale:** Audience interaction is web-accessible; all processing/AI/video stays local, where possible, for reliability, speed, and offline capability

---

## Art Display Cells

**Center cell:** Incoming messages with routing animation

| Cell | Module | Input | Output | Implementation |
|------|--------|-------|--------|----------------|
| TBC |  |  |  |  |
| TBC |  |  |  |  |
| TBC |  |  |  |  |
| TBC |  |  |  |  |
| TBC |  |  |  |  |
| TBC |  |  |  |  |
| TBC |  |  |  |  |
| TBC |  |  |  |  |

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
| **Three-Phase Queue Display** | ✅ DONE | Claude 3.5 Sonnet | Medium | Airport departures board pagination: Overview→Queued→Ingested, 16:9 responsive, fullscreen, arrow-key grid presets |
| **HTTPS Tunnel (ngrok)** | ✅ DONE | Claude 3.5 Sonnet | Medium | ngrok HTTPS tunnel with auto-auth, Vercel auto-config, mixed content fix |
| **Hub-Bridge** | ✅ DONE | Claude 3.5 Sonnet | Medium | Node.js bridge for art modules: WebSocket↔OSC/HTTP/UDP, webhook input, local config UI |
| **Bulk Test Generation** | ✅ DONE | Claude 3 Haiku | Low | Dev test endpoints for populating queues (+50 pending, +100 approved), UI at `/test` |

*Infrastructure that keeps the show running smoothly.*

---

### 🌐 Deployment & Operations

| Task | Status | Claude Model | Complexity | Description |
|------|--------|--------------|------------|-------------|
| **Vercel Deployment** | ✅ DONE | Claude 3.5 Sonnet | Low | Cloud deployment for audience submission/moderation UIs |
| **Boot Script (`boot.sh`)** | ✅ DONE | Claude 3.5 Sonnet | Medium | Auto IP detection, session management, Hub+Bridge start, ngrok tunnel, Vercel auto-config |
| **Soft Reset (`reset-soft.sh`)** | ✅ DONE | Claude 3 Haiku | Low | Restart services while keeping session messages |
| **Hard Reset (`reset-hard.sh`)** | ✅ DONE | Claude 3 Haiku | Low | Full reset with new session (archives old) |
| **Status Check (`status.sh`)** | ✅ DONE | Claude 3 Haiku | Low | System health check: memory, API, tunnel status |
| **Audience UI Redesign** | ✅ DONE | Claude 3.5 Sonnet | Medium | WCAG AAA compliant submission form, IBM Carbon design, black bg, dynamic status |
| **Load Testing** | ⏳ PENDING | Claude 3 Haiku | Low | Simulate audience burst, module failure scenarios |
| **Artist Integration** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Work with team to integrate their workflows |
| **Rehearsal Support** | ⏳ PENDING | Claude 3.5 Sonnet | Low | Monitoring, quick fixes, restart procedures |
| **Hub Control Center Redesign** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Paginated moderation, recent-first messages, consolidated live ops view |

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

## Design Principles & Standards

### Core Design Philosophy
All interfaces must maintain **computationally efficient, well-documented, and modular architecture** while adhering to industry-leading accessibility and usability standards. This ensures the exhibition works reliably under pressure while being inclusive and intuitive for all users.

### IBM Carbon Design System
**Visual Consistency & Component Reuse:**
- Use Carbon's typography scale (IBM Plex Sans) for all text
- Apply 16px base grid system for consistent spacing
- Implement Carbon color tokens for semantic color usage
- Leverage Carbon icons for consistent visual language
- Follow Carbon motion principles (productive motion, 300ms transitions)

**Carbon Implementation Guidelines:**
- All components must be keyboard navigable
- Use Carbon's elevation system (shadows) for visual hierarchy
- Apply consistent border-radius values (4px standard)
- Implement Carbon's responsive grid breakpoints
- Use semantic color tokens (primary, secondary, danger, success)

### WCAG AAA Accessibility Compliance
**Level AAA Requirements (Strictest Standard):**
- **Color Contrast:** Minimum 7:1 ratio for normal text, 4.5:1 for large text
- **Keyboard Navigation:** All functionality accessible via keyboard alone
- **Screen Readers:** Proper ARIA labels, semantic HTML, descriptive alt text
- **Focus Management:** Clear focus indicators, logical tab order
- **Error Handling:** Clear error messages with recovery suggestions
- **Language:** lang attributes for all content, simple language structure

**Testing Requirements:**
- Test with screen readers (NVDA, JAWS, VoiceOver)
- Verify keyboard-only navigation
- Validate HTML semantics
- Use automated tools (axe-core, Lighthouse) + manual testing
- Ensure zoom functionality up to 400% without horizontal scroll

### Nielsen's 10 Usability Heuristics
**1. System Status Visibility**
- Real-time feedback for all user actions
- Progress indicators for multi-step processes
- Clear connection status for all components

**2. Match System & Real World**
- Familiar language and conventions
- Logical information architecture
- Natural task flow order

**3. User Control & Freedom**
- Undo/redo capabilities where applicable
- Emergency exits (restart, reset functions)
- Clear navigation paths

**4. Consistency & Standards**
- Consistent interaction patterns across all interfaces
- Standard web conventions (blue links, form patterns)
- Uniform terminology throughout system

**5. Error Prevention**
- Form validation with clear guidance
- Confirmation dialogs for destructive actions
- Default safe states

**6. Recognition vs Recall**
- Visible options and actions
- Clear labels and instructions
- Persistent navigation elements

**7. Flexibility & Efficiency**
- Shortcuts for advanced users (keyboard shortcuts)
- Customizable interfaces where beneficial
- Progressive disclosure of complexity

**8. Aesthetic & Minimalist Design**
- Remove unnecessary elements
- Focus on primary tasks
- Clear visual hierarchy

**9. Help Users with Errors**
- Plain language error messages
- Specific problem identification
- Clear recovery instructions

**10. Help & Documentation**
- Contextual help when needed
- Clear operational instructions
- Troubleshooting guides

### Technical Implementation Standards
**Performance Requirements:**
- Initial page load < 2 seconds
- Interactive response < 100ms
- Minimize JavaScript bundle size
- Optimize images and assets

**Browser Compatibility:**
- Support modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Progressive enhancement approach
- Graceful degradation for older browsers

**Code Quality:**
- ESLint + Prettier for consistent formatting
- Semantic HTML5 elements
- CSS custom properties for theming
- Modular component architecture

**Documentation Requirements:**
- Inline code comments for complex logic
- README files for each major component
- API documentation for all endpoints
- Deployment and setup guides

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
