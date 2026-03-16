import SwiftUI
import Carbon.HIToolbox

@main
struct ScreenshotAgentApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        MenuBarExtra("Screenshot Agent", systemImage: "camera.viewfinder") {
            Button("Capture Screenshot") {
                appDelegate.captureScreenshot()
            }
            .keyboardShortcut("A", modifiers: [.command, .shift])

            Divider()

            Toggle("Watch for Screenshots", isOn: Binding(
                get: { appDelegate.screenshotMonitor.isRunning },
                set: { enabled in
                    if enabled {
                        appDelegate.screenshotMonitor.start()
                    } else {
                        appDelegate.screenshotMonitor.stop()
                    }
                    UserDefaults.standard.set(enabled, forKey: "watchScreenshots")
                }
            ))

            Divider()

            Button("Settings...") {
                appDelegate.showSettings()
            }

            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .keyboardShortcut("Q", modifiers: .command)
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    var capturePopup: NSWindow?
    var capturedImage: NSImage?
    var hotKeyRef: EventHotKeyRef?
    let screenshotMonitor = ScreenshotMonitor()

    func applicationDidFinishLaunching(_ notification: Notification) {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        registerGlobalHotKey()

        // Wire up the FSEvents monitor: native screenshots show the same popup
        screenshotMonitor.onScreenshotDetected = { [weak self] image in
            self?.capturedImage = image
            self?.showCapturePopup(image: image)
        }

        // Auto-start if previously enabled (defaults to true on first launch)
        let watchEnabled = UserDefaults.standard.object(forKey: "watchScreenshots") as? Bool ?? true
        if watchEnabled {
            screenshotMonitor.start()
        }
    }

    // MARK: - Global Hotkey (Cmd+Shift+A)

    func registerGlobalHotKey() {
        var hotKeyID = EventHotKeyID()
        hotKeyID.signature = OSType(0x53_53_41_47) // 'SSAG'
        hotKeyID.id = 1

        var eventType = EventTypeSpec()
        eventType.eventClass = OSType(kEventClassKeyboard)
        eventType.eventKind = UInt32(kEventHotKeyPressed)

        InstallEventHandler(GetApplicationEventTarget(), { _, event, _ -> OSStatus in
            let delegate = NSApplication.shared.delegate as? AppDelegate
            delegate?.captureScreenshot()
            return noErr
        }, 1, &eventType, nil, nil)

        // Cmd+Shift+A = keycode 0 (A) with modifiers
        RegisterEventHotKey(
            UInt32(kVK_ANSI_A),
            UInt32(cmdKey | shiftKey),
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
    }

    // MARK: - Screenshot Capture

    func captureScreenshot() {
        // Use macOS screencapture tool for interactive region selection
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        task.arguments = ["-i", "-c"] // interactive, clipboard

        task.terminationHandler = { [weak self] process in
            guard process.terminationStatus == 0 else { return }
            DispatchQueue.main.async {
                self?.handleScreenshotFromClipboard()
            }
        }

        try? task.run()
    }

    func handleScreenshotFromClipboard() {
        guard let pasteboard = NSPasteboard.general.readObjects(forClasses: [NSImage.self]) as? [NSImage],
              let image = pasteboard.first else { return }
        capturedImage = image
        showCapturePopup(image: image)
    }

    // MARK: - Capture Popup

    func showCapturePopup(image: NSImage) {
        let popupView = CapturePopupView(
            image: image,
            onSend: { [weak self] context in
                self?.capturePopup?.close()
                self?.sendToAPI(context: context)
            },
            onCancel: { [weak self] in
                self?.capturePopup?.close()
            }
        )

        let hostingView = NSHostingView(rootView: popupView)
        hostingView.frame = NSRect(x: 0, y: 0, width: 400, height: 320)

        let window = NSPanel(
            contentRect: hostingView.frame,
            styleMask: [.titled, .closable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Screenshot Agent"
        window.contentView = hostingView
        window.level = .floating
        window.isMovableByWindowBackground = true
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        capturePopup = window
    }

    // MARK: - API

    func sendToAPI(context: String) {
        guard let image = capturedImage,
              let tiffData = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiffData),
              let jpegData = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.8]) else { return }

        let base64 = jpegData.base64EncodedString()
        let dataURL = "data:image/jpeg;base64,\(base64)"

        let payload: [String: Any] = [
            "image": dataURL,
            "text": context,
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload),
              let url = URL(string: "\(Config.apiBaseURL)/api/screenshot") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        request.timeoutInterval = 60

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.showNotification(title: "Error", body: error.localizedDescription, url: nil)
                    return
                }

                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    self?.showNotification(title: "Error", body: "Failed to parse response", url: nil)
                    return
                }

                let summary = json["summary"] as? String ?? "Actions ready for review"
                let cards = json["cards"] as? [String: Any] ?? [:]
                let emails = cards["emails"] as? [[String: Any]] ?? []
                let calendar = cards["calendar"] as? [[String: Any]] ?? []
                let totalCards = emails.count + calendar.count

                if totalCards == 0 {
                    self?.showNotification(title: "No Actions Found", body: summary, url: nil)
                    return
                }

                // Encode the response as base64 JSON for the web app URL
                if let cardsData = try? JSONSerialization.data(withJSONObject: json),
                   let cardsJSON = String(data: cardsData, encoding: .utf8) {
                    let encoded = Data(cardsJSON.utf8).base64EncodedString()
                    let webURL = "\(Config.webAppURL)/action?data=\(encoded)"
                    self?.showNotification(
                        title: "\(totalCards) action\(totalCards == 1 ? "" : "s") ready",
                        body: summary,
                        url: webURL
                    )
                }
            }
        }.resume()
    }

    // MARK: - Notifications

    func showNotification(title: String, body: String, url: String?) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        if let url = url {
            content.userInfo = ["url": url]
        }

        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let urlString = response.notification.request.content.userInfo["url"] as? String,
           let url = URL(string: urlString) {
            NSWorkspace.shared.open(url)
        }
        completionHandler()
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    // MARK: - Settings

    func showSettings() {
        // TODO: Settings window for API URL config
    }
}

import UserNotifications
