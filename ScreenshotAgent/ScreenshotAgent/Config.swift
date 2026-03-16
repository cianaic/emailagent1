import Foundation

enum Config {
    // Set these to your deployed Vercel URLs
    static let apiBaseURL = ProcessInfo.processInfo.environment["SCREENSHOT_AGENT_API_URL"]
        ?? "http://localhost:3000"

    static let webAppURL = ProcessInfo.processInfo.environment["SCREENSHOT_AGENT_WEB_URL"]
        ?? "http://localhost:5173"
}
