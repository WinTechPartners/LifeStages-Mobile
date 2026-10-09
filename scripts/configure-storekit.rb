require 'fileutils'
require 'xcodeproj'
require 'json'
root = File.expand_path('..', __dir__)
app = File.join(root, 'ios/App/App')
project = Xcodeproj::Project.open(File.join(root, 'ios/App/App.xcodeproj'))
group = project.main_group.find_subpath('App', false)
target = project.targets.find { |t| t.name == 'App' }
raise 'App target or group missing' unless group && target
required_native = %w[LifeStagesBridgeViewController.swift LifeStagesStoreKitPlugin.swift]
required_native.each do |file|
  raise "Required native source missing: #{file}" unless File.file?(File.join(root, 'native/ios', file))
end
Dir[File.join(root, 'native/ios/*.swift')].each do |source|
  file = File.basename(source)
  FileUtils.cp(source, File.join(app, file))
  ref = group.files.find { |f| f.path == file } || group.new_file(file)
  target.source_build_phase.add_file_reference(ref, true)
end
target.build_configurations.each do |c|
  c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  c.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.bibleforlifestages'
end
project.save
storyboard = File.join(app, 'Base.lproj/Main.storyboard')
text = File.read(storyboard)
unless text.include?('LifeStagesBridgeViewController')
  raise 'Unexpected bridge storyboard' unless text.include?('customClass="CAPBridgeViewController"')
  text = text.sub('customClass="CAPBridgeViewController" customModule="Capacitor"', 'customClass="LifeStagesBridgeViewController" customModule="App" customModuleProvider="target"')
  raise 'Bridge replacement failed' unless text.include?('LifeStagesBridgeViewController')
  File.write(storyboard, text)
end
brand = File.join(root, 'public/images/front-page-icon.jpg')
raise 'LifeStages brand artwork missing' unless File.file?(brand)
icon_dir = File.join(app, 'Assets.xcassets/AppIcon.appiconset')
FileUtils.mkdir_p(icon_dir)
raise 'App icon conversion failed' unless system('sips', '-s', 'format', 'png', brand, '--out', File.join(icon_dir, 'LifeStages.png'), out: File::NULL)
File.write(File.join(icon_dir, 'Contents.json'), JSON.pretty_generate({images: [{filename: 'LifeStages.png', idiom: 'universal', platform: 'ios', size: '1024x1024'}], info: {version: 1, author: 'xcode'}}))
splash_dir = File.join(app, 'Assets.xcassets/Splash.imageset')
FileUtils.mkdir_p(splash_dir)
FileUtils.cp(File.join(icon_dir, 'LifeStages.png'), File.join(splash_dir, 'LifeStages.png'))
File.write(File.join(splash_dir, 'Contents.json'), JSON.pretty_generate({images: [{filename: 'LifeStages.png', idiom: 'universal'}], info: {version: 1, author: 'xcode'}}))
launch = File.join(app, 'Base.lproj/LaunchScreen.storyboard')
launch_text = File.read(launch).sub('contentMode="scaleAspectFill"', 'contentMode="scaleAspectFit"')
launch_text = launch_text.sub('<color key="backgroundColor" systemColor="systemBackgroundColor"/>', '<color key="backgroundColor" red="0.047" green="0.098" blue="0.161" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>')
File.write(launch, launch_text)
puts 'Existing LifeStages artwork installed for the app icon and launch screen.'
puts 'Direct StoreKit bridge registered in the iOS app target.'
