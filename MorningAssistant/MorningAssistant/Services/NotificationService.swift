import Foundation
import UserNotifications

class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()
    
    @Published var hasPermission = false
    
    private override init() {
        super.init()
        checkPermission()
    }
    
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                self.hasPermission = granted
            }
            
            if let error = error {
                print("通知許可エラー: \(error)")
            }
        }
    }
    
    func checkPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.hasPermission = settings.authorizationStatus == .authorized
            }
        }
    }
    
    func scheduleAlarmNotification(alarm: AlarmSettings) {
        let content = UNMutableNotificationContent()
        content.title = "朝のAIアシスタント"
        content.body = alarm.label
        content.sound = .default
        content.categoryIdentifier = "MORNING_ALARM"
        content.userInfo = ["alarmId": alarm.id]
        
        // 時刻から DateComponents を作成
        let timeComponents = alarm.time.split(separator: ":").compactMap { Int($0) }
        guard timeComponents.count == 2 else { return }
        
        if alarm.days.isEmpty {
            // 1回のみの通知
            var dateComponents = DateComponents()
            dateComponents.hour = timeComponents[0]
            dateComponents.minute = timeComponents[1]
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
            let request = UNNotificationRequest(identifier: alarm.id, content: content, trigger: trigger)
            
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("通知スケジュールエラー: \(error)")
                }
            }
        } else {
            // 曜日ごとの繰り返し通知
            for day in alarm.days {
                var dateComponents = DateComponents()
                dateComponents.hour = timeComponents[0]
                dateComponents.minute = timeComponents[1]
                dateComponents.weekday = day + 1 // 1=日曜日, 2=月曜日...
                
                let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
                let request = UNNotificationRequest(
                    identifier: "\(alarm.id)_\(day)",
                    content: content,
                    trigger: trigger
                )
                
                UNUserNotificationCenter.current().add(request) { error in
                    if let error = error {
                        print("通知スケジュールエラー: \(error)")
                    }
                }
            }
        }
        
        // スヌーズ設定
        if alarm.snooze {
            scheduleSnoozeNotification(for: alarm)
        }
    }
    
    func cancelAlarmNotification(alarmId: String) {
        var identifiers = [alarmId]
        
        // 曜日ごとの通知IDも追加
        for day in 0...6 {
            identifiers.append("\(alarmId)_\(day)")
        }
        
        // スヌーズ通知IDも追加
        identifiers.append("\(alarmId)_snooze")
        
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: identifiers)
    }
    
    private func scheduleSnoozeNotification(for alarm: AlarmSettings) {
        let content = UNMutableNotificationContent()
        content.title = "スヌーズ - 朝のAIアシスタント"
        content.body = "\(alarm.label) (スヌーズ)"
        content.sound = .default
        content.categoryIdentifier = "MORNING_ALARM_SNOOZE"
        content.userInfo = ["alarmId": alarm.id, "isSnooze": true]
        
        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: TimeInterval(alarm.snoozeDuration * 60),
            repeats: false
        )
        
        let request = UNNotificationRequest(
            identifier: "\(alarm.id)_snooze",
            content: content,
            trigger: trigger
        )
        
        // スヌーズ通知は実際のアラームが鳴った後に設定される
    }
}

// MARK: - AlarmManager
class AlarmManager: ObservableObject {
    static let shared = AlarmManager()
    
    @Published var alarms: [AlarmSettings] = []
    @Published var hasPermission = false
    
    private let alarmsKey = "morning_assistant_alarms"
    private let notificationService = NotificationService.shared
    
    private init() {
        loadAlarms()
        checkPermission()
    }
    
    func loadAlarms() {
        if let data = UserDefaults.standard.data(forKey: alarmsKey),
           let decoded = try? JSONDecoder().decode([AlarmSettings].self, from: data) {
            alarms = decoded
        }
    }
    
    func saveAlarms() {
        if let encoded = try? JSONEncoder().encode(alarms) {
            UserDefaults.standard.set(encoded, forKey: alarmsKey)
        }
    }
    
    func addAlarm(_ alarm: AlarmSettings) {
        alarms.append(alarm)
        saveAlarms()
        
        if alarm.enabled {
            notificationService.scheduleAlarmNotification(alarm: alarm)
        }
    }
    
    func updateAlarm(_ alarm: AlarmSettings) {
        if let index = alarms.firstIndex(where: { $0.id == alarm.id }) {
            // 既存の通知をキャンセル
            notificationService.cancelAlarmNotification(alarmId: alarm.id)
            
            // アラームを更新
            alarms[index] = alarm
            saveAlarms()
            
            // 有効な場合は新しい通知をスケジュール
            if alarm.enabled {
                notificationService.scheduleAlarmNotification(alarm: alarm)
            }
        }
    }
    
    func deleteAlarm(_ alarm: AlarmSettings) {
        notificationService.cancelAlarmNotification(alarmId: alarm.id)
        alarms.removeAll { $0.id == alarm.id }
        saveAlarms()
    }
    
    func requestPermission() {
        notificationService.requestAuthorization()
    }
    
    func checkPermission() {
        notificationService.checkPermission()
        hasPermission = notificationService.hasPermission
    }
}