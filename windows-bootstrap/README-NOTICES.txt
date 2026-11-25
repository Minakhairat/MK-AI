MK AI Windows starter (small download)
This folder contains only MK AI's own files plus the Studio web assets (ONNX Runtime Web, JSZip, TensorFlow.js, MobileNetV3: see their THIRD-PARTY-NOTICES.txt and NOTICE-MODEL.txt in studio/template and build/detect-template).
On first run MK-AI.bat downloads, straight from the official distributors onto your own PC:
  - Python 3.12 embeddable package (python.org, PSF licence)
  - pip (bootstrap.pypa.io)
  - PyTorch CPU (download.pytorch.org) and the libraries in requirements.txt (pypi.org), each under its own licence
  - the detector starting model PekingU/rtdetr_r18vd (huggingface.co, Apache-2.0 per its model card)
  - if missing, Microsoft's own Visual C++ Redistributable (https://aka.ms/vc14/vc_redist.x64.exe), with your permission
Needs: Windows 10/11 64-bit, internet on first run (about 1 to 2 GB), about 4 GB free disk, a folder you can write to.
No datasets, trained models or benchmark weights are included.
