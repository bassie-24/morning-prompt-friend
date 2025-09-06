import SwiftUI
import UserNotifications

struct AlarmView: View {
    @StateObject private var alarmManager = AlarmManager.shared
    @State private var showAddAlarm = false
    @State private var editingAlarm: AlarmSettings?
    
    var body: some View {
        NavigationView {
            List {
                // アラーム権限の状態
                Section {
                    HStack {
                        Image(systemName: "bell.badge")
                            .foregroundColor(alarmManager.hasPermission ? .green : .orange)
                        
                        VStack(alignment: .leading) {
                            Text(alarmManager.hasPermission ? "通知許可済み" : "通知許可が必要です")
                                .font(.headline)
                            
                            if !alarmManager.hasPermission {
                                Button("権限を要求") {
                                    alarmManager.requestPermission()
                                }
                                .font(.caption)
                                .buttonStyle(.bordered)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 4)
                }
                
                // アラーム一覧
                Section(header: Text("アラーム")) {
                    if alarmManager.alarms.isEmpty {
                        HStack {
                            Spacer()
                            VStack(spacing: 12) {
                                Image(systemName: "alarm")
                                    .font(.system(size: 40))
                                    .foregroundColor(.gray)
                                Text("アラームが設定されていません")
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 20)
                            Spacer()
                        }
                    } else {
                        ForEach(alarmManager.alarms) { alarm in
                            AlarmRow(alarm: alarm, onEdit: {
                                editingAlarm = alarm
                            })
                        }
                        .onDelete(perform: deleteAlarm)
                    }
                }
                
                // 使い方
                Section(header: Text("アラーム機能について")) {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("指定時刻に通知を送信", systemImage: "bell")
                            .font(.caption)
                        Label("タップで朝のAIアシスタントを起動", systemImage: "hand.tap")
                            .font(.caption)
                        Label("曜日ごとの繰り返し設定可能", systemImage: "calendar")
                            .font(.caption)
                        Label("スヌーズ機能対応", systemImage: "clock")
                            .font(.caption)
                    }
                    .padding(.vertical, 4)
                }
            }
            .navigationTitle("アラーム")
            .navigationBarItems(trailing: Button(action: { showAddAlarm = true }) {
                Image(systemName: "plus")
            })
            .sheet(isPresented: $showAddAlarm) {
                AlarmEditView(alarm: nil, onSave: { alarm in
                    alarmManager.addAlarm(alarm)
                    showAddAlarm = false
                })
            }
            .sheet(item: $editingAlarm) { alarm in
                AlarmEditView(alarm: alarm, onSave: { updatedAlarm in
                    alarmManager.updateAlarm(updatedAlarm)
                    editingAlarm = nil
                })
            }
        }
    }
    
    private func deleteAlarm(at offsets: IndexSet) {
        for index in offsets {
            alarmManager.deleteAlarm(alarmManager.alarms[index])
        }
    }
}

struct AlarmRow: View {
    let alarm: AlarmSettings
    let onEdit: () -> Void
    @StateObject private var alarmManager = AlarmManager.shared
    @State private var isEnabled: Bool
    
    init(alarm: AlarmSettings, onEdit: @escaping () -> Void) {
        self.alarm = alarm
        self.onEdit = onEdit
        self._isEnabled = State(initialValue: alarm.enabled)
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(alarm.time)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                HStack(spacing: 8) {
                    Text(alarm.label)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("•")
                        .foregroundColor(.secondary)
                    
                    Text(formatDays(alarm.days))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if alarm.snooze {
                        Text("•")
                            .foregroundColor(.secondary)
                        Image(systemName: "bell.slash")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            Toggle("", isOn: $isEnabled)
                .labelsHidden()
                .onChange(of: isEnabled) { newValue in
                    var updated = alarm
                    updated.enabled = newValue
                    alarmManager.updateAlarm(updated)
                }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onEdit()
        }
    }
    
    private func formatDays(_ days: [Int]) -> String {
        let dayNames = ["日", "月", "火", "水", "木", "金", "土"]
        
        if days.isEmpty {
            return "1回のみ"
        } else if days.count == 7 {
            return "毎日"
        } else if days == [1, 2, 3, 4, 5] {
            return "平日"
        } else if days == [0, 6] {
            return "週末"
        } else {
            return days.map { dayNames[$0] }.joined(separator: ", ")
        }
    }
}

struct AlarmEditView: View {
    let alarm: AlarmSettings?
    let onSave: (AlarmSettings) -> Void
    
    @State private var time: String
    @State private var label: String
    @State private var selectedDays: Set<Int>
    @State private var snooze: Bool
    @State private var snoozeDuration: Int
    @Environment(\.dismiss) var dismiss
    
    init(alarm: AlarmSettings?, onSave: @escaping (AlarmSettings) -> Void) {
        self.alarm = alarm
        self.onSave = onSave
        
        if let alarm = alarm {
            self._time = State(initialValue: alarm.time)
            self._label = State(initialValue: alarm.label)
            self._selectedDays = State(initialValue: Set(alarm.days))
            self._snooze = State(initialValue: alarm.snooze)
            self._snoozeDuration = State(initialValue: alarm.snoozeDuration)
        } else {
            self._time = State(initialValue: "07:00")
            self._label = State(initialValue: "朝の準備")
            self._selectedDays = State(initialValue: Set([1, 2, 3, 4, 5])) // 平日
            self._snooze = State(initialValue: true)
            self._snoozeDuration = State(initialValue: 5)
        }
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("基本設定")) {
                    // 時刻選択
                    DatePicker("時刻", selection: Binding(
                        get: { timeToDate(time) },
                        set: { time = dateToTime($0) }
                    ), displayedComponents: .hourAndMinute)
                    
                    // ラベル
                    TextField("ラベル", text: $label)
                }
                
                Section(header: Text("繰り返し")) {
                    HStack {
                        ForEach(0..<7) { day in
                            DayButton(
                                day: day,
                                isSelected: selectedDays.contains(day),
                                action: {
                                    if selectedDays.contains(day) {
                                        selectedDays.remove(day)
                                    } else {
                                        selectedDays.insert(day)
                                    }
                                }
                            )
                        }
                    }
                }
                
                Section(header: Text("スヌーズ")) {
                    Toggle("スヌーズを有効にする", isOn: $snooze)
                    
                    if snooze {
                        Picker("スヌーズ間隔", selection: $snoozeDuration) {
                            Text("5分").tag(5)
                            Text("10分").tag(10)
                            Text("15分").tag(15)
                            Text("30分").tag(30)
                        }
                    }
                }
            }
            .navigationTitle(alarm == nil ? "新しいアラーム" : "アラームを編集")
            .navigationBarItems(
                leading: Button("キャンセル") { dismiss() },
                trailing: Button("保存") {
                    let newAlarm = AlarmSettings(
                        id: alarm?.id ?? UUID().uuidString,
                        enabled: alarm?.enabled ?? true,
                        time: time,
                        days: Array(selectedDays).sorted(),
                        label: label,
                        sound: alarm?.sound ?? "default",
                        snooze: snooze,
                        snoozeDuration: snoozeDuration
                    )
                    onSave(newAlarm)
                    dismiss()
                }
            )
        }
    }
    
    private func timeToDate(_ time: String) -> Date {
        let components = time.split(separator: ":").compactMap { Int($0) }
        var dateComponents = DateComponents()
        dateComponents.hour = components.first ?? 0
        dateComponents.minute = components.last ?? 0
        return Calendar.current.date(from: dateComponents) ?? Date()
    }
    
    private func dateToTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

struct DayButton: View {
    let day: Int
    let isSelected: Bool
    let action: () -> Void
    
    private let dayNames = ["日", "月", "火", "水", "木", "金", "土"]
    
    var body: some View {
        Button(action: action) {
            Text(dayNames[day])
                .font(.caption)
                .fontWeight(.semibold)
                .frame(width: 35, height: 35)
                .background(isSelected ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .primary)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }
}