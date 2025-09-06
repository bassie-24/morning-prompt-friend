import SwiftUI

struct LogsView: View {
    @EnvironmentObject var registry: CapabilityRegistry
    @StateObject private var vmHolder = Holder()

    private final class Holder: ObservableObject { var vm: LogsViewModel? }

    var body: some View {
        let vm = ensureVM()
        List {
            ForEach(vm.logs) { log in
                VStack(alignment: .leading, spacing: 4) {
                    Text(log.date.formatted(date: .abbreviated, time: .shortened)).font(.headline)
                    Text("時間: \(Int(log.duration))秒  メッセージ: \(log.conversation.count)").foregroundStyle(.secondary)
                }
            }.onDelete { idx in
                let ids = idx.map { vm.logs[$0].id }
                vm.delete(ids)
            }
        }.navigationTitle("通話ログ")
    }

    private func ensureVM() -> LogsViewModel {
        if let vm = vmHolder.vm { return vm }
        let newVM = LogsViewModel(registry: registry)
        vmHolder.vm = newVM
        return newVM
    }
}

