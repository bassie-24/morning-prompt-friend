import Foundation

final class StorageService {
    private let defaults = UserDefaults.standard

    private enum Keys: String { case instructions, planRaw, webSearchProvider }

    func saveInstructions(_ instructions: [UserInstruction]) {
        if let data = try? JSONEncoder().encode(instructions) {
            defaults.set(data, forKey: Keys.instructions.rawValue)
        }
    }

    func loadInstructions() -> [UserInstruction] {
        guard let data = defaults.data(forKey: Keys.instructions.rawValue) else { return [] }
        return (try? JSONDecoder().decode([UserInstruction].self, from: data)) ?? []
    }

    func setPlan(_ plan: Plan) { defaults.set(plan.rawValue, forKey: Keys.planRaw.rawValue) }
    func getPlan() -> Plan { Plan(rawValue: defaults.string(forKey: Keys.planRaw.rawValue) ?? "free") ?? .free }
}

