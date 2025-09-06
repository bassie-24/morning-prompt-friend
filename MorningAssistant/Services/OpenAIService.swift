import Foundation

class OpenAIService: ObservableObject {
    static let shared = OpenAIService()
    
    private let baseURL = "https://api.openai.com/v1/chat/completions"
    private var apiKey: String = ""
    
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
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                print("APIエラー: \(response)")
                return nil
            }
            
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let choices = json["choices"] as? [[String: Any]],
               let firstChoice = choices.first,
               let message = firstChoice["message"] as? [String: Any],
               let content = message["content"] as? String {
                
                // AIの応答を会話履歴に追加
                let assistantEntry = ConversationEntry(
                    role: .assistant,
                    content: content,
                    timestamp: Date()
                )
                conversationHistory.append(assistantEntry)
                
                return content
            }
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
            "model": "gpt-3.5-turbo",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 500
        ]
    }
    
    func resetConversation() {
        conversationHistory.removeAll()
    }
}