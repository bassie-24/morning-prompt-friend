import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var dataManager: DataManager
    @State private var apiKey = ""
    @State private var showAddInstruction = false
    @State private var newInstructionTitle = ""
    @State private var newInstructionContent = ""
    @State private var useWebSearch = false
    @State private var showPlanUpgrade = false
    
    var body: some View {
        NavigationView {
            Form {
                // APIキー設定
                Section(header: Text("OpenAI API設定")) {
                    SecureField("APIキー (sk-...)", text: $apiKey)
                        .onAppear {
                            apiKey = dataManager.apiKey
                        }
                    
                    Button("保存") {
                        dataManager.saveApiKey(apiKey)
                    }
                    .disabled(apiKey.isEmpty)
                }
                
                // プラン情報
                Section(header: Text("プラン")) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(appState.currentPlan.rawValue)
                                .font(.headline)
                            Text(planDescription)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        if appState.currentPlan != .premium {
                            Button("アップグレード") {
                                showPlanUpgrade = true
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                }
                
                // カスタム指示
                Section(header: Text("カスタム指示")) {
                    ForEach(dataManager.instructions) { instruction in
                        InstructionRow(instruction: instruction)
                    }
                    .onDelete(perform: deleteInstruction)
                    
                    Button(action: { showAddInstruction = true }) {
                        Label("指示を追加", systemImage: "plus.circle.fill")
                    }
                    .disabled(dataManager.instructions.count >= maxInstructions)
                    
                    if dataManager.instructions.count >= maxInstructions {
                        Text("最大\(maxInstructions)件まで")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Web検索設定（プレミアムのみ）
                if appState.currentPlan == .premium {
                    Section(header: Text("Web検索設定")) {
                        Toggle("Web検索を有効化", isOn: $useWebSearch)
                        
                        if useWebSearch {
                            Picker("検索プロバイダー", selection: $dataManager.webSearchProvider) {
                                Text("Google").tag("google")
                                Text("Bing").tag("bing")
                                Text("Serper").tag("serper")
                            }
                            
                            SecureField("検索APIキー", text: $dataManager.webSearchApiKey)
                        }
                    }
                }
                
                // アプリ情報
                Section(header: Text("アプリ情報")) {
                    HStack {
                        Text("バージョン")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    
                    Link("利用規約", destination: URL(string: "https://example.com/terms")!)
                    Link("プライバシーポリシー", destination: URL(string: "https://example.com/privacy")!)
                }
            }
            .navigationTitle("設定")
            .sheet(isPresented: $showAddInstruction) {
                AddInstructionView(
                    title: $newInstructionTitle,
                    content: $newInstructionContent,
                    useWebSearch: $useWebSearch,
                    onSave: {
                        let instruction = UserInstruction(
                            id: UUID().uuidString,
                            title: newInstructionTitle,
                            content: newInstructionContent,
                            order: dataManager.instructions.count + 1,
                            isActive: true,
                            useWebSearch: useWebSearch
                        )
                        dataManager.addInstruction(instruction)
                        newInstructionTitle = ""
                        newInstructionContent = ""
                        useWebSearch = false
                        showAddInstruction = false
                    },
                    onCancel: {
                        showAddInstruction = false
                    }
                )
            }
            .sheet(isPresented: $showPlanUpgrade) {
                PlanUpgradeView()
            }
        }
    }
    
    private var planDescription: String {
        switch appState.currentPlan {
        case .free:
            return "5分通話 • ログ閲覧不可 • Web検索不可"
        case .plus:
            return "15分通話 • ログ閲覧可能 • Web検索不可"
        case .premium:
            return "30分通話 • ログ閲覧可能 • Web検索可能"
        }
    }
    
    private var maxInstructions: Int {
        switch appState.currentPlan {
        case .free:
            return 3
        case .plus:
            return 5
        case .premium:
            return 10
        }
    }
    
    private func deleteInstruction(at offsets: IndexSet) {
        for index in offsets {
            dataManager.deleteInstruction(dataManager.instructions[index])
        }
    }
}

struct InstructionRow: View {
    let instruction: UserInstruction
    @EnvironmentObject var dataManager: DataManager
    @State private var isActive: Bool
    
    init(instruction: UserInstruction) {
        self.instruction = instruction
        self._isActive = State(initialValue: instruction.isActive)
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(instruction.title)
                        .font(.headline)
                    
                    if instruction.useWebSearch {
                        Image(systemName: "magnifyingglass")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                Text(instruction.content)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            Toggle("", isOn: $isActive)
                .labelsHidden()
                .onChange(of: isActive) { newValue in
                    var updated = instruction
                    updated.isActive = newValue
                    dataManager.updateInstruction(updated)
                }
        }
        .padding(.vertical, 4)
    }
}

struct AddInstructionView: View {
    @Binding var title: String
    @Binding var content: String
    @Binding var useWebSearch: Bool
    let onSave: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("指示の詳細")) {
                    TextField("タイトル", text: $title)
                    
                    TextEditor(text: $content)
                        .frame(minHeight: 100)
                }
                
                Section {
                    Toggle("Web検索を使用", isOn: $useWebSearch)
                }
            }
            .navigationTitle("新しい指示")
            .navigationBarItems(
                leading: Button("キャンセル", action: onCancel),
                trailing: Button("保存", action: onSave)
                    .disabled(title.isEmpty || content.isEmpty)
            )
        }
    }
}

struct PlanUpgradeView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("プランをアップグレード")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                // プラン比較
                VStack(spacing: 16) {
                    PlanCard(
                        name: "フリー",
                        price: "¥0",
                        features: ["5分通話", "3つの指示", "基本機能"],
                        isCurrentPlan: true
                    )
                    
                    PlanCard(
                        name: "プラス",
                        price: "¥500/月",
                        features: ["15分通話", "5つの指示", "ログ閲覧"],
                        isRecommended: true
                    )
                    
                    PlanCard(
                        name: "プレミアム",
                        price: "¥1,500/月",
                        features: ["30分通話", "10つの指示", "ログ閲覧", "Web検索"],
                        isPremium: true
                    )
                }
                
                Spacer()
            }
            .padding()
            .navigationBarItems(trailing: Button("閉じる") { dismiss() })
        }
    }
}

struct PlanCard: View {
    let name: String
    let price: String
    let features: [String]
    var isCurrentPlan = false
    var isRecommended = false
    var isPremium = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(name)
                    .font(.headline)
                
                if isCurrentPlan {
                    Text("現在のプラン")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(4)
                }
                
                if isRecommended {
                    Text("おすすめ")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.2))
                        .cornerRadius(4)
                }
                
                Spacer()
                
                Text(price)
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            
            ForEach(features, id: \.self) { feature in
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                    Text(feature)
                        .font(.caption)
                }
            }
            
            if !isCurrentPlan {
                Button(action: {}) {
                    Text("選択")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isPremium ? Color.purple.opacity(0.1) : Color.gray.opacity(0.05))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isPremium ? Color.purple : Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
}