# MK AI (prototype)

مشروع تجريبي: Studio بيعلّم الآلة بالصور، وبعدين يولّد تطبيق ويب بيشتغل على جهاز المستخدم. فيه وضعين: **تصنيف الصور** و**تحديد الأشياء وعدّها**.

An early prototype, not a release. It is not ready for end users.

## What it does
One page, five steps: project type, data (class cards, or box labeling on a canvas), train, test, export.
- Classify: a pretrained MobileNetV3-small feature extractor (ONNX, run in the browser with onnxruntime-web) plus a softmax head trained in the browser. Export is a zip web app with its own random app id.
- Detect and count: boxes are drawn in the page and the dataset is sent to a trainer running on this computer (Python, PyTorch, RT-DETR r18, CPU). The result is a zip web app (ONNX + onnxruntime-web). The hosted page cannot train detectors.

## Tested so far (and what is not)
- Linux, headless Chrome, small sets: classify flow through the UI (train, test a held-out photo, export); detect flow through the UI (mouse-drawn boxes, local trainer, 2-epoch run, exported app loads and runs inference). No accuracy claim: the test photos are unverified Wikimedia images and synthetic collages.
- Windows: a GitHub Actions run on a Windows runner executes `start-windows.bat` in check mode (npm install, asset setup, file checks), starts the local server and probes it, then runs the detector pipeline self-test. See the Actions tab for the latest result. This proves the scripts run on a Windows runner. It does not prove a desktop install, a browser on Windows, the camera or any phone.
- Not tested: real phones/tablets (Android, iPhone), iOS offline storage limits, camera capture, large photo sets, real labeled data quality, GPU training, a one-click Windows installer.

## Run it on Windows
Needs Python 3.10, 3.11 or 3.12 (the launcher refuses other versions; PyTorch 2.6 CPU wheels exist for Windows up to 3.13, but 3.13 is untested here; CI runs 3.10 and 3.12 on a Windows runner and 3.11 is not run) and Node.js 22+. Double-click `start-windows.bat`: it creates a virtual environment, installs CPU PyTorch and the Python packages, runs `npm install` and `npm run setup`, starts the local server on 127.0.0.1:8000 and opens the page. First run downloads PyTorch (CPU build), Python and npm packages and a pretrained model; it is a large download and asks before it starts. This launcher has not been run on a real Windows desktop yet.

## Run it anywhere else
```
npm install
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
npm run setup                      # copies JS libs, exports the classify backbone to ONNX
python server/studio_server.py 8000    # open http://127.0.0.1:8000
python trainer/selftest.py             # detector pipeline self-test
```
The server binds to 127.0.0.1 only. Images are processed on your own computer.

## Exported apps
An exported classifier zip must be served from a web server (do not open the file directly), for example `python -m http.server` after unzipping, or HTTPS hosting. The first open caches the app files; afterwards it runs offline at the same address. Every export has a random id used for its cache name and manifest id, so several apps on one origin do not share a cache. Tested with three exports on one origin in headless Chrome on Linux. Not tested: other MK apps, phones.

## Licensing and downloads
- No license has been chosen for this repository's own code, so all rights are reserved by default. That is the owner's decision.
- Classify backbone: `timm/mobilenetv3_small_100.lamb_in1k` at revision 76b303ec28c466e9df37f4745dfb7aef20ab87ae. The Hugging Face model card lists license Apache-2.0 and the dataset ImageNet-1k. `scripts/export_backbone.py` converts it to ONNX at setup; the hosted site and every exported classifier include the converted file, `NOTICE-MODEL.txt` and the full `LICENSE-APACHE-2.0.txt`. How the ImageNet-1k terms affect the weights is an open uncertainty and has not been assessed.
- Detection base model: `PekingU/rtdetr_r18vd` from Hugging Face, whose model metadata lists Apache-2.0. It was pretrained on COCO, whose images carry mixed Flickr terms; the effect on fine-tuned weights has not been assessed. It is downloaded at run time and exported detector apps contain a fine-tuned copy. The exported detector app does not yet include a NOTICE or license text for it.
- Earlier experiments used Google's MobileNet V1 (tfjs-models bucket, weight license not stated) and torchvision SSDLite weights (no stated license). Neither is used.
- Do not use Ultralytics YOLO code or weights with this project without reading their AGPL-3.0 / enterprise terms.
- JS libraries from npm: onnxruntime-web (MIT), JSZip (MIT OR GPL-3.0-or-later).

## Hosted page
https://minakhairat.github.io/MK-AI/ is built by `.github/workflows/pages.yml` when `site.version` changes. It serves the classify flow. The detect flow shows that the local trainer is not running and disables training.
- Exported zips include `NOTICE-MODEL.txt`, `LICENSE-APACHE-2.0.txt`, `THIRD-PARTY-NOTICES.txt`, and the upstream ONNX Runtime `ORT-LICENSE-MIT.txt` and `ORT-THIRD-PARTY-NOTICES.txt` (v1.31.1, fetched at setup and hash-checked). Which third-party components are compiled into the ONNX Runtime wasm files was not verified, and none of this is legal clearance.
- Offline detector app: it reads `detector.onnx` straight from the offline cache. Streaming the 80 MB model through the service worker crashed Chrome (headless, Linux) during inference.
