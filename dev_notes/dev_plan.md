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
| **Terminal Critic v2** | � NEXT | Claude 3.5 Sonnet | Medium | Local LLM module + control panel UI, modular design for reuse |
| **Music Prompt** | ⏳ PENDING | Claude 3 Haiku | Low | Key/mode/tempo generation with variety enforcement |
| **External Template** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Generic interface for Ian + Gravity Sketch |
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
| **Hub v2 Rework** | 🔄 NEXT | Claude 3.5 Sonnet | High | Auto module registration, connection status, drag-drop reordering, 60s timeout |
| **Moderator UI v2** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Module status dashboard, drag-drop grid, backup local submission |
| **Archive + Recording** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | JSON logging (submissions/approvals/routing) + 4K video recording |
| **Module Control Panels** | ⏳ PENDING | Claude 3 Haiku | Low | Web-based unified monitoring page for all modules |
| **Fallback Systems** | ⏳ PENDING | Claude 3.5 Sonnet | Medium | Offline placeholder cells, safe mode, module retry queue |

*Infrastructure that keeps the show running smoothly.*

---

### 🌐 Deployment & Operations

| Task | Status | Claude Model | Complexity | Description |
|------|--------|--------------|------------|-------------|
| **Vercel Deployment** | ⏳ PENDING | Claude 3.5 Sonnet | Low | Cloud deployment for audience submission/moderation UIs |
| **Startup Script** | ⏳ PENDING | Claude 3 Haiku | Low | Single command to spin up all modules (server → modules → archive) |
| **Restart Script** | ⏳ PENDING | Claude 3 Haiku | Low | Graceful restart preserving queue state and audience prompts |
| **Reset Script** | ⏳ PENDING | Claude 3 Haiku | Low | Full system reset (clears queue, restarts everything) |
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

**✅ Completed:**
- Core submission → moderation → routing → display pipeline
- WebSocket module protocol
- Network configuration for LAN deployment
- Architecture design (Vercel + Local split)

**🔄 Currently Building:**
- Hub v2 rework (auto module registration, connection status, reordering)
- Moderator UI v2 (status dashboard, drag-drop, backup submission)

**⏳ Priority Queue:**
1. Terminal Critic v2 (local module + control panel)
2. Music Prompt module (key/mode/tempo generation)
3. Archive system (JSON logging + 4K recording)
4. Startup/restart scripts
5. External artist template (Ian + Gravity Sketch interface)
6. 3D scene generation (Blender MCP + Three.js viewer)

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
