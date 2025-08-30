# 朝のAIアシスタント - iOSアプリ版

PWA+CapacitorアプリからSwift純正iOSアプリに移行した朝のAIアシスタントアプリです。

## 概要

このアプリは朝の準備をサポートするAIアシスタントです。音声認識と音声合成機能を使用して、ユーザーとAIが自然に会話し、朝のルーティンをガイドします。

### 主要機能

1. **音声会話機能**
   - iOSネイティブの音声認識（Speech Framework）
   - AVSpeechSynthesizerによる音声合成
   - OpenAI GPT-3.5-turboとの自然な会話

2. **アラーム機能**
   - AlarmKit（iOS 26.0+）対応
   - 標準通知によるフォールバック
   - 繰り返しアラームの設定
   - アラーム時の自動アプリ起動

3. **設定管理**
   - OpenAI APIキー設定
   - AIへの指示カスタマイズ
   - 指示の有効/無効切り替え

4. **通話ログ**
   - 会話履歴の保存
   - 通話時間・回数の記録
   - ログの詳細表示

## システム要件

- iOS 16.0以上
- iPhone/iPad対応
- マイク・音声認識権限必須
- AlarmKit使用時はiOS 26.0以上推奨

## セットアップ手順

### 1. Xcodeプロジェクトの作成

```bash
# MorningAssistantAppディレクトリに移動
cd MorningAssistantApp

# Xcodeでプロジェクトを開く
open MorningAssistantApp.xcodeproj
```

### 2. 必要なFrameworkの追加

Xcodeのプロジェクト設定で以下のFrameworkを追加：

- `SwiftUI`
- `Foundation`
- `AVFoundation`
- `Speech`
- `AlarmKit` (iOS 26.0+のみ)

### 3. Bundle Identifierの設定

`project.pbxproj`でBundle Identifierを変更：
```
PRODUCT_BUNDLE_IDENTIFIER = com.yourcompany.morningassistant;
```

### 4. Development Teamの設定

Xcodeのプロジェクト設定でDevelopment Teamを設定。

### 5. Privacy Permissionsの確認

`Info.plist`に以下が含まれていることを確認：

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`
- `NSAlarmKitUsageDescription` (iOS 26.0+)

## アプリの使用方法

### 初回起動時

1. OpenAI APIキーを入力して保存
2. マイクと音声認識の権限を許可
3. AlarmKit権限の許可（iOS 26.0+）

### 基本的な使い方

1. **通話開始**
   - メイン画面の「通話開始」ボタンをタップ
   - AIが挨拶し、朝の準備をガイド開始

2. **音声会話**
   - AIが話し終わったら自動的に音声認識開始
   - はっきりと話すと認識精度が向上
   - エラー時は自動的に再試行

3. **通話終了**
   - 「通話終了」ボタンで会話終了
   - ログが自動保存される

### 設定カスタマイズ

1. **指示の編集**
   - 設定画面で「指示を追加」
   - タイトルと詳細内容を入力
   - アクティブ/非アクティブを切り替え

2. **アラーム設定**
   - アラーム画面で「+」ボタン
   - 時刻、曜日、ラベルを設定
   - AlarmKitまたは標準通知で動作

### 通話ログの確認

- ログ画面で過去の会話履歴を表示
- 各ログをタップで詳細表示
- 通話時間、会話回数、詳細内容を確認

## 技術仕様

### アーキテクチャ

- **UI**: SwiftUI
- **状態管理**: ObservableObject + @Published
- **音声処理**: AVFoundation + Speech Framework
- **データ永続化**: UserDefaults + JSONEncoder/Decoder
- **アラーム**: AlarmKit (iOS 26.0+) / UserNotifications (フォールバック)

### APIインテグレーション

- **OpenAI API**: GPT-3.5-turbo
- **認証**: Bearer Token
- **リクエスト形式**: JSON over HTTPS
- **応答処理**: JSON parsing with completion handlers

### データ構造

```swift
// ユーザー指示
struct UserInstruction: Identifiable, Codable {
    let id: UUID
    var title: String
    var content: String
    var order: Int
    var isActive: Bool
    let useWebSearch: Bool
}

// 通話ログ
struct CallLog: Codable, Identifiable {
    let id: UUID
    let date: Date
    let duration: Int
    let conversationCount: Int
    let conversation: [(role: String, content: String)]
}

// アラーム設定
struct AlarmConfiguration: Identifiable, Codable {
    let id: UUID
    var label: String
    var time: Date
    var weekdays: Set<Int>
    var isEnabled: Bool
}
```

## トラブルシューティング

### よくある問題

1. **音声認識が動作しない**
   - マイク権限の確認
   - 音声認識権限の確認
   - インターネット接続の確認

2. **AI応答が取得できない**
   - OpenAI APIキーの確認
   - ネットワーク接続の確認
   - API制限の確認

3. **アラームが鳴らない**
   - 通知権限の確認
   - AlarmKit権限の確認（iOS 26.0+）
   - アラーム有効状態の確認

### デバッグ手順

1. **ログ確認**
   ```swift
   print("Debug message")
   ```

2. **権限状態確認**
   ```swift
   let micStatus = AVAudioSession.sharedInstance().recordPermission
   let speechStatus = SFSpeechRecognizer.authorizationStatus()
   ```

3. **API応答確認**
   - Xcode Consoleでネットワークリクエストログを確認
   - APIレスポンスのエラーメッセージを確認

## カスタマイズポイント

### AI指示のカスタマイズ

デフォルトの指示を変更する場合は`SettingsViewModel.swift`の`loadSettings()`メソッドを編集：

```swift
instructions = [
    UserInstruction(
        title: "カスタム指示",
        content: "あなた専用の指示内容",
        order: 1,
        isActive: true,
        useWebSearch: false
    )
]
```

### UI/UXのカスタマイズ

- カラースキーム: `Assets.xcassets/AccentColor.colorset/Contents.json`
- アプリアイコン: `Assets.xcassets/AppIcon.appiconset/`
- フォント: `ContentView.swift`のText要素
- アニメーション: SwiftUIのanimation modifiers

### アラーム機能の拡張

`AlarmSettingsView.swift`で以下をカスタマイズ可能：

- デフォルトアラーム時刻
- サウンド設定
- スヌーズ機能
- カスタムアクション

## パフォーマンス最適化

### メモリ管理

- weak referencesの適切な使用
- Combineパブリッシャーの適切な解放
- 音声リソースの適切な管理

### バッテリー効率

- バックグラウンド処理の最小化
- 音声エンジンの適切な停止
- タイマーの適切な管理

### ネットワーク最適化

- APIコール回数の最適化
- レスポンスキャッシュの実装
- エラー時のリトライ戦略

## ビルドとデプロイ

### 開発ビルド

```bash
# Xcodeでビルド
⌘+B

# シミュレーターで実行
⌘+R
```

### リリースビルド

1. Archive作成 (⌘+Shift+B)
2. App Store Connect にアップロード
3. TestFlight での配布
4. App Store 審査申請

### 必要な証明書

- iOS Development Certificate
- iOS Distribution Certificate
- Provisioning Profile (Development/Distribution)

## セキュリティ考慮事項

### APIキー管理

- ユーザーが自身のAPIキーを設定
- KeychainまたはUserDefaultsに暗号化保存
- アプリ内にAPIキーをハードコードしない

### プライバシー保護

- 音声データのローカル処理
- 会話ログの端末内保存
- 不要なデータの自動削除

### 権限管理

- 最小限の権限要求
- 権限用途の明確な説明
- 権限拒否時の適切なフォールバック

## 今後の拡張予定

### 機能拡張

- [ ] Web検索機能の実装
- [ ] 多言語サポート
- [ ] Apple Watch対応
- [ ] Siri Shortcuts統合
- [ ] HealthKit連携

### 技術改善

- [ ] Core Data導入
- [ ] CloudKit同期
- [ ] WidgetKit対応
- [ ] Live Activities
- [ ] App Intents拡張

---

## サポート

質問や問題がある場合は、プロジェクトのIssueトラッカーまでお問い合わせください。