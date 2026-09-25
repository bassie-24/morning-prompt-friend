import Foundation
import UserNotifications

class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()
    
    @Published var hasPermission = false
    
    private override init() {
        super.init()
        checkPermission()
        setupNotificationDelegate()
    }
    
    private func setupNotificationDelegate() {
        UNUserNotificationCenter.current().delegate = self
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
        content.title = "⏰ 朝のAIアシスタント"
        content.body = alarm.label
        // より長い通知音を設定
        content.sound = UNNotificationSound(named: UNNotificationSoundName("alarm_custom.wav"))
        // デフォルト音にフォールバック
        if content.sound == nil {
            content.sound = .defaultCritical
        }
        content.categoryIdentifier = "MORNING_ALARM"
        content.userInfo = ["alarmId": alarm.id]
        // iOS 15以降で重要な通知として設定
        if #available(iOS 15.0, *) {
            content.interruptionLevel = .critical
        }
        
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
    
    // AlarmKitServiceへのアクセスを提供するプロパティ
    @available(iOS 26.0, *)
    private var alarmKitService: AlarmKitService {
        return AlarmKitService.shared
    }
    
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
            scheduleAlarmBasedOnOS(alarm: alarm)
        }
    }
    
    func updateAlarm(_ alarm: AlarmSettings) {
        if let index = alarms.firstIndex(where: { $0.id == alarm.id }) {
            // 既存のアラームをキャンセル
            cancelAlarmBasedOnOS(alarmId: alarm.id)
            
            // アラームを更新
            alarms[index] = alarm
            saveAlarms()
            
            // 有効な場合は新しいアラームをスケジュール
            if alarm.enabled {
                scheduleAlarmBasedOnOS(alarm: alarm)
            }
        }
    }
    
    func deleteAlarm(_ alarm: AlarmSettings) {
        cancelAlarmBasedOnOS(alarmId: alarm.id)
        alarms.removeAll { $0.id == alarm.id }
        saveAlarms()
    }
    
    func requestPermission() {
        if #available(iOS 26.0, *) {
            Task {
                do {
                    try await alarmKitService.requestAuthorization()
                    await MainActor.run {
                        self.hasPermission = alarmKitService.authorizationState == .authorized
                    }
                } catch {
                    print("AlarmKit認証エラー: \(error)")
                }
            }
        } else {
            notificationService.requestAuthorization()
        }
    }
    
    func checkPermission() {
        if #available(iOS 26.0, *) {
            hasPermission = alarmKitService.authorizationState == .authorized
        } else {
            notificationService.checkPermission()
            hasPermission = notificationService.hasPermission
        }
    }
    
    // MARK: - Private Methods
    
    private func scheduleAlarmBasedOnOS(alarm: AlarmSettings) {
        if #available(iOS 26.0, *) {
            // AlarmKitを使用（iOS 26以降）
            Task {
                do {
                    _ = try await alarmKitService.scheduleAlarm(settings: alarm)
                    print("AlarmKit: アラームをスケジュールしました - \(alarm.time)")
                } catch {
                    print("AlarmKit: アラームのスケジュールに失敗: \(error)")
                    print("フォールバック: 通知を使用します")
                    // フォールバック: 通知を使用
                    notificationService.scheduleAlarmNotification(alarm: alarm)
                }
            }
        } else {
            // iOS 26未満では通知を使用
            notificationService.scheduleAlarmNotification(alarm: alarm)
        }
    }
    
    private func cancelAlarmBasedOnOS(alarmId: String) {
        if #available(iOS 26.0, *) {
            // AlarmKitを使用（iOS 26以降）
            do {
                try alarmKitService.cancelAlarm(id: alarmId)
                print("AlarmKit: アラームをキャンセルしました - ID: \(alarmId)")
            } catch {
                print("AlarmKit: アラームのキャンセルに失敗: \(error)")
                print("フォールバック: 通知をキャンセルします")
                // フォールバック: 通知をキャンセル
                notificationService.cancelAlarmNotification(alarmId: alarmId)
            }
        } else {
            // iOS 26未満では通知をキャンセル
            notificationService.cancelAlarmNotification(alarmId: alarmId)
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension NotificationService: UNUserNotificationCenterDelegate {
    // フォアグラウンドでも通知を表示
    func userNotificationCenter(_ center: UNUserNotificationCenter, 
                               willPresent notification: UNNotification, 
                               withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // iOS 14以降の場合
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            // iOS 13以前
            completionHandler([.alert, .sound, .badge])
        }
    }
    
    // 通知タップ時の処理
    func userNotificationCenter(_ center: UNUserNotificationCenter, 
                               didReceive response: UNNotificationResponse, 
                               withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        
        if let alarmId = userInfo["alarmId"] as? String {
            print("アラーム通知がタップされました: \(alarmId)")
            // ここでアプリを起動してHomeViewを表示する処理を追加できます
        }
        
        completionHandler()
    }
}