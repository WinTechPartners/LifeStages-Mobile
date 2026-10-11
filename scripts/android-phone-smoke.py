import pathlib, re, subprocess, time, xml.etree.ElementTree as ET

output = pathlib.Path('build/android-phone')
output.mkdir(parents=True, exist_ok=True)
def adb(*args):
    return subprocess.run(['adb',*args], check=True, capture_output=True).stdout
def screen(name):
    (output / (name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
def tree():
    adb('shell','uiautomator','dump','/sdcard/lifestages-ui.xml')
    data=adb('shell','cat','/sdcard/lifestages-ui.xml')
    (output/'latest-ui.xml').write_bytes(data)
    return ET.fromstring(data)
def text(root):
    return ' '.join(node.get('text','')+' '+node.get('content-desc','') for node in root.iter('node'))
def wait_for(label):
    for attempt in range(12):
        root=tree()
        if label.lower() in text(root).lower():
            return root
        time.sleep(5)
    raise RuntimeError('Android screen did not display '+label)
def tap_label(root, label):
    candidates=[node for node in root.iter('node') if node.get('text','').strip().lower()==label.lower() or node.get('content-desc','').strip().lower()==label.lower()]
    if not candidates:
        raise RuntimeError('Android control is missing: '+label)
    node=candidates[-1]
    coordinates=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
    adb('shell','input','tap',str((coordinates[0]+coordinates[2])//2),str((coordinates[1]+coordinates[3])//2))

adb('install','-r','test-apk/app-debug.apk')
adb('logcat','-c')
adb('shell','am','start','-n','com.bibleforlifestages/.MainActivity')
try:
    root=wait_for('Read the Bible')
    screen('home')
    tap_label(root,'Bible')
    root=wait_for('Testament')
    screen('bible')
    adb('shell','input','keyevent','4')
    root=wait_for('Read the Bible')
    tap_label(root,'Premium')
    root=wait_for('Choose Your Plan')
    screen('subscription')
    if 'Google Play' not in text(root):
        raise RuntimeError('Android subscription page did not identify Google Play')
    (output/'result.txt').write_text('PASS: native cold launch, Bible navigation, and Google Play paywall displayed. Purchase not attempted.\n')
finally:
    screen('final')
    (output/'logcat.txt').write_bytes(adb('logcat','-d'))
