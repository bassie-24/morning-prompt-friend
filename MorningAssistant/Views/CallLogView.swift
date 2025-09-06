import SwiftUI

struct CallLogView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var selectedLog: CallLog?
    @State private var searchText = ""
    
    var filteredLogs: [CallLog] {
        if searchText.isEmpty {
            return dataManager.callLogs
        } else {
            return dataManager.callLogs.filter { log in
                log.instructions.contains { $0.title.localizedCaseInsensitiveContains(searchText) } ||
                log.conversation.contains { $0.content.localizedCaseInsensitiveContains(searchText) }
            }
        }
    }
    
    var body: some View {
        NavigationView {
            List {
                if filteredLogs.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("通話ログがありません")
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 40)
                        Spacer()
                    }
                } else {
                    ForEach(filteredLogs) { log in
                        CallLogRow(log: log)
                            .onTapGesture {
                                selectedLog = log
                            }
                    }
                    .onDelete(perform: deleteLog)
                }
            }
            .searchable(text: $searchText, prompt: "ログを検索")
            .navigationTitle("通話ログ")
            .sheet(item: $selectedLog) { log in
                CallLogDetailView(log: log)
            }
        }
    }
    
    private func deleteLog(at offsets: IndexSet) {
        for index in offsets {
            dataManager.deleteCallLog(filteredLogs[index])
        }
    }
}

struct CallLogRow: View {
    let log: CallLog
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(formatDate(log.date))
                    .font(.headline)
                
                Spacer()
                
                Text(formatDuration(log.duration))
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.2))
                    .cornerRadius(4)
            }
            
            HStack {
                Image(systemName: "list.bullet")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("\(log.instructions.count)個の指示")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("•")
                    .foregroundColor(.secondary)
                
                Image(systemName: "message")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("\(log.conversation.count)メッセージ")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if let firstMessage = log.conversation.first {
                Text(firstMessage.content)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        formatter.locale = Locale(identifier: "ja_JP")
        return formatter.string(from: date)
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d分%02d秒", minutes, seconds)
    }
}

struct CallLogDetailView: View {
    let log: CallLog
    @Environment(\.dismiss) var dismiss
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            TabView(selection: $selectedTab) {
                // 概要タブ
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // 基本情報
                        VStack(alignment: .leading, spacing: 8) {
                            Label("日時", systemImage: "calendar")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(formatDate(log.date))
                                .font(.headline)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Label("通話時間", systemImage: "clock")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(formatDuration(log.duration))
                                .font(.headline)
                        }
                        
                        Divider()
                        
                        // 使用した指示
                        VStack(alignment: .leading, spacing: 8) {
                            Label("使用した指示", systemImage: "list.bullet")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            ForEach(log.instructions) { instruction in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                        .font(.caption)
                                    
                                    VStack(alignment: .leading) {
                                        Text(instruction.title)
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                        
                                        if instruction.useWebSearch {
                                            Label("Web検索使用", systemImage: "magnifyingglass")
                                                .font(.caption2)
                                                .foregroundColor(.blue)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding()
                }
                .tabItem {
                    Label("概要", systemImage: "info.circle")
                }
                .tag(0)
                
                // 会話タブ
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(log.conversation) { message in
                            ConversationMessageView(message: message)
                        }
                    }
                    .padding()
                }
                .tabItem {
                    Label("会話", systemImage: "message")
                }
                .tag(1)
            }
            .navigationTitle("通話ログ詳細")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("閉じる") { dismiss() })
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        formatter.timeStyle = .medium
        formatter.locale = Locale(identifier: "ja_JP")
        return formatter.string(from: date)
    }
    
    private func formatDuration(_ duration: TimeInterval) -> String {
        let minutes = Int(duration) / 60
        let seconds = Int(duration) % 60
        return String(format: "%d分%02d秒", minutes, seconds)
    }
}

struct ConversationMessageView: View {
    let message: ConversationEntry
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // アイコン
            Image(systemName: message.role == .user ? "person.circle.fill" : "cpu")
                .font(.title2)
                .foregroundColor(message.role == .user ? .blue : .green)
            
            VStack(alignment: .leading, spacing: 4) {
                // ロールと時刻
                HStack {
                    Text(message.role == .user ? "あなた" : "AI")
                        .font(.caption)
                        .fontWeight(.semibold)
                    
                    Text(formatTime(message.timestamp))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                // メッセージ内容
                Text(message.content)
                    .font(.body)
            }
            
            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(message.role == .user ? Color.blue.opacity(0.1) : Color.green.opacity(0.1))
        )
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}