import Capacitor
import AlarmKit
import SwiftUI

// カスタムメタデータ構造体
struct SimpleAlarmMetadata: AlarmMetadata {
    let title: String
    let subtitle: String
}

@objc(AlarmKitPlugin)
public class AlarmKitPlugin: CAPPlugin {
    private let alarmManager = AlarmManager.shared
    
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        Task {
            do {
                let authState = try await alarmManager.requestAuthorization()
                let authorized = (authState == .authorized)
                call.resolve(["authorized": authorized])
            } catch {
                call.reject("Authorization failed", error.localizedDescription)
            }
        }
    }
    
    @objc func scheduleAlarm(_ call: CAPPluginCall) {
        guard let idString = call.getString("id"),
              let title = call.getString("title"),
              let body = call.getString("body") else {
            call.reject("Missing required parameters")
            return
        }
        
        Task {
            do {
                let alarmId = UUID()
                let configuration = try createAlarmConfiguration(from: call, title: title, body: body)
                let _ = try await alarmManager.schedule(id: alarmId, configuration: configuration)
                
                // IDをローカルストレージにマッピング保存
                UserDefaults.standard.set(alarmId.uuidString, forKey: "alarm_\(idString)")
                
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to schedule alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func cancelAlarm(_ call: CAPPluginCall) {
        guard let idString = call.getString("id") else {
            call.reject("Missing alarm ID")
            return
        }
        
        Task {
            do {
                if let uuidString = UserDefaults.standard.string(forKey: "alarm_\(idString)"),
                   let alarmId = UUID(uuidString: uuidString) {
                    try alarmManager.cancel(id: alarmId)
                    UserDefaults.standard.removeObject(forKey: "alarm_\(idString)")
                }
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to cancel alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func pauseAlarm(_ call: CAPPluginCall) {
        guard let idString = call.getString("id") else {
            call.reject("Missing alarm ID")
            return
        }
        
        Task {
            do {
                if let uuidString = UserDefaults.standard.string(forKey: "alarm_\(idString)"),
                   let alarmId = UUID(uuidString: uuidString) {
                    try alarmManager.pause(id: alarmId)
                }
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to pause alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func resumeAlarm(_ call: CAPPluginCall) {
        guard let idString = call.getString("id") else {
            call.reject("Missing alarm ID")
            return
        }
        
        Task {
            do {
                if let uuidString = UserDefaults.standard.string(forKey: "alarm_\(idString)"),
                   let alarmId = UUID(uuidString: uuidString) {
                    try alarmManager.resume(id: alarmId)
                }
                call.resolve(["success": true])
            } catch {
                call.reject("Failed to resume alarm", error.localizedDescription)
            }
        }
    }
    
    @objc func getAlarms(_ call: CAPPluginCall) {
        Task {
            do {
                let alarms = try await alarmManager.alarms
                let alarmData = alarms.map { alarm in
                    [
                        "id": alarm.id.uuidString,
                        "countdownDuration": alarm.countdownDuration
                    ]
                }
                call.resolve(["alarms": alarmData])
            } catch {
                call.reject("Failed to get alarms", error.localizedDescription)
            }
        }
    }
    
    private func createAlarmConfiguration(from call: CAPPluginCall, title: String, body: String) throws -> AlarmManager.AlarmConfiguration<SimpleAlarmMetadata> {
        
        // スケジュール設定
        let schedule: Alarm.Schedule?
        if let dateString = call.getString("date") {
            let formatter = ISO8601DateFormatter()
            if let date = formatter.date(from: dateString) {
                schedule = .fixed(date)
            } else {
                throw AlarmError.invalidDate
            }
        } else if let time = call.getString("time"),
                  let weekdays = call.getArray("weekdays", Int.self) {
            // 週次繰り返しの実装を簡素化
            let timeComponents = time.split(separator: ":")
            let hour = Int(timeComponents[0]) ?? 0
            let minute = Int(timeComponents[1]) ?? 0
            
            // 単純化：毎日のアラームとして設定
            let today = Calendar.current.startOfDay(for: Date())
            let alarmTime = Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: today) ?? Date()
            schedule = .fixed(alarmTime)
        } else {
            schedule = nil
        }
        
        // メタデータ
        let metadata = SimpleAlarmMetadata(title: title, subtitle: body)
        
        // プレゼンテーション設定
        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: AlarmButton(text: "停止", textColor: .blue, systemImageName: "stop.circle"),
            secondaryButton: AlarmButton(text: "繰り返し", textColor: .blue, systemImageName: "repeat"),
            secondaryButtonBehavior: .countdown
        )
        
        let countdown = AlarmPresentation.Countdown(title: LocalizedStringResource(stringLiteral: "カウントダウン中"))
        let paused = AlarmPresentation.Paused(
            title: LocalizedStringResource(stringLiteral: "一時停止中"),
            resumeButton: AlarmButton(text: "再開", textColor: .blue, systemImageName: "play.circle")
        )
        
        let presentation = AlarmPresentation(alert: alert, countdown: countdown, paused: paused)
        
        // 属性
        let attributes = AlarmAttributes(
            presentation: presentation,
            metadata: metadata,
            tintColor: .blue
        )
        
        // タイマー設定（5分のカウントダウン例）
        let configuration = AlarmManager.AlarmConfiguration<SimpleAlarmMetadata>.timer(
            duration: 300, // 5分
            attributes: attributes,
            stopIntent: nil,
            secondaryIntent: nil,
            sound: .default
        )
        
        return configuration
    }
}

enum AlarmError: Error {
    case invalidDate
    case invalidSchedule
    case unauthorized
}