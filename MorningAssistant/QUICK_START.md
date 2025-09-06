# MorningAssistant 検証クイックスタート

## 🚀 即座に検証を開始

### 1. 最速で全検証を実行
```bash
cd /Users/apple/projects/morning-prompt-friend/MorningAssistant
./verify_app.sh all
```

### 2. 部分的な検証

#### ファイル構造のみ確認（5秒）
```bash
./verify_app.sh structure
```

#### ビルドのみ実行（1-2分）
```bash
./verify_app.sh build
```

#### 静的解析のみ（30秒）
```bash
./verify_app.sh analyze
```

## 📋 検証チェックリスト

### 自動検証項目（スクリプトで実行）
- [ ] プロジェクト構造の確認
- [ ] 必須ファイルの存在確認
- [ ] Info.plist設定の検証
- [ ] ビルド成功確認
- [ ] 静的解析の実行

### 手動検証項目（Xcodeで確認）
- [ ] プロジェクトを開く
  ```bash
  open MorningAssistant.xcodeproj
  ```
- [ ] Team設定の確認
- [ ] シミュレータで実行（Cmd + R）
- [ ] 基本動作の確認

## 🔍 検証結果の確認

検証ログは以下に保存されます：
```
MorningAssistant/verification_logs/
├── verify_YYYYMMDD_HHMMSS.log    # メインログ
├── build_YYYYMMDD_HHMMSS.log     # ビルドログ
└── analyze_YYYYMMDD_HHMMSS.log   # 解析ログ
```

最新のログを確認：
```bash
ls -lt verification_logs/ | head -5
```

## ⚠️ よくある問題と対処

### 1. "Scheme not found" エラー
```bash
# Schemeリストを確認
xcodebuild -list -project MorningAssistant.xcodeproj
```

### 2. シミュレータが見つからない
```bash
# 利用可能なシミュレータを確認
xcrun simctl list devices | grep "iPhone"
```

### 3. ビルドエラーの詳細確認
```bash
# 最新のビルドログを開く
open verification_logs/build_*.log
```

## 📊 検証頻度の推奨

| タイミング | 実行コマンド | 所要時間 |
|-----------|------------|---------|
| コミット前 | `./verify_app.sh structure` | 5秒 |
| プルリクエスト前 | `./verify_app.sh build` | 1-2分 |
| リリース前 | `./verify_app.sh all` | 3-5分 |

## 🛠 カスタマイズ

検証スクリプトの設定を変更する場合：
```bash
vim verify_app.sh

# プロジェクト名やScheme名を変更
PROJECT_NAME="MorningAssistant"
SCHEME="MorningAssistant"
```

## 📚 詳細ドキュメント

完全な検証手順については以下を参照：
- [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) - 詳細な検証手順書

## 💡 Tips

1. **並列実行で時間短縮**
   ```bash
   # 構造とビルドを別ターミナルで同時実行
   ./verify_app.sh structure & ./verify_app.sh build
   ```

2. **結果のフィルタリング**
   ```bash
   # エラーのみ表示
   ./verify_app.sh all | grep -E "❌|error:"
   ```

3. **定期実行の設定**
   ```bash
   # crontabで毎日AM9時に実行
   0 9 * * * cd /path/to/MorningAssistant && ./verify_app.sh all
   ```

---
最終更新: 2024-01
