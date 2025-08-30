# AlarmKit セットアップガイド

## 現在の状況
iOS 26.0シミュレータで `{"code":"UNIMPLEMENTED"}` エラーが発生しています。これはAlarmKitプラグインがXcodeプロジェクトに正しく統合されていないためです。

## 手動でのXcode設定手順

### 1. 前提条件の確認
- Xcode 16.0+ （AlarmKit対応）
- iOS 26.0+ シミュレータまたは実機
- プロジェクトのDeployment Target設定

### 2. Xcodeでプロジェクトを開く
```bash
npx cap copy ios
npx cap open ios
```

### 3. Deployment Targetを更新（重要）
1. プロジェクトナビゲータで `App` プロジェクトを選択
2. `TARGETS` → `App` を選択  
3. `General` タブで `Deployment Info` → `iOS` を `26.0` に設定

### 4. AlarmKitプラグインファイルをプロジェクトに追加

1. Xcodeで `App` グループを右クリック → `New Group` → `Plugins` グループを作成
2. `Plugins` グループを右クリック → `Add Files to "App"`
3. 以下のファイルを選択・追加：
   - `ios/App/App/Plugins/AlarmKitPlugin.swift`
   - `ios/App/App/Plugins/AlarmKitPlugin.m`
4. `Add to target` で `App` にチェックが入っていることを確認

### 5. AlarmKitフレームワークを追加

1. `TARGETS` → `App` → `General` タブ
2. `Frameworks, Libraries, and Embedded Content` セクションで `+` ボタン
3. `AlarmKit.framework` を検索して追加
4. `Embed & Sign` に設定

### 5. Info.plistの確認

`NSAlarmKitUsageDescription` キーが追加されていることを確認：
```xml
<key>NSAlarmKitUsageDescription</key>
<string>朝のAIアシスタントは指定された時刻にアラームを鳴らして起動するためにAlarmKitを使用します</string>
```

### 6. ビルド・テスト

```bash
# Capacitorファイルをコピー
npx cap copy ios

# Xcodeでビルド・実行
```

## 代替案：AlarmKit未対応の場合

現在の実装では、AlarmKitが利用できない場合は自動的にNotificationServiceにフォールバックします。

- iOS 26.0未満: NotificationService使用
- AlarmKit権限なし: NotificationService使用  
- プラグインエラー: NotificationService使用

この設計により、AlarmKit対応前でも既存機能は正常に動作します。

## 確認事項

以下のコマンドでAlarmKitが正しく設定されているか確認できます：

```bash
# Xcodeプロジェクトでフレームワークリンクを確認
xcodebuild -showBuildSettings -target App | grep FRAMEWORK_SEARCH_PATHS

# シミュレータでログ確認
# iOS 26.0シミュレータでアプリを起動し、コンソールログをチェック
```

## 期待される動作

### 成功時のログ
```
📱 iOS: AlarmKit service initialized successfully
📱 iOS: AlarmKitサービスを使用します
```

### フォールバック時のログ  
```
📱 iOS: AlarmKit plugin not available, falling back to NotificationService
📱 iOS: NotificationServiceを使用します
```