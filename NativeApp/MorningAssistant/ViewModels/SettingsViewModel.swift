import Foundation

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var apiKey: String = ""
    @Published var instructions: [UserInstruction] = []
    @Published var plan: Plan = .free

    private let registry: CapabilityRegistry

    init(registry: CapabilityRegistry) {
        self.registry = registry
        self.instructions = registry.storage.loadInstructions()
        self.plan = registry.storage.getPlan()
        self.apiKey = registry.keychain.get(key: .openAIAPIKey) ?? ""
    }

    func saveAPIKey() { _ = registry.keychain.set(apiKey, key: .openAIAPIKey) }
    func saveInstructions() { registry.storage.saveInstructions(instructions) }
    func savePlan() { registry.storage.setPlan(plan) }
}

