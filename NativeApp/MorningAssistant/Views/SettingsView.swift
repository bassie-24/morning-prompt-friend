import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var registry: CapabilityRegistry
    @StateObject private var vmHolder = Holder()

    private final class Holder: ObservableObject { var vm: SettingsViewModel? }

    var body: some View {
        let vm = ensureVM()
        Form {
            Section("OpenAI APIキー") {
                SecureField("sk-...", text: $vm.apiKey)
                Button("保存") { vm.saveAPIKey() }
            }
            Section("プラン") {
                Picker("プラン", selection: $vm.plan) {
                    ForEach(Plan.allCases) { p in Text(p.rawValue).tag(p) }
                }
                .pickerStyle(.segmented)
                Button("プランを保存") { vm.savePlan() }
            }
            Section("指示") {
                List {
                    ForEach($vm.instructions) { $inst in
                        VStack(alignment: .leading) {
                            TextField("タイトル", text: $inst.title)
                            TextField("内容", text: $inst.content)
                            Toggle("有効", isOn: $inst.isActive)
                            Toggle("Web検索", isOn: $inst.useWebSearch)
                        }
                    }.onDelete { idx in vm.instructions.remove(atOffsets: idx) }
                }
                Button("指示を追加") { vm.instructions.append(.init(title: "新規指示", content: "", order: vm.instructions.count+1, isActive: true, useWebSearch: false)) }
                Button("指示を保存") { vm.saveInstructions() }
            }
        }
        .navigationTitle("設定")
    }

    private func ensureVM() -> SettingsViewModel {
        if let vm = vmHolder.vm { return vm }
        let newVM = SettingsViewModel(registry: registry)
        vmHolder.vm = newVM
        return newVM
    }
}

