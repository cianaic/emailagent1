import Foundation
import AppKit

/// Monitors the macOS screenshot save directory for new screenshots taken via
/// Cmd+Shift+3, Cmd+Shift+4, or Cmd+Shift+5. Uses FSEvents for near-instant
/// detection (~0.5s latency). Same approach used by CleanShot X and Shottr.
class ScreenshotMonitor {
    private var stream: FSEventStreamRef?
    private var processedFiles = Set<String>()
    private var watchPath: String
    private(set) var isRunning = false

    /// Called when a new native screenshot is detected. Passes the loaded NSImage.
    var onScreenshotDetected: ((NSImage) -> Void)?

    init() {
        watchPath = ScreenshotMonitor.resolveScreenshotDirectory()
    }

    // MARK: - Start / Stop

    func start() {
        guard !isRunning else { return }

        let pathsCF = [watchPath] as CFArray

        var context = FSEventStreamContext(
            version: 0,
            info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil,
            release: nil,
            copyDescription: nil
        )

        guard let stream = FSEventStreamCreate(
            kCFAllocatorDefault,
            fsEventCallback,
            &context,
            pathsCF,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
            0.5, // latency in seconds — debounce for file write completion
            UInt32(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes)
        ) else {
            print("ScreenshotMonitor: Failed to create FSEventStream")
            return
        }

        self.stream = stream
        FSEventStreamSetDispatchQueue(stream, DispatchQueue.main)
        FSEventStreamStart(stream)
        isRunning = true

        // Snapshot current files so we don't process existing screenshots on first launch
        seedProcessedFiles()

        print("ScreenshotMonitor: Watching \(watchPath)")
    }

    func stop() {
        guard isRunning, let stream = stream else { return }
        FSEventStreamStop(stream)
        FSEventStreamInvalidate(stream)
        FSEventStreamRelease(stream)
        self.stream = nil
        isRunning = false
        print("ScreenshotMonitor: Stopped")
    }

    /// Restart with a potentially new screenshot directory
    func restart() {
        stop()
        watchPath = ScreenshotMonitor.resolveScreenshotDirectory()
        processedFiles.removeAll()
        start()
    }

    // MARK: - Screenshot Directory Resolution

    /// Reads the macOS screenshot save location from user defaults.
    /// Falls back to ~/Desktop if not configured.
    static func resolveScreenshotDirectory() -> String {
        // macOS stores custom screenshot location in com.apple.screencapture
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/defaults")
        task.arguments = ["read", "com.apple.screencapture", "location"]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = Pipe() // suppress errors

        do {
            try task.run()
            task.waitUntilExit()

            if task.terminationStatus == 0 {
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                if let path = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
                   !path.isEmpty {
                    // Expand ~ if present
                    return NSString(string: path).expandingTildeInPath
                }
            }
        } catch {}

        // Default: ~/Desktop
        return NSHomeDirectory() + "/Desktop"
    }

    // MARK: - File Processing

    /// Seed the processed set with existing screenshot files to avoid
    /// processing old screenshots on first launch.
    private func seedProcessedFiles() {
        let fm = FileManager.default
        guard let contents = try? fm.contentsOfDirectory(atPath: watchPath) else { return }
        for filename in contents {
            if isScreenshotFile(filename) {
                processedFiles.insert(watchPath + "/" + filename)
            }
        }
    }

    /// Check if a filename matches the macOS screenshot naming convention.
    /// Pattern: "Screenshot YYYY-MM-DD at HH.MM.SS.png" (or with spaces/periods)
    private func isScreenshotFile(_ filename: String) -> Bool {
        // macOS uses "Screenshot" prefix and .png extension
        // Localized macOS may use different prefixes, but "Screenshot" covers English
        let lower = filename.lowercased()
        return (lower.hasPrefix("screenshot") || lower.hasPrefix("screen shot")) && lower.hasSuffix(".png")
    }

    /// Called by the FSEvents callback. Scans the directory for new screenshot files.
    fileprivate func handleFSEvent() {
        let fm = FileManager.default
        guard let contents = try? fm.contentsOfDirectory(atPath: watchPath) else { return }

        let now = Date()

        for filename in contents {
            guard isScreenshotFile(filename) else { continue }

            let fullPath = watchPath + "/" + filename

            // Skip already-processed files
            guard !processedFiles.contains(fullPath) else { continue }

            // Only process files created in the last 5 seconds
            guard let attrs = try? fm.attributesOfItem(atPath: fullPath),
                  let creationDate = attrs[.creationDate] as? Date,
                  now.timeIntervalSince(creationDate) < 5.0 else {
                continue
            }

            // Mark as processed immediately to avoid duplicates
            processedFiles.insert(fullPath)

            // Load the image
            guard let image = NSImage(contentsOfFile: fullPath) else { continue }

            print("ScreenshotMonitor: Detected new screenshot: \(filename)")

            DispatchQueue.main.async { [weak self] in
                self?.onScreenshotDetected?(image)
            }
        }
    }
}

// MARK: - FSEvents C Callback

private func fsEventCallback(
    _ streamRef: ConstFSEventStreamRef,
    _ clientCallbackInfo: UnsafeMutableRawPointer?,
    _ numEvents: Int,
    _ eventPaths: UnsafeMutableRawPointer,
    _ eventFlags: UnsafePointer<FSEventStreamEventFlags>,
    _ eventIds: UnsafePointer<FSEventStreamEventId>
) {
    guard let info = clientCallbackInfo else { return }
    let monitor = Unmanaged<ScreenshotMonitor>.fromOpaque(info).takeUnretainedValue()
    monitor.handleFSEvent()
}
