import SwiftUI
import AVFoundation

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var dataManager: DataManager
    @StateObject private var speechService = SpeechService.shared
    @StateObject private var openAIService = OpenAIService.shared
    @State private var timer: Timer?
    @State private var showApiKeyAlert = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // ヘッダー
                VStack(spacing: 10) {
                    Text("朝のAIアシスタント")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("音声で朝の準備をサポートします")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    // プラン情報
                    HStack {
                        Image(systemName: "crown.fill")
                            .foregroundColor(planColor)
                        Text(appState.currentPlan.rawValue)
                            .font(.caption)
                            .fontWeight(.semibold)
                        Text("・")
                        Text("残り: \(formatTime(appState.remainingTime))")
                            .font(.caption)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(planColor.opacity(0.2))
                    .cornerRadius(15)
                }
                .padding(.top, 20)
                
                Spacer()
                
                // 通話状態表示
                VStack(spacing: 20) {
                    if appState.isCallActive {
                        // 通話中の表示
                        VStack(spacing: 15) {
                            if appState.isSpeaking {
                                HStack {
                                    Image(systemName: "speaker.wave.3.fill")
                                        .foregroundColor(.blue)
                                        .font(.title2)
                                    Text("AIが話しています...")
                                        .font(.headline)
                                }
                            } else if appState.isListening {
                                HStack {
                                    Image(systemName: "mic.fill")
                                        .foregroundColor(.red)
                                        .font(.title2)
                                    Text("お話しください...")
                                        .font(.headline)
                                }
                            } else {
                                Text("準備中...")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                            }
                            
                            // 現在のメッセージ
                            if !appState.currentMessage.isEmpty {
                                Text(appState.currentMessage)
                                    .font(.body)
                                    .padding()
                                    .frame(maxWidth: .infinity)
                                    .background(Color.gray.opacity(0.1))
                                    .cornerRadius(12)
                            }
                        }
                    } else {
                        // 待機中の表示
                        VStack(spacing: 10) {
                            Image(systemName: "mic.slash")
                                .font(.system(size: 50))
                                .foregroundColor(.gray)
                            
                            Text("通話を開始する準備ができました")
                                .font(.headline)
                            
                            Text("アクティブな指示: \(dataManager.activeInstructionsCount)件")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Spacer()
                
                // 通話ボタン
                Button(action: toggleCall) {
                    ZStack {
                        Circle()
                            .fill(appState.isCallActive ? Color.red : Color.green)
                            .frame(width: 120, height: 120)
                        
                        VStack(spacing: 8) {
                            Image(systemName: appState.isCallActive ? "phone.down.fill" : "phone.fill")
                                .font(.system(size: 40))
                                .foregroundColor(.white)
                            
                            Text(appState.isCallActive ? "通話終了" : "通話開始")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }
                    }
                    .scaleEffect(appState.isCallActive && appState.isListening ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: appState.isListening)
                }
                .disabled(!canStartCall())
                
                Spacer()
                
                // 使い方のヒント
                if !appState.isCallActive {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("使い方のヒント")
                            .font(.footnote)
                            .fontWeight(.semibold)
                        
                        Text("• 設定画面で指示を登録してください")
                            .font(.caption2)
                        Text("• 通話中はAIの指示に従ってください")
                            .font(.caption2)
                        Text("• 音声認識がうまくいかない場合は、はっきりと話してください")
                            .font(.caption2)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                }
            }
            .padding()
            .navigationBarHidden(true)
        }
        .alert("APIキーが必要です", isPresented: $showApiKeyAlert) {
            Button("設定画面へ") {
                // 設定タブに切り替え
            }
            Button("キャンセル", role: .cancel) {}
        } message: {
            Text("OpenAI APIキーを設定してください")
        }
    }
    
    private var planColor: Color {
        switch appState.currentPlan {
        case .free:
            return .gray
        case .plus:
            return .blue
        case .premium:
            return .purple
        }
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
    
    private func canStartCall() -> Bool {
        return dataManager.hasApiKey && dataManager.activeInstructionsCount > 0
    }
    
    private func toggleCall() {
        if appState.isCallActive {
            endCall()
        } else {
            startCall()
        }
    }
    
    private func startCall() {
        guard canStartCall() else {
            showApiKeyAlert = true
            return
        }
        
        appState.isCallActive = true
        appState.remainingTime = appState.planLimits.timeLimit
        
        // タイマー開始
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if appState.remainingTime > 0 {
                appState.remainingTime -= 1
            } else {
                endCall()
            }
        }
        
        // 音声認識開始
        Task {
            await startConversation()
        }
    }
    
    private func endCall() {
        appState.isCallActive = false
        timer?.invalidate()
        timer = nil
        
        // 通話ログを保存
        saveCallLog()
        
        // 音声サービスを停止
        speechService.stopListening()
        speechService.stopSpeaking()
    }
    
    private func startConversation() async {
        // 初期メッセージ
        appState.currentMessage = "おはようございます！朝の準備を始めましょう。"
        appState.isSpeaking = true
        
        await speechService.speak(appState.currentMessage)
        appState.isSpeaking = false
        
        // 会話ループ
        while appState.isCallActive {
            // ユーザーの音声を待つ
            appState.isListening = true
            if let userInput = await speechService.startListening() {
                appState.isListening = false
                appState.currentMessage = "あなた: \(userInput)"
                
                // AIの応答を取得
                if let response = await openAIService.sendMessage(userInput, instructions: dataManager.activeInstructions) {
                    appState.currentMessage = response
                    appState.isSpeaking = true
                    await speechService.speak(response)
                    appState.isSpeaking = false
                }
            } else {
                appState.isListening = false
            }
            
            // 少し待機
            try? await Task.sleep(nanoseconds: 1_000_000_000)
        }
    }
    
    private func saveCallLog() {
        let log = CallLog(
            id: UUID().uuidString,
            date: Date(),
            duration: appState.planLimits.timeLimit - appState.remainingTime,
            instructions: dataManager.activeInstructions,
            conversation: openAIService.conversationHistory
        )
        dataManager.saveCallLog(log)
    }
}