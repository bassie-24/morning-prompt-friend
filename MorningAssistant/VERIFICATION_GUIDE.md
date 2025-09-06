# MorningAssistant iOS アプリ検証手順書

## 概要
このドキュメントは、MorningAssistant iOSアプリの検証を標準化し、再現可能な手順として文書化したものです。

## 検証環境要件
- macOS（Xcode対応バージョン）
- Xcode 15.0以上
- Command Line Tools for Xcode
- iOS Simulator

## 検証手順

### フェーズ1: 自動検証（コマンドライン実行可能）

#### 1.1 プロジェクト構造の確認

```bash
# プロジェクトディレクトリへ移動
cd /Users/apple/projects/morning-prompt-friend/MorningAssistant

# ファイル構造の確認
find . -name "*.swift" -type f | head -20

# 必須ファイルの存在確認
ls -la MorningAssistant/MorningAssistantApp.swift
ls -la MorningAssistant/ContentView.swift
ls -la MorningAssistant/Info.plist
```

#### 1.2 ソースコードの静的検証

```bash
# Swiftファイルの文法チェック
find MorningAssistant -name "*.swift" -exec swiftc -parse {} \; 2>&1 | grep -E "error:|warning:"

# import文の確認
grep -r "^import" MorningAssistant --include="*.swift" | sort | uniq

# 未実装メソッドの検出
grep -r "fatalError\|TODO\|FIXME" MorningAssistant --include="*.swift"
```

#### 1.3 プロジェクト設定の確認

```bash
# 利用可能なSchemeとターゲットの確認
xcodebuild -list -project MorningAssistant.xcodeproj

# ビルド設定の詳細確認
xcodebuild -project MorningAssistant.xcodeproj -showBuildSettings | grep -E "PRODUCT_BUNDLE_IDENTIFIER|IPHONEOS_DEPLOYMENT_TARGET|SWIFT_VERSION"

# Info.plist設定の確認
/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" MorningAssistant/Info.plist
/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" MorningAssistant/Info.plist
/usr/libexec/PlistBuddy -c "Print :NSMicrophoneUsageDescription" MorningAssistant/Info.plist
/usr/libexec/PlistBuddy -c "Print :NSSpeechRecognitionUsageDescription" MorningAssistant/Info.plist
```

#### 1.4 ビルド検証

```bash
# クリーンビルド
xcodebuild clean -project MorningAssistant.xcodeproj -scheme MorningAssistant

# デバッグビルド（エラー検出）
xcodebuild -project MorningAssistant.xcodeproj \
           -scheme MorningAssistant \
           -configuration Debug \
           -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
           build 2>&1 | tee build_log.txt

# ビルドエラーの確認
grep -E "error:|failed" build_log.txt

# 警告の確認
grep "warning:" build_log.txt | head -20
```

#### 1.5 静的解析

```bash
# Xcodeの静的解析実行
xcodebuild -project MorningAssistant.xcodeproj \
           -scheme MorningAssistant \
           -configuration Debug \
           analyze 2>&1 | tee analyze_log.txt

# 解析結果の確認
grep -E "error:|warning:|issue:" analyze_log.txt
```

#### 1.6 依存関係の確認

```bash
# CocoaPodsの確認（もし使用している場合）
if [ -f "Podfile" ]; then
    pod install --repo-update
    echo "Pods installed"
else
    echo "No Podfile found"
fi

# Swift Package Managerの確認
xcodebuild -resolvePackageDependencies -project MorningAssistant.xcodeproj
```

### フェーズ2: 半自動検証（結果の解釈が必要）

#### 2.1 シミュレータビルド

```bash
# iPhoneシミュレータ用ビルド
xcodebuild -project MorningAssistant.xcodeproj \
           -scheme MorningAssistant \
           -sdk iphonesimulator \
           -configuration Debug \
           -derivedDataPath ./DerivedData \
           build

# ビルド成果物の確認
find ./DerivedData -name "*.app" -type d
```

#### 2.2 テスト実行（もしテストがある場合）

```bash
# ユニットテストの実行
xcodebuild test -project MorningAssistant.xcodeproj \
                -scheme MorningAssistant \
                -destination 'platform=iOS Simulator,name=iPhone 15' \
                2>&1 | tee test_log.txt

# テスト結果の確認
grep -E "Test Suite|passed|failed" test_log.txt
```

### フェーズ3: 手動検証（人間による確認必須）

#### 3.1 Xcodeでの確認項目

1. **プロジェクトナビゲーター**
   - [ ] すべてのファイルが正しくリンクされている（赤い表示がない）
   - [ ] グループ構造が適切に整理されている

2. **ビルド設定**
   - [ ] Team設定が正しい
   - [ ] Bundle Identifierが適切
   - [ ] Deployment Targetが適切（iOS 15.0以上推奨）
   - [ ] Code Signing設定が正しい

3. **Capabilities**
   - [ ] 必要な機能が有効化されている
     - Background Modes（audio, fetch, processing）
     - Push Notifications（必要な場合）

#### 3.2 シミュレータ/実機での動作確認

1. **起動確認**
   - [ ] アプリが正常に起動する
   - [ ] 初期画面が表示される
   - [ ] クラッシュしない

2. **権限リクエスト**
   - [ ] マイクアクセス許可ダイアログが表示される
   - [ ] 音声認識許可ダイアログが表示される
   - [ ] 通知許可ダイアログが表示される

3. **基本機能確認**
   - [ ] 各画面への遷移が正常に動作する
   - [ ] 音声入力機能が動作する（許可後）
   - [ ] 設定の保存・読み込みが動作する
   - [ ] APIキー設定が機能する

4. **画面別確認**
   - [ ] HomeView: 基本表示と操作
   - [ ] AlarmView: アラーム設定機能
   - [ ] CallLogView: ログ表示機能
   - [ ] SettingsView: 設定変更機能

#### 3.3 エッジケース確認

1. **エラーハンドリング**
   - [ ] ネットワークエラー時の動作
   - [ ] APIキー未設定時の動作
   - [ ] 権限拒否時の動作

2. **パフォーマンス**
   - [ ] メモリ使用量が適切
   - [ ] 応答速度が適切

## トラブルシューティング

### よくあるエラーと対処法

#### 1. ビルドエラー: "No such module"
```bash
# 依存関係の再解決
xcodebuild -resolvePackageDependencies
```

#### 2. Code Signing エラー
```bash
# 署名設定の確認
security find-identity -v -p codesigning
```

#### 3. シミュレータが見つからない
```bash
# 利用可能なシミュレータの確認
xcrun simctl list devices
```

## 検証結果の記録

### 検証レポートテンプレート

```markdown
## 検証実施日: YYYY-MM-DD

### 環境情報
- macOS: [バージョン]
- Xcode: [バージョン]
- iOS SDK: [バージョン]

### 自動検証結果
- [ ] ビルド成功
- [ ] 静的解析パス
- [ ] 警告数: [数]

### 手動検証結果
- [ ] 起動確認
- [ ] 基本機能動作
- [ ] エラーハンドリング

### 発見された問題
1. [問題の詳細]
2. [問題の詳細]

### 推奨アクション
- [対応が必要な項目]
```

## 検証頻度の推奨

- **日次**: 自動ビルド検証（CI/CD環境がある場合）
- **週次**: フルビルドと静的解析
- **リリース前**: 完全な手動検証を含むフル検証

## 更新履歴

- 2024-01-XX: 初版作成
- [更新日]: [更新内容]

---

この手順書は定期的に見直し、プロジェクトの成長に合わせて更新してください。
