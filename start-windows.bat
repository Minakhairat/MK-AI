@echo off
rem MK AI local trainer launcher for Windows (prototype). Untested on a real Windows desktop; CI runs it in check mode only.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python 3.10 or newer is required: https://www.python.org/downloads/ & exit /b 1)
where node >nul 2>nul || (echo Node.js 22 or newer is required: https://nodejs.org/ & exit /b 1)
if not "%MKAI_CHECK%"=="1" (
  if not exist venv\Scripts\activate.bat python -m venv venv
  call venv\Scripts\activate.bat
  if not exist venv\.deps (
    python -m pip install --upgrade pip || exit /b 1
    pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu || exit /b 1
    pip install -r requirements.txt || exit /b 1
    echo ok> venv\.deps
  )
)
if not exist node_modules call npm install || exit /b 1
if not exist studio\template\files.json call npm run setup || exit /b 1
if "%MKAI_CHECK%"=="1" (
  python -c "import os,sys;sys.exit(0 if all(os.path.exists(p) for p in ['studio/template/files.json','studio/template/base/feat.onnx','studio/ort.min.js','build/detect-template/ort.min.js']) else 1)" || exit /b 1
  echo check ok
  exit /b 0
)
start "" http://127.0.0.1:8000
python server\studio_server.py 8000
