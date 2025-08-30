import SwiftUI
import Foundation
import AVFoundation
import Speech
import Combine

@MainActor
class MorningAssistantViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var isCallActive = false
    @Published var isListening = false
    @Published var isSpeaking = false
    @Published var currentMessage = ""
    @Published var remainingTime = 0
    @Published var tempApiKey = ""
    @Published var hasApiKey = false
    @Published var activeInstructionsCount = 0
    
    // MARK: - Private Properties
    private let speechRecognizer = SFSpeechRecognizer()
    private let audioEngine = AVAudioEngine()
    private let speechSynthesizer = AVSpeechSynthesizer()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    
    private var timer: Timer?
    private let timeLimit = 300 // 5分
    private var callStartTime: Date?
    
    private var conversationHistory: [(role: String, content: String)] = []
    
    // MARK: - Computed Properties
    var formattedRemainingTime: String {
        let minutes = remainingTime / 60
        let seconds = remainingTime % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
    
    var canStartCall: Bool {
        hasApiKey && activeInstructionsCount > 0
    }
    
    // MARK: - Initialization
    init() {
        loadApiKey()
        loadInstructions()
        requestPermissions()
    }
    
    // MARK: - API Key Management
    private func loadApiKey() {
        if let apiKey = UserDefaults.standard.string(forKey: "openai_api_key"), !apiKey.isEmpty {
            hasApiKey = true
        }
    }
    
    func saveApiKey() {
        let trimmedKey = tempApiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedKey.isEmpty else { return }
        
        UserDefaults.standard.set(trimmedKey, forKey: "openai_api_key")
        hasApiKey = true
        tempApiKey = ""
    }
    
    // MARK: - Instructions Management
    private func loadInstructions() {
        // デフォルトの指示を設定（実際の実装では UserDefaults から読み込み）
        activeInstructionsCount = 2
    }
    
    // MARK: - Permissions
    private func requestPermissions() {
        // Speech recognition permission
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                // Handle authorization status
            }
        }
        
        // Microphone permission
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                // Handle permission
            }
        }
    }
    
    // MARK: - Call Management
    func startCall() async {
        guard canStartCall else { return }
        
        isCallActive = true
        callStartTime = Date()
        remainingTime = timeLimit
        startTimer()
        
        currentMessage = "おはようございます！朝の準備を始めましょう。"
        await speak(currentMessage)
        
        // AI初期応答を取得
        let initialResponse = await getAIResponse("おはようございます。朝の準備を始めます。最初の指示をお願いします。")
        if let response = initialResponse {
            currentMessage = response
            await speak(response)
        }
        
        // 音声認識開始
        startListening()
    }
    
    func endCall() {
        isCallActive = false
        isListening = false
        isSpeaking = false
        stopTimer()
        stopListening()
        stopSpeaking()
        
        // 通話ログを保存
        saveCallLog()
        
        currentMessage = ""
        conversationHistory.removeAll()
    }
    
    // MARK: - Timer Management
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            Task { @MainActor in
                if self.remainingTime > 0 {
                    self.remainingTime -= 1
                } else {
                    self.endCall()
                }
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
        remainingTime = 0
    }
    
    // MARK: - Speech Recognition
    private func startListening() {
        guard isCallActive else { return }
        
        isListening = true
        
        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try? audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        
        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }
        recognitionRequest.shouldReportPartialResults = true
        
        // Configure audio engine
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }
        
        audioEngine.prepare()
        try? audioEngine.start()
        
        // Start recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }
            
            Task { @MainActor in
                if let result = result {
                    let recognizedText = result.bestTranscription.formattedString
                    
                    if result.isFinal {
                        self.stopListening()
                        self.processUserInput(recognizedText)
                    }
                } else if let error = error {
                    print("Speech recognition error: \(error)")
                    self.stopListening()
                    // Retry after a short delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        if self.isCallActive {
                            self.startListening()
                        }
                    }
                }
            }
        }
    }
    
    private func stopListening() {
        isListening = false
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
    }
    
    // MARK: - Speech Synthesis
    private func speak(_ text: String) async {
        guard !text.isEmpty else { return }
        
        isSpeaking = true
        
        return await withCheckedContinuation { continuation in
            let utterance = AVSpeechUtterance(string: text)
            utterance.rate = 0.5
            utterance.pitchMultiplier = 1.0
            utterance.volume = 1.0
            utterance.voice = AVSpeechSynthesisVoice(language: "ja-JP")
            
            // Set delegate to detect when speaking finishes
            speechSynthesizer.delegate = SpeechSynthesizerDelegate { [weak self] in
                Task { @MainActor in
                    self?.isSpeaking = false
                    continuation.resume()
                }
            }
            
            speechSynthesizer.speak(utterance)
        }
    }
    
    private func stopSpeaking() {
        speechSynthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }
    
    // MARK: - AI Communication
    private func processUserInput(_ input: String) {
        currentMessage = "あなた: \(input)"
        conversationHistory.append((role: "user", content: input))
        
        Task {
            let aiResponse = await getAIResponse(input)
            if let response = aiResponse {
                currentMessage = response
                await speak(response)
                
                // Continue listening after AI responds
                if isCallActive {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                        if self.isCallActive {
                            self.startListening()
                        }
                    }
                }
            }
        }
    }
    
    private func getAIResponse(_ userMessage: String) async -> String? {
        guard let apiKey = UserDefaults.standard.string(forKey: "openai_api_key") else {
            return nil
        }
        
        conversationHistory.append((role: "user", content: userMessage))
        
        let url = URL(string: "https://api.openai.com/v1/chat/completions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let systemPrompt = """
        あなたは朝の準備をサポートするAIアシスタントです。
        簡潔で親切な日本語で応答し、ユーザーの朝のルーティンをサポートしてください。
        
        主な指示：
        1. 朝の基本準備: 天気確認、予定確認、健康チェック、朝食提案
        2. モチベーション向上: 前向きな励ましとアドバイス
        
        応答は1-2文で簡潔にし、次に何をすべきかを明確に指示してください。
        """
        
        var messages: [[String: String]] = [["role": "system", "content": systemPrompt]]
        messages.append(contentsOf: conversationHistory.map { ["role": $0.role, "content": $0.content] })
        
        let requestBody: [String: Any] = [
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "max_tokens": 150,
            "temperature": 0.7
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: requestBody)
        
        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let choices = json["choices"] as? [[String: Any]],
               let firstChoice = choices.first,
               let message = firstChoice["message"] as? [String: Any],
               let content = message["content"] as? String {
                
                conversationHistory.append((role: "assistant", content: content))
                return content.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        } catch {
            print("API request failed: \(error)")
        }
        
        return "すみません、応答の取得に失敗しました。もう一度お試しください。"
    }
    
    // MARK: - Call Log Management
    private func saveCallLog() {
        guard let startTime = callStartTime else { return }
        
        let duration = Int(Date().timeIntervalSince(startTime))
        let log = CallLog(
            id: UUID(),
            date: startTime,
            duration: duration,
            conversationCount: conversationHistory.count,
            conversation: conversationHistory
        )
        
        var logs = getCallLogs()
        logs.append(log)
        
        // Keep only last 50 logs
        if logs.count > 50 {
            logs = Array(logs.suffix(50))
        }
        
        if let data = try? JSONEncoder().encode(logs) {
            UserDefaults.standard.set(data, forKey: "call_logs")
        }
    }
    
    func getCallLogs() -> [CallLog] {
        guard let data = UserDefaults.standard.data(forKey: "call_logs"),
              let logs = try? JSONDecoder().decode([CallLog].self, from: data) else {
            return []
        }
        return logs
    }
}

// MARK: - Supporting Types
struct CallLog: Codable, Identifiable {
    let id: UUID
    let date: Date
    let duration: Int
    let conversationCount: Int
    let conversation: [(role: String, content: String)]
    
    enum CodingKeys: String, CodingKey {
        case id, date, duration, conversationCount, conversation
    }
    
    init(id: UUID, date: Date, duration: Int, conversationCount: Int, conversation: [(role: String, content: String)]) {
        self.id = id
        self.date = date
        self.duration = duration
        self.conversationCount = conversationCount
        self.conversation = conversation
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        date = try container.decode(Date.self, forKey: .date)
        duration = try container.decode(Int.self, forKey: .duration)
        conversationCount = try container.decode(Int.self, forKey: .conversationCount)
        
        let conversationData = try container.decode([ConversationEntry].self, forKey: .conversation)
        conversation = conversationData.map { ($0.role, $0.content) }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(date, forKey: .date)
        try container.encode(duration, forKey: .duration)
        try container.encode(conversationCount, forKey: .conversationCount)
        
        let conversationData = conversation.map { ConversationEntry(role: $0.role, content: $0.content) }
        try container.encode(conversationData, forKey: .conversation)
    }
    
    private struct ConversationEntry: Codable {
        let role: String
        let content: String
    }
}

class SpeechSynthesizerDelegate: NSObject, AVSpeechSynthesizerDelegate {
    private let completion: () -> Void
    
    init(completion: @escaping () -> Void) {
        self.completion = completion
    }
    
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        completion()
    }
}