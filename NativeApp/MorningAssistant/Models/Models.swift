import Foundation

enum Role: String, Codable { case user, assistant }

struct UserInstruction: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var title: String
    var content: String
    var order: Int
    var isActive: Bool
    var useWebSearch: Bool
}

struct ConversationEntry: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var role: Role
    var content: String
    var timestamp: Date
}

struct CallLog: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var date: Date
    var duration: TimeInterval
    var instructions: [UserInstruction]
    var conversation: [ConversationEntry]
}

struct AlarmSettings: Codable, Identifiable, Equatable {
    var id: UUID = UUID()
    var enabled: Bool
    var time: String // HH:mm
    var days: [Int] // 0..6 (Sun..Sat)
    var label: String
    var snooze: Bool
    var snoozeDuration: Int // minutes
}

enum Plan: String, Codable, CaseIterable, Identifiable {
    case free, plus, premium
    var id: String { rawValue }

    var timeLimitSeconds: Int {
        switch self {
        case .free: return 5 * 60
        case .plus: return 15 * 60
        case .premium: return 30 * 60
        }
    }

    var canViewLogs: Bool { self != .free }
    var hasWebSearch: Bool { self == .premium }
}

