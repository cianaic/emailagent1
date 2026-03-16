# Screenshot Agent — Mac Menubar App

A lightweight macOS menubar app that captures screenshots and sends them to the Email Agent for analysis.

## Requirements
- macOS 13 (Ventura) or later
- Xcode 15+ or Swift 5.9+

## Setup

### 1. Open in Xcode
```bash
cd ScreenshotAgent
open Package.swift
```

Or create an Xcode project and add the Swift files.

### 2. Configure API URLs

Set environment variables or edit `Config.swift`:

```bash
export SCREENSHOT_AGENT_API_URL="https://your-app.vercel.app"
export SCREENSHOT_AGENT_WEB_URL="https://your-app.vercel.app"
```

### 3. Build & Run
```bash
swift build
swift run
```

Or build in Xcode (Cmd+R).

### 4. Grant Permissions
- **Screen Recording**: System Settings → Privacy & Security → Screen Recording → Enable Screenshot Agent
- **Notifications**: Allow when prompted

## Usage

1. **Cmd+Shift+A** — Triggers screen region capture
2. Select the region to capture
3. A popup appears with the screenshot preview
4. Add optional context (e.g., "Reply to this email", "Schedule this meeting")
5. Click **Send** (or press Enter)
6. A notification appears when analysis is complete
7. Click the notification to open the web app and review/confirm actions

## How It Works

```
Cmd+Shift+A → Region Capture → Popup (add context) → Send to /api/screenshot
    → Claude Vision analyzes → macOS notification → Click → Web app /action page
    → Review email/calendar cards → Confirm → Actions executed
```
