# MK AI first-run setup. Downloads Python, PyTorch (CPU) and the other libraries directly from their official
# distributors (python.org, pytorch.org, pypi.org, huggingface.co). Nothing third-party is shipped inside this folder.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocol]::Tls12
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$interactive = -not ($env:MKAI_NONINTERACTIVE -eq '1')
function Say($m) { Write-Host "[MK AI] $m" }

# 1) Microsoft Visual C++ Redistributable (x64): needed by PyTorch. Downloaded from Microsoft only, never bundled.
$have = $false
try { $v = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64' -ErrorAction Stop; if ($v.Installed -eq 1) { $have = $true } } catch {}
if ($env:MKAI_FORCE_NO_VCRT -eq '1') { $have = $false }
if (-not $have) {
  Say 'One free Microsoft component is missing: Microsoft Visual C++ Redistributable (x64).'
  Say 'Official download: https://aka.ms/vc14/vc_redist.x64.exe'
  if (-not $interactive) { exit 2 }
  $a = Read-Host 'Download it from Microsoft and install it now? Windows will ask for permission (Y/N)'
  if ($a -notmatch '^[Yy]') { Say 'Install it from the link above, then run MK-AI.bat again.'; exit 2 }
  $vc = Join-Path $env:TEMP 'vc_redist.x64.exe'
  Invoke-WebRequest 'https://aka.ms/vc14/vc_redist.x64.exe' -OutFile $vc
  $p = Start-Process $vc -ArgumentList '/install','/passive','/norestart' -Verb RunAs -Wait -PassThru
  if ($p.ExitCode -notin 0,1638,3010) { Say "Microsoft installer exit code $($p.ExitCode). Install it manually from the link above."; exit 2 }
}

# 2) Python 3.12 embeddable package from python.org, checked against the MD5 that python.org publishes for it
$py = Join-Path $root 'python'
if (-not (Test-Path "$py\python.exe")) {
  Say 'Downloading Python 3.12.10 from python.org (about 10 MB)...'
  $zip = Join-Path $env:TEMP 'python-embed.zip'
  Invoke-WebRequest 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip' -OutFile $zip
  $md5 = (Get-FileHash $zip -Algorithm MD5).Hash.ToLower()
  if ($md5 -ne 'fe8ef205f2e9c3ba44d0cf9954e1abd3') { throw "Python download checksum mismatch ($md5)" }
  Expand-Archive $zip -DestinationPath $py -Force
  Set-Content "$py\python312._pth" @('python312.zip','.','Lib\site-packages','import site') -Encoding ASCII
  New-Item -ItemType Directory "$py\Lib\site-packages" -Force | Out-Null
  Say 'Downloading pip from pypa.io...'
  Invoke-WebRequest 'https://bootstrap.pypa.io/get-pip.py' -OutFile "$py\get-pip.py"
  & "$py\python.exe" "$py\get-pip.py" --no-warn-script-location
  if ($LASTEXITCODE -ne 0) { throw 'pip setup failed' }
}
$env:PYTHONNOUSERSITE = '1'
# 3) Libraries from PyTorch.org and PyPI (versions pinned in constraints.txt, the set proven by our Windows CI)
if (-not (Test-Path "$root\python\.libs-done")) {
  Say 'Downloading PyTorch (CPU) and libraries, about 1 to 2 GB. This takes a while once.'
  & "$py\python.exe" -m pip install --no-warn-script-location torch==2.6.0 torchvision==0.21.0 -r "$root\requirements.txt" -c "$root\constraints.txt" --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple
  if ($LASTEXITCODE -ne 0) { throw 'library download failed (check the internet connection)' }
  New-Item "$root\python\.libs-done" -ItemType File | Out-Null
}
# 4) Detector backbone (PekingU/rtdetr_r18vd, Apache-2.0 per its model card) from Hugging Face, pinned revision
if (-not (Test-Path "$root\hf\.backbone-done")) {
  Say 'Downloading the detector starting model from Hugging Face (about 80 MB)...'
  $env:HF_HUB_CACHE = "$root\hf"
  & "$py\python.exe" -c "from huggingface_hub import snapshot_download as s; print(s('PekingU/rtdetr_r18vd', revision='ac77a11ff0170a41b771c03264987f8ce2b0d753'))"
  if ($LASTEXITCODE -ne 0) { throw 'model download failed' }
  New-Item "$root\hf\.backbone-done" -ItemType File | Out-Null
}
Say 'Setup finished. It will not be repeated; later starts work without the internet.'
exit 0
