"""Downloads the public Blood Cell Detection dataset (Roboflow export mirrored on Hugging Face as keremberke/blood-cell-object-detection;
its README.dataset.txt says 'License: Public Domain', 3 classes: platelets, rbc, wbc) and writes
  build/bc/ds.zip  (Studio-format training zip: train + valid splits)
  build/bc/test/      (held-out test images + truth.json, never used for training)
Not committed or published anywhere: the files live only in the CI job."""
import urllib.request,zipfile,json,io,os,shutil
from PIL import Image
B='https://huggingface.co/datasets/keremberke/blood-cell-object-detection/resolve/main/'
os.makedirs('build/bc',exist_ok=True)
def get(s):
    p=f'build/bc/{s}.zip'
    if not os.path.exists(p):urllib.request.urlretrieve(B+f'data/{s}.zip',p)
    return zipfile.ZipFile(p)
def boxes(coco):
    by={};[by.setdefault(a['image_id'],[]).append(a) for a in coco['annotations']]
    out=[]
    for im in coco['images']:
        bs=[[a['bbox'][0],a['bbox'][1],a['bbox'][0]+a['bbox'][2],a['bbox'][1]+a['bbox'][3],a['category_id']] for a in by.get(im['id'],[])]
        out.append((im['file_name'],im['width'],im['height'],bs))
    return out
classes=None;meta={'classes':None,'images':[]};zo=zipfile.ZipFile('build/bc/ds.zip','w')
for s in ['train','valid']:
    z=get(s);c=json.loads(z.read('_annotations.coco.json'));classes=[x['name'] for x in sorted(c['categories'],key=lambda x:x['id'])]
    for f,w,h,bs in boxes(c):
        zo.writestr('images/'+s+'_'+f,z.read(f));meta['images'].append({'file':'images/'+s+'_'+f,'width':w,'height':h,'boxes':bs})
meta['classes']=classes;zo.writestr('annotations.json',json.dumps(meta));zo.close()
z=get('test');c=json.loads(z.read('_annotations.coco.json'));shutil.rmtree('build/bc/test',ignore_errors=True);os.makedirs('build/bc/test')
def dh(im,n=16):
    im=im.convert('L').resize((n+1,n),Image.BILINEAR);px=list(im.getdata());bits=0
    for r in range(n):
        for c in range(n):bits=(bits<<1)|(px[r*(n+1)+c]>px[r*(n+1)+c+1])
    return bits
trz=zipfile.ZipFile('build/bc/ds.zip');trh=[dh(Image.open(io.BytesIO(trz.read(n)))) for n in trz.namelist() if n.endswith('.jpg')]
truth=[]
for f,w,h,bs in boxes(c):
    raw=z.read(f);open('build/bc/test/'+f,'wb').write(raw);d=min(bin(dh(Image.open(io.BytesIO(raw)))^t).count('1') for t in trh)
    truth.append({'file':f,'w':w,'h':h,'boxes':bs,'near_train_dist':d,'near_dup':d<=40})
json.dump({'classes':classes,'images':truth},open('build/bc/test/truth.json','w'))
print('near-duplicate test photos (dHash 256-bit distance<=40 to a training photo):',sum(t['near_dup'] for t in truth))
print('classes',classes,'train+valid images',len(meta['images']),'test images',len(truth))
