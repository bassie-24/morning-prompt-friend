import Foundation

// MARK: - User Instruction
struct UserInstruction: Identifiable, Codable {
    var id: String
    var title: String
    var content: String
    var order: Int
    var isActive: Bool
    var useWebSearch: Bool
}

// MARK: - Call Log
struct CallLog: Identifiable, Codable {
    let id: String
    let date: Date
    let duration: TimeInterval
    let instructions: [UserInstruction]
    let conversation: [ConversationEntry]
}

// MARK: - Conversation Entry
struct ConversationEntry: Identifiable, Codable {
    let id = UUID().uuidString
    let role: ConversationRole
    let content: String
    let timestamp: Date
}

enum ConversationRole: String, Codable {
    case user
    case assistant
}

// MARK: - Alarm Settings
struct AlarmSettings: Identifiable, Codable {
    var id: String
    var enabled: Bool
    var time: String // HH:mm format
    var days: [Int] // 0=Sunday, 1=Monday, etc.
    var label: String
    var sound: String
    var snooze: Bool
    var snoozeDuration: Int // minutes
}

// MARK: - Web Search Result
struct WebSearchResult: Codable {
    let query: String
    let results: [SearchItem]
    let timestamp: Date
}

struct SearchItem: Codable {
    let title: String
    let snippet: String
    let link: String
}