import SwiftUI

@main
struct MorningAssistantApp: App {
    @StateObject private var registry = CapabilityRegistry.bootstrap()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(registry)
        }
    }
}

