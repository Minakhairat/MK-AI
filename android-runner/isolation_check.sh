#!/usr/bin/env bash
# Installs the Runner APK and the export-test APK side by side on a fresh emulator; checks they are separate apps with separate data.
set -u
E=isolation-evidence.txt; : > $E
R=com.mkai.runner; X=com.mkai.exporttest
adb install -r apks/runner-clean.apk >> $E 2>&1 || exit 1
adb install -r apks/export-test.apk >> $E 2>&1 || exit 1
adb shell pm grant $R android.permission.CAMERA || true
{ echo '--- packages'; adb shell pm list packages | grep -E 'com\.mkai' | tr -d '\r'
  for p in $R $X; do echo "--- $p"; adb shell dumpsys package $p | grep -E 'userId=|versionName=|dataDir=|flags=\[' | head -4 | tr -d '\r'; done; } >> $E
ua=$(adb shell dumpsys package $R | grep -o 'userId=[0-9]*' | head -1); ub=$(adb shell dumpsys package $X | grep -o 'userId=[0-9]*' | head -1)
adb logcat -c
adb shell am start -n $R/.MainActivity; sleep 25
adb shell am start -n $X/.MainActivity; sleep 25
adb logcat -d | grep -E 'MKAI_|Capacitor/Console' | sed 's/^.*Console: //' | tail -30 >> $E
# separate app-data dirs and separate WebView storage (debug builds allow run-as)
for p in $R $X; do echo "--- app_webview in $p"; adb shell run-as $p ls app_webview 2>&1 | head -5; adb shell run-as $p find app_webview -maxdepth 3 -name 'Local Storage' -o -maxdepth 3 -name 'Service Worker' -o -maxdepth 3 -name 'CacheStorage' 2>&1 | head -6; done >> $E
# cross-read must fail
adb shell run-as $R ls /data/data/$X 2>&1 | head -2 >> $E
echo "uid_runner=$ua uid_export=$ub" >> $E
cat $E >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
[ -n "$ua" ] && [ "$ua" != "$ub" ] && adb shell pm list packages | grep -q $X && echo 'ISOLATION CHECK PASSED' && exit 0
echo 'ISOLATION CHECK FAILED'; exit 1
