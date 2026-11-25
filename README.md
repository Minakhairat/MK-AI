# MK AI (prototype)

مشروع تجريبي: برنامج يعلّم الآلة بالصور، وبعدين يولّد تطبيق ويب بيشتغل على جهاز المستخدم. فيه وضعين يختار منهم المستخدم: **تصنيف الصورة** و**تحديد الأشياء وعدّها**.

An early prototype, not a release. It is not ready for end users.

## Status (what has and has not been tested)
- Classification: train in the browser (TF.js transfer learning), export a zip app, run it offline. Tested only on Linux in headless Chrome with a small smoke-test photo set.
- Detection and counting: label boxes in the browser, train on this computer (Python, PyTorch, CPU), export a browser app (ONNX + onnxruntime-web). Tested only on synthetic images (shapes/pasted crops) on Linux in headless Chrome.
- Windows: a GitHub Actions workflow runs the detector pipeline self-test on a Windows runner (see Actions tab). It checks that the pipeline runs. It does not prove an installer, camera, or real-device behaviour.
- Not tested: real phones/tablets (Android, iPhone), iOS offline storage limits, camera capture, large photo sets, real labeled data quality, GPU training, packaging into a one-click Windows installer.

## Run it locally
```
npm install
npm run setup        # copies JS libs, downloads the MobileNet base model
pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
python server/studio_server.py 8000    # open http://127.0.0.1:8000  (classification)
                                       # and http://127.0.0.1:8000/label.html (detection labeling + training)
python trainer/selftest.py             # pipeline self-test
```
The server binds to 127.0.0.1 only. Images are processed on your own computer.

## Licensing and downloads (read before redistributing anything)
- This repository does **not** contain model weights, training photos, or built apps. `.gitignore` excludes them.
- No license has been chosen for this repository's own code yet, so by default all rights are reserved. A license is the owner's decision.
- Classification base model: MobileNet V1 0.25 from `storage.googleapis.com/tfjs-models`. The tfjs-models repo is Apache-2.0, but a license for the hosted weight files is not stated explicitly. **Unconfirmed.**
- Detection base model: `PekingU/rtdetr_r18vd` from Hugging Face, whose model metadata lists Apache-2.0. It was pretrained on COCO, whose images carry mixed Flickr terms. How that affects redistribution of fine-tuned weights has **not** been assessed. Weights are downloaded at run time, not shipped here.
- An earlier experiment used torchvision SSDLite weights. They have no stated license and are not used here.
- Do not use Ultralytics YOLO code or weights with this project without reading their AGPL-3.0 / enterprise terms.
- JS libraries are installed from npm: TensorFlow.js (Apache-2.0), onnxruntime-web (MIT), JSZip (MIT OR GPL-3.0-or-later).

## Hosted demo (GitHub Pages)

https://minakhairat.github.io/MK-AI/ is built by `.github/workflows/pages.yml`. It publishes no model weights. The classify Studio there loads the MobileNet base model directly from Google's tfjs-models bucket in the visitor's browser; the license of those weight files is not confirmed. Exports made on the hosted page do not contain the weights: the exported app fetches them from the same bucket on first open and then keeps them in its own cache. Only the exports made by a local setup (`npm run setup`) bundle a downloaded copy for the user's own machine.

Every exported app gets its own random id used for its cache name and manifest id, so several generated apps served from one origin do not share a cache. Tested with three exports on one origin (two hosted-mode, one local-mode) in headless Chrome on Linux. Not tested: other MK apps, real phones.

Detector training is not available on the hosted page. It needs the local Python trainer (`python server/studio_server.py 8000`); the labeling page disables its train button and says so when no local server answers.
