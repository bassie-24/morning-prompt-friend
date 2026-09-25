# 🚀 Xcode自動化クイックリファレンス

## 基本コマンド（AIアシスタント用）

### 🔴 最重要：コード修正後の自動実行
```bash
# これ1つですべて実行（推奨）
cd /Users/apple/projects/morning-prompt-friend/MorningAssistant && ruby xcode_automation.rb all
```

---

## 📝 シナリオ別コマンド

### 1. 新しいファイルを作成した場合
```bash
# 例：新しいServiceファイルを作成
write "MorningAssistant/Services/WeatherService.swift"

# Xcodeに追加してビルド・実行
run_terminal_cmd "cd MorningAssistant && ruby xcode_automation.rb all"
```

### 2. 既存ファイルを修正した場合
```bash
# 例：AlarmKitServiceを修正
search_replace "MorningAssistant/Services/AlarmKitService.swift" ...

# ビルドして実行
run_terminal_cmd "cd MorningAssistant && ruby xcode_automation.rb build && ruby xcode_automation.rb run"
```

### 3. ビルドエラーが出た場合
```bash
# エラー修復して再実行
run_terminal_cmd "cd MorningAssistant && ruby xcode_automation.rb fix && ruby xcode_automation.rb build"
```

### 4. アプリをテストする場合
```bash
# シミュレーターで起動
run_terminal_cmd "cd MorningAssistant && ruby xcode_automation.rb run"

# スクリーンショットを撮る
run_terminal_cmd "xcrun simctl io 'iPhone 16 Pro' screenshot ~/Desktop/test.png"
```

---

## ⚡ ワンライナー集

```bash
# 完全リセット＆ビルド
cd MorningAssistant && ruby xcode_automation.rb all

# ファイル追加のみ
cd MorningAssistant && ruby xcode_automation.rb add

# エラー修復のみ
cd MorningAssistant && ruby xcode_automation.rb fix

# ビルドのみ
cd MorningAssistant && ruby xcode_automation.rb build

# 実行のみ
cd MorningAssistant && ruby xcode_automation.rb run
```

---

## 🎯 AIアシスタントの標準手順

### コード変更時の標準フロー
```python
# 1. コードを修正
modify_code()

# 2. 自動化スクリプト実行
run_terminal_cmd("cd MorningAssistant && ruby xcode_automation.rb all")

# 3. 結果確認
check_simulator_output()
```

---

## ✅ これだけ覚えれば大丈夫！

**何か変更したら、これを実行：**
```bash
cd MorningAssistant && ruby xcode_automation.rb all
```

**これで以下がすべて自動実行されます：**
1. ✅ 新規ファイルの追加
2. ✅ 重複の削除
3. ✅ パスの修正
4. ✅ クリーンビルド
5. ✅ アプリのビルド
6. ✅ シミュレーターで起動

---

## 🔥 緊急時のコマンド

```bash
# Xcodeプロジェクトが壊れた場合
cd MorningAssistant && ruby fix_paths_relative.rb && ruby xcode_automation.rb all

# シミュレーターがフリーズした場合
xcrun simctl shutdown all && xcrun simctl erase all

# すべてをリセットしたい場合
rm -rf ~/Library/Developer/Xcode/DerivedData/MorningAssistant-*
cd MorningAssistant && ruby xcode_automation.rb all
```
