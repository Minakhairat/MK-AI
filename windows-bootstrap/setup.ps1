# MK AI first-run setup. Downloads Python, pip, PyTorch (CPU), libraries and the detector backbone directly from their
# official distributors onto this PC. Nothing third-party is shipped inside this folder except the Studio web assets
# listed in windows-bootstrap\README-NOTICES.txt.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$interactive = -not ($env:MKAI_NONINTERACTIVE -eq '1')
function Say($m) { Write-Host "[MK AI] $m" }
function Sha256($f) { (Get-FileHash $f -Algorithm SHA256).Hash.ToLower() }
function Final-Host($url) {
  $r = Invoke-WebRequest $url -Method Head -UseBasicParsing
  if ($r.BaseResponse.ResponseUri) { return $r.BaseResponse.ResponseUri } else { return $r.BaseResponse.RequestMessage.RequestUri }
}
$py = Join-Path $root 'python'
$needVc = $false
$have = $false
try { $v = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64' -ErrorAction Stop; if ($v.Installed -eq 1) { $have = $true } } catch {}
if ($env:MKAI_FORCE_NO_VCRT -eq '1') { $have = $false }
$needPy = -not (Test-Path "$py\.libs-done")
$needHf = -not (Test-Path "$root\hf\.backbone-done")

if (-not $have) {
  Say 'One free Microsoft component is missing: Microsoft Visual C++ Redistributable (x64).'
  Say 'Official download: https://aka.ms/vc14/vc_redist.x64.exe'
  if (-not $interactive) { exit 2 }
}

# Tell the user what will be downloaded and installed, and ask first.
if ($interactive -or $env:MKAI_ASSUME_YES -ne '1') {
  Write-Host ''
  Say 'First-run setup. MK AI needs these, downloaded now from the official sources onto this PC (internet needed once):'
  if (-not $have) { Write-Host '  - Microsoft Visual C++ Redistributable (x64), from Microsoft. Installing it makes Windows ask for permission (administrator).' }
  if ($needPy) {
    Write-Host '  - Python 3.12.10 (python.org, about 10 MB), checked by SHA-256 and the Python Software Foundation signature'
    Write-Host '  - pip (pypi.org, pinned and checked by SHA-256)'
    Write-Host '  - PyTorch CPU (download.pytorch.org) and libraries from pypi.org, about 1 to 2 GB, installed inside this folder only'
  }
  if ($needHf) { Write-Host '  - Detector starting model PekingU/rtdetr_r18vd (huggingface.co, about 80 MB, pinned revision)' }
  Write-Host '  Needs about 4 GB of free disk. Nothing is installed system-wide except the Microsoft component above.'
  $a = Read-Host 'Continue? (Y/N)'
  if ($a -notmatch '^[Yy]') { Say 'Stopped. Nothing was downloaded.'; exit 2 }
}

# 1) Microsoft Visual C++ Redistributable: official Microsoft download only, host and signature checked.
if (-not $have) {
  $u = Final-Host 'https://aka.ms/vc14/vc_redist.x64.exe'
  Say "aka.ms redirects to $($u.Host)"
  if ($u.Host -notlike '*.microsoft.com' -or $u.Scheme -ne 'https') { throw 'Unexpected download host for the Microsoft runtime' }
  $vc = Join-Path $env:TEMP 'vc_redist.x64.exe'
  Invoke-WebRequest 'https://aka.ms/vc14/vc_redist.x64.exe' -OutFile $vc
  $sig = Get-AuthenticodeSignature $vc
  if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft Corporation') { throw "Microsoft runtime signature check failed ($($sig.Status))" }
  Say 'Microsoft signature valid. Starting the installer.'
  $p = Start-Process $vc -ArgumentList '/install','/passive','/norestart' -Verb RunAs -Wait -PassThru
  if ($p.ExitCode -notin 0,1638,3010) { Say "Microsoft installer exit code $($p.ExitCode). Install it manually from the link above."; exit 2 }
}

# 2) Python 3.12 embeddable package from python.org. SHA-256 below was verified against the release manager's
#    Sigstore signature (thomas@python.org) when this starter was built; the PSF Authenticode signature is checked too.
if (-not (Test-Path "$py\python.exe")) {
  Say 'Downloading Python 3.12.10 from python.org...'
  $zip = Join-Path $env:TEMP 'python-embed.zip'
  Invoke-WebRequest 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip' -OutFile $zip
  if ((Sha256 $zip) -ne '4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3') { throw 'Python download SHA-256 mismatch' }
  Expand-Archive $zip -DestinationPath $py -Force
  $sig = Get-AuthenticodeSignature "$py\python.exe"
  if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Python Software Foundation') { throw "Python signature check failed ($($sig.Status))" }
  Say 'Python SHA-256 and Python Software Foundation signature verified.'
  Set-Content "$py\python312._pth" @('python312.zip','.','Lib\site-packages','import site') -Encoding ASCII
  New-Item -ItemType Directory "$py\Lib\site-packages" -Force | Out-Null
  $whl = "$py\pip-26.3-py3-none-any.whl"
  Invoke-WebRequest 'https://files.pythonhosted.org/packages/07/25/ee8c38ae72d66b844ce8eb9711ba905dba21ca1a8a0c960057c41cd23337/pip-26.3-py3-none-any.whl' -OutFile $whl
  if ((Sha256 $whl) -ne 'f3b60b20ffaadd4415ed7957212a38ac63fa4c5fa375bd0f4a797777940fad13') { throw 'pip download SHA-256 mismatch' }
  & "$py\python.exe" "$whl\pip" install --no-index --no-warn-script-location $whl
  if ($LASTEXITCODE -ne 0) { throw 'pip setup failed' }
  Remove-Item $whl
}
$env:PYTHONNOUSERSITE = '1'
# 3) Libraries from PyTorch.org and PyPI (versions pinned in constraints.txt, the set proven by our Windows CI)
if ($needPy) {
  Say 'Downloading PyTorch (CPU) and libraries. This takes a while, once.'
  & "$py\python.exe" -m pip install --no-warn-script-location torch==2.6.0 torchvision==0.21.0 -r "$root\requirements.txt" -c "$root\constraints.txt" --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple
  if ($LASTEXITCODE -ne 0) { throw 'library download failed (check the internet connection)' }
  New-Item "$py\.libs-done" -ItemType File | Out-Null
}
# 4) Detector backbone (PekingU/rtdetr_r18vd, Apache-2.0 per its model card) from Hugging Face, pinned revision
if ($needHf) {
  Say 'Downloading the detector starting model from Hugging Face...'
  $env:HF_HUB_CACHE = "$root\hf"
  & "$py\python.exe" -c "from huggingface_hub import snapshot_download as s; print(s('PekingU/rtdetr_r18vd', revision='ac77a11ff0170a41b771c03264987f8ce2b0d753'))"
  if ($LASTEXITCODE -ne 0) { throw 'model download failed' }
  New-Item "$root\hf\.backbone-done" -ItemType File | Out-Null
}
Say 'Setup finished. It will not be repeated; later starts work without the internet.'
exit 0
