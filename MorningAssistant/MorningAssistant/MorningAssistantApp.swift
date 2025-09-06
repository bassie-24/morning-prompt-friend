import SwiftUI

@main
struct MorningAssistantApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var dataManager = DataManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(dataManager)
                .onAppear {
                    setupApp()
                }
        }
    }
    
    private func setupApp() {
        // 初期設定
        requestPermissions()
        loadSavedData()
    }
    
    private func requestPermissions() {
        // 音声認識権限のリクエスト
        SpeechService.shared.requestAuthorization()
        
        // 通知権限のリクエスト
        NotificationService.shared.requestAuthorization()
    }
    
    private func loadSavedData() {
        // 保存されたデータの読み込み
        dataManager.loadInstructions()
        dataManager.loadApiKey()
    }
}

// アプリ全体の状態管理
class AppState: ObservableObject {
    @Published var isCallActive = false
    @Published var currentPlan: UserPlan = .free
    @Published var remainingTime: TimeInterval = 0
    @Published var currentMessage = ""
    @Published var isListening = false
    @Published var isSpeaking = false
    
    var planLimits: PlanLimits {
        switch currentPlan {
        case .free:
            return PlanLimits(timeLimit: 300, hasLogAccess: false, hasWebSearch: false)
        case .plus:
            return PlanLimits(timeLimit: 900, hasLogAccess: true, hasWebSearch: false)
        case .premium:
            return PlanLimits(timeLimit: 1800, hasLogAccess: true, hasWebSearch: true)
        }
    }
}

enum UserPlan: String, CaseIterable {
    case free = "フリー"
    case plus = "プラス"
    case premium = "プレミアム"
}

struct PlanLimits {
    let timeLimit: TimeInterval
    let hasLogAccess: Bool
    let hasWebSearch: Bool
}