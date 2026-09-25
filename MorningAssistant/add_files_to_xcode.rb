#!/usr/bin/env ruby

require 'xcodeproj'
require 'pathname'

# プロジェクトパス
project_path = 'MorningAssistant.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# メインターゲットを取得
target = project.targets.find { |t| t.name == 'MorningAssistant' }

unless target
  puts "Error: Target 'MorningAssistant' not found"
  exit 1
end

# MorningAssistantグループを取得
main_group = project.main_group['MorningAssistant']

unless main_group
  puts "Error: Group 'MorningAssistant' not found"
  exit 1
end

# Servicesグループを取得または作成
services_group = main_group['Services'] || main_group.new_group('Services')

# ファイルを追加する関数
def add_file_to_group(group, file_path, target)
  file_name = File.basename(file_path)
  
  # 既存のファイル参照を探す
  existing_ref = group.files.find { |f| f.display_name == file_name || f.path == file_path }
  
  if existing_ref
    puts "File already exists: #{file_name}"
    # ビルドフェーズに追加されているか確認
    unless target.source_build_phase.files_references.include?(existing_ref)
      target.source_build_phase.add_file_reference(existing_ref)
      puts "Added to build phase: #{file_name}"
    end
  else
    # 新しいファイル参照を作成
    file_ref = group.new_reference(file_path)
    file_ref.name = file_name
    
    # ビルドフェーズに追加
    if file_path.end_with?('.swift')
      target.source_build_phase.add_file_reference(file_ref)
      puts "Added new file: #{file_name}"
    end
  end
end

# 追加するファイルのリスト
files_to_add = [
  'MorningAssistant/Services/AlarmKitService.swift',
  'MorningAssistant/Services/NotificationService.swift',
  'MorningAssistant/Services/DataManager.swift',
  'MorningAssistant/Services/OpenAIService.swift',
  'MorningAssistant/Services/SpeechService.swift'
]

# Modelsグループを取得または作成
models_group = main_group['Models'] || main_group.new_group('Models')

model_files = [
  'MorningAssistant/Models/Models.swift'
]

# Viewsグループを取得または作成  
views_group = main_group['Views'] || main_group.new_group('Views')

view_files = [
  'MorningAssistant/Views/HomeView.swift',
  'MorningAssistant/Views/AlarmView.swift',
  'MorningAssistant/Views/CallLogView.swift',
  'MorningAssistant/Views/SettingsView.swift'
]

# Servicesファイルを追加
files_to_add.each do |file_path|
  if File.exist?(file_path)
    add_file_to_group(services_group, file_path, target)
  else
    puts "Warning: File not found: #{file_path}"
  end
end

# Modelsファイルを追加
model_files.each do |file_path|
  if File.exist?(file_path)
    add_file_to_group(models_group, file_path, target)
  else
    puts "Warning: File not found: #{file_path}"
  end
end

# Viewsファイルを追加
view_files.each do |file_path|
  if File.exist?(file_path)
    add_file_to_group(views_group, file_path, target)
  else
    puts "Warning: File not found: #{file_path}"
  end
end

# プロジェクトを保存
project.save

puts "\nProject updated successfully!"
puts "All Swift files have been added to the Xcode project."
