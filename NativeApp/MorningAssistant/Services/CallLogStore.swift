import Foundation

final class CallLogStore {
    private let fileName = "call_logs.json"

    private var fileURL: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent(fileName)
    }

    func load() -> [CallLog] {
        guard let data = try? Data(contentsOf: fileURL) else { return [] }
        return (try? JSONDecoder().decode([CallLog].self, from: data)) ?? []
    }

    func save(_ logs: [CallLog]) {
        if let data = try? JSONEncoder().encode(logs) {
            try? data.write(to: fileURL)
        }
    }

    func append(_ log: CallLog) {
        var logs = load()
        logs.append(log)
        save(logs)
    }
}

