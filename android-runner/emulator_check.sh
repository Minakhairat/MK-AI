#!/usr/bin/env bash
set -u
APK=wrap/android/app/build/outputs/apk/debug/app-debug.apk
adb install -r "$APK" || exit 1
adb shell pm grant com.mkai.exporttest android.permission.CAMERA || true
adb logcat -c
adb shell am start -n com.mkai.exporttest/.MainActivity
for i in $(seq 1 60); do
  sleep 5
  if adb logcat -d | grep -q 'MKAI_NATIVE_'; then break; fi
done
adb logcat -d | grep -E 'MKAI_NATIVE_|Capacitor/Console' | tail -20
adb logcat -d | grep -q 'MKAI_NATIVE_OK' && echo 'EMULATOR CHECK PASSED' && exit 0
echo 'EMULATOR CHECK FAILED'; exit 1
