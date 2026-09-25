#!/usr/bin/env ruby

require 'xcodeproj'

# プロジェクトパス
project_path = 'MorningAssistant.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# メインターゲットを取得
target = project.targets.find { |t| t.name == 'MorningAssistant' }

unless target
  puts "Error: Target 'MorningAssistant' not found"
  exit 1
end

# すべてのファイル参照をクリア
puts "Clearing all file references..."

# ビルドフェーズをクリア
target.source_build_phase.clear
target.resources_build_phase.clear

# 既存のグループを削除して再作成
main_group = project.main_group
main_group.groups.find { |g| g.display_name == 'MorningAssistant' }&.remove_from_project

# MorningAssistantグループを作成
app_group = main_group.new_group('MorningAssistant', 'MorningAssistant')

# Servicesグループを作成
services_group = app_group.new_group('Services', 'Services')

# Modelsグループを作成
models_group = app_group.new_group('Models', 'Models')

# Viewsグループを作成
views_group = app_group.new_group('Views', 'Views')

# ファイルを追加
puts "Adding files..."

# メインファイル
['MorningAssistantApp.swift', 'ContentView.swift'].each do |file_name|
  file_ref = app_group.new_reference(file_name)
  target.source_build_phase.add_file_reference(file_ref)
  puts "Added: #{file_name}"
end

# Servicesファイル
['AlarmKitService.swift', 'NotificationService.swift', 'DataManager.swift', 'OpenAIService.swift', 'SpeechService.swift'].each do |file_name|
  file_ref = services_group.new_reference(file_name)
  target.source_build_phase.add_file_reference(file_ref)
  puts "Added: Services/#{file_name}"
end

# Modelsファイル
file_ref = models_group.new_reference('Models.swift')
target.source_build_phase.add_file_reference(file_ref)
puts "Added: Models/Models.swift"

# Viewsファイル
['HomeView.swift', 'AlarmView.swift', 'CallLogView.swift', 'SettingsView.swift'].each do |file_name|
  file_ref = views_group.new_reference(file_name)
  target.source_build_phase.add_file_reference(file_ref)
  puts "Added: Views/#{file_name}"
end

# Assets.xcassetsを追加
assets_ref = app_group.new_reference('Assets.xcassets')
target.resources_build_phase.add_file_reference(assets_ref)
puts "Added: Assets.xcassets"

# Info.plistを追加
info_plist_ref = app_group.new_reference('Info.plist')
puts "Added: Info.plist"

# プロジェクトを保存
project.save

puts "\nProject paths fixed with relative paths!"
puts "All files have been added correctly."
