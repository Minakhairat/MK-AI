"""usage: pil_pixels.py TESTDIR SIZE OUT.bin  -> uint8 RGB pixels of each photo (truth.json order) resized the way the Python pipelines do (PIL BILINEAR, stretch)."""
import sys,json,numpy as np
from PIL import Image
td,z,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]
T=json.load(open(td+'/truth.json'))['images']
with open(out,'wb') as f:
    for it in T:f.write(np.asarray(Image.open(td+'/'+it['file']).convert('RGB').resize((z,z),Image.BILINEAR),np.uint8).tobytes())
print('wrote',len(T),'photos at',z)
