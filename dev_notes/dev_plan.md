# Development Plan

Maintain strict bucketing of tasks into done, pending, and future.

Do not attempt future tasks, they will be moved into pending when ready to develop.

After task development approved move the task into done.

## DONE

### 1. Hub v2 Server (`server/index.js`)
Central Express + Socket.IO server (port 3000, ~1600 lines). Fully implemented:
- **Submission API** — `POST /api/submit` with validation, rate limiting (30s per session), UUID tracking
- **Moderation API** — `POST /api/moderate` (approve/reject/edit), `GET /api/submissions`, `GET /api/rejected`, `GET /api/submissions/approved`
- **Queue API** — `GET /api/queue` returns queued + processing messages with stats
- **Module Management** — `GET /api/modules/status`, `POST /api/modules/reorder` (drag-drop order), `POST /api/modules/retry`, `POST /api/modules/clear-queue`
- **Routing** — Round-robin `routeToNextModule()` respecting module order and safe mode; 60s timeout with redistribution
- **Display Config API** — `GET/POST /api/config/display` with resolution presets (720p–4k), framerate (25/30/50/60), message display time, transition time; broadcasts changes to all displays
- **Safe Mode** — `POST /api/config/safe-mode` skips modules without recent heartbeat
- **Local Submit** — `POST /api/local-submit` for moderator fallback input
- **Progress Tracking** — 8-stage pipeline (Received → Queued → Under Review → Approved → Routing → Processing → Preparing Output → Displayed) with minimum 3s per stage and per-session broadcasting
- **Archive Logging** — JSON append to `archive/events_YYYY-MM-DD.json` for crash recovery; `GET /api/archive` endpoint
- **Module Discovery** — TCP port scan on startup (ports 3001–3008)
- **Socket.IO Rooms** — `moderators`, `display`, `history`, `modules`, `audience`; role-based `identify` handshake
- **Heartbeat System** — 30s interval, 60s timeout to mark modules offline
- **Test System** — Virtual module creation (`POST /api/test/create-modules`), test submissions, auto-approve, auto-run with timed intervals, bulk pending/approved generation (up to 200/500), cleanup endpoint
- **Graceful Shutdown** — SIGINT handler notifies modules, logs shutdown event
- **QR Code** — Optional terminal QR code for audience submission URL (requires `qrcode` package)
- **CORS** — Wildcard for HTTP routes; Vercel URL support for Socket.IO

### 3. Art Display (`public/display/index.html`)
Full-screen 3x3 grid display for projection (~726 lines). Fully implemented:
- **3x3 Grid Layout** — Center cell shows incoming messages; 8 surrounding cells for module outputs
- **Module Status Indicators** — Green dot (online), amber pulse (processing), grey (offline)
- **Message Animation** — Fade-in/scale for incoming messages, routing indicator (white dot animating center to target cell)
- **Output Rendering** — Supports text, image, HTML, and video (including direct video URLs)
- **WebRTC Video Streams** — Full peer connection setup for live video from hub-bridge modules
- **Progress Tracker** — Bottom of center cell with label, progress bar, and stage dots
- **Display Config** — Fetches and applies resolution/framerate/timing config from Hub; live updates via Socket.IO
- **Keyboard Shortcuts** — `c` toggles config overlay, `f` toggles fullscreen
- **Config Overlay** — Shows current resolution, framerate, and timing (hidden by default)

### 4. Message Queue Display (`public/queue/index.html`)
Dedicated queue visualisation page (~871 lines). Fully implemented:
- **Three-Phase Auto-Rotation** — Overview (both columns, 18s) then Queued Detail (paginated, 8s/page) then Ingested Detail (paginated, 5s/page)
- **12 Grid Presets** — From 2x1 to 7x5, cycled with Up/Down arrow keys; toast notification on change
- **Proportional Scaling** — All sizing uses `--u` CSS unit (1% container width); aspect-ratio media query for height-constrained displays
- **Keyboard Navigation** — Left/Right arrows for manual phase, Up/Down for grid density, F for fullscreen
- **IBM Plex Sans / Carbon Design Tokens** — WCAG AAA contrast, `prefers-reduced-motion` and `prefers-contrast` support
- **Skip Navigation** — Accessibility skip link
- **Pagination Indicator** — Phase name, page number, dot indicators (capped at 20)
- **Auto-Refresh** — Polls `/api/queue` every 2 seconds

### 5. Moderation Panel (`public/moderate/` — `index.html` + `script.js`)
Real-time moderation dashboard (~632 lines JS). Fully implemented:
- **Live Submission Queue** — Real-time via Socket.IO `new-submission` events; loads pending on connect
- **Moderation Actions** — Approve, reject (with reason), inline edit before approval
- **Module Status Grid** — Shows connected modules with status, queue depth, last response time
- **Drag-and-Drop Reorder** — Module processing order via `POST /api/modules/reorder`
- **Module Controls** — Retry failed messages, clear queue per module
- **Safe Mode Toggle** — Enable/disable via `POST /api/config/safe-mode`
- **Local Fallback Submit** — Text input for moderator to inject messages when audience is offline
- **Connection Status** — Visual indicator for Hub connection health

### 6. History Page (`public/history/index.html`)
Recent approved messages viewer (~125 lines). Fully implemented:
- **Real-time Updates** — Socket.IO `message-approved` events
- **Rolling Display** — Last 20 messages, newest first
- **HTML Escaping** — XSS-safe rendering

### 7. Audience Submission UI — Vercel App (`vercel-app/`)
Next.js application for remote audience participation. Fully implemented:
- **Connection Management** — Checks Hub availability via `/api/prompt`, visual connection status
- **Message Submission** — `POST /api/submit` with validation (280 char max)
- **30s Cooldown Timer** — Countdown with remaining time display
- **Session Tracking** — `localStorage`-based session ID and submission history
- **Accessibility** — Skip link, ARIA attributes, WCAG AAA target, Nielsen's heuristics
- **Vercel Deployment** — `deploy-vercel.sh` script, `NEXT_PUBLIC_HUB_URL` env var

### 12. Operational Scripts (`scripts/`)
All shell scripts implemented:
- **boot.sh** (~211 lines) — Full system startup: kills stale processes, detects LAN IP, manages session files, installs dependencies, starts Hub (port 3000) + optional Bridge (port 4000), optional ngrok HTTPS tunnel, prints URL summary
- **reset-soft.sh** (~52 lines) — Stops services, preserves session messages, restarts via boot.sh
- **reset-hard.sh** (~74 lines) — Stops services, archives current session logs, clears messages, fresh session, restarts via boot.sh
- **status.sh** (~71 lines) — Displays session info, LAN IP, process status with PIDs and memory usage for Hub/Bridge/ngrok
- **deploy-vercel.sh** (~49 lines) — Checks for Vercel CLI, deploys vercel-app (preview or production), instructions for `NEXT_PUBLIC_HUB_URL`


## PENDING

### x) Status Progression with Artificial Delays
📋 **PLANNED** - Enhanced user feedback system
- Status flow: "Connecting..." (3s min) → "Sending..." → "Received" → "Routing" → "Processing" → "Displaying" → "Send a dream..."
- Minimum 3 seconds per status for readability
- Integrate with existing 8-stage Hub progress tracking
- Map backend stages to user-friendly messages
- **TBD**: Message queuing for multiple simultaneous submissions
- **TBD**: Individual vs consolidated status for queued messages
- Implementation: Socket.IO progress events + client-side artificial delays



### x) Hub Control Center Redesign
📋 **PLANNED** - Redesigned moderation interface
- **Add Pagination**: Current moderation display shows all pending messages in one scrollable list
- List of messages on the right (with status, approve/reject buttons)
- Remove "Moderation" section underneath
- Display most recent message first, highlight ones needing decision
- Keep core live operations visible, move less common controls to menu
- Move art-module info (LAN address, queue depth) to main display under status

### x) Shared Codebase — Local + Online Pages
📋 **PLANNED** - All pages (except module-specific and archive) available both locally and online

**Goal:** Shared static HTML codebase deployed to both the local Hub and Vercel. Enables remote team testing and venue redundancy.

**Pages in scope (7):**

| Page | Local URL | Online URL |
|------|-----------|-----------|
| Audience Submission | `/submit` | Vercel `/` |
| Moderation Panel | `/moderate` | Vercel `/moderate` |
| Art Display | `/display` | Vercel `/display` |
| Message Queue Display | `/queue` | Vercel `/queue` |
| History Page | `/history` | Vercel `/history` |
| Testing Console | `/test` | Vercel `/test` |
| Message Checker (NEW) | `/checker` | Vercel `/checker` |

**Excluded:** Archive (`/archive` — venue-only), Hub Bridge Config (module-specific), Terminal Critic Web UI (module-specific)

**Architecture:**
- Replace `vercel-app/` (Next.js) with static HTML deployment from `public/`
- Each page includes shared `hub-connect.js` for Hub URL auto-detection
- Auto-detect: if running on localhost → connect to `localhost:3000`; if on Vercel → connect via ngrok URL

**Hub Mode Switch:**
- New endpoint: `GET /api/config/connection` returns `{ mode, localUrl, publicUrl }`
- Hub tracks its ngrok URL when tunnel starts (via `boot.sh`)
- Two modes: `local` (venue, prefer localhost) and `remote` (testing, prefer ngrok)
- Toggle via `POST /api/config/mode` or Moderation Panel UI

**Message Checker (new page):**
- Team view of all messages and their moderation status
- Shows pending, approved, and rejected messages (including rejection reasons)
- Read-only — no moderation actions
- Real-time updates via Socket.IO

**Deployment:**
- `deploy-vercel.sh` updated to deploy `public/` as static site
- `boot.sh` updated to set Hub public URL when ngrok starts

**Supersedes:** FUTURE item "Make local and online audience pages the same" — solved by shared codebase

## FUTURE

### 5) README Link Enhancement
📋 **PLANNED** - Make documentation links clickable
- Convert plain text URLs to markdown links
- Improve navigation within README

### 7) Video Snapshot Feature
💭 **CONCEPT** - Send display screenshot to user after their submission appears
- Capture main screen video output
- Send snapshot to user's browser once message is displayed
- Integration with status progression system

### 8) testing / rehearsal support