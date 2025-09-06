import Foundation
import Speech

final class SpeechRecognizerService: NSObject, ObservableObject {
    private let recognizer = SFSpeechRecognizer()
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    func requestAuthorization() async -> Bool {
        await withCheckedContinuation { cont in
            SFSpeechRecognizer.requestAuthorization { status in
                cont.resume(returning: status == .authorized)
            }
        }
    }

    func recognizeOnce() async throws -> String {
        guard await requestAuthorization() else { throw NSError(domain: "Speech", code: 1, userInfo: [NSLocalizedDescriptionKey: "Speech not authorized"]) }

        stop() // reset
        request = SFSpeechAudioBufferRecognitionRequest()
        guard let request = request else { throw NSError(domain: "Speech", code: 2, userInfo: nil) }

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()

        return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String, Error>) in
            self.task = self.recognizer?.recognitionTask(with: request) { result, error in
                if let error = error {
                    cont.resume(throwing: error)
                    self.stop()
                    return
                }
                if let result = result, result.isFinal {
                    cont.resume(returning: result.bestTranscription.formattedString)
                    self.stop()
                }
            }
        }
    }

    func stop() {
        task?.cancel(); task = nil
        request?.endAudio(); request = nil
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
    }
}

