import Foundation
import Combine

@MainActor
final class CallViewModel: ObservableObject {
    @Published var isActive = false
    @Published var isListening = false
    @Published var isSpeaking = false
    @Published var currentMessage: String = ""
    @Published var remainingSeconds: Int = 0

    private let registry: CapabilityRegistry
    private var conversation: [ConversationEntry] = []
    private var callStart: Date?
    private var timer: Timer?

    init(registry: CapabilityRegistry) { self.registry = registry }

    func start(plan: Plan, instructions: [UserInstruction]) async {
        guard !(registry.keychain.get(key: .openAIAPIKey) ?? "").isEmpty else { return }
        let active = instructions.filter { $0.isActive }
        guard !active.isEmpty else { return }

        isActive = true
        callStart = Date()
        remainingSeconds = plan.timeLimitSeconds
        startTimer()
        conversation.removeAll()

        let greet = "おはようございます！朝の準備を始めましょう。"
        currentMessage = greet
        isSpeaking = true
        await registry.speechOut.speak(greet)
        isSpeaking = false

        do {
            let initial = try await registry.ai.chat(messages: [
                .init(role: "system", content: systemPrompt(from: active)),
                .init(role: "user", content: "おはようございます。朝の準備を始めます。最初の指示をお願いします。")
            ])
            currentMessage = initial
            isSpeaking = true
            await registry.speechOut.speak(initial)
            isSpeaking = false
            await listenLoop(plan: plan, instructions: active)
        } catch {
            stop()
        }
    }

    func stop() {
        isActive = false
        isListening = false
        isSpeaking = false
        registry.speechOut.stop()
        registry.speechIn.stop()
        timer?.invalidate(); timer = nil
        if let start = callStart {
            let duration = Date().timeIntervalSince(start)
            let log = CallLog(date: start, duration: duration, instructions: [], conversation: conversation)
            registry.logs.append(log)
        }
        callStart = nil
        conversation.removeAll()
        currentMessage = ""
    }

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self = self, self.isActive else { return }
            if self.remainingSeconds <= 0 { self.stop() } else { self.remainingSeconds -= 1 }
        }
    }

    private func listenLoop(plan: Plan, instructions: [UserInstruction]) async {
        while isActive {
            isListening = true
            let userText: String
            do { userText = try await registry.speechIn.recognizeOnce() } catch { break }
            isListening = false
            conversation.append(.init(role: .user, content: userText, timestamp: Date()))

            var messages: [ChatMessage] = [
                .init(role: "system", content: systemPrompt(from: instructions))
            ]
            for entry in conversation.suffix(10) { // window
                messages.append(.init(role: entry.role == .user ? "user" : "assistant", content: entry.content))
            }

            do {
                var responseText = try await registry.ai.chat(messages: messages)
                if registry.storage.getPlan().hasWebSearch && instructions.contains(where: { $0.useWebSearch }) && responseText.contains("[search:") {
                    // trivial directive format: [search:query]
                    if let q = responseText.split(separator: "[").last?.split(separator: "]").first, q.hasPrefix("search:") {
                        let query = q.dropFirst("search:".count)
                        let digest = try? await registry.webSearch.search(String(query))
                        if let d = digest { responseText += "\n\n" + d }
                    }
                }
                conversation.append(.init(role: .assistant, content: responseText, timestamp: Date()))
                currentMessage = responseText
                isSpeaking = true
                await registry.speechOut.speak(responseText)
                isSpeaking = false
            } catch {
                break
            }
        }
        stop()
    }

    private func systemPrompt(from instructions: [UserInstruction]) -> String {
        let bullet = instructions.sorted { $0.order < $1.order }.map { "- \($0.title): \($0.content)" }.joined(separator: "\n")
        return "あなたは丁寧なモーニングアシスタントです。次の指示に基づき日本語で簡潔に話してください:\n\n\(bullet)"
    }
}

