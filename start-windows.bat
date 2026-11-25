@echo off
rem MK AI local trainer launcher for Windows (prototype). Not tested on a real Windows desktop; CI runs it in check mode only.
rem MKAI_CHECK=1 runs the checks without installing or starting anything (used by CI).
cd /d "%~dp0"
setlocal
where python >nul 2>nul || (echo [MK AI] Python was not found. Install Python 3.10 or newer from https://www.python.org/downloads/ and tick "Add python.exe to PATH", then run this file again. & goto :fail)
python -c "import sys;sys.exit(0 if sys.version_info>=(3,10) else 1)" || (echo [MK AI] Your Python is too old. Python 3.10 or newer is required. & goto :fail)
where node >nul 2>nul || (echo [MK AI] Node.js was not found. Install Node.js 22 or newer from https://nodejs.org/ then run this file again. & goto :fail)
node -e "process.exit(parseInt(process.versions.node)>=22?0:1)" || (echo [MK AI] Your Node.js is too old. Node.js 22 or newer is required. & goto :fail)
if "%MKAI_CHECK%"=="1" goto :npmstep
if not exist venv\.deps (
  echo [MK AI] First run. This downloads PyTorch ^(CPU build^), the Python packages, npm packages and a pretrained model.
  echo [MK AI] The download is large and needs a working internet connection and free disk space. Later runs skip this.
  choice /m "Continue"
  if errorlevel 2 goto :fail
  if not exist venv\Scripts\activate.bat python -m venv venv || goto :fail
  call venv\Scripts\activate.bat
  python -m pip install --upgrade pip || (echo [MK AI] Could not update pip. Check your internet connection. & goto :fail)
  pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu || (echo [MK AI] PyTorch install failed. Check your internet connection and disk space. & goto :fail)
  pip install -r requirements.txt || (echo [MK AI] Python package install failed. & goto :fail)
  echo ok> venv\.deps
) else (
  call venv\Scripts\activate.bat
)

:npmstep
if not exist node_modules call npm install || (echo [MK AI] npm install failed. & goto :fail)
if not exist studio\template\files.json call npm run setup || (echo [MK AI] Setup failed. See the messages above. & goto :fail)
if "%MKAI_CHECK%"=="1" goto :checkonly
echo [MK AI] Starting. A browser tab opens at http://127.0.0.1:8000 . Keep this window open while you use MK AI. Close it to stop.
start "" http://127.0.0.1:8000
python server\studio_server.py 8000
echo [MK AI] The server stopped. If this was not expected, read the messages above.
goto :fail

:checkonly
python -c "import os,sys;sys.exit(0 if all(os.path.exists(p) for p in ['studio/template/files.json','studio/template/base/feat.onnx','studio/ort.min.js','build/detect-template/app.js','build/detect-template/NOTICE-MODEL.txt','build/detect-template/THIRD-PARTY-NOTICES.txt','studio/template/THIRD-PARTY-NOTICES.txt']) else 1)" || (echo check failed: assets missing & exit /b 1)
echo check ok
exit /b 0

:fail
if "%MKAI_CHECK%"=="1" exit /b 1
echo.
echo [MK AI] Stopped. Press any key to close this window.
pause >nul
exit /b 1
