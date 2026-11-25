MK AI Windows starter (small download)

What is inside this folder: MK AI's own files (server, trainer, Studio, detector template, launcher, setup script, requirements.txt and constraints.txt) plus
the Studio web assets, which are third-party components shipped with their notices:
  - ONNX Runtime Web (studio/ort*.js, ort*.mjs, wasm): notices in studio/template/ORT-THIRD-PARTY-NOTICES.txt
  - JSZip (studio/jszip.min.js): its licence header is in the file
  - TensorFlow.js and the MobileNetV3 classifier backbone (studio/base and build/detect-template): notices in studio/template/THIRD-PARTY-NOTICES.txt and studio/base/NOTICE-MODEL.txt
Read those notice files for the terms; this starter does not replace them.
No Python, no native Windows libraries (.dll/.exe/.pyd), no datasets, no trained models and no benchmark weights are inside.

On first run MK-AI.bat tells you what it will download and asks Y/N before downloading anything. It then fetches, directly from the official distributors onto your own PC:
  - Python 3.12.10 embeddable package (python.org; checked by SHA-256 and the Python Software Foundation signature; PSF licence)
  - pip 26.3 (files.pythonhosted.org, pinned, checked by SHA-256)
  - PyTorch CPU 2.6.0 (download.pytorch.org) and the libraries in requirements.txt at the versions in constraints.txt (pypi.org), each under its own licence
  - the detector starting model PekingU/rtdetr_r18vd (huggingface.co, pinned revision, Apache-2.0 per its model card)
  - only if missing and you agree: Microsoft's Visual C++ Redistributable from https://aka.ms/vc14/vc_redist.x64.exe (Microsoft host and Microsoft signature are checked)
Needs: Windows 10/11 64-bit, internet on first run, free disk space (CI measured the real size), a folder you can write to.
Libraries from PyPI/PyTorch are version-pinned and fetched over HTTPS from the official indexes, not hash-pinned.
