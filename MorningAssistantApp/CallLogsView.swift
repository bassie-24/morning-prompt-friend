import SwiftUI

struct CallLogsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CallLogsViewModel()
    @State private var selectedLog: CallLog?
    
    var body: some View {
        NavigationView {
            Group {
                if viewModel.logs.isEmpty {
                    ContentUnavailableView(
                        "通話ログなし",
                        systemImage: "doc.text",
                        description: Text("まだ通話ログがありません。\n通話を開始してログを記録しましょう。")
                    )
                } else {
                    List {
                        ForEach(viewModel.logs) { log in
                            CallLogRow(log: log) {
                                selectedLog = log
                            }
                        }
                        .onDelete(perform: viewModel.deleteLog)
                    }
                }
            }
            .navigationTitle("通話ログ")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
                
                if !viewModel.logs.isEmpty {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("全削除") {
                            viewModel.deleteAllLogs()
                        }
                        .foregroundColor(.red)
                    }
                }
            }
            .sheet(item: $selectedLog) { log in
                CallLogDetailView(log: log)
            }
        }
        .onAppear {
            viewModel.loadLogs()
        }
    }
}

struct CallLogRow: View {
    let log: CallLog
    let onTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(log.date, style: .date)
                    .font(.headline)
                
                Spacer()
                
                Text(log.date, style: .time)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Label("\(formatDuration(log.duration))", systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Label("\(log.conversationCount)回", systemImage: "bubble.left.and.bubble.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
    }
    
    private func formatDuration(_ duration: Int) -> String {
        let minutes = duration / 60
        let seconds = duration % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

struct CallLogDetailView: View {
    let log: CallLog
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header info
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("通話日時")
                                .font(.headline)
                            Spacer()
                            Text(log.date, format: .dateTime)
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Text("通話時間")
                                .font(.headline)
                            Spacer()
                            Text(formatDuration(log.duration))
                                .foregroundColor(.secondary)
                        }
                        
                        HStack {
                            Text("会話回数")
                                .font(.headline)
                            Spacer()
                            Text("\(log.conversationCount)回")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    
                    Divider()
                    
                    // Conversation
                    Text("会話履歴")
                        .font(.headline)
                    
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(Array(log.conversation.enumerated()), id: \.offset) { index, entry in
                            ConversationBubble(role: entry.role, content: entry.content)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("通話詳細")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func formatDuration(_ duration: Int) -> String {
        let minutes = duration / 60
        let seconds = duration % 60
        return String(format: "%d分%02d秒", minutes, seconds)
    }
}

struct ConversationBubble: View {
    let role: String
    let content: String
    
    var isUser: Bool {
        role == "user"
    }
    
    var body: some View {
        HStack {
            if isUser {
                Spacer(minLength: 40)
            }
            
            VStack(alignment: isUser ? .trailing : .leading) {
                HStack {
                    if !isUser {
                        Image(systemName: "robot")
                            .foregroundColor(.blue)
                    }
                    
                    Text(isUser ? "あなた" : "AI")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(isUser ? .white : .primary)
                    
                    if isUser {
                        Image(systemName: "person")
                            .foregroundColor(.white)
                    }
                }
                
                Text(content)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isUser ? Color.blue : Color(.systemGray5))
                    .foregroundColor(isUser ? .white : .primary)
                    .cornerRadius(16)
            }
            
            if !isUser {
                Spacer(minLength: 40)
            }
        }
    }
}

@MainActor
class CallLogsViewModel: ObservableObject {
    @Published var logs: [CallLog] = []
    
    func loadLogs() {
        guard let data = UserDefaults.standard.data(forKey: "call_logs"),
              let loadedLogs = try? JSONDecoder().decode([CallLog].self, from: data) else {
            logs = []
            return
        }
        logs = loadedLogs.sorted { $0.date > $1.date }
    }
    
    func deleteLog(at indexSet: IndexSet) {
        logs.remove(atOffsets: indexSet)
        saveLogs()
    }
    
    func deleteAllLogs() {
        logs.removeAll()
        saveLogs()
    }
    
    private func saveLogs() {
        if let data = try? JSONEncoder().encode(logs) {
            UserDefaults.standard.set(data, forKey: "call_logs")
        }
    }
}