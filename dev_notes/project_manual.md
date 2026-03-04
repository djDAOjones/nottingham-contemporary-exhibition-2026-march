# Development Plan — Interactive Art Installation

**Show date:** March 29th 2026  

**Concept:** [AI Jam](DADA%20KE%20fund%20template_25_26%20K%20Jones.pdf) (funding bid)  

**Team:**  
- Jen (artist/producer)  
- Krisitan (artist/developer)  
- Lars (artist/musician)  
- Ian (artist/developer)  
- Priten (3D artist/developer)  
- Juju (artist/dancer)  
- Joe (artist/developer)  

---

## Core flow:  

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



---

### Equipment
- **Router:** Ethernet connection for each laptop
- **Main Laptop:** Runs Hub server (port 3000)
- **Module Laptops:** Connect to ports 3001, 3002, etc
- **Projectors / Screens:** Connected to display laptops
- **Camera:** For capturing movement performance? (TBC)

**Network Architecture:**
- **Vercel (Cloud):** Audience submission UI, moderation UI, history feed (easy access, no latency concerns)
- **Local LAN (192.168.1.252:3000):** Central hub, art modules, archive, module control panels
- **Rationale:** Audience interaction is web-accessible; all processing/AI/video stays local, where possible, for reliability, speed, and offline capability

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

## Art Modules Config

Helper app for routing messages and media signal to and from Art Modules

---

## UI Pages

All pages (except venue-specific) share the same codebase and are available both locally and online. Online versions enable remote team testing and venue redundancy. Pages auto-detect whether to connect to `localhost:3000` or the ngrok public URL.

### All Pages

| Panel | Local URL | Online URL | Purpose |
|-------|-----------|------------|---------|
| **Audience Submission** | [Local](http://localhost:3000/submit) | [Online](https://nottingham-contemporary-exhibition.vercel.app/submit) | Visitor text input (QR code target) |
| **Moderation Panel** | [Local](http://localhost:3000/moderate) | [Online](https://nottingham-contemporary-exhibition.vercel.app/moderate) | Approve/reject submissions, control modules |
| **Art Display** | [Local](http://localhost:3000/display) | [Online](https://nottingham-contemporary-exhibition.vercel.app/display) | 3×3 grid of Art Module outputs for projection |
| **Message Queue Display** | [Local](http://localhost:3000/queue) | [Online](https://nottingham-contemporary-exhibition.vercel.app/queue) | Paginated queue of approved audience submissions |
| **Message Checker** | [Local](http://localhost:3000/checker) | [Online](https://nottingham-contemporary-exhibition.vercel.app/checker) | Team view: all messages + moderation status (read-only) |
| **Testing Console** | [Local](http://localhost:3000/test) | [Online](https://nottingham-contemporary-exhibition.vercel.app/test) | Diagnostics and bulk test generation |
| **Archive/Event Log** | [Local](http://localhost:3000/archive) | [Online](https://nottingham-contemporary-exhibition.vercel.app/archive) | Event history and logs (venue only) |
| **Hub Bridge Config** | [Local](http://localhost:4000/) | [Online](https://nottingham-contemporary-exhibition.vercel.app/bridge) | Hub-Bridge control panel for Art Module Laptops (venue only) |

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

**`git_push.sh`** — Commit, push & deploy
```bash
# Usage: ./scripts/git_push.sh [commit message]
# 1. Stage all changes
# 2. Commit (custom message or auto-generated summary)
# 3. Push to origin/master
# 4. Deploy static pages to Vercel (if CLI installed)
```



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