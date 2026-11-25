#!/usr/bin/env bash
# Emulator (Android 13, airplane mode): the TEST apk imports the real exported zips and infers real held-out photos. Logcat is kept for scoring.
set -u
APP=com.mkai.runner; E=native-real-evidence.txt; : > $E
adb install -r apks/runner-real-test.apk || exit 1
adb shell cmd connectivity airplane-mode enable || true; adb shell svc wifi disable || true; adb shell svc data disable || true; sleep 4
{ echo "airplane_mode_on=$(adb shell settings get global airplane_mode_on | tr -d '\r')"; adb shell ping -c 2 -W 2 8.8.8.8 2>&1 | tail -2; } >> $E
adb logcat -c; adb logcat -v brief 'chromium:I' 'Capacitor/Console:I' '*:S' > native_log_full.txt 2>&1 &
LP=$!
adb shell am start -n $APP/.MainActivity
for i in $(seq 1 240); do sleep 5; grep -q -E 'MKAI_REAL_(DONE|FAIL)' native_log_full.txt && break; done
kill $LP 2>/dev/null; sleep 1
adb exec-out screencap -p > native-real-shot.png || true
grep -E 'MKAI_REAL' native_log_full.txt | sed 's/^.*Console: //;s/^.*INFO:CONSOLE[^"]*"//' > native_real_lines.txt
echo "log lines: $(wc -l < native_real_lines.txt)" >> $E
grep -E 'MKAI_REAL_(IMPORTED|DONE|FAIL)' native_real_lines.txt >> $E
cat $E >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
grep -q MKAI_REAL_DONE native_real_lines.txt && exit 0; echo 'NATIVE REAL RUN FAILED'; exit 1
