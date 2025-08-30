import SwiftUI
import AVFoundation
import Speech

struct ContentView: View {
    @StateObject private var viewModel = MorningAssistantViewModel()
    @State private var showSettings = false
    @State private var showLogs = false
    @State private var showAlarms = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                headerView
                apiKeySetupView
                mainCallInterface
                tipsView
            }
            .padding()
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.1)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .navigationTitle("朝のAIアシスタント")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .navigationBarTrailing) {
                    Button {
                        showAlarms = true
                    } label: {
                        Image(systemName: "alarm")
                    }
                    
                    Button {
                        showLogs = true
                    } label: {
                        Image(systemName: "doc.text")
                    }
                    
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: $showLogs) {
                CallLogsView()
            }
            .sheet(isPresented: $showAlarms) {
                AlarmSettingsView()
            }
            .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("AlarmTriggered"))) { notification in
                if let userInfo = notification.userInfo,
                   let autoStart = userInfo["autoStart"] as? Bool,
                   autoStart && viewModel.hasApiKey && !viewModel.isCallActive {
                    Task {
                        await viewModel.startCall()
                    }
                }
            }
        }
    }
    
    private var headerView: some View {
        VStack {
            Text("朝のAIアシスタント")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("音声で朝の準備をサポートします")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    @ViewBuilder
    private var apiKeySetupView: some View {
        if !viewModel.hasApiKey {
            VStack(alignment: .leading, spacing: 12) {
                Text("初期設定")
                    .font(.headline)
                
                SecureField("OpenAI APIキー (sk-...)", text: $viewModel.tempApiKey)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                Button("APIキーを保存") {
                    viewModel.saveApiKey()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(radius: 2)
        }
    }
    
    private var mainCallInterface: some View {
        VStack(spacing: 20) {
            if !viewModel.isCallActive {
                VStack {
                    Text("通話を開始する準備ができました")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("アクティブな指示: \(viewModel.activeInstructionsCount)件")
                        .foregroundColor(.secondary)
                }
            } else {
                VStack {
                    Text("通話中")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    HStack {
                        Image(systemName: "clock")
                        Text("残り: \(viewModel.formattedRemainingTime)")
                            .font(.title3)
                            .foregroundColor(viewModel.remainingTime <= 30 ? .red : .primary)
                    }
                    
                    if viewModel.isSpeaking {
                        Text("🎤 AIが話しています...")
                            .foregroundColor(.blue)
                    }
                    
                    if viewModel.isListening {
                        Text("👂 あなたの声を待っています...")
                            .foregroundColor(.green)
                    }
                }
            }
            
            // Current message display
            if !viewModel.currentMessage.isEmpty {
                Text(viewModel.currentMessage)
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
            }
            
            // Call control button
            if !viewModel.isCallActive {
                Button {
                    Task {
                        await viewModel.startCall()
                    }
                } label: {
                    VStack {
                        Image(systemName: "phone")
                            .font(.largeTitle)
                        Text("通話開始")
                            .font(.headline)
                    }
                    .frame(width: 120, height: 120)
                    .foregroundColor(.white)
                    .background(Color.green)
                    .clipShape(Circle())
                }
                .disabled(!viewModel.canStartCall)
            } else {
                Button {
                    viewModel.endCall()
                } label: {
                    VStack {
                        Image(systemName: "phone.down")
                            .font(.largeTitle)
                        Text("通話終了")
                            .font(.headline)
                    }
                    .frame(width: 120, height: 120)
                    .foregroundColor(.white)
                    .background(Color.red)
                    .clipShape(Circle())
                }
            }
            
            // Status indicators
            if viewModel.isCallActive {
                HStack(spacing: 20) {
                    HStack {
                        Image(systemName: viewModel.isListening ? "mic" : "mic.slash")
                        Text(viewModel.isListening ? "音声認識中" : "待機中")
                    }
                    .foregroundColor(viewModel.isListening ? .green : .secondary)
                }
                .font(.caption)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 4)
    }
    
    @ViewBuilder
    private var tipsView: some View {
        if !viewModel.isCallActive {
            VStack(alignment: .leading, spacing: 8) {
                Text("使い方のヒント")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("• 設定画面でAIに指示してほしい内容を事前に登録してください")
                    Text("• 通話中はAIの指示に従って行動し、完了したら口頭で報告してください")
                    Text("• 音声認識がうまくいかない場合は、はっきりと話してください")
                    Text("• 通話ログは自動的に保存され、後で確認できます")
                    Text("• アラームを設定すると指定時刻にアプリが自動起動します")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(radius: 2)
        }
    }
}