# Human Actions Required

## 🚨 IMMEDIATE: Fix Vercel Deployment (Blocking)

The Vercel project exists but has never deployed. Root directory setting is wrong.

**Steps to fix (5 minutes):**

1. Go to: https://vercel.com/tropicalwilsons-projects/nottingham-contemporary-exhibition-2026-march/settings
2. Scroll to **"Root Directory"**
3. **Clear the field** (delete `vercel-app` so it's empty) and save
4. Run deployment from terminal:
   ```
   cd vercel-app
   npx vercel deploy --prod
   ```
5. After deploy succeeds, add environment variable:
   - Go to Settings → Environment Variables
   - Add: `NEXT_PUBLIC_HUB_URL` = `ws://YOUR-LAN-IP:3000`
   - Replace `YOUR-LAN-IP` with your actual local network IP (e.g. `192.168.1.252`)
   - Select all environments (Production, Preview, Development)
   - Save and redeploy

**Why it failed:** Vercel project had Root Directory set to `vercel-app`, but CLI was already running from inside `vercel-app/`, causing a doubled path (`vercel-app/vercel-app`).

## Vercel Post-Deploy Checklist
- [ ] Verify Vercel URL loads in browser (should show submission form)
- [ ] Test WebSocket connection from Vercel to local Hub (cross-network)
- [ ] Generate QR codes pointing to Vercel URL for audience access
- [ ] Test submission flow: QR scan → Vercel UI → WebSocket → local Hub
- [ ] Set up custom domain (optional)

## Hardware & Network Setup
- [ ] Configure router/network for multiple laptops
- [ ] Test WebSocket connections across devices
- [ ] Set up 4K video recording hardware/software
- [ ] Install Ollama on Terminal Critic device
- [ ] Download required LLM models (Mistral, etc.)

## Local System Testing
- [ ] Run `npm start` from project root to start Hub v2
- [ ] Open http://localhost:3000/moderate — verify moderator UI loads
- [ ] Open http://localhost:3000/submit — test submission form
- [ ] Open http://localhost:3000/display — verify 3x3 grid display
- [ ] Test backup local submission from moderator panel
- [ ] Test module connections from different laptops (ports 3001-3008)
- [ ] Verify drag-and-drop module reordering in moderator UI
- [ ] Test graceful handling of module disconnections

## Performance & Load Testing
- [ ] Test with multiple simultaneous audience submissions
- [ ] Verify 60-second module timeout handling
- [ ] Test archive file integrity after sudden shutdowns
- [ ] Validate backup local submission method works

## Artist Workflow Integration
- [ ] Build and test external module adapters for VJ/Ian/Gravity Sketch
- [ ] Work with VJ to test TouchDesigner OSC integration
- [ ] Coordinate with Ian on external module interface
- [ ] Test with Gravity Sketch person on their workflow

## Show Day Preparation
- [ ] Create QR codes for audience submission
- [ ] Set up projection hardware and calibration
- [ ] Test full system startup/restart procedures
- [ ] Prepare backup plans for common failure scenarios
- [ ] Brief team on moderator controls and emergency procedures