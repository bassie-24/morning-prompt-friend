import Foundation
import Security

class DataManager: ObservableObject {
    static let shared = DataManager()
    
    @Published var instructions: [UserInstruction] = []
    @Published var callLogs: [CallLog] = []
    @Published var apiKey: String = ""
    @Published var webSearchApiKey: String = ""
    @Published var webSearchProvider: String = "google"
    
    private let instructionsKey = "morning_assistant_instructions"
    private let callLogsKey = "morning_assistant_call_logs"
    private let apiKeyService = "MorningAssistant"
    private let apiKeyAccount = "OpenAIAPIKey"
    private let webSearchApiKeyAccount = "WebSearchAPIKey"
    
    private init() {
        loadInstructions()
        loadCallLogs()
        loadApiKey()
        
        // デフォルト指示の追加（初回起動時）
        if instructions.isEmpty {
            addDefaultInstructions()
        }
    }
    
    // MARK: - Computed Properties
    var activeInstructions: [UserInstruction] {
        instructions.filter { $0.isActive }
    }
    
    var activeInstructionsCount: Int {
        activeInstructions.count
    }
    
    var hasApiKey: Bool {
        !apiKey.isEmpty
    }
    
    // MARK: - Instructions Management
    func loadInstructions() {
        if let data = UserDefaults.standard.data(forKey: instructionsKey),
           let decoded = try? JSONDecoder().decode([UserInstruction].self, from: data) {
            instructions = decoded
        }
    }
    
    func saveInstructions() {
        if let encoded = try? JSONEncoder().encode(instructions) {
            UserDefaults.standard.set(encoded, forKey: instructionsKey)
        }
    }
    
    func addInstruction(_ instruction: UserInstruction) {
        instructions.append(instruction)
        saveInstructions()
    }
    
    func updateInstruction(_ instruction: UserInstruction) {
        if let index = instructions.firstIndex(where: { $0.id == instruction.id }) {
            instructions[index] = instruction
            saveInstructions()
        }
    }
    
    func deleteInstruction(_ instruction: UserInstruction) {
        instructions.removeAll { $0.id == instruction.id }
        saveInstructions()
    }
    
    private func addDefaultInstructions() {
        let defaults = [
            UserInstruction(
                id: UUID().uuidString,
                title: "朝の基本準備",
                content: "朝の基本的な準備についてアドバイスしてください。天気、予定の確認、健康チェック、朝食の提案など、一般的な朝のルーティンをサポートしてください。",
                order: 1,
                isActive: true,
                useWebSearch: false
            ),
            UserInstruction(
                id: UUID().uuidString,
                title: "モチベーション向上",
                content: "1日を前向きに始められるような励ましの言葉や、やる気を引き出すアドバイスを提供してください。",
                order: 2,
                isActive: true,
                useWebSearch: false
            )
        ]
        
        instructions = defaults
        saveInstructions()
    }
    
    // MARK: - Call Logs Management
    func loadCallLogs() {
        if let data = UserDefaults.standard.data(forKey: callLogsKey),
           let decoded = try? JSONDecoder().decode([CallLog].self, from: data) {
            callLogs = decoded.sorted { $0.date > $1.date }
        }
    }
    
    func saveCallLog(_ log: CallLog) {
        callLogs.insert(log, at: 0)
        if let encoded = try? JSONEncoder().encode(callLogs) {
            UserDefaults.standard.set(encoded, forKey: callLogsKey)
        }
    }
    
    func deleteCallLog(_ log: CallLog) {
        callLogs.removeAll { $0.id == log.id }
        if let encoded = try? JSONEncoder().encode(callLogs) {
            UserDefaults.standard.set(encoded, forKey: callLogsKey)
        }
    }
    
    // MARK: - API Key Management (Keychain)
    func loadApiKey() {
        apiKey = getKeychainValue(service: apiKeyService, account: apiKeyAccount) ?? ""
        webSearchApiKey = getKeychainValue(service: apiKeyService, account: webSearchApiKeyAccount) ?? ""
        
        // OpenAIServiceにAPIキーを設定
        if !apiKey.isEmpty {
            OpenAIService.shared.setApiKey(apiKey)
        }
    }
    
    func saveApiKey(_ key: String) {
        apiKey = key
        setKeychainValue(key, service: apiKeyService, account: apiKeyAccount)
        OpenAIService.shared.setApiKey(key)
    }
    
    func saveWebSearchApiKey(_ key: String) {
        webSearchApiKey = key
        setKeychainValue(key, service: apiKeyService, account: webSearchApiKeyAccount)
    }
    
    // MARK: - Keychain Helper Methods
    private func setKeychainValue(_ value: String, service: String, account: String) {
        let data = value.data(using: .utf8)!
        
        // 既存のアイテムを削除
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // 新しいアイテムを追加
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            print("Keychainへの保存に失敗: \(status)")
        }
    }
    
    private func getKeychainValue(service: String, account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess,
           let data = dataTypeRef as? Data,
           let value = String(data: data, encoding: .utf8) {
            return value
        }
        
        return nil
    }
}