import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("ホーム", systemImage: "house.fill")
                }
                .tag(0)
            
            SettingsView()
                .tabItem {
                    Label("設定", systemImage: "gear")
                }
                .tag(1)
            
            AlarmView()
                .tabItem {
                    Label("アラーム", systemImage: "alarm.fill")
                }
                .tag(2)
            
            if appState.planLimits.hasLogAccess {
                CallLogView()
                    .tabItem {
                        Label("ログ", systemImage: "doc.text.fill")
                    }
                    .tag(3)
            }
        }
    }
}