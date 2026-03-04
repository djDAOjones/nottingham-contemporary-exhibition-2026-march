# Message Display Specification
**Location**: `/public/queue/index.html` | **Route**: `/queue/`  
**Purpose**: Gallery-optimized audience display showing queued and ingested messages  
**Target**: Medium-size art gallery, medium-size screen, audiences milling around (2-5m viewing distance)

---

## Display Modes (Three-Phase System)

### Phase 1: Overview (18 seconds)
**Purpose**: Airport departures board style - show both "next departures" and "now processing"

**Layout**: Split 2-column view
- **Left Column**: "QUEUED MESSAGES" (yellow/warning color)
  - Shows most recent queued messages
  - Grid layout (unspecified)
- **Right Column**: "INGESTED MESSAGES" (green/success color)
  - Shows most recent ingested messages
  - Grid layout (unspecified)

**Timing**: 18 seconds total, then advance to Phase 2

---

### Phase 2: Queued Details (8 seconds per page)
**Purpose**: Full-screen focus on messages waiting to be processed

**Layout**: Single column, full-width
- **Header**: "QUEUED MESSAGES"
- **Content**: Queued messages displayed in grid layout (unspecified)
- **Pagination**: Shows current page and total pages (e.g., "Page 1 of 26")

**Behavior**:
- Auto-advances to next page after 8 seconds
- When all queued pages exhausted, moves to Phase 3
- If no queued messages exist, skips to Phase 3

**Timing**: 8 seconds per page

---

### Phase 3: Ingested Details (5 seconds per page)
**Purpose**: Full-screen focus on messages currently being processed by modules

**Layout**: Single column, full-width
- **Header**: "INGESTED MESSAGES"
- **Content**: Ingested messages displayed in grid layout (unspecified)
- **Pagination**: Shows current page and total pages (e.g., "Page 1 of 12")

**Behavior**:
- Auto-advances to next page after 5 seconds
- When all ingested pages exhausted, loops back to Phase 1
- If no ingested messages exist, shows "No ingested messages"

**Timing**: 5 seconds per page

---

## Message Card Design

### Card Structure
```
┌─────────────────────────────┐
│  Message Text (wraps)       │
│                             │
│  Message ID    [STATUS]     │
└─────────────────────────────┘
```

### Card Dimensions
- **Minimum Height**: Unspecified (determined by content and layout)
- **Padding**: `var(--spacing-lg)` (1rem)
- **Gap Between Cards**: `var(--spacing-lg)` (1rem)
- **Grid**: Layout unspecified (flexible based on content and screen size)

### Typography
- **Message Text**: Large, readable from 2-5 meters, weight 500
- **Message ID**: Smaller, monospace, tertiary color
- **Status Badge**: Prominent, uppercase, weight 600

### Colors
- **Queued Cards**: 
  - Background: `rgba(241, 194, 27, 0.25)` (yellow tint)
  - Border: `rgba(241, 194, 27, 0.3)`
  - Status Badge: Yellow/warning color
- **Ingested Cards**:
  - Background: `rgba(36, 161, 72, 0.1)` (green tint)
  - Border: `rgba(36, 161, 72, 0.3)`
  - Status Badge: Green/success color

### Animations
- **Fade Out**: 0.8s ease-out when leaving page
- **Slide Up**: 0.8s ease-out transition between pages
- **Slide In**: 0.8s ease-out when entering page

---

## Container & Responsive Behavior

### 16:9 Aspect Ratio Maintenance
**Windowed Mode**:
- Width: 100vw
- Height: 56.25vw (100vw × 9/16)
- Max-height: 100vh
- Scales with window width

**Wide Aspect Ratio** (browser wider than 16:9):
- Width: calc(100vh × 16/9)
- Height: 100vh
- Scales with window height

**Fullscreen Mode**:
- Width: 100vw
- Height: 100vh
- Maintains 16:9 within viewport

### Padding & Spacing
- **Container Padding**: Responsive, scales with viewport
- **Header Margin**: Responsive, scales with viewport
- **Grid Gap**: Consistent spacing throughout

### Gallery Viewing Distance Optimization
- **Target Distance**: 2-5 meters (medium-size gallery, audiences milling around)
- **Text Sizing**: Large enough for comfortable reading at gallery distance
- **Card Sizing**: Adequate spacing and size for visibility from medium distance
- **Color Contrast**: High contrast for visibility in gallery lighting conditions

---

## Header Section

### Title
- **Text**: "Exhibition Queue"
- **Font Size**: Responsive, scales with viewport
- **Weight**: 600
- **Margin Below**: Responsive

### Subtitle (Phase-Specific)
- **Phase 1**: "Overview: Next departures and current processing"
- **Phase 2**: "Next departures - Page X of Y"
- **Phase 3**: "Now processing - Page X of Y"
- **Font Size**: Responsive, readable from gallery distance
- **Color**: Secondary text color

### Section Headers (in split view)
- **Font Size**: Responsive, scales with viewport
- **Weight**: 600
- **Text Transform**: UPPERCASE
- **Letter Spacing**: 0.1em
- **Border Bottom**: 2px solid border
- **Colors**:
  - Queued: Yellow/warning
  - Ingested: Green/success

---

## Pagination Indicator

### Position
- **Location**: Bottom center of screen
- **Positioning**: Absolute, responsive distance from bottom
- **Background**: Semi-transparent black with blur

### Content
- **Phase Info**: Current phase name (e.g., "Phase 1: Overview")
- **Page Info**: Page number (e.g., "Page 1 of 26")
- **Dots**: Visual indicators showing progress through current phase pages

### Styling
- **Font Size**: Readable from gallery distance
- **Padding**: Responsive
- **Dot Size**: Visible from gallery distance
- **Dot Gap**: Consistent spacing
- **Active Dot**: Highlighted color
- **Inactive Dot**: Tertiary text color

---

## Controls

### Fullscreen Toggle
- **Location**: Top-right corner
- **Trigger**: F key, Cmd+F, or Ctrl+F
- **Exit**: Escape key
- **Button Text**: "Fullscreen (F)"
- **Visibility**: Hidden in fullscreen mode (opacity: 0)

### Keyboard Navigation (Testing)
- **Right Arrow**: Advance to next phase/page
- **Left Arrow**: Go back to previous phase/page
- **F Key**: Toggle fullscreen
- **Escape**: Exit fullscreen

---

## Data Source

### API Endpoint
- **URL**: `/api/queue`
- **Method**: GET
- **Refresh Interval**: 2000ms (2 seconds)

### Response Format
```json
{
  "queued": [
    {
      "id": "abc123",
      "message": "Message text",
      "timestamp": "2026-03-01T15:30:00Z"
    }
  ],
  "processing": [
    {
      "id": "def456",
      "message": "Message text",
      "timestamp": "2026-03-01T15:29:00Z",
      "module": "module_name"
    }
  ]
}
```

### Message Processing
- **Truncation**: Max 120 characters (with "..." suffix if truncated)
- **Timestamp**: Not displayed on cards (used internally for ordering)
- **ID Format**: Hex hash (e.g., "#abc123")

---

## Accessibility & Design Principles

### WCAG AAA Compliance
- High contrast text on dark backgrounds
- Readable from 2-5 meters gallery distance
- Clear visual hierarchy
- Semantic HTML structure

### IBM Carbon Design System
- Consistent spacing using design tokens
- Responsive typography with clamp()
- Accessible color palette
- Professional, minimal aesthetic

### Nielsen Usability Heuristics
- **Visibility**: Clear phase indicators and page numbers
- **Match System & Real World**: "Queued" and "Ingested" terminology matches workflow
- **User Control**: Arrow keys for manual testing navigation
- **Consistency**: Identical layout structure across all phases
- **Error Prevention**: Graceful handling of empty states

---

## Empty States

### No Queued Messages
- **Display**: "No queued messages" in center of queued section
- **Phase 2 Behavior**: Skips to Phase 3 if no queued messages exist

### No Ingested Messages
- **Display**: "No ingested messages" in center of ingested section
- **Phase 3 Behavior**: Shows empty state, then loops back to Phase 1

### No Messages at All
- **Display**: Both sections show empty state
- **Behavior**: Continues cycling through phases

---

## Performance Considerations

- **Refresh Rate**: 2-second API polling interval
- **Animation Duration**: 0.8 seconds for smooth transitions
- **Phase Timing**: Configurable via CONFIG object
- **Memory**: Efficient DOM updates, minimal re-renders
- **Network**: Graceful degradation if API unavailable

---

## Configuration Constants

```javascript
CONFIG = {
  HUB_URL: 'http://192.168.1.252:3000' (or ngrok URL),
  REFRESH_INTERVAL: 2000,           // 2 seconds
  MESSAGES_PER_PAGE: 6,             // 3 columns x 2 rows (detail phases)
  OVERVIEW_MESSAGES_PER_SECTION: 3, // 1 column x 3 rows per section in overview
  PHASE_TIMING: {
    OVERVIEW: 18000,      // 18 seconds
    QUEUED_PAGE: 8000,    // 8 seconds per page
    INGESTED_PAGE: 5000   // 5 seconds per page
  },
  MAX_MESSAGE_LENGTH: 120  // Characters before truncation
}
```

### Implementation Notes
- **No title/subtitle header** — all vertical space used for message cards
- **Section headers are compact** — just "QUEUED" / "INGESTED" labels with page info inline
- **Phase 1 (Overview)**: 2-column split, each section shows 3 messages in a single column (1×3)
- **Phase 2/3 (Detail)**: Full width, 6 messages in a 3×2 grid
- **Pagination indicator**: Compact single-line bar at bottom, dots capped at 20 max

---

## Testing & Verification Checklist

- [ ] Phase 1 displays queued and ingested messages (split view)
- [ ] Phase 2 displays queued messages (full-width)
- [ ] Phase 3 displays ingested messages (full-width)
- [ ] Timing: Phase 1 = 18s, Phase 2 = 8s/page, Phase 3 = 5s/page
- [ ] 16:9 aspect ratio maintained in windowed mode
- [ ] 16:9 aspect ratio maintained in fullscreen mode
- [ ] All content fits within 16:9 frame (no cut-off)
- [ ] Layout proportions identical across all phases
- [ ] Arrow keys navigate forward/backward
- [ ] F key toggles fullscreen
- [ ] Escape exits fullscreen
- [ ] Pagination indicator shows correct page/phase info
- [ ] Empty states display gracefully
- [ ] Animations smooth and consistent
- [ ] Text readable from 2-5 meters gallery distance
- [ ] Colors accessible (WCAG AAA)
- [ ] Message cards clear and legible in gallery lighting
