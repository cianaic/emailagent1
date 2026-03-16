# Screenshot Agent — Mac Menubar App

A lightweight macOS menubar app that captures screenshots and sends them to Email Agent for AI analysis. Claude Vision reads your screenshot and creates ready-to-send email drafts and calendar events.

## What It Does

You take a screenshot (either with the app's hotkey or your normal Cmd+Shift+4). A small popup appears where you can add context like "reply to this" or "schedule this meeting". The app sends the screenshot to Claude Vision, which analyzes it and creates action cards. You get a macOS notification — click it to review, edit, and confirm the actions in your browser.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Screenshot ──► Popup ──► Claude Vision ──► Notification ──► Browser   │
│  (Cmd+Shift+A    (add       (analyzes        (click to       (review    │
│   or native)     context)    image)           open)           & send)   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Two capture modes

| Mode | Trigger | How it works |
|------|---------|-------------|
| **Dedicated hotkey** | Cmd+Shift+A | App triggers macOS region selection, reads from clipboard |
| **Native auto-detect** | Cmd+Shift+3 / 4 / 5 | App watches your screenshot folder and picks up new files automatically (~0.5s) |

---

## Requirements

- macOS 13 (Ventura) or later
- Xcode 15+ or Swift 5.9+
- Your Email Agent web app deployed (Vercel or local)

---

## Getting Started

### 1. Clone the repo and navigate to the app

```bash
git clone https://github.com/cianaic/emailagent1.git
cd emailagent1/ScreenshotAgent
```

> **Important:** The Swift app lives inside the main repo at `ScreenshotAgent/`, not at the repo root.

### 2. Configure your API URLs

The app needs to know where your Email Agent backend and web app are running.

**Option A — Environment variables (recommended for development):**

```bash
export SCREENSHOT_AGENT_API_URL="https://your-app.vercel.app"
export SCREENSHOT_AGENT_WEB_URL="https://your-app.vercel.app"
```

**Option B — Edit Config.swift directly:**

Open `ScreenshotAgent/Config.swift` and replace the defaults:

```swift
enum Config {
    static let apiBaseURL = "https://your-app.vercel.app"
    static let webAppURL  = "https://your-app.vercel.app"
}
```

**For local development**, the defaults point at `localhost:3000` (API) and `localhost:5173` (Vite dev server). If you're running the web app locally with `npm run dev`, no config changes are needed.

### 3. Build and run

**With Xcode (recommended):**

```bash
open Package.swift
```

This opens the project in Xcode. Press **Cmd+R** to build and run. A camera icon (viewfinder) appears in your menubar.

**From Terminal:**

```bash
swift build
swift run
```

### 4. Grant permissions

On first launch, macOS will ask for two permissions:

| Permission | Where to enable | Why it's needed |
|-----------|----------------|----------------|
| **Screen Recording** | System Settings → Privacy & Security → Screen Recording → enable Screenshot Agent | Required for the Cmd+Shift+A hotkey capture |
| **Notifications** | Click "Allow" when prompted | Shows results after screenshot analysis |

> If you skip Screen Recording, the Cmd+Shift+A hotkey won't work. The native auto-detect mode (Cmd+Shift+4) does NOT require Screen Recording — it just reads files from your Desktop.

---

## Usage

### Capture with hotkey (Cmd+Shift+A)

1. Press **Cmd+Shift+A** anywhere on your Mac
2. macOS shows the crosshair — drag to select a screen region
3. A floating popup appears showing your screenshot
4. Type optional context (e.g. "reply saying I'm available Thursday")
5. Press **Enter** or click **Send**
6. Wait a few seconds — a macOS notification appears
7. Click the notification → your browser opens the review page
8. Edit any fields if needed → click **Confirm** → emails send / events create

### Auto-detect native screenshots

1. Make sure **"Watch for Screenshots"** is toggled on in the menubar
2. Take a screenshot normally with **Cmd+Shift+4** (or 3 or 5)
3. The popup appears automatically ~0.5 seconds after the screenshot saves
4. Same flow from there: add context → Send → notification → review

### Menubar options

Click the camera icon in the menubar:

- **Capture Screenshot** (Cmd+Shift+A) — manual capture
- **Watch for Screenshots** — toggle auto-detection of native screenshots on/off
- **Quit** — exit the app

---

## How It Works Under the Hood

### Hotkey path
```
Cmd+Shift+A
  → Carbon EventHotKey fires
  → /usr/sbin/screencapture -i -c (interactive, to clipboard)
  → Read NSImage from pasteboard
  → Show popup
  → JPEG base64 POST to /api/screenshot
  → Claude Vision agentic loop (creates email + calendar cards)
  → macOS notification
  → Click → opens /action?data=<base64> in browser
```

### Native screenshot path
```
Cmd+Shift+4 (normal macOS shortcut)
  → macOS saves Screenshot YYYY-MM-DD at HH.MM.SS.png to ~/Desktop
  → FSEventStream detects new file (~0.5s latency)
  → Filter: filename starts with "Screenshot", created in last 5s, not already processed
  → Load NSImage from file
  → Show same popup → same flow from here
```

### Screenshot directory detection

The app reads your macOS screenshot save location from:
```bash
defaults read com.apple.screencapture location
```
Falls back to `~/Desktop` if not set. If you've changed your screenshot location (e.g. to a Screenshots folder), the app will find it automatically.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cmd+Shift+A does nothing | Grant Screen Recording permission in System Settings |
| No notification after Send | Grant Notification permission; check that API URL is correct |
| "Watch for Screenshots" doesn't detect anything | Check that screenshots are saving to ~/Desktop (or your configured location). The app looks for files named "Screenshot*.png" |
| Popup appears for old screenshots on launch | This shouldn't happen — the app seeds existing files on startup. If it does, restart the app |
| API returns errors | Make sure your `ANTHROPIC_API_KEY` is set in your Vercel/server environment |
| Calendar events fail | Sign out and back into the web app to refresh your Google OAuth token |

---

## Project Structure

```
ScreenshotAgent/
├── Package.swift                          # Swift package manifest
├── README.md                              # This file
└── ScreenshotAgent/
    ├── ScreenshotAgentApp.swift           # App entry, menubar, hotkey, API calls, notifications
    ├── CapturePopupView.swift             # Floating popup UI (screenshot preview + text input)
    ├── ScreenshotMonitor.swift            # FSEvents watcher for native screenshot detection
    ├── Config.swift                       # API + web app URL configuration
    └── Info.plist                         # App metadata + privacy descriptions
```
