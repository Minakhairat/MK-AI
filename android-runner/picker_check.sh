#!/usr/bin/env bash
# CI REQUIRED check (exit 1 when the import is not confirmed): real system file picker in the emulator. Pushes a good export zip to Downloads, taps the import button, picks the file, expects MKAI_RUNNER_IMPORTED in the console.
set -u
APP=${APP_ID:-com.mkai.runner}; E=picker-evidence.txt; : > $E
adb uninstall $APP >/dev/null 2>&1; adb install -r "$APK" || exit 1
adb push "$ZIP" /sdcard/Download/pick-test.zip
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/pick-test.zip >/dev/null
adb logcat -c; adb shell am start -n $APP/.MainActivity; sleep 15
tapnode(){ adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml ui.xml >/dev/null 2>&1
 python3 - "$1" <<'PY'
import re,sys,xml.etree.ElementTree as ET
t=sys.argv[1]
for n in ET.parse('ui.xml').iter('node'):
    if t in (n.get('text') or '')+(n.get('content-desc') or ''):
        m=re.findall(r'\d+',n.get('bounds'));x=(int(m[0])+int(m[2]))//2;y=(int(m[1])+int(m[3]))//2;print(x,y);sys.exit(0)
sys.exit(1)
PY
}
# the import button is WebView content that uiautomator cannot see: tap its position (measured on the emulator screenshot: about 73% across, 40% down)
read W H < <(adb shell wm size | grep -o '[0-9]*x[0-9]*' | tail -1 | tr x ' ')
X=$((W*73/100)); Y=$((H*40/100)); echo "screen ${W}x${H}, tapping import button at $X $Y" >> $E; adb exec-out screencap -p > picker-0.png
adb shell input tap $X $Y
sleep 6; adb exec-out screencap -p > picker-1.png
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml picker-picker-ui.xml >/dev/null 2>&1
for t in pick-test Downloads pick-test; do
 xy=$(tapnode "$t") && { echo "tapped '$t' at $xy" >> $E; adb shell input tap $xy; sleep 3; } || echo "'$t' not found in picker" >> $E
done
sleep 12; adb exec-out screencap -p > picker-2.png
adb logcat -d > picker_logcat_full.txt; grep -E 'MKAI_|Capacitor/Console' picker_logcat_full.txt | tail -20 | sed 's/^.*Console: //' >> $E
cat $E >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
for f in picker-1.png picker-2.png; do [ -s $f ] && { echo "<details><summary>$f base64</summary><pre>"; base64 -w0 $f; echo "</pre></details>"; } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; done
{ echo '<details><summary>picker ui dump</summary><pre>'; head -c 20000 picker-picker-ui.xml | sed 's/&/\&amp;/g;s/</\&lt;/g'; echo '</pre></details>'; } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
grep -q 'MKAI_RUNNER_IMPORTED' picker_logcat_full.txt && echo PICKER_IMPORT_OK && { echo PICKER_IMPORT_OK >> $E; exit 0; }
echo PICKER_IMPORT_NOT_CONFIRMED | tee -a $E; exit 1
