import Foundation

@MainActor
final class LogsViewModel: ObservableObject {
    @Published var logs: [CallLog] = []
    private let registry: CapabilityRegistry

    init(registry: CapabilityRegistry) { self.registry = registry; reload() }

    func reload() { logs = registry.logs.load().sorted { $0.date > $1.date } }
    func delete(_ ids: [UUID]) {
        var all = registry.logs.load()
        all.removeAll { ids.contains($0.id) }
        registry.logs.save(all)
        reload()
    }
}

