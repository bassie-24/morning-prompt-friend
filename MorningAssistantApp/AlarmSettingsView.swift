import SwiftUI
import UserNotifications

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
                            Text("指定時刻になると通知が表示され、タップするとアプリが起動します")
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
                AlarmEditView(alarm: nil) { newAlarm in
                    Task {
                        await viewModel.addAlarm(newAlarm)
                    }
                }
            }
            .sheet(item: $editingAlarm) { alarm in
                AlarmEditView(alarm: alarm) { updatedAlarm in
                    Task {
                        await viewModel.updateAlarm(updatedAlarm)
                    }
                }
            }
            .alert("通知権限が必要です", isPresented: $viewModel.showPermissionAlert) {
                Button("設定を開く") {
                    viewModel.openSettings()
                }
                Button("キャンセル", role: .cancel) {}
            } message: {
                Text("アラーム機能を使用するには、設定から通知の権限を許可してください。")
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
    let onSave: (AlarmConfiguration) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var label: String
    @State private var time: Date
    @State private var selectedWeekdays: Set<Int>
    @State private var isEnabled: Bool
    
    init(alarm: AlarmConfiguration?, onSave: @escaping (AlarmConfiguration) -> Void) {
        self.alarm = alarm
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
                            Image(systemName: "bell.fill")
                                .foregroundColor(.blue)
                            
                            Text("ローカル通知使用")
                                .font(.headline)
                        }
                        
                        Text("指定時刻に通知が表示され、タップするとアプリが起動します。")
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
    @Published var showPermissionAlert = false
    
    func initialize() async {
        await checkNotificationPermission()
        loadAlarms()
    }
    
    private func checkNotificationPermission() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        
        if settings.authorizationStatus == .notDetermined {
            do {
                _ = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            } catch {
                showPermissionAlert = true
            }
        } else if settings.authorizationStatus == .denied {
            showPermissionAlert = true
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
            await scheduleNotification(for: alarm)
        }
    }
    
    func updateAlarm(_ alarm: AlarmConfiguration) async {
        if let index = alarms.firstIndex(where: { $0.id == alarm.id }) {
            // Cancel existing notification
            await cancelNotification(for: alarms[index].id)
            
            // Update and reschedule if enabled
            alarms[index] = alarm
            saveAlarms()
            
            if alarm.isEnabled {
                await scheduleNotification(for: alarm)
            }
        }
    }
    
    func toggleAlarm(_ id: UUID) {
        if let index = alarms.firstIndex(where: { $0.id == id }) {
            alarms[index].isEnabled.toggle()
            saveAlarms()
            
            Task {
                if alarms[index].isEnabled {
                    await scheduleNotification(for: alarms[index])
                } else {
                    await cancelNotification(for: id)
                }
            }
        }
    }
    
    func deleteAlarm(_ id: UUID) {
        Task {
            await cancelNotification(for: id)
        }
        
        alarms.removeAll { $0.id == id }
        saveAlarms()
    }
    
    private func scheduleNotification(for alarm: AlarmConfiguration) async {
        let center = UNUserNotificationCenter.current()
        
        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = "朝のAIアシスタント"
        content.body = alarm.label
        content.sound = .default
        content.userInfo = ["alarmId": alarm.id.uuidString, "autoStart": true]
        
        // Create date components from alarm time
        let calendar = Calendar.current
        let components = calendar.dateComponents([.hour, .minute], from: alarm.time)
        
        if alarm.weekdays.isEmpty {
            // One-time notification
            var triggerDate = calendar.dateComponents([.year, .month, .day], from: Date())
            triggerDate.hour = components.hour
            triggerDate.minute = components.minute
            
            // If time has passed today, schedule for tomorrow
            if let scheduledDate = calendar.date(from: triggerDate),
               scheduledDate <= Date() {
                triggerDate = calendar.dateComponents([.year, .month, .day], from: Date().addingTimeInterval(86400))
                triggerDate.hour = components.hour
                triggerDate.minute = components.minute
            }
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)
            let request = UNNotificationRequest(identifier: alarm.id.uuidString, content: content, trigger: trigger)
            
            try? await center.add(request)
        } else {
            // Repeating notifications for each selected weekday
            for weekday in alarm.weekdays {
                var triggerComponents = DateComponents()
                triggerComponents.weekday = weekday + 1 // UNCalendarNotificationTrigger uses 1-based weekdays
                triggerComponents.hour = components.hour
                triggerComponents.minute = components.minute
                
                let trigger = UNCalendarNotificationTrigger(dateMatching: triggerComponents, repeats: true)
                let request = UNNotificationRequest(
                    identifier: "\(alarm.id.uuidString)-\(weekday)",
                    content: content,
                    trigger: trigger
                )
                
                try? await center.add(request)
            }
        }
    }
    
    private func cancelNotification(for alarmId: UUID) async {
        let center = UNUserNotificationCenter.current()
        
        // Cancel one-time notification
        center.removePendingNotificationRequests(withIdentifiers: [alarmId.uuidString])
        
        // Cancel all repeating notifications for this alarm
        let identifiers = (0..<7).map { "\(alarmId.uuidString)-\($0)" }
        center.removePendingNotificationRequests(withIdentifiers: identifiers)
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