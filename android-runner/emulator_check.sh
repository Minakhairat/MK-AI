#!/usr/bin/env bash
# CI emulator check. APK and APP_ID come from the environment. Evidence is written to evidence.txt and uploaded.
set -u
APK=${APK:-wrap/android/app/build/outputs/apk/debug/app-debug.apk}; APP=${APP_ID:-com.mkai.runner}
E=evidence.txt; : > $E
adb install -r "$APK" || exit 1
adb shell pm grant $APP android.permission.CAMERA || true
adb shell cmd connectivity airplane-mode enable || true
adb shell svc wifi disable || true
adb shell svc data disable || true
sleep 4
{ echo "airplane_mode_on=$(adb shell settings get global airplane_mode_on | tr -d '\r')"; echo "ping 8.8.8.8:"; adb shell ping -c 2 -W 2 8.8.8.8 2>&1 | tail -3; echo "dns example.com:"; adb shell ping -c 1 -W 2 example.com 2>&1 | tail -2; } >> $E
adb logcat -c
adb shell am start -n $APP/.MainActivity
for i in $(seq 1 60); do sleep 5; adb logcat -d | grep -q -E 'MKAI_NATIVE_(OK|FAIL)' && break; done
adb exec-out screencap -p > emu-shot.png || true
adb logcat -d | grep -E 'MKAI_|Capacitor/Console' | tail -40 > mkai_log.txt
{ echo '--- console lines'; grep -h 'MKAI_' mkai_log.txt | sed 's/^.*Console: //' ; } >> $E
adb shell input keyevent KEYCODE_HOME; sleep 2; adb exec-out screencap -p > emu-home.png || true
cat $E >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
grep -q 'MKAI_NATIVE_OK' mkai_log.txt && echo 'EMULATOR CHECK PASSED' && exit 0
echo 'EMULATOR CHECK FAILED'; exit 1
