import Foundation
import AlarmKit
import ActivityKit
import SwiftUI

// MARK: - AlarmMetadata Implementation
// AlarmKitのAlarmMetadataプロトコルに準拠した実装
struct MorningAlarmMetadata: AlarmMetadata {
    let alarmId: String
    let label: String
    let isSnooze: Bool
}

// MARK: - AlarmAttributes Implementation
// ActivityAttributesに準拠したAlarmAttributes
@available(iOS 26.0, *)
struct MorningAlarmAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        let mode: AlarmMode
        let remainingTime: TimeInterval?
    }
    
    enum AlarmMode: String, Codable {
        case scheduled = "scheduled"
        case alerting = "alerting"
        case countdown = "countdown"
        case paused = "paused"
    }
    
    let alarmId: String
    let label: String
    let tintColor: String
}

// MARK: - AlarmKitService
// AlarmKit を使用したアラームサービス
@available(iOS 26.0, *)
class AlarmKitService: ObservableObject {
    static let shared = AlarmKitService()
    
    @Published var authorizationState: AlarmKit.AlarmManager.AuthorizationState = .notDetermined
    @Published var activeAlarms: [Alarm] = []
    
    private let alarmManager = AlarmKit.AlarmManager.shared
    private var alarmUpdateTask: Task<Void, Never>?
    private var authorizationUpdateTask: Task<Void, Never>?
    
    private init() {
        checkAuthorizationState()
        observeAlarmUpdates()
        observeAuthorizationUpdates()
    }
    
    deinit {
        alarmUpdateTask?.cancel()
        authorizationUpdateTask?.cancel()
    }
    
    // MARK: - Authorization
    
    func requestAuthorization() async throws {
        authorizationState = try await alarmManager.requestAuthorization()
        print("AlarmKit認証状態: \(authorizationState)")
    }
    
    private func checkAuthorizationState() {
        authorizationState = alarmManager.authorizationState
    }
    
    private func observeAuthorizationUpdates() {
        authorizationUpdateTask = Task {
            for await state in alarmManager.authorizationUpdates {
                await MainActor.run {
                    self.authorizationState = state
                    print("AlarmKit認証状態更新: \(state)")
                }
            }
        }
    }
    
    // MARK: - Alarm Updates Observation
    
    private func observeAlarmUpdates() {
        alarmUpdateTask = Task {
            for await alarms in alarmManager.alarmUpdates {
                await MainActor.run {
                    self.activeAlarms = alarms
                    print("アラーム更新: \(alarms.count)個のアラーム")
                }
            }
        }
    }
    
    // MARK: - Schedule Alarm
    
    func scheduleAlarm(settings: AlarmSettings) async throws -> Alarm {
        // メタデータの作成
        let metadata = MorningAlarmMetadata(
            alarmId: settings.id,
            label: settings.label,
            isSnooze: settings.snooze
        )
        
        // AlarmButtonの作成
        let stopButton = AlarmButton(
            text: "停止",
            textColor: Color.white,
            systemImageName: "stop.circle"
        )
        
        let snoozeButton = settings.snooze ? AlarmButton(
            text: "スヌーズ",
            textColor: Color.blue,
            systemImageName: "moon.zzz"
        ) : nil
        
        // AlarmPresentationの作成
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: settings.label),
            stopButton: stopButton,
            secondaryButton: snoozeButton,
            secondaryButtonBehavior: settings.snooze ? .countdown : nil
        )
        
        let countdown: AlarmPresentation.Countdown?
        if settings.snooze {
            countdown = AlarmPresentation.Countdown(
                title: LocalizedStringResource(stringLiteral: "スヌーズ中...")
            )
        } else {
            countdown = nil
        }
        
        let presentation = AlarmPresentation(
            alert: alert,
            countdown: countdown,
            paused: nil
        )
        
        // AlarmAttributesの作成
        let attributes = AlarmAttributes(
            presentation: presentation,
            metadata: metadata,
            tintColor: Color.blue
        )
        
        // Scheduleの作成
        let schedule = try createSchedule(for: settings)
        
        // CountdownDurationの作成（スヌーズ用）
        let countdownDuration: Alarm.CountdownDuration?
        if settings.snooze {
            countdownDuration = Alarm.CountdownDuration(
                preAlert: nil,
                postAlert: TimeInterval(settings.snoozeDuration * 60)
            )
        } else {
            countdownDuration = nil
        }
        
        // AlarmConfigurationの作成
        let configuration: AlarmKit.AlarmManager.AlarmConfiguration<MorningAlarmMetadata>
        if let schedule = schedule {
            // スケジュールアラーム
            configuration = .alarm(
                schedule: schedule,
                attributes: attributes,
                stopIntent: nil,
                secondaryIntent: nil,
                sound: .default
            )
        } else {
            // 即座に鳴るタイマー（フォールバック）
            configuration = .timer(
                duration: 1,
                attributes: attributes,
                stopIntent: nil,
                secondaryIntent: nil,
                sound: .default
            )
        }
        
        // アラームのスケジュール
        let alarmId = Alarm.ID(uuidString: settings.id) ?? Alarm.ID()
        let alarm = try await alarmManager.schedule(
            id: alarmId,
            configuration: configuration
        )
        
        print("AlarmKit: アラームをスケジュール - ID: \(settings.id), 時刻: \(settings.time)")
        
        return alarm
    }
    
    // MARK: - Cancel Alarm
    
    func cancelAlarm(id: String) throws {
        guard let alarmId = Alarm.ID(uuidString: id) else {
            print("AlarmKit: 無効なアラームID: \(id)")
            return
        }
        try alarmManager.cancel(id: alarmId)
        print("AlarmKit: アラームをキャンセル - ID: \(id)")
    }
    
    // MARK: - Pause/Resume Alarm
    
    func pauseAlarm(id: String) throws {
        guard let alarmId = Alarm.ID(uuidString: id) else { return }
        try alarmManager.pause(id: alarmId)
        print("AlarmKit: アラームを一時停止 - ID: \(id)")
    }
    
    func resumeAlarm(id: String) throws {
        guard let alarmId = Alarm.ID(uuidString: id) else { return }
        try alarmManager.resume(id: alarmId)
        print("AlarmKit: アラームを再開 - ID: \(id)")
    }
    
    // MARK: - Stop Alarm
    
    func stopAlarm(id: String) throws {
        guard let alarmId = Alarm.ID(uuidString: id) else { return }
        try alarmManager.stop(id: alarmId)
        print("AlarmKit: アラームを停止 - ID: \(id)")
    }
    
    // MARK: - Countdown (Timer)
    
    func countdownAlarm(id: String) throws {
        guard let alarmId = Alarm.ID(uuidString: id) else { return }
        try alarmManager.countdown(id: alarmId)
        print("AlarmKit: カウントダウン開始 - ID: \(id)")
    }
    
    // MARK: - Helper Methods
    
    private func createSchedule(for settings: AlarmSettings) throws -> Alarm.Schedule? {
        // 時刻をDateComponentsに変換
        let timeComponents = settings.time.split(separator: ":").compactMap { Int($0) }
        guard timeComponents.count == 2 else {
            print("AlarmKit: 無効な時刻形式: \(settings.time)")
            return nil
        }
        
        let hour = timeComponents[0]
        let minute = timeComponents[1]
        
        // DateComponentsを使用して時刻を作成
        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute
        
        // Alarm.Schedule.Relative.Timeの作成
        let time = Alarm.Schedule.Relative.Time(hour: hour, minute: minute)
        
        // スケジュールの作成
        if settings.days.isEmpty {
            // 1回のみのアラーム
            let relative = Alarm.Schedule.Relative(
                time: time,
                repeats: .never
            )
            return .relative(relative)
        } else {
            // 繰り返しアラーム
            // 曜日の変換 (0=日曜を Locale.Weekday に変換)
            let weekdays: [Locale.Weekday] = settings.days.compactMap { day in
                switch day {
                case 0: return .sunday
                case 1: return .monday
                case 2: return .tuesday
                case 3: return .wednesday
                case 4: return .thursday
                case 5: return .friday
                case 6: return .saturday
                default: return nil
                }
            }
            
            let relative = Alarm.Schedule.Relative(
                time: time,
                repeats: .weekly(weekdays)
            )
            return .relative(relative)
        }
    }
    
    // MARK: - Timer Support
    
    func scheduleTimer(duration: TimeInterval, label: String) async throws -> Alarm {
        // タイマー用のメタデータ
        let metadata = MorningAlarmMetadata(
            alarmId: UUID().uuidString,
            label: label,
            isSnooze: false
        )
        
        // タイマー用のボタン
        let stopButton = AlarmButton(
            text: "停止",
            textColor: Color.red,
            systemImageName: "stop.circle"
        )
        
        let pauseButton = AlarmButton(
            text: "一時停止",
            textColor: Color.orange,
            systemImageName: "pause.circle"
        )
        
        let resumeButton = AlarmButton(
            text: "再開",
            textColor: Color.green,
            systemImageName: "play.circle"
        )
        
        // タイマー用のPresentation
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: "タイマー終了"),
            stopButton: stopButton,
            secondaryButton: nil,
            secondaryButtonBehavior: nil
        )
        
        let countdown = AlarmPresentation.Countdown(
            title: LocalizedStringResource(stringLiteral: label),
            pauseButton: pauseButton
        )
        
        let paused = AlarmPresentation.Paused(
            title: LocalizedStringResource(stringLiteral: "一時停止中"),
            resumeButton: resumeButton
        )
        
        let presentation = AlarmPresentation(
            alert: alert,
            countdown: countdown,
            paused: paused
        )
        
        // タイマー用のAttributes
        let attributes = AlarmAttributes(
            presentation: presentation,
            metadata: metadata,
            tintColor: Color.orange
        )
        
        // タイマー設定
        let configuration = AlarmKit.AlarmManager.AlarmConfiguration<MorningAlarmMetadata>.timer(
            duration: duration,
            attributes: attributes,
            stopIntent: nil,
            secondaryIntent: nil,
            sound: .default
        )
        
        let timerId = Alarm.ID()
        let alarm = try await alarmManager.schedule(
            id: timerId,
            configuration: configuration
        )
        
        print("AlarmKit: タイマーを開始 - 時間: \(duration)秒")
        
        return alarm
    }
}

// MARK: - Error Types
enum AlarmKitError: Error {
    case invalidTime
    case invalidSchedule
    case authorizationDenied
}