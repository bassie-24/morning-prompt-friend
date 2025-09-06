import Foundation
import Combine

final class CapabilityRegistry: ObservableObject {
    // Core capabilities
    let speechIn: SpeechRecognizerService
    let speechOut: SpeechSynthesizerService
    let ai: OpenAIClient
    let storage: StorageService
    let keychain: KeychainService
    let logs: CallLogStore
    let alarm: AlarmScheduler
    let webSearch: WebSearchClient

    static func bootstrap() -> CapabilityRegistry {
        let keychain = KeychainService()
        let storage = StorageService()
        let logs = CallLogStore()
        let speechIn = SpeechRecognizerService()
        let speechOut = SpeechSynthesizerService()
        let ai = OpenAIClient(keyProvider: { keychain.get(key: .openAIAPIKey) ?? "" })
        let webSearch = DefaultWebSearchClient()

        // Select alarm implementation by availability
        let alarm: AlarmScheduler
        if #available(iOS 18.0, *) {
            alarm = AlarmKitScheduler()
        } else {
            alarm = LocalNotificationScheduler()
        }

        return CapabilityRegistry(
            speechIn: speechIn,
            speechOut: speechOut,
            ai: ai,
            storage: storage,
            keychain: keychain,
            logs: logs,
            alarm: alarm,
            webSearch: webSearch
        )
    }

    init(
        speechIn: SpeechRecognizerService,
        speechOut: SpeechSynthesizerService,
        ai: OpenAIClient,
        storage: StorageService,
        keychain: KeychainService,
        logs: CallLogStore,
        alarm: AlarmScheduler,
        webSearch: WebSearchClient
    ) {
        self.speechIn = speechIn
        self.speechOut = speechOut
        self.ai = ai
        self.storage = storage
        self.keychain = keychain
        self.logs = logs
        self.alarm = alarm
        self.webSearch = webSearch
    }
}

