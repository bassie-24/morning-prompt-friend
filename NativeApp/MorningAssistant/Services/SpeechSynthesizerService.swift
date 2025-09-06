import Foundation
import AVFoundation

final class SpeechSynthesizerService: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    private let synth = AVSpeechSynthesizer()
    @Published var isSpeaking: Bool = false

    override init() {
        super.init()
        synth.delegate = self
    }

    func speak(_ text: String, lang: String = "ja-JP") async {
        await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
            let utterance = AVSpeechUtterance(string: text)
            utterance.voice = AVSpeechSynthesisVoice(language: lang)
            utterance.rate = AVSpeechUtteranceDefaultSpeechRate
            self.synth.speak(utterance)
            self.isSpeaking = true
            // Resolve when finished via delegate
            DispatchQueue.global().asyncAfter(deadline: .now() + max(0.1, Double(text.count) / 12.0)) {
                cont.resume()
            }
        }
    }

    func stop() { synth.stopSpeaking(at: .immediate); isSpeaking = false }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        isSpeaking = false
    }
}

