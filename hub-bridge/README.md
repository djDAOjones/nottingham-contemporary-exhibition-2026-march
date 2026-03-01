# Hub Bridge

Bridge between Hub v2 and local artist creative tools (TouchDesigner, Processing, Max/MSP, etc.).

Runs on the artist's laptop, receives audience messages from the Hub, forwards them to local creative tools, captures the output, and sends it back to the display.

## Quick Start

```bash
cd hub-bridge
npm install
node index.js
```

Open `http://localhost:4000` for the local control UI.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HUB_URL` | `ws://localhost:3000` | Hub WebSocket URL |
| `MODULE_NAME` | `Artist Bridge` | Display name in Hub |
| `MODULE_ID` | `bridge-<timestamp>` | Unique module identifier |
| `BRIDGE_PORT` | `4000` | Local web server port |
| `CAPTURE_MODE` | `webhook` | How output is captured (see below) |
| `OSC_ENABLED` | `false` | Enable OSC forwarding |
| `OSC_OUT_HOST` | `127.0.0.1` | OSC destination host |
| `OSC_OUT_PORT` | `9000` | OSC destination port |
| `OSC_IN_PORT` | `9001` | OSC listen port for responses |
| `TIMEOUT_MS` | `30000` | Max processing time (ms) |
| `SCREENSHOT_DELAY_MS` | `5000` | Delay before screenshot capture |

## Capture Modes

- **`webhook`** — Creative tool POSTs output to `http://localhost:4000/api/output`
- **`screenshot`** — Auto-captures screen after a delay
- **`manual`** — Operator sends output via the local web UI

## Webhook API

Your creative tool should POST output when ready:

```bash
# Text output
curl -X POST http://localhost:4000/api/output \
  -H "Content-Type: application/json" \
  -d '{"type": "text", "content": "Generated poem..."}'

# Image output (URL)
curl -X POST http://localhost:4000/api/output \
  -H "Content-Type: application/json" \
  -d '{"type": "image", "url": "http://localhost:8080/render.png"}'

# Image output (base64)
curl -X POST http://localhost:4000/api/output/image \
  -H "Content-Type: application/json" \
  -d '{"base64": "<base64-data>", "caption": "Generated art"}'

# HTML output
curl -X POST http://localhost:4000/api/output \
  -H "Content-Type: application/json" \
  -d '{"type": "html", "content": "<div>...</div>"}'

# Video URL
curl -X POST http://localhost:4000/api/output \
  -H "Content-Type: application/json" \
  -d '{"type": "video", "url": "http://localhost:8080/stream.mp4"}'
```

## OSC Messages

When OSC is enabled, incoming messages are forwarded as:

| Address | Value |
|---|---|
| `/hub/message/id` | Message UUID |
| `/hub/message/text` | Full message text |
| `/hub/message/length` | Character count |
| `/hub/message/words` | Word count |
| `/hub/trigger` | `1` (new message signal) |

Respond via OSC to the bridge's listen port:

| Address | Value |
|---|---|
| `/hub/output/text` | Text content |
| `/hub/output/image` | Image URL |
| `/hub/output/html` | HTML content |
| `/hub/output/video` | Video URL |
