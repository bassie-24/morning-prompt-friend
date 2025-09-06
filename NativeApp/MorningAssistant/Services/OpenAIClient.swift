import Foundation

struct ChatMessage: Codable { let role: String; let content: String }
struct ChatRequest: Codable { let model: String; let messages: [ChatMessage]; let temperature: Double? }
struct ChatResponse: Codable { struct Choice: Codable { struct Message: Codable { let role: String; let content: String } let index: Int; let message: Message }; let choices: [Choice] }

final class OpenAIClient {
    private let keyProvider: () -> String
    private let session: URLSession
    private let endpoint = URL(string: "https://api.openai.com/v1/chat/completions")!
    private let model = "gpt-4o-mini"

    init(keyProvider: @escaping () -> String, session: URLSession = .shared) {
        self.keyProvider = keyProvider
        self.session = session
    }

    func chat(messages: [ChatMessage], temperature: Double = 0.7) async throws -> String {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(keyProvider())", forHTTPHeaderField: "Authorization")
        let body = ChatRequest(model: model, messages: messages, temperature: temperature)
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw NSError(domain: "OpenAI", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: "OpenAI request failed"])
        }
        let decoded = try JSONDecoder().decode(ChatResponse.self, from: data)
        return decoded.choices.first?.message.content ?? ""
    }
}

