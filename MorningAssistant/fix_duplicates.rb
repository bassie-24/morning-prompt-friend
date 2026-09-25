#!/usr/bin/env ruby

require 'xcodeproj'
require 'set'

# プロジェクトパス
project_path = 'MorningAssistant.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# メインターゲットを取得
target = project.targets.find { |t| t.name == 'MorningAssistant' }

unless target
  puts "Error: Target 'MorningAssistant' not found"
  exit 1
end

# ソースビルドフェーズを取得
source_build_phase = target.source_build_phase

# ファイル名と参照を記録
file_references = {}
duplicates = []

# すべてのファイル参照を確認
source_build_phase.files.each do |build_file|
  file_ref = build_file.file_ref
  next unless file_ref
  
  # ファイル名を取得（パスの最後の部分）
  file_name = file_ref.display_name || File.basename(file_ref.path || "")
  
  if file_references[file_name]
    # 重複を発見
    duplicates << build_file
    puts "Found duplicate: #{file_name}"
  else
    # 初めて見るファイル
    file_references[file_name] = build_file
  end
end

# 重複を削除
duplicates.each do |build_file|
  source_build_phase.remove_build_file(build_file)
  file_name = build_file.file_ref ? (build_file.file_ref.display_name || "unknown") : "unknown"
  puts "Removed duplicate reference: #{file_name}"
end

# プロジェクト全体から重複ファイル参照を削除
def remove_duplicate_file_refs(group, seen_paths = Set.new)
  to_remove = []
  
  group.children.each do |child|
    if child.is_a?(Xcodeproj::Project::Object::PBXFileReference)
      path = child.real_path.to_s rescue child.path
      if path && seen_paths.include?(path)
        to_remove << child
        puts "Removing duplicate file reference: #{child.display_name || child.path}"
      else
        seen_paths.add(path) if path
      end
    elsif child.is_a?(Xcodeproj::Project::Object::PBXGroup)
      remove_duplicate_file_refs(child, seen_paths)
    end
  end
  
  to_remove.each { |ref| ref.remove_from_project }
end

# プロジェクト全体から重複を削除
remove_duplicate_file_refs(project.main_group)

# プロジェクトを保存
project.save

puts "\nFixed #{duplicates.count} duplicate build file references"
puts "Project saved successfully!"
