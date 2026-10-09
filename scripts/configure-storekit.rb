require 'fileutils'
require 'xcodeproj'
root = File.expand_path('..', __dir__)
app = File.join(root, 'ios/App/App')
project = Xcodeproj::Project.open(File.join(root, 'ios/App/App.xcodeproj'))
group = project.main_group.find_subpath('App', false)
target = project.targets.find { |t| t.name == 'App' }
raise 'App target or group missing' unless group && target
Dir[File.join(root, 'native/ios/*.swift')].each do |source|
  file = File.basename(source)
  FileUtils.cp(source, File.join(app, file))
  ref = group.files.find { |f| f.path == file } || group.new_file(file)
  target.source_build_phase.add_file_reference(ref, true)
end
target.build_configurations.each { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0' }
project.save
storyboard = File.join(app, 'Base.lproj/Main.storyboard')
text = File.read(storyboard)
unless text.include?('LifeStagesBridgeViewController')
  raise 'Unexpected bridge storyboard' unless text.include?('customClass="CAPBridgeViewController"')
  text = text.sub('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="LifeStagesBridgeViewController" customModule="App" customModuleProvider="target"')
  raise 'Bridge replacement failed' unless text.include?('LifeStagesBridgeViewController')
  File.write(storyboard, text)
end
puts 'Direct StoreKit bridge registered in the iOS app target.'
