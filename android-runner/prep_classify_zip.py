# CI only: builds a classify-format export zip (head.json + base/feat.onnx) with a head TRAINED here on synthetic images (red vs blue)
# using the real backbone features and the same preprocessing as the app. Held-out accuracy is printed. Synthetic data, pipeline test only.
import sys,json,zipfile,numpy as np,onnxruntime as ort
feat,out=sys.argv[1],sys.argv[2]
S=ort.InferenceSession(feat,providers=['CPUExecutionProvider'])
MEAN=np.array([0.485,0.456,0.406],np.float32);STD=np.array([0.229,0.224,0.225],np.float32)
rng=np.random.default_rng(0)
def img(c):
    base=np.zeros((224,224,3),np.float32);base[...,0 if c==0 else 2]=rng.uniform(0.6,1.0);base[...,1]=rng.uniform(0,0.2);base+=rng.normal(0,0.05,base.shape);return np.clip(base,0,1)
def f(a):
    x=((a-MEAN)/STD).transpose(2,0,1)[None].astype(np.float32);o=S.run(None,{'image':x})[0][0];return o/(np.linalg.norm(o) or 1)
def ds(n):
    X=[];y=[]
    for i in range(n):
        c=i%2;X.append(f(img(c)));y.append(c)
    return np.array(X),np.array(y)
Xt,yt=ds(60);Xv,yv=ds(40);D=Xt.shape[1];K=2
W=np.zeros((D,K),np.float32);b=np.zeros(K,np.float32)
for _ in range(400):
    l=Xt@W+b;l-=l.max(1,keepdims=True);p=np.exp(l);p/=p.sum(1,keepdims=True);p[np.arange(len(yt)),yt]-=1;W-=0.5*(Xt.T@p)/len(yt);b-=0.5*p.mean(0)
acc=float(((Xv@W+b).argmax(1)==yv).mean());print('heldout synthetic accuracy',acc,'D',D)
assert acc>0.95
head={'classes':['red','blue'],'D':int(D),'W':[float(v) for v in W.reshape(-1)],'b':[float(v) for v in b]}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('head.json',json.dumps(head));z.write(feat,'base/feat.onnx')
