import SwiftUI
import AlarmKit

struct AlarmSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AlarmSettingsViewModel()
    @State private var showingAddAlarm = false
    @State private var editingAlarm: AlarmConfiguration?
    
    var body: some View {
        NavigationView {
            Group {
                if viewModel.alarms.isEmpty {
                    ContentUnavailableView(
                        "アラームなし",
                        systemImage: "alarm",
                        description: Text("アラームを追加して、指定時刻に朝のAIアシスタントを起動しましょう。")
                    )
                } else {
                    List {
                        Section {
                            ForEach(viewModel.alarms) { alarm in
                                AlarmRow(alarm: alarm) {
                                    viewModel.toggleAlarm(alarm.id)
                                } onEdit: {
                                    editingAlarm = alarm
                                } onDelete: {
                                    viewModel.deleteAlarm(alarm.id)
                                }
                            }
                        } header: {
                            Text("アラーム一覧")
                        } footer: {
                            if viewModel.isAlarmKitAvailable {
                                Text("AlarmKit使用中 - フォーカスモードやサイレントモードでもアラームが鳴ります")
                            } else {
                                Text("標準通知使用中 - アプリの通知許可が必要です")
                            }
                        }
                    }
                }
            }
            .navigationTitle("アラーム設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingAddAlarm = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddAlarm) {
                AlarmEditView(alarm: nil, isAlarmKitAvailable: viewModel.isAlarmKitAvailable) { newAlarm in
                    Task {
                        await viewModel.addAlarm(newAlarm)
                    }
                }
            }
            .sheet(item: $editingAlarm) { alarm in
                AlarmEditView(alarm: alarm, isAlarmKitAvailable: viewModel.isAlarmKitAvailable) { updatedAlarm in
                    Task {
                        await viewModel.updateAlarm(updatedAlarm)
                    }
                }
            }
            .alert("アラーム権限が必要です", isPresented: $viewModel.showPermissionAlert) {
                Button("設定を開く") {
                    viewModel.openSettings()
                }
                Button("キャンセル", role: .cancel) {}
            } message: {
                Text("アラーム機能を使用するには、設定からアラームの権限を許可してください。")
            }
        }
        .onAppear {
            Task {
                await viewModel.initialize()
            }
        }
    }
}

struct AlarmRow: View {
    let alarm: AlarmConfiguration
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(alarm.timeString)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text(alarm.label)
                    .font(.headline)
                
                Text(formatDays(alarm.weekdays))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Toggle("", isOn: .constant(alarm.isEnabled))
                .onChange(of: alarm.isEnabled) { _ in
                    onToggle()
                }
        }
        .opacity(alarm.isEnabled ? 1.0 : 0.6)
        .swipeActions(edge: .trailing) {
            Button("削除", role: .destructive) {
                onDelete()
            }
            
            Button("編集") {
                onEdit()
            }
            .tint(.blue)
        }
    }
    
    private func formatDays(_ weekdays: Set<Int>) -> String {
        if weekdays.isEmpty {
            return "1回のみ"
        }
        
        if weekdays.count == 7 {
            return "毎日"
        }
        
        let weekdayNames = ["日", "月", "火", "水", "木", "金", "土"]
        let sortedDays = weekdays.sorted()
        return sortedDays.map { weekdayNames[$0] }.joined(separator: ", ")
    }
}

struct AlarmEditView: View {
    let alarm: AlarmConfiguration?
    let isAlarmKitAvailable: Bool
    let onSave: (AlarmConfiguration) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var label: String
    @State private var time: Date
    @State private var selectedWeekdays: Set<Int>
    @State private var isEnabled: Bool
    
    init(alarm: AlarmConfiguration?, isAlarmKitAvailable: Bool, onSave: @escaping (AlarmConfiguration) -> Void) {
        self.alarm = alarm
        self.isAlarmKitAvailable = isAlarmKitAvailable
        self.onSave = onSave
        
        _label = State(initialValue: alarm?.label ?? "朝の準備")
        _time = State(initialValue: alarm?.time ?? Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date()) ?? Date())
        _selectedWeekdays = State(initialValue: alarm?.weekdays ?? Set([1, 2, 3, 4, 5])) // 平日
        _isEnabled = State(initialValue: alarm?.isEnabled ?? true)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("アラーム設定") {
                    TextField("ラベル", text: $label)
                    
                    DatePicker("時刻", selection: $time, displayedComponents: .hourAndMinute)
                        .datePickerStyle(.wheel)
                    
                    Toggle("有効", isOn: $isEnabled)
                }
                
                Section("繰り返し") {
                    VStack(alignment: .leading) {
                        Text("曜日選択")
                            .font(.headline)
                        
                        HStack {
                            ForEach(0..<7) { weekday in
                                let weekdayName = ["日", "月", "火", "水", "木", "金", "土"][weekday]
                                
                                Button {
                                    if selectedWeekdays.contains(weekday) {
                                        selectedWeekdays.remove(weekday)
                                    } else {
                                        selectedWeekdays.insert(weekday)
                                    }
                                } label: {
                                    Text(weekdayName)
                                        .font(.caption)
                                        .frame(width: 30, height: 30)
                                        .foregroundColor(selectedWeekdays.contains(weekday) ? .white : .primary)
                                        .background(selectedWeekdays.contains(weekday) ? Color.blue : Color.gray.opacity(0.3))
                                        .clipShape(Circle())
                                }
                            }
                        }
                    }
                }
                
                Section {
                    VStack(alignment: .leading) {
                        HStack {
                            Image(systemName: isAlarmKitAvailable ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                .foregroundColor(isAlarmKitAvailable ? .green : .orange)
                            
                            Text(isAlarmKitAvailable ? "AlarmKit利用可能" : "標準通知使用")
                                .font(.headline)
                        }
                        
                        Text(isAlarmKitAvailable ?
                             "システムレベルのアラーム機能を使用します。フォーカスモードやサイレントモードでもアラームが鳴ります。" :
                             "標準的な通知機能を使用します。アプリの通知許可が必要です。")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle(alarm == nil ? "新しいアラーム" : "アラームを編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("保存") {
                        let configuration = AlarmConfiguration(
                            id: alarm?.id ?? UUID(),
                            label: label,
                            time: time,
                            weekdays: selectedWeekdays,
                            isEnabled: isEnabled
                        )
                        onSave(configuration)
                        dismiss()
                    }
                    .disabled(label.isEmpty)
                }
            }
        }
    }
}

// MARK: - ViewModel
@MainActor
class AlarmSettingsViewModel: ObservableObject {
    @Published var alarms: [AlarmConfiguration] = []
    @Published var isAlarmKitAvailable = false
    @Published var showPermissionAlert = false
    
    private let alarmManager = AlarmManager.shared
    
    func initialize() async {
        await checkAlarmKitAvailability()
        loadAlarms()
    }
    
    private func checkAlarmKitAvailability() async {
        // Check if AlarmKit is available (iOS 26.0+)
        if #available(iOS 26.0, *) {
            do {
                let authStatus = alarmManager.authorizationState
                if authStatus == .authorized {
                    isAlarmKitAvailable = true
                } else if authStatus == .notDetermined {
                    let newStatus = try await alarmManager.requestAuthorization()
                    isAlarmKitAvailable = (newStatus == .authorized)
                } else {
                    showPermissionAlert = true
                }
            } catch {
                print("AlarmKit authorization error: \(error)")
                isAlarmKitAvailable = false
            }
        } else {
            isAlarmKitAvailable = false
        }
    }
    
    private func loadAlarms() {
        if let data = UserDefaults.standard.data(forKey: "alarm_configurations"),
           let loadedAlarms = try? JSONDecoder().decode([AlarmConfiguration].self, from: data) {
            alarms = loadedAlarms.sorted { $0.timeString < $1.timeString }
        }
    }
    
    func addAlarm(_ alarm: AlarmConfiguration) async {
        alarms.append(alarm)
        saveAlarms()
        
        if alarm.isEnabled {
            await scheduleAlarm(alarm)
        }
    }
    
    func updateAlarm(_ alarm: AlarmConfiguration) async {
        if let index = alarms.firstIndex(where: { $0.id == alarm.id }) {
            // Cancel existing alarm
            await cancelAlarm(alarms[index].id)
            
            // Update and reschedule if enabled
            alarms[index] = alarm
            saveAlarms()
            
            if alarm.isEnabled {
                await scheduleAlarm(alarm)
            }
        }
    }
    
    func toggleAlarm(_ id: UUID) {
        if let index = alarms.firstIndex(where: { $0.id == id }) {
            alarms[index].isEnabled.toggle()
            saveAlarms()
            
            Task {
                if alarms[index].isEnabled {
                    await scheduleAlarm(alarms[index])
                } else {
                    await cancelAlarm(id)
                }
            }
        }
    }
    
    func deleteAlarm(_ id: UUID) {
        Task {
            await cancelAlarm(id)
        }
        
        alarms.removeAll { $0.id == id }
        saveAlarms()
    }
    
    private func scheduleAlarm(_ alarm: AlarmConfiguration) async {
        if isAlarmKitAvailable {
            await scheduleWithAlarmKit(alarm)
        } else {
            scheduleWithLocalNotification(alarm)
        }
    }
    
    @available(iOS 26.0, *)
    private func scheduleWithAlarmKit(_ alarm: AlarmConfiguration) async {
        let attributes = AlarmAttributes(
            presentation: AlarmPresentation(
                alert: AlarmPresentation.Alert(
                    title: "朝のAIアシスタント",
                    stopButton: .init(text: "停止", textColor: .white, systemImageName: "stop.circle")
                )
            ),
            metadata: MorningAssistantMetadata(alarmId: alarm.id.uuidString),
            tintColor: .blue
        )
        
        let schedule: Alarm.Schedule
        if alarm.weekdays.isEmpty {
            // One-time alarm
            schedule = .fixed(alarm.time)
        } else {
            // Repeating alarm
            let calendar = Calendar.current
            let components = calendar.dateComponents([.hour, .minute], from: alarm.time)
            let time = Alarm.Schedule.Relative.Time(
                hour: components.hour ?? 7,
                minute: components.minute ?? 0
            )
            
            let weekdays: [Locale.Weekday] = alarm.weekdays.compactMap { weekdayIndex in
                switch weekdayIndex {
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
            
            schedule = .relative(.init(
                time: time,
                repeats: .weekly(weekdays)
            ))
        }
        
        let configuration = AlarmManager.AlarmConfiguration(
            schedule: schedule,
            attributes: attributes,
            stopIntent: StopAlarmIntent(alarmID: alarm.id.uuidString)
        )
        
        do {
            _ = try await alarmManager.schedule(id: alarm.id, configuration: configuration)
            print("AlarmKit alarm scheduled successfully")
        } catch {
            print("Failed to schedule AlarmKit alarm: \(error)")
        }
    }
    
    private func scheduleWithLocalNotification(_ alarm: AlarmConfiguration) {
        // Implement local notification scheduling
        // This is a simplified version - you would implement full notification scheduling here
        print("Scheduling local notification for alarm: \(alarm.label)")
    }
    
    private func cancelAlarm(_ id: UUID) async {
        if isAlarmKitAvailable {
            try? alarmManager.cancel(id: id)
        } else {
            // Cancel local notification
            print("Canceling local notification for alarm: \(id)")
        }
    }
    
    private func saveAlarms() {
        if let data = try? JSONEncoder().encode(alarms) {
            UserDefaults.standard.set(data, forKey: "alarm_configurations")
        }
    }
    
    func openSettings() {
        if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(settingsUrl)
        }
    }
}

// MARK: - Supporting Types
struct AlarmConfiguration: Identifiable, Codable {
    let id: UUID
    var label: String
    var time: Date
    var weekdays: Set<Int>
    var isEnabled: Bool
    
    var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: time)
    }
}

// AlarmKit Metadata for our app
struct MorningAssistantMetadata: AlarmMetadata {
    let createdAt = Date()
    let alarmId: String
}

// App Intent for stopping alarms
struct StopAlarmIntent: LiveActivityIntent {
    let alarmID: String
    
    init(alarmID: String) {
        self.alarmID = alarmID
    }
    
    func perform() async throws -> some IntentResult {
        // Handle alarm stop action
        print("Stopping alarm: \(alarmID)")
        
        // Trigger app to start if needed
        NotificationCenter.default.post(
            name: NSNotification.Name("AlarmTriggered"),
            object: nil,
            userInfo: ["alarmId": alarmID, "autoStart": true]
        )
        
        return .result()
    }
}