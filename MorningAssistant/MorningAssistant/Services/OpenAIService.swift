import Foundation

class OpenAIService: ObservableObject {
    static let shared = OpenAIService()
    
    private let baseURL = "https://api.openai.com/v1/chat/completions"
    private var apiKey: String = ""
    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 30
        return URLSession(configuration: config)
    }()
    
    @Published var conversationHistory: [ConversationEntry] = []
    
    private init() {}
    
    func setApiKey(_ key: String) {
        self.apiKey = key
    }
    
    func sendMessage(_ message: String, instructions: [UserInstruction]) async -> String? {
        guard !apiKey.isEmpty else {
            print("APIキーが設定されていません")
            return nil
        }
        
        // 会話履歴に追加
        let userEntry = ConversationEntry(
            role: .user,
            content: message,
            timestamp: Date()
        )
        conversationHistory.append(userEntry)
        
        // システムプロンプトの構築
        let systemPrompt = buildSystemPrompt(from: instructions)
        
        // リクエストボディの構築
        let requestBody = buildRequestBody(systemPrompt: systemPrompt, userMessage: message)
        
        // APIリクエスト
        guard let url = URL(string: baseURL) else { return nil }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
            
            // 簡易リトライ（指数バックオフ）
            let maxRetries = 2
            var attempt = 0
            var lastError: Error?
            while attempt <= maxRetries {
                do {
                    let (data, response) = try await session.data(for: request)
                    guard let httpResponse = response as? HTTPURLResponse else {
                        throw URLError(.badServerResponse)
                    }
                    guard (200...299).contains(httpResponse.statusCode) else {
                        // 429/5xx はリトライ対象
                        if httpResponse.statusCode == 429 || (500...599).contains(httpResponse.statusCode) {
                            throw URLError(.cannotConnectToHost)
                        } else {
                            print("API非成功ステータス: \(httpResponse.statusCode)")
                            return nil
                        }
                    }
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let choices = json["choices"] as? [[String: Any]],
                       let firstChoice = choices.first,
                       let message = firstChoice["message"] as? [String: Any],
                       let content = message["content"] as? String {
                        let assistantEntry = ConversationEntry(
                            role: .assistant,
                            content: content,
                            timestamp: Date()
                        )
                        conversationHistory.append(assistantEntry)
                        return content
                    } else {
                        print("応答のパースに失敗")
                        return nil
                    }
                } catch {
                    lastError = error
                    if attempt == maxRetries { break }
                    let backoff = UInt64(pow(2.0, Double(attempt))) * 500_000_000 // 0.5s,1s,2s
                    try? await Task.sleep(nanoseconds: backoff)
                    attempt += 1
                }
            }
            if let lastError = lastError { print("OpenAI APIエラー(最終): \(lastError)") }
        } catch {
            print("OpenAI APIエラー: \(error)")
        }
        
        return nil
    }
    
    private func buildSystemPrompt(from instructions: [UserInstruction]) -> String {
        var prompt = """
        あなたは朝の準備をサポートする優しいAIアシスタントです。
        ユーザーが朝の準備を効率的に行えるよう、以下の指示に従ってサポートしてください。
        
        """
        
        for (index, instruction) in instructions.enumerated() {
            prompt += "\n\(index + 1). \(instruction.title):\n\(instruction.content)\n"
        }
        
        prompt += """
        
        重要な注意事項：
        - 励ましと前向きな声かけを心がけてください
        - 簡潔で分かりやすい言葉を使ってください
        - ユーザーの進捗を褒めてください
        - 時間を意識した効率的なアドバイスをしてください
        """
        
        return prompt
    }
    
    private func buildRequestBody(systemPrompt: String, userMessage: String) -> [String: Any] {
        var messages: [[String: String]] = [
            ["role": "system", "content": systemPrompt]
        ]
        
        // 最近の会話履歴を含める（最大10件）
        let recentHistory = conversationHistory.suffix(10)
        for entry in recentHistory.dropLast() { // 最後のユーザーメッセージは除く
            messages.append([
                "role": entry.role.rawValue,
                "content": entry.content
            ])
        }
        
        // 現在のユーザーメッセージを追加
        messages.append(["role": "user", "content": userMessage])
        
        return [
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 500
        ]
    }
    
    func resetConversation() {
        conversationHistory.removeAll()
    }
}
