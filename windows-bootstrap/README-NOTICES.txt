MK AI Windows starter (small download)

What is inside this folder: MK AI's own files (server, trainer, Studio, detector template, launcher, setup script, requirements.txt and constraints.txt) plus
these third-party components, shipped with their notices (read them for the terms; this starter does not replace them):
  - ONNX Runtime Web (studio/ort.min.js and the two ort-wasm-simd-threaded wasm files, copies also under studio/template and build/detect-template): notices in ORT-THIRD-PARTY-NOTICES.txt
  - JSZip 3.10.1 (studio/jszip.min.js): "dual licenced under the MIT license or GPLv3" per its header, uses pako (MIT)
  - MobileNetV3-small feature extractor as an ONNX file (studio/base/feat.onnx, about 6 MB; timm/mobilenetv3_small_100.lamb_in1k, Apache-2.0 per its model card, pretrained on ImageNet-1k; the effect of the ImageNet terms on the weights is an open uncertainty): see NOTICE-MODEL.txt and LICENSE-APACHE-2.0.txt next to it
  - build/detect-template/THIRD-PARTY-NOTICES.txt for the detector template
No Python, no native Windows libraries (.dll/.exe/.pyd), no datasets, no user-trained models and no benchmark weights are inside. The only model weights inside are that pretrained MobileNetV3 file.

On first run MK-AI.bat tells you what it will download and asks Y/N before downloading anything. It then fetches, directly from the official distributors onto your own PC:
  - Python 3.12.10 embeddable package (python.org; checked by SHA-256 and the Python Software Foundation signature; PSF licence)
  - pip 26.3 (files.pythonhosted.org, pinned, checked by SHA-256)
  - PyTorch CPU 2.6.0 (download.pytorch.org) and the libraries in requirements.txt at the versions in constraints.txt (pypi.org), each under its own licence
  - the detector starting model PekingU/rtdetr_r18vd (huggingface.co, pinned revision, Apache-2.0 per its model card)
  - only if missing and you agree: Microsoft's Visual C++ Redistributable from https://aka.ms/vc14/vc_redist.x64.exe (Microsoft host and Microsoft signature are checked)
Needs: Windows 10/11 64-bit, internet on first run, free disk space (CI measured the real size), a folder you can write to.
Libraries from PyPI/PyTorch are version-pinned and fetched over HTTPS from the official indexes, not hash-pinned.
