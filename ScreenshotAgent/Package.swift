// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ScreenshotAgent",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "ScreenshotAgent",
            path: "ScreenshotAgent"
        ),
    ]
)
