import SwiftUI

struct RootView: View {
    @EnvironmentObject var registry: CapabilityRegistry

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("ホーム", systemImage: "phone") }
            SettingsView()
                .tabItem { Label("設定", systemImage: "gear") }
            AlarmView()
                .tabItem { Label("アラーム", systemImage: "alarm") }
            LogsView()
                .tabItem { Label("ログ", systemImage: "text.book.closed") }
        }
    }
}

