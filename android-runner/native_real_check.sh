#!/usr/bin/env bash
# Emulator (Android 13, airplane mode): the TEST apk imports the real exported zips and infers real held-out photos.
# Streams progress, bounded stage waits: fails fast if the app logs nothing for SILENCE seconds, hard cap TOTAL seconds. Always saves the full log and crash evidence.
set -u
APP=com.mkai.runner; E=native-real-evidence.txt; : > $E; SILENCE=${SILENCE:-180}; TOTAL=${TOTAL:-1500}
adb install -r apks/runner-real-test.apk || exit 1
adb shell cmd connectivity airplane-mode enable || true; adb shell svc wifi disable || true; adb shell svc data disable || true; sleep 4
{ echo "airplane_mode_on=$(adb shell settings get global airplane_mode_on | tr -d '\r')"; adb shell ping -c 2 -W 2 8.8.8.8 2>&1 | tail -2; adb shell getprop ro.build.version.release; adb shell cat /proc/meminfo | head -2; } >> $E
adb logcat -c; adb logcat -v time > native_log_full.txt 2>&1 &
LP=$!
adb shell am start -n $APP/.MainActivity
start=$(date +%s); last=$start; prev=0
while true; do sleep 10; now=$(date +%s)
  n=$(grep -c 'MKAI_REAL' native_log_full.txt); [ "$n" != "$prev" ] && { last=$now; prev=$n; }
  echo "t=$((now-start))s mkai_lines=$n last_stage: $(grep -o 'MKAI_REAL_STAGE[^"]*' native_log_full.txt | tail -1 | cut -c1-120)"
  grep -q -E 'MKAI_REAL_(DONE|FAIL)' native_log_full.txt && break
  [ $((now-last)) -gt $SILENCE ] && { echo "NO APP LOG OUTPUT FOR ${SILENCE}s: harness stalled or app crashed"; echo "STALL after ${SILENCE}s silence" >> $E; break; }
  [ $((now-start)) -gt $TOTAL ] && { echo "TOTAL CAP ${TOTAL}s reached"; echo "TOTAL CAP" >> $E; break; }
done
kill $LP 2>/dev/null; sleep 1
adb exec-out screencap -p > native-real-shot.png || true
{ echo '--- crash / memory evidence'; grep -i -E 'FATAL|AndroidRuntime|lowmemorykiller|Out of memory|OOM|killing|died|renderer|Render process|crash' native_log_full.txt | tail -25; echo '--- app process alive?'; adb shell pidof $APP || echo 'NOT RUNNING'; echo '--- last MKAI lines'; grep 'MKAI_REAL' native_log_full.txt | grep -v 'REAL_DET \|REAL_CLS ' | tail -15 | cut -c1-220; } >> $E
grep -E 'MKAI_REAL' native_log_full.txt > native_real_lines.txt
echo "mkai log lines: $(wc -l < native_real_lines.txt)" >> $E
cat $E >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
grep -q MKAI_REAL_DONE native_real_lines.txt && exit 0; echo 'NATIVE REAL RUN INCOMPLETE'; exit 1
