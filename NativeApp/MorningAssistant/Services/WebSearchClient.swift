import Foundation

protocol WebSearchClient {
    func search(_ query: String) async throws -> String
}

struct DefaultWebSearchClient: WebSearchClient {
    func search(_ query: String) async throws -> String {
        // Stub: return a placeholder string
        return "[検索結果ダイジェスト: \(query)]"
    }
}

