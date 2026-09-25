#!/usr/bin/env ruby

# ==============================================================================
# Xcode Project Automation Script
# ==============================================================================
# This script automates Xcode project management for MorningAssistant
# Features:
# - Auto-detect and add new Swift files
# - Remove duplicate references
# - Fix file paths
# - Build and run in simulator
# ==============================================================================

require 'xcodeproj'
require 'pathname'
require 'fileutils'
require 'open3'

class XcodeAutomation
  attr_reader :project, :target, :main_group
  
  PROJECT_NAME = 'MorningAssistant'
  PROJECT_PATH = 'MorningAssistant.xcodeproj'
  SIMULATOR_NAME = 'iPhone 16 Pro'
  
  def initialize
    @project = Xcodeproj::Project.open(PROJECT_PATH)
    @target = @project.targets.find { |t| t.name == PROJECT_NAME }
    @main_group = @project.main_group[PROJECT_NAME]
    
    unless @target
      puts "❌ Error: Target '#{PROJECT_NAME}' not found"
      exit 1
    end
    
    unless @main_group
      puts "❌ Error: Group '#{PROJECT_NAME}' not found"
      exit 1
    end
  end
  
  # ==============================================================================
  # 1. Scan and add all Swift files
  # ==============================================================================
  def scan_and_add_files
    puts "\n📂 Scanning for Swift files..."
    
    # Define folder structure
    folders = {
      'Models' => 'MorningAssistant/Models',
      'Services' => 'MorningAssistant/Services',
      'Views' => 'MorningAssistant/Views',
      'ViewModels' => 'MorningAssistant/ViewModels',
      'Utils' => 'MorningAssistant/Utils'
    }
    
    # Root level files
    root_files = Dir.glob('MorningAssistant/*.swift')
    root_files.each do |file_path|
      add_file_to_project(file_path, @main_group)
    end
    
    # Folder files
    folders.each do |group_name, folder_path|
      next unless Dir.exist?(folder_path)
      
      group = @main_group[group_name] || @main_group.new_group(group_name)
      
      Dir.glob("#{folder_path}/*.swift").each do |file_path|
        add_file_to_project(file_path, group)
      end
    end
    
    puts "✅ File scanning complete"
  end
  
  # ==============================================================================
  # 2. Add single file to project
  # ==============================================================================
  def add_file_to_project(file_path, group)
    file_name = File.basename(file_path)
    relative_path = Pathname.new(file_path).relative_path_from(Pathname.new('.'))
    
    # Check for existing reference
    existing_ref = group.files.find { |f| 
      f.display_name == file_name || 
      f.path&.end_with?(file_name) ||
      f.real_path.to_s.end_with?(file_name)
    }
    
    if existing_ref
      # Ensure it's in build phase
      unless @target.source_build_phase.files_references.include?(existing_ref)
        @target.source_build_phase.add_file_reference(existing_ref)
        puts "  ➕ Added to build phase: #{file_name}"
      end
    else
      # Create new reference
      file_ref = group.new_reference(relative_path.to_s)
      file_ref.name = file_name
      
      # Add to build phase
      if file_path.end_with?('.swift')
        @target.source_build_phase.add_file_reference(file_ref)
        puts "  ✨ Added new file: #{file_name}"
      end
    end
  end
  
  # ==============================================================================
  # 3. Remove duplicate references
  # ==============================================================================
  def remove_duplicates
    puts "\n🔍 Checking for duplicates..."
    
    # Track seen files
    seen_files = {}
    duplicates_removed = 0
    
    # Check all build files
    @target.source_build_phase.files.each do |build_file|
      next unless build_file.file_ref
      
      file_name = build_file.file_ref.display_name || build_file.file_ref.path
      
      if seen_files[file_name]
        # Remove duplicate
        build_file.remove_from_project
        duplicates_removed += 1
        puts "  🗑️  Removed duplicate: #{file_name}"
      else
        seen_files[file_name] = true
      end
    end
    
    if duplicates_removed > 0
      puts "✅ Removed #{duplicates_removed} duplicates"
    else
      puts "✅ No duplicates found"
    end
  end
  
  # ==============================================================================
  # 4. Fix file paths
  # ==============================================================================
  def fix_file_paths
    puts "\n🔧 Fixing file paths..."
    paths_fixed = 0
    
    @target.source_build_phase.files.each do |build_file|
      file_ref = build_file.file_ref
      next unless file_ref
      
      # Get the expected path
      file_name = file_ref.display_name || File.basename(file_ref.path || '')
      
      # Find actual file
      actual_path = find_file(file_name)
      
      if actual_path
        # Remove redundant MorningAssistant prefix if it exists
        correct_path = actual_path.gsub(/^MorningAssistant\//, '')
        
        # Only update if path is different
        if file_ref.path != correct_path
          file_ref.path = correct_path
          paths_fixed += 1
          puts "  🔧 Fixed path: #{file_name} -> #{correct_path}"
        end
      end
    end
    
    if paths_fixed > 0
      puts "✅ Fixed #{paths_fixed} file paths"
    else
      puts "✅ All paths are correct"
    end
  end
  
  # ==============================================================================
  # 5. Find file in project
  # ==============================================================================
  def find_file(file_name)
    # Search in common locations (relative to project root)
    search_paths = [
      "MorningAssistant/#{file_name}",
      "MorningAssistant/Models/#{file_name}",
      "MorningAssistant/Services/#{file_name}",
      "MorningAssistant/Views/#{file_name}",
      "MorningAssistant/ViewModels/#{file_name}",
      "MorningAssistant/Utils/#{file_name}"
    ]
    
    search_paths.each do |path|
      return path if File.exist?(path)
    end
    
    # Fallback: search entire directory
    result = Dir.glob("MorningAssistant/**/*#{file_name}").first
    result
  end
  
  # ==============================================================================
  # 6. Clean build folder
  # ==============================================================================
  def clean_build
    puts "\n🧹 Cleaning build folder..."
    
    system("xcodebuild -project #{PROJECT_PATH} -scheme #{PROJECT_NAME} clean > /dev/null 2>&1")
    
    # Also clean DerivedData
    derived_data_path = "~/Library/Developer/Xcode/DerivedData/#{PROJECT_NAME}-*"
    system("rm -rf #{derived_data_path} 2>/dev/null")
    
    puts "✅ Build folder cleaned"
  end
  
  # ==============================================================================
  # 7. Build project
  # ==============================================================================
  def build_project
    puts "\n🔨 Building project..."
    
    cmd = "xcodebuild -project #{PROJECT_PATH} -scheme #{PROJECT_NAME} -destination 'platform=iOS Simulator,name=#{SIMULATOR_NAME}' build 2>&1"
    
    output, status = Open3.capture2e(cmd)
    
    if status.success?
      puts "✅ Build successful!"
      return true
    else
      puts "❌ Build failed!"
      puts output.lines.grep(/error:/).join
      return false
    end
  end
  
  # ==============================================================================
  # 8. Run in simulator
  # ==============================================================================
  def run_in_simulator
    puts "\n📱 Running in simulator..."
    
    # Boot simulator
    system("xcrun simctl boot '#{SIMULATOR_NAME}' 2>/dev/null || true")
    
    # Open Simulator app
    system("open -a Simulator")
    
    # Wait for simulator to boot
    sleep 3
    
    # Install and launch app
    app_path = Dir.glob("~/Library/Developer/Xcode/DerivedData/#{PROJECT_NAME}-*/Build/Products/Debug-iphonesimulator/#{PROJECT_NAME}.app").first
    
    if app_path && File.exist?(File.expand_path(app_path))
      # Uninstall old version
      system("xcrun simctl uninstall '#{SIMULATOR_NAME}' com.morningassistant.app 2>/dev/null || true")
      
      # Install new version
      system("xcrun simctl install '#{SIMULATOR_NAME}' '#{File.expand_path(app_path)}'")
      
      # Launch app
      system("xcrun simctl launch '#{SIMULATOR_NAME}' com.morningassistant.app")
      
      puts "✅ App launched in simulator!"
      return true
    else
      puts "❌ App not found. Please build first."
      return false
    end
  end
  
  # ==============================================================================
  # 9. Save project
  # ==============================================================================
  def save_project
    @project.save
    puts "\n💾 Project saved"
  end
  
  # ==============================================================================
  # Main execution
  # ==============================================================================
  def run(action = 'all')
    puts "=" * 80
    puts "🚀 Xcode Automation Script - #{PROJECT_NAME}"
    puts "=" * 80
    
    case action
    when 'add'
      scan_and_add_files
      save_project
    when 'fix'
      remove_duplicates
      fix_file_paths
      save_project
    when 'build'
      clean_build
      build_project
    when 'run'
      run_in_simulator
    when 'all'
      scan_and_add_files
      remove_duplicates
      fix_file_paths
      save_project
      clean_build
      if build_project
        run_in_simulator
      end
    else
      puts "Unknown action: #{action}"
      puts "Available actions: add, fix, build, run, all"
    end
    
    puts "\n✨ Done!"
  end
end

# ==============================================================================
# Command line interface
# ==============================================================================
if __FILE__ == $0
  action = ARGV[0] || 'all'
  
  begin
    automation = XcodeAutomation.new
    automation.run(action)
  rescue => e
    puts "❌ Error: #{e.message}"
    puts e.backtrace
    exit 1
  end
end
