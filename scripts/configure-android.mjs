import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const android=path.join(root,'android')
const source=path.join(android,'app/src/main/java/com/bibleforlifestages')
fs.mkdirSync(source,{recursive:true})
fs.copyFileSync('native/android/LifeStagesGoogleBillingPlugin.java',path.join(source,'LifeStagesGoogleBillingPlugin.java'))
fs.writeFileSync(path.join(source,'MainActivity.java'),`package com.bibleforlifestages;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle savedInstanceState) {
  registerPlugin(LifeStagesGoogleBillingPlugin.class);
  super.onCreate(savedInstanceState);
 }
}`)
let variables=fs.readFileSync(path.join(android,'variables.gradle'),'utf8').replace(/compileSdkVersion\s*=\s*\d+/,'compileSdkVersion = 36').replace(/targetSdkVersion\s*=\s*\d+/,'targetSdkVersion = 36').replace(/minSdkVersion\s*=\s*\d+/,'minSdkVersion = 24')
fs.writeFileSync(path.join(android,'variables.gradle'),variables)
const buildFile=path.join(android,'build.gradle')
fs.writeFileSync(buildFile,fs.readFileSync(buildFile,'utf8').replace(/com.android.tools.build:gradle:[^']+/,'com.android.tools.build:gradle:8.9.2'))
const wrapper=path.join(android,'gradle/wrapper/gradle-wrapper.properties')
fs.writeFileSync(wrapper,fs.readFileSync(wrapper,'utf8').replace(/gradle-[\d.]+-all.zip/,'gradle-8.11.1-all.zip'))
const appBuild=path.join(android,'app/build.gradle')
let gradle=fs.readFileSync(appBuild,'utf8').replace(/versionCode\s+\d+/,`versionCode ${Number(process.env.ANDROID_VERSION_CODE)||1}`)
gradle+=`\ndependencies { implementation 'com.android.billingclient:billing:8.3.0' }\n`
// Signing credentials are supplied by a protected release environment only.
gradle+=`\nif (System.getenv('ANDROID_KEYSTORE_PATH')) {
 android {
  signingConfigs { release {
   storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
   storePassword System.getenv('ANDROID_STORE_PASSWORD')
   keyAlias System.getenv('ANDROID_KEY_ALIAS')
   keyPassword System.getenv('ANDROID_KEY_PASSWORD')
  } }
  buildTypes { release { signingConfig signingConfigs.release } }
 }
}\n`
fs.writeFileSync(appBuild,gradle)
// Preserve the same verified tree/book identity as the iPhone app.
const icon='public/images/lifestages-app-icon.png'
if(!fs.existsSync(icon)) throw Error('The verified LifeStages app icon is missing')
for(const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']) {
  const icons=path.join(android,`app/src/main/res/mipmap-${density}`)
  fs.mkdirSync(icons,{recursive:true})
  for(const name of ['ic_launcher','ic_launcher_round','ic_launcher_foreground']) fs.copyFileSync(icon,path.join(icons,`${name}.png`))
}
fs.copyFileSync(icon,path.join(android,'app/src/main/res/drawable/lifestages_icon.png'))
for(const name of ['ic_launcher','ic_launcher_round']) fs.writeFileSync(path.join(android,'app/src/main/res/mipmap-anydpi-v26',`${name}.xml`),`<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/lifestages_icon"/></adaptive-icon>`)
console.log('Android native billing registered; target SDK 36; min SDK 24.')
