#!/bin/bash

# iOS実機テスト用ビルドスクリプト
# Phase 4: iOS実機テスト・App Store準備

echo "🚀 iOS実機テスト用ビルドを開始します..."

# 1. 最新のWebビルドを作成
echo "📦 Webビルドを作成中..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Webビルドに失敗しました"
    exit 1
fi

# 2. CapacitorでiOSプロジェクトに反映
echo "📱 iOSプロジェクトに反映中..."
npx cap copy ios

if [ $? -ne 0 ]; then
    echo "❌ Capacitorコピーに失敗しました"
    exit 1
fi

# 3. 依存関係の更新（必要に応じて）
echo "🔄 Capacitorプラグインを更新中..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo "❌ Capacitor同期に失敗しました"
    exit 1
fi

echo "✅ iOS実機テスト用ビルドが完了しました！"
echo ""
echo "📋 次のステップ:"
echo "1. Macで以下のコマンドを実行してXcodeを開く:"
echo "   npx cap open ios"
echo ""
echo "2. Xcodeで以下を確認:"
echo "   - 署名とプロビジョニングプロファイルの設定"
echo "   - 実機デバイスの選択"
echo "   - Build & Run でアプリを実機にインストール"
echo ""
echo "3. iOS実機で以下の機能をテスト:"
echo "   - 🎤 音声入力機能（マイク許可）"
echo "   - 🔍 Web検索機能（Responses API）"
echo "   - 🔔 アラーム・通知機能（通知許可）"
echo "   - 📱 プラットフォーム判定とサービス切り替え"
echo ""
echo "4. 開発者コンソールでログを確認:"
echo "   - Safari > 開発 > [デバイス名] > [アプリ名]"
echo "   - プラットフォーム情報とサービス選択のログ"
echo ""
echo "🎯 実機テストのポイント:"
echo "   - 音声認識の精度と応答速度"
echo "   - Web検索のレスポンス時間"
echo "   - 通知の確実な動作"
echo "   - バックグラウンド時の動作"
echo ""