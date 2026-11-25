#!/usr/bin/env bash
set -u
APK=wrap/android/app/build/outputs/apk/debug/app-debug.apk
adb install -r "$APK" || exit 1
adb shell pm grant ${APP_ID:-com.mkai.exporttest} android.permission.CAMERA || true

adb shell cmd connectivity airplane-mode enable || true
adb shell svc wifi disable || true
adb shell svc data disable || true
sleep 3
adb shell dumpsys connectivity | grep -m3 -iE 'NetworkAgentInfo|state' > /tmp/net.txt || true
adb logcat -c
adb shell am start -n ${APP_ID:-com.mkai.exporttest}/.MainActivity
for i in $(seq 1 60); do
  sleep 5
  if adb logcat -d | grep -q 'MKAI_NATIVE_'; then break; fi
done
adb exec-out screencap -p > emu-shot.png || true
adb shell input keyevent KEYCODE_HOME; sleep 2; adb exec-out screencap -p > emu-home.png || true
adb logcat -d | grep -E 'MKAI_NATIVE_|Capacitor/Console' | tail -20 | tee /tmp/mkai_log.txt
{ echo '### Emulator WebView check (airplane mode on, wifi and data disabled before launch)'; echo 'network state:'; head -3 /tmp/net.txt; echo '### Emulator WebView check'; echo '```'; grep -h 'MKAI_NATIVE_' /tmp/mkai_log.txt | tail -3; echo '```'; } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
adb logcat -d | grep -q 'MKAI_NATIVE_OK' && echo 'EMULATOR CHECK PASSED' && exit 0
echo 'EMULATOR CHECK FAILED'; exit 1
