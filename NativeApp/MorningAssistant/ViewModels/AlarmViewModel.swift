import Foundation

@MainActor
final class AlarmViewModel: ObservableObject {
    @Published var alarms: [AlarmSettings] = []
    @Published var authorized: Bool = false

    private let registry: CapabilityRegistry

    init(registry: CapabilityRegistry) { self.registry = registry }

    func requestAuthorization() async { authorized = await registry.alarm.requestAuthorization() }

    func schedule(_ alarm: AlarmSettings) async {
        guard authorized else { return }
        do { try await registry.alarm.schedule(alarm) } catch {}
    }

    func cancel(_ id: UUID) async { try? await registry.alarm.cancel(id: id) }
}

