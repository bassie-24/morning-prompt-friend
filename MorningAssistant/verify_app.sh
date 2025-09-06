#!/bin/bash

# MorningAssistant iOS App 自動検証スクリプト
# 使用方法: ./verify_app.sh [all|structure|build|analyze|help]

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクト設定
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_NAME="MorningAssistant"
XCODEPROJ="${PROJECT_NAME}.xcodeproj"
SCHEME="${PROJECT_NAME}"

# ログファイル
LOG_DIR="${PROJECT_DIR}/verification_logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/verify_${TIMESTAMP}.log"

# ログディレクトリ作成
mkdir -p "${LOG_DIR}"

# ログ出力関数
log() {
    echo -e "$1" | tee -a "${LOG_FILE}"
}

# セクション表示関数
print_section() {
    log "\n${BLUE}════════════════════════════════════════════════════════${NC}"
    log "${BLUE}  $1${NC}"
    log "${BLUE}════════════════════════════════════════════════════════${NC}\n"
}

# 結果表示関数
print_result() {
    if [ $1 -eq 0 ]; then
        log "${GREEN}✅ $2${NC}"
    else
        log "${RED}❌ $2${NC}"
    fi
}

# ヘルプ表示
show_help() {
    cat << EOF
使用方法: $0 [オプション]

オプション:
    all       - すべての検証を実行
    structure - プロジェクト構造の検証のみ
    build     - ビルド検証のみ
    analyze   - 静的解析のみ
    help      - このヘルプを表示

例:
    $0 all      # すべての検証を実行
    $0 build    # ビルドのみ実行
EOF
}

# プロジェクト構造の検証
verify_structure() {
    print_section "プロジェクト構造の検証"
    
    log "📁 必須ファイルの確認..."
    
    # 必須ファイルリスト
    declare -a required_files=(
        "${PROJECT_NAME}/MorningAssistantApp.swift"
        "${PROJECT_NAME}/ContentView.swift"
        "${PROJECT_NAME}/Info.plist"
        "${PROJECT_NAME}/Models/Models.swift"
        "${PROJECT_NAME}/Services/DataManager.swift"
        "${PROJECT_NAME}/Services/NotificationService.swift"
        "${PROJECT_NAME}/Services/OpenAIService.swift"
        "${PROJECT_NAME}/Services/SpeechService.swift"
        "${PROJECT_NAME}/Views/HomeView.swift"
        "${PROJECT_NAME}/Views/AlarmView.swift"
        "${PROJECT_NAME}/Views/CallLogView.swift"
        "${PROJECT_NAME}/Views/SettingsView.swift"
    )
    
    local all_found=true
    for file in "${required_files[@]}"; do
        if [ -f "${PROJECT_DIR}/${file}" ]; then
            log "  ✅ ${file}"
        else
            log "  ❌ ${file} - ファイルが見つかりません"
            all_found=false
        fi
    done
    
    if [ "$all_found" = true ]; then
        print_result 0 "すべての必須ファイルが存在します"
    else
        print_result 1 "一部の必須ファイルが見つかりません"
    fi
    
    log "\n📊 Swiftファイル統計:"
    local swift_count=$(find "${PROJECT_DIR}/${PROJECT_NAME}" -name "*.swift" -type f | wc -l)
    log "  Swiftファイル数: ${swift_count}"
    
    log "\n📦 Import文の解析:"
    grep -h "^import" "${PROJECT_DIR}/${PROJECT_NAME}"/**/*.swift 2>/dev/null | sort | uniq | while read -r line; do
        log "  $line"
    done
}

# ビルド設定の確認
verify_build_settings() {
    print_section "ビルド設定の確認"
    
    log "🔧 プロジェクト情報の取得..."
    
    cd "${PROJECT_DIR}"
    
    # Scheme一覧
    log "\n利用可能なScheme:"
    xcodebuild -list -project "${XCODEPROJ}" 2>&1 | grep -A 100 "Schemes:" | tail -n +2 | head -10 | while read -r scheme; do
        log "  • $scheme"
    done
    
    # ビルド設定の主要項目
    log "\n主要なビルド設定:"
    xcodebuild -project "${XCODEPROJ}" -showBuildSettings 2>/dev/null | grep -E "PRODUCT_BUNDLE_IDENTIFIER|IPHONEOS_DEPLOYMENT_TARGET|SWIFT_VERSION|PRODUCT_NAME" | head -10 | while read -r setting; do
        log "  $setting"
    done
}

# ビルド実行
verify_build() {
    print_section "ビルド検証"
    
    cd "${PROJECT_DIR}"
    
    log "🔨 クリーンビルドを開始..."
    
    # クリーン
    xcodebuild clean -project "${XCODEPROJ}" -scheme "${SCHEME}" &>/dev/null
    
    # ビルド
    local build_log="${LOG_DIR}/build_${TIMESTAMP}.log"
    log "  ログ: ${build_log}"
    
    if xcodebuild -project "${XCODEPROJ}" \
                  -scheme "${SCHEME}" \
                  -configuration Debug \
                  -destination 'platform=iOS Simulator,name=iPhone 15,OS=latest' \
                  build &> "${build_log}"; then
        print_result 0 "ビルド成功"
        
        # 警告の確認
        local warning_count=$(grep -c "warning:" "${build_log}" 2>/dev/null || echo "0")
        if [ "$warning_count" -gt 0 ]; then
            log "${YELLOW}⚠️  警告: ${warning_count}件${NC}"
            log "\n警告の詳細（最初の5件）:"
            grep "warning:" "${build_log}" | head -5 | while read -r warning; do
                log "  ${warning}"
            done
        fi
    else
        print_result 1 "ビルド失敗"
        log "\nエラーの詳細:"
        grep "error:" "${build_log}" | head -10 | while read -r error; do
            log "  ${error}"
        done
    fi
}

# 静的解析
verify_analyze() {
    print_section "静的解析"
    
    cd "${PROJECT_DIR}"
    
    log "🔍 静的解析を実行中..."
    
    local analyze_log="${LOG_DIR}/analyze_${TIMESTAMP}.log"
    log "  ログ: ${analyze_log}"
    
    if xcodebuild -project "${XCODEPROJ}" \
                  -scheme "${SCHEME}" \
                  -configuration Debug \
                  analyze &> "${analyze_log}"; then
        print_result 0 "静的解析完了"
        
        # 問題の確認
        local issue_count=$(grep -c "issue:" "${analyze_log}" 2>/dev/null || echo "0")
        if [ "$issue_count" -gt 0 ]; then
            log "${YELLOW}⚠️  検出された問題: ${issue_count}件${NC}"
            grep "issue:" "${analyze_log}" | head -5 | while read -r issue; do
                log "  ${issue}"
            done
        fi
    else
        print_result 1 "静的解析失敗"
    fi
}

# Info.plist検証
verify_info_plist() {
    print_section "Info.plist設定の検証"
    
    local plist_path="${PROJECT_DIR}/${PROJECT_NAME}/Info.plist"
    
    if [ -f "$plist_path" ]; then
        log "📝 権限設定の確認:"
        
        # 権限設定の確認
        declare -a permissions=(
            "NSMicrophoneUsageDescription:マイク使用許可"
            "NSSpeechRecognitionUsageDescription:音声認識許可"
            "NSUserNotificationUsageDescription:通知許可"
        )
        
        for permission in "${permissions[@]}"; do
            IFS=':' read -r key desc <<< "$permission"
            if /usr/libexec/PlistBuddy -c "Print :$key" "$plist_path" &>/dev/null; then
                local value=$(/usr/libexec/PlistBuddy -c "Print :$key" "$plist_path" 2>/dev/null)
                log "  ✅ ${desc}: \"${value}\""
            else
                log "  ❌ ${desc}: 未設定"
            fi
        done
        
        log "\n📱 アプリ情報:"
        local bundle_id=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$plist_path" 2>/dev/null || echo "未設定")
        local version=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$plist_path" 2>/dev/null || echo "未設定")
        log "  Bundle ID: ${bundle_id}"
        log "  Version: ${version}"
    else
        print_result 1 "Info.plistが見つかりません"
    fi
}

# サマリー表示
show_summary() {
    print_section "検証サマリー"
    
    log "📊 検証結果:"
    log "  実行日時: $(date '+%Y-%m-%d %H:%M:%S')"
    log "  ログファイル: ${LOG_FILE}"
    log ""
    log "${GREEN}検証が完了しました。詳細はログファイルを確認してください。${NC}"
    log ""
    log "次のステップ:"
    log "  1. 上記の結果を確認"
    log "  2. エラーや警告があれば対処"
    log "  3. Xcodeで手動確認を実施"
}

# メイン処理
main() {
    log "${GREEN}MorningAssistant iOS App 検証開始${NC}"
    log "実行時刻: $(date '+%Y-%m-%d %H:%M:%S')"
    
    case "${1:-all}" in
        all)
            verify_structure
            verify_build_settings
            verify_info_plist
            verify_build
            verify_analyze
            show_summary
            ;;
        structure)
            verify_structure
            verify_info_plist
            ;;
        build)
            verify_build
            ;;
        analyze)
            verify_analyze
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log "${RED}不明なオプション: $1${NC}"
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"
