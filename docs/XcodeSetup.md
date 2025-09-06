# Xcode Setup (純Swiftアプリ)

- Open `MorningAssistant/MorningAssistant.xcodeproj` in Xcode.
- Targets → MorningAssistant:
  - Deployment target: iOS 16.0+
  - Signing & Capabilities:
    - App Sandbox: off (iOS default)
    - Background Modes: not required for now
    - Microphone: add `NSSpeechRecognitionUsageDescription` in Info.plist
    - Microphone/Audio: add `NSMicrophoneUsageDescription` if you allow recording
    - Notifications: request authorization at launch (already implemented)
  - Info.plist keys:
    - `NSSpeechRecognitionUsageDescription`: 朝のAIアシスタントは音声認識のためにアクセスが必要です
    - `NSMicrophoneUsageDescription`: 朝のAIアシスタントは音声入力にマイクを使用します

- Build & Run on iOS 16+ device/simulator.
- 初回起動後:
  - 設定タブで OpenAI API キーを保存
  - 指示を有効化
  - ホームで通話開始

- AlarmKit (iOS 18+):
  - 現状はローカル通知フォールバックで動作。
  - iOS 18+ 端末にて AlarmKit を追加する場合、別途 entitlement/フレームワークの導入が必要です。

