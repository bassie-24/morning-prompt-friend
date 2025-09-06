import Foundation
import Speech
import AVFoundation

class SpeechService: NSObject, ObservableObject {
    static let shared = SpeechService()
    
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "ja-JP"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private let synthesizer = AVSpeechSynthesizer()
    
    @Published var isListening = false
    @Published var isSpeaking = false
    @Published var transcribedText = ""
    
    private var speechContinuation: CheckedContinuation<String?, Never>?
    
    override init() {
        super.init()
        synthesizer.delegate = self
    }
    
    // MARK: - Authorization
    func requestAuthorization() {
        SFSpeechRecognizer.requestAuthorization { authStatus in
            DispatchQueue.main.async {
                switch authStatus {
                case .authorized:
                    print("音声認識が許可されました")
                case .denied:
                    print("音声認識が拒否されました")
                case .restricted:
                    print("音声認識が制限されています")
                case .notDetermined:
                    print("音声認識の許可が未決定です")
                @unknown default:
                    print("未知の認識状態")
                }
            }
        }
    }
    
    // MARK: - Speech Recognition
    func startListening() async -> String? {
        return await withCheckedContinuation { continuation in
            self.speechContinuation = continuation
            
            DispatchQueue.main.async {
                self.isListening = true
                self.transcribedText = ""
            }
            
            // 既存のタスクをキャンセル
            if recognitionTask != nil {
                recognitionTask?.cancel()
                recognitionTask = nil
            }
            
            // オーディオセッションの設定
            let audioSession = AVAudioSession.sharedInstance()
            do {
                try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
                try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                print("オーディオセッション設定エラー: \(error)")
                continuation.resume(returning: nil)
                return
            }
            
            recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
            
            let inputNode = audioEngine.inputNode
            
            guard let recognitionRequest = recognitionRequest else {
                continuation.resume(returning: nil)
                return
            }
            
            recognitionRequest.shouldReportPartialResults = true
            
            // 音声認識タスクの開始
            recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { result, error in
                var isFinal = false
                
                if let result = result {
                    DispatchQueue.main.async {
                        self.transcribedText = result.bestTranscription.formattedString
                    }
                    isFinal = result.isFinal
                }
                
                if error != nil || isFinal {
                    self.audioEngine.stop()
                    inputNode.removeTap(onBus: 0)
                    
                    self.recognitionRequest = nil
                    self.recognitionTask = nil
                    
                    DispatchQueue.main.async {
                        self.isListening = false
                    }
                    
                    if let continuation = self.speechContinuation {
                        continuation.resume(returning: self.transcribedText.isEmpty ? nil : self.transcribedText)
                        self.speechContinuation = nil
                    }
                }
            }
            
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
                self.recognitionRequest?.append(buffer)
            }
            
            audioEngine.prepare()
            
            do {
                try audioEngine.start()
            } catch {
                print("オーディオエンジン開始エラー: \(error)")
                continuation.resume(returning: nil)
            }
            
            // タイムアウト設定（10秒）
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                if self.isListening {
                    self.stopListening()
                }
            }
        }
    }
    
    func stopListening() {
        audioEngine.stop()
        recognitionRequest?.endAudio()
        isListening = false
        
        if let continuation = speechContinuation {
            continuation.resume(returning: transcribedText.isEmpty ? nil : transcribedText)
            speechContinuation = nil
        }
    }
    
    // MARK: - Text to Speech
    func speak(_ text: String) async {
        await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                self.isSpeaking = true
            }
            
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: "ja-JP")
            utterance.rate = 0.5
            utterance.pitchMultiplier = 1.0
            utterance.volume = 1.0
            
            // 完了ハンドラーの設定
            var observer: NSObjectProtocol?
            observer = NotificationCenter.default.addObserver(
                forName: .AVSpeechSynthesizerDidFinish,
                object: nil,
                queue: .main
            ) { _ in
                DispatchQueue.main.async {
                    self.isSpeaking = false
                }
                if let observer = observer {
                    NotificationCenter.default.removeObserver(observer)
                }
                continuation.resume()
            }
            
            synthesizer.speak(utterance)
        }
    }
    
    func stopSpeaking() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }
}

// MARK: - AVSpeechSynthesizerDelegate
extension SpeechService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
        NotificationCenter.default.post(name: .AVSpeechSynthesizerDidFinish, object: nil)
    }
}

extension Notification.Name {
    static let AVSpeechSynthesizerDidFinish = Notification.Name("AVSpeechSynthesizerDidFinish")
}