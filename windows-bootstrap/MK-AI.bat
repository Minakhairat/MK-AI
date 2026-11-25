@echo off
cd /d "%~dp0"
if not exist "python\.libs-done" goto setup
if not exist "hf\.backbone-done" goto setup
goto run
:setup
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows-bootstrap\setup.ps1"
if errorlevel 1 (
  echo [MK AI] Setup did not finish. Read the messages above, fix the cause and run this file again.
  if not "%MKAI_NOBROWSER%"=="1" pause
  exit /b 2
)
:run
set HF_HUB_CACHE=%~dp0hf
set HF_HUB_OFFLINE=1
set PYTHONNOUSERSITE=1
echo [MK AI] Starting. A browser tab opens at http://127.0.0.1:8000 . Keep this window open while you use MK AI. Close it to stop.
if not "%MKAI_NOBROWSER%"=="1" start "" http://127.0.0.1:8000
python\python.exe server\studio_server.py 8000
echo [MK AI] The server stopped. If this was not expected, read the messages above.
if not "%MKAI_NOBROWSER%"=="1" pause
