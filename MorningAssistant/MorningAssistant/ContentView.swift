import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var dataManager: DataManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("ホーム", systemImage: "house.fill")
                }
                .tag(0)
            
            AlarmView()
                .tabItem {
                    Label("アラーム", systemImage: "alarm.fill")
                }
                .tag(1)
            
            CallLogView()
                .tabItem {
                    Label("ログ", systemImage: "list.bullet")
                }
                .tag(2)
                .disabled(!appState.planLimits.hasLogAccess)
            
            SettingsView()
                .tabItem {
                    Label("設定", systemImage: "gear")
                }
                .tag(3)
        }
        .accentColor(.blue)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AppState())
            .environmentObject(DataManager.shared)
    }
}