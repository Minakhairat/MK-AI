"""CI only. Oxford-IIIT Pet (37 breeds, CC BY-SA 4.0, https://www.robots.ox.ac.uk/~vgg/data/pets/) via the timm parquet mirror.
Uses the dataset's own train/test split (3680 / 3669). Trains a softmax head on features of the REAL bundled backbone (studio/base/feat.onnx),
same preprocessing as the app (stretch to 224, ImageNet mean/std, L2-normalised features). Reports held-out accuracy and per-class recall.
Writes build/ox/export.zip (head.json + base/feat.onnx), the exact format the app and the Android runner import, and build/ox/test (200 held-out photos + labels)
for the runner-parity check. Software benchmark. Nothing is published."""
import io,json,os,sys,zipfile,hashlib,numpy as np,onnxruntime as ort,pyarrow.parquet as pq
from PIL import Image
from huggingface_hub import hf_hub_download
O='build/ox';os.makedirs(O+'/test',exist_ok=True)
S=ort.InferenceSession('studio/base/feat.onnx',providers=['CPUExecutionProvider'])
MEAN=np.array([0.485,0.456,0.406],np.float32);STD=np.array([0.229,0.224,0.225],np.float32)
def feat(raw):
    a=np.asarray(Image.open(io.BytesIO(raw)).convert('RGB').resize((224,224),Image.BILINEAR),np.float32)/255
    o=S.run(None,{'image':((a-MEAN)/STD).transpose(2,0,1)[None].astype(np.float32)})[0][0];return o/(np.linalg.norm(o) or 1)
def load(split):
    p=hf_hub_download('timm/oxford-iiit-pet',f'data/{split}-00000-of-00001.parquet',repo_type='dataset');t=pq.read_table(p).to_pylist();return t
tr,te=load('train'),load('test')
names=['abyssinian','american_bulldog','american_pit_bull_terrier','basset_hound','beagle','bengal','birman','bombay','boxer','british_shorthair','chihuahua','egyptian_mau','english_cocker_spaniel','english_setter','german_shorthaired','great_pyrenees','havanese','japanese_chin','keeshond','leonberger','maine_coon','miniature_pinscher','newfoundland','persian','pomeranian','pug','ragdoll','russian_blue','saint_bernard','samoyed','scottish_terrier','shiba_inu','siamese','sphynx','staffordshire_bull_terrier','wheaten_terrier','yorkshire_terrier']
K=len(names)
ids_tr={r['image_id'] for r in tr};ids_te={r['image_id'] for r in te}
h_tr={hashlib.md5(r['image']['bytes']).hexdigest() for r in tr};h_te={hashlib.md5(r['image']['bytes']).hexdigest() for r in te}
print('train',len(tr),'test',len(te),'| image_id overlap',len(ids_tr&ids_te),'| exact byte-duplicate overlap',len(h_tr&h_te))
Xt=np.array([feat(r['image']['bytes']) for r in tr]);yt=np.array([r['label'] for r in tr])
Xv=np.array([feat(r['image']['bytes']) for r in te]);yv=np.array([r['label'] for r in te]);D=Xt.shape[1]
# near-duplicate check in feature space (cosine>0.995 between a test and a train photo)
sim=Xv@Xt.T;nd=int((sim.max(1)>0.995).sum());print('test photos with a train photo at cosine>0.995:',nd)
W=np.zeros((D,K),np.float32);b=np.zeros(K,np.float32);Y=np.eye(K,dtype=np.float32)[yt]
for ep in range(300):
    l=Xt@W+b;l-=l.max(1,keepdims=True);p=np.exp(l);p/=p.sum(1,keepdims=True);g=(p-Y)/len(yt);W-=8*(Xt.T@g+1e-4*W);b-=8*g.sum(0)
pred=(Xv@W+b).argmax(1);acc=float((pred==yv).mean());print(f'held-out top-1 accuracy {acc:.4f} on {len(yv)} test photos, {K} classes (chance {1/K:.3f})')
keep=(sim.max(1)<=0.995);print(f'accuracy excluding flagged near-duplicates: {float((pred[keep]==yv[keep]).mean()):.4f} on {int(keep.sum())}')
rec=[(names[c],float((pred[yv==c]==c).mean()),int((yv==c).sum())) for c in range(K)]
print('per-class recall (worst 8):',[(n,round(r,2),k) for n,r,k in sorted(rec,key=lambda x:x[1])[:8]])
print('per-class recall min %.2f median %.2f max %.2f'%(min(r for _,r,_ in rec),float(np.median([r for _,r,_ in rec])),max(r for _,r,_ in rec)))
assert acc>0.5,'sanity floor'
head={'classes':[n.replace('_',' ') for n in names],'D':int(D),'W':[float(v) for v in W.reshape(-1)],'b':[float(v) for v in b]}
with zipfile.ZipFile(O+'/export.zip','w',zipfile.ZIP_DEFLATED) as z:z.writestr('head.json',json.dumps(head));z.write('studio/base/feat.onnx','base/feat.onnx')
rng=np.random.default_rng(1);idx=rng.choice(len(te),200,replace=False);T=[]
for j,i in enumerate(idx):
    f=f'{j:03d}.jpg';Image.open(io.BytesIO(te[i]['image']['bytes'])).convert('RGB').save(O+f'/test/{f}',quality=95);T.append({'file':f,'label':int(yv[i]),'py_pred':int(pred[i]),'py_logits':[float(v) for v in (Xv[i]@W+b)]})
json.dump({'classes':head['classes'],'images':T},open(O+'/test/truth.json','w'))
