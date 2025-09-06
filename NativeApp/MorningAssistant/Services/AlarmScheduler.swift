import Foundation
import UserNotifications

protocol AlarmScheduler {
    func requestAuthorization() async -> Bool
    func schedule(_ alarm: AlarmSettings) async throws
    func cancel(id: UUID) async throws
    func list() async -> [AlarmSettings]
}

struct LocalNotificationScheduler: AlarmScheduler {
    private let center = UNUserNotificationCenter.current()

    func requestAuthorization() async -> Bool {
        return await withCheckedContinuation { cont in
            center.requestAuthorization(options: [.alert, .sound, .badge]) { ok, _ in cont.resume(returning: ok) }
        }
    }

    func schedule(_ alarm: AlarmSettings) async throws {
        let content = UNMutableNotificationContent()
        content.title = alarm.label.isEmpty ? "アラーム" : alarm.label
        content.body = "朝のAIアシスタントを開始します"
        content.sound = .default

        let comps = alarm.time.split(separator: ":").compactMap { Int($0) }
        guard comps.count == 2 else { return }
        var date = DateComponents()
        date.hour = comps[0]
        date.minute = comps[1]
        let trigger = UNCalendarNotificationTrigger(dateMatching: date, repeats: true)
        let req = UNNotificationRequest(identifier: alarm.id.uuidString, content: content, trigger: trigger)
        try await center.add(req)
    }

    func cancel(id: UUID) async throws {
        center.removePendingNotificationRequests(withIdentifiers: [id.uuidString])
        center.removeDeliveredNotifications(withIdentifiers: [id.uuidString])
    }

    func list() async -> [AlarmSettings] {
        // Local notifications do not expose all fields; persist separately if needed.
        return []
    }
}

@available(iOS 18.0, *)
struct AlarmKitScheduler: AlarmScheduler {
    func requestAuthorization() async -> Bool { true /* implement with AlarmKit when integrating in Xcode */ }
    func schedule(_ alarm: AlarmSettings) async throws { /* integrate AlarmKit */ }
    func cancel(id: UUID) async throws { /* integrate AlarmKit */ }
    func list() async -> [AlarmSettings] { [] }
}

