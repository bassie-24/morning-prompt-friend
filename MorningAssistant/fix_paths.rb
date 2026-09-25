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

# プロジェクトからすべてのSwiftファイルを削除
def remove_all_swift_files(group)
  to_remove = []
  
  group.children.each do |child|
    if child.is_a?(Xcodeproj::Project::Object::PBXFileReference) && child.path && child.path.end_with?('.swift')
      to_remove << child
    elsif child.is_a?(Xcodeproj::Project::Object::PBXGroup)
      remove_all_swift_files(child)
    end
  end
  
  to_remove.each { |ref| ref.remove_from_project }
end

# 既存のSwiftファイルをすべて削除
puts "Removing all Swift file references..."
remove_all_swift_files(project.main_group)

# MorningAssistantグループを取得
main_group = project.main_group['MorningAssistant']

unless main_group
  puts "Creating MorningAssistant group..."
  main_group = project.main_group.new_group('MorningAssistant')
end

# 正しいファイルパスで追加
files_to_add = {
  '' => [
    'MorningAssistant/MorningAssistantApp.swift',
    'MorningAssistant/ContentView.swift'
  ],
  'Services' => [
    'MorningAssistant/Services/AlarmKitService.swift',
    'MorningAssistant/Services/NotificationService.swift',
    'MorningAssistant/Services/DataManager.swift',
    'MorningAssistant/Services/OpenAIService.swift',
    'MorningAssistant/Services/SpeechService.swift'
  ],
  'Models' => [
    'MorningAssistant/Models/Models.swift'
  ],
  'Views' => [
    'MorningAssistant/Views/HomeView.swift',
    'MorningAssistant/Views/AlarmView.swift',
    'MorningAssistant/Views/CallLogView.swift',
    'MorningAssistant/Views/SettingsView.swift'
  ]
}

# ビルドフェーズをクリア
source_build_phase = target.source_build_phase
source_build_phase.clear

# ファイルを追加
files_to_add.each do |group_name, file_paths|
  # グループを取得または作成
  if group_name.empty?
    group = main_group
  else
    group = main_group[group_name] || main_group.new_group(group_name)
  end
  
  file_paths.each do |file_path|
    if File.exist?(file_path)
      # ファイル参照を作成
      file_ref = group.new_reference(file_path)
      file_ref.name = File.basename(file_path)
      
      # ビルドフェーズに追加
      source_build_phase.add_file_reference(file_ref)
      puts "Added: #{file_path}"
    else
      puts "Warning: File not found: #{file_path}"
    end
  end
end

# Assets.xcassetsを追加
if File.exist?('MorningAssistant/Assets.xcassets')
  assets_ref = main_group.new_reference('MorningAssistant/Assets.xcassets')
  assets_ref.name = 'Assets.xcassets'
  target.resources_build_phase.add_file_reference(assets_ref)
  puts "Added: MorningAssistant/Assets.xcassets"
end

# Info.plistの参照を設定
if File.exist?('MorningAssistant/Info.plist')
  info_plist_ref = main_group.new_reference('MorningAssistant/Info.plist')
  info_plist_ref.name = 'Info.plist'
  puts "Added: MorningAssistant/Info.plist"
end

# プロジェクトを保存
project.save

puts "\nProject paths fixed successfully!"
puts "All files have been re-added with correct paths."
