import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = SettingsViewModel()
    @State private var showingAddInstruction = false
    @State private var editingInstruction: UserInstruction?
    
    var body: some View {
        NavigationView {
            List {
                apiKeySection
                instructionsSection
            }
            .navigationTitle("設定")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("閉じる") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingAddInstruction) {
                InstructionEditView(instruction: nil) { newInstruction in
                    viewModel.addInstruction(newInstruction)
                }
            }
            .sheet(item: $editingInstruction) { instruction in
                InstructionEditView(instruction: instruction) { updatedInstruction in
                    viewModel.updateInstruction(updatedInstruction)
                }
            }
        }
    }
    
    private var apiKeySection: some View {
        Section("OpenAI API設定") {
            SecureField("APIキー", text: $viewModel.apiKey)
                .textFieldStyle(RoundedBorderTextFieldStyle())
            
            Button("保存") {
                viewModel.saveApiKey()
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.apiKey.isEmpty)
        }
    }
    
    private var instructionsSection: some View {
        Section {
            ForEach(viewModel.instructions) { instruction in
                InstructionRow(instruction: instruction) {
                    viewModel.toggleInstruction(instruction.id)
                } onEdit: {
                    editingInstruction = instruction
                } onDelete: {
                    viewModel.deleteInstruction(instruction.id)
                }
            }
            
            Button {
                showingAddInstruction = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("指示を追加")
                }
            }
        } header: {
            Text("AI指示設定")
        } footer: {
            Text("AIアシスタントに指示したい内容を設定してください。アクティブな指示のみが使用されます。")
        }
    }
}

struct InstructionRow: View {
    let instruction: UserInstruction
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(instruction.title)
                    .font(.headline)
                
                Text(instruction.content)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            Toggle("", isOn: .constant(instruction.isActive))
                .onChange(of: instruction.isActive) { _ in
                    onToggle()
                }
        }
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
}

struct InstructionEditView: View {
    let instruction: UserInstruction?
    let onSave: (UserInstruction) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var content: String
    @State private var isActive: Bool
    
    init(instruction: UserInstruction?, onSave: @escaping (UserInstruction) -> Void) {
        self.instruction = instruction
        self.onSave = onSave
        
        _title = State(initialValue: instruction?.title ?? "")
        _content = State(initialValue: instruction?.content ?? "")
        _isActive = State(initialValue: instruction?.isActive ?? true)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("指示の詳細") {
                    TextField("タイトル", text: $title)
                    
                    TextField("内容", text: $content, axis: .vertical)
                        .lineLimit(3...6)
                    
                    Toggle("アクティブ", isOn: $isActive)
                }
                
                Section {
                    Text("AIアシスタントに具体的な指示を書いてください。例：「今日の天気を確認して、適切な服装をアドバイスしてください」")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle(instruction == nil ? "新しい指示" : "指示を編集")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("キャンセル") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("保存") {
                        let newInstruction = UserInstruction(
                            id: instruction?.id ?? UUID(),
                            title: title,
                            content: content,
                            order: instruction?.order ?? 0,
                            isActive: isActive,
                            useWebSearch: false // Web検索機能は簡略化
                        )
                        onSave(newInstruction)
                        dismiss()
                    }
                    .disabled(title.isEmpty || content.isEmpty)
                }
            }
        }
    }
}

@MainActor
class SettingsViewModel: ObservableObject {
    @Published var apiKey = ""
    @Published var instructions: [UserInstruction] = []
    
    init() {
        loadSettings()
    }
    
    private func loadSettings() {
        // API Key
        apiKey = UserDefaults.standard.string(forKey: "openai_api_key") ?? ""
        
        // Instructions
        if let data = UserDefaults.standard.data(forKey: "user_instructions"),
           let loadedInstructions = try? JSONDecoder().decode([UserInstruction].self, from: data) {
            instructions = loadedInstructions
        } else {
            // デフォルト指示を設定
            instructions = [
                UserInstruction(
                    id: UUID(),
                    title: "朝の基本準備",
                    content: "朝の基本的な準備についてアドバイスしてください。天気、予定の確認、健康チェック、朝食の提案など、一般的な朝のルーティンをサポートしてください。",
                    order: 1,
                    isActive: true,
                    useWebSearch: false
                ),
                UserInstruction(
                    id: UUID(),
                    title: "モチベーション向上",
                    content: "1日を前向きに始められるような励ましの言葉や、やる気を引き出すアドバイスを提供してください。",
                    order: 2,
                    isActive: true,
                    useWebSearch: false
                )
            ]
            saveInstructions()
        }
    }
    
    func saveApiKey() {
        let trimmedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        UserDefaults.standard.set(trimmedKey, forKey: "openai_api_key")
    }
    
    func addInstruction(_ instruction: UserInstruction) {
        var newInstruction = instruction
        newInstruction.order = instructions.count + 1
        instructions.append(newInstruction)
        saveInstructions()
    }
    
    func updateInstruction(_ instruction: UserInstruction) {
        if let index = instructions.firstIndex(where: { $0.id == instruction.id }) {
            instructions[index] = instruction
            saveInstructions()
        }
    }
    
    func toggleInstruction(_ id: UUID) {
        if let index = instructions.firstIndex(where: { $0.id == id }) {
            instructions[index].isActive.toggle()
            saveInstructions()
        }
    }
    
    func deleteInstruction(_ id: UUID) {
        instructions.removeAll { $0.id == id }
        saveInstructions()
    }
    
    private func saveInstructions() {
        if let data = try? JSONEncoder().encode(instructions) {
            UserDefaults.standard.set(data, forKey: "user_instructions")
        }
    }
}

// MARK: - Supporting Types
struct UserInstruction: Identifiable, Codable {
    let id: UUID
    var title: String
    var content: String
    var order: Int
    var isActive: Bool
    let useWebSearch: Bool
}