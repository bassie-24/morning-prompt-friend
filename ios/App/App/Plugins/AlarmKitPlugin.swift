import Capacitor
import AlarmKit
import SwiftUI

@objc(AlarmKitPlugin)
public class AlarmKitPlugin: CAPPlugin {
    private let alarmManager = AlarmManager.shared
    
    override public func load() {
        Task {
            await setupAlarmManager()
        }
    }
    
    private func setupAlarmManager() async {
        // アラーム更新の監視
        for await update in alarmManager.alarmUpdates {
            notifyListeners("alarmUpdated", data: [
                "id": update.id,
                "state": update.state.description
            ])
        }
    }
    
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            do {
                let authorized = try await alarmManager.requestAuthorization()
                call.resolve(["authorized": authorized])
            } catch {
                call.reject("Authorization failed", error.localizedDescription)
            }
        }
    }
    
    @objc func scheduleAlarm(_ call: CAPPluginCall) {
        guard let id = call.getString("id"),
              let title = call.getString("title"),
              let body = call.getString("body") else {
            call.reject("Missing required parameters")
            return
        }
        
        Task {
            do {
                let configuration = try createAlarmConfiguration(from: call)
                try await alarmManager.schedule(id: id, configuration: configuration)
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to schedule alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func cancelAlarm(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing alarm ID")
            return
        }
        
        Task {
            do {
                try await alarmManager.cancel(id: id)
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to cancel alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func pauseAlarm(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing alarm ID")
            return
        }
        
        Task {
            do {
                try await alarmManager.pause(id: id)
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to pause alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func resumeAlarm(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing alarm ID")
            return
        }
        
        Task {
            do {
                try await alarmManager.resume(id: id)
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to resume alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func getAlarms(_ call: CAPPluginCall) {
        Task {
            let alarms = await alarmManager.alarms
            let alarmData = alarms.map { alarm in
                [
                    "id": alarm.id,
                    "state": alarm.state.description,
                    "schedule": describeSchedule(alarm.schedule)
                ]
            }
            call.resolve(["alarms": alarmData])
        }
    }
    
    private func createAlarmConfiguration(from call: CAPPluginCall) throws -> AlarmConfiguration {
        let title = call.getString("title") ?? "アラーム"
        let body = call.getString("body") ?? ""
        let tintColor = Color.blue // カスタマイズ可能
        
        // スケジュール設定
        let schedule: Alarm.Schedule
        if let dateString = call.getString("date") {
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: dateString) {
                schedule = .fixed(date)
            } else {
                throw AlarmError.invalidDate
            }
        } else if let time = call.getString("time"),
                  let weekdays = call.getArray("weekdays", Int.self) {
            // 週次繰り返し
            let weekdaySet = Set(weekdays.compactMap(Weekday.init))
            schedule = .relative(.init(time: RelativeTime(time), recurrence: .weekly(weekdaySet)))
        } else {
            throw AlarmError.invalidSchedule
        }
        
        // カウントダウン設定
        let countdownDuration: CountdownDuration?
        if let countdown = call.getInt("countdown") {
            countdownDuration = CountdownDuration(TimeInterval(countdown))
        } else {
            countdownDuration = nil
        }
        
        // アラーム設定
        let alarm = Alarm(schedule: schedule, countdown: countdownDuration)
        
        // UI属性
        let metadata = AlarmMetadata(
            title: title,
            subtitle: body
        )
        
        let attributes = AlarmAttributes(
            tintColor: tintColor,
            metadata: metadata
        )
        
        // プレゼンテーション設定
        let alertPresentation = AlarmPresentation.Alert(
            stopButton: .stop,
            secondaryButton: call.getBool("enableSnooze", false) ? .snooze : nil,
            secondaryButtonBehavior: .countdown
        )
        
        let presentation = AlarmPresentation(
            alert: alertPresentation,
            countdown: nil, // 必要に応じて設定
            paused: nil     // 必要に応じて設定
        )
        
        return AlarmConfiguration(
            alarm: alarm,
            attributes: attributes,
            presentation: presentation
        )
    }
    
    private func describeSchedule(_ schedule: Alarm.Schedule) -> [String: Any] {
        switch schedule {
        case .fixed(let date):
            return [
                "type": "fixed",
                "date": ISO8601DateFormatter().string(from: date)
            ]
        case .relative(let relative):
            var result: [String: Any] = [
                "type": "relative",
                "time": relative.time.description
            ]
            
            switch relative.recurrence {
            case .never:
                result["recurrence"] = "never"
            case .weekly(let weekdays):
                result["recurrence"] = "weekly"
                result["weekdays"] = weekdays.map { $0.rawValue }
            }
            
            return result
        }
    }
}

enum AlarmError: Error {
    case invalidDate
    case invalidSchedule
    case unauthorized
}

extension Weekday {
    init?(_ rawValue: Int) {
        switch rawValue {
        case 0: self = .sunday
        case 1: self = .monday
        case 2: self = .tuesday
        case 3: self = .wednesday
        case 4: self = .thursday
        case 5: self = .friday
        case 6: self = .saturday
        default: return nil
        }
    }
}

extension RelativeTime {
    init(_ timeString: String) {
        let components = timeString.split(separator: ":")
        let hour = Int(components[0]) ?? 0
        let minute = Int(components[1]) ?? 0
        self.init(hour: hour, minute: minute)
    }
}

extension Alarm.State {
    var description: String {
        switch self {
        case .scheduled: return "scheduled"
        case .alerting: return "alerting"
        case .paused: return "paused"
        }
    }
}