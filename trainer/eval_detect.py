"""Held-out evaluation on photos the model never trained on.
  eval_detect.py onnx DETECTOR.onnx MODEL.json TESTDIR     -> runs the exported ONNX with onnxruntime
  eval_detect.py dets DETS.json MODEL.json TESTDIR          -> scores detections produced elsewhere (the app runner), format {file:[{score,cls,box:[x1,y1,x2,y2]}]}
Greedy IoU>=0.5 matching per class. Reports all test photos, and again without photos flagged as near-duplicates of a training photo."""
import sys,json,numpy as np
mode,src,model_p,td=sys.argv[1:5];M=json.load(open(model_p));z=M['size'];thr=M['score_threshold'];T=json.load(open(td+'/truth.json'))['images'];K=len(M['classes'])
def predict(it):
    if mode=='dets':return [(d['box'],int(d['cls']),float(d['score'])) for d in D[it['file']] if d['score']>=thr]
    from PIL import Image
    im=Image.open(td+'/'+it['file']).convert('RGB');W,H=im.size;x=(np.asarray(im.resize((z,z),Image.BILINEAR),np.float32)/255).transpose(2,0,1)[None]
    b,sc,lb=S.run(None,{'image':x});return [([b[i][0]*W/z,b[i][1]*H/z,b[i][2]*W/z,b[i][3]*H/z],int(lb[i]),float(sc[i])) for i in range(len(sc)) if sc[i]>=thr]
if mode=='dets':D=json.load(open(src))
else:
    import onnxruntime as ort;S=ort.InferenceSession(src,providers=['CPUExecutionProvider'])
def iou(a,b):
    x1,y1=max(a[0],b[0]),max(a[1],b[1]);x2,y2=min(a[2],b[2]),min(a[3],b[3]);i=max(0,x2-x1)*max(0,y2-y1);u=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-i;return i/u if u>0 else 0
preds={it['file']:predict(it) for it in T}
def score(items,title):
    tp=[0]*K;fp=[0]*K;fn=[0]*K;ce=[[] for _ in range(K)]
    for it in items:
        pred=preds[it['file']]
        for c in range(K):
            P=sorted([p for p in pred if p[1]==c],key=lambda p:-p[2]);G=[g[:4] for g in it['boxes'] if g[4]==c];used=[False]*len(G)
            for p in P:
                best,bj=0,-1
                for j,g in enumerate(G):
                    if not used[j]:
                        v=iou(p[0],g)
                        if v>best:best,bj=v,j
                if best>=0.5:used[bj]=True;tp[c]+=1
                else:fp[c]+=1
            fn[c]+=used.count(False);ce[c].append(abs(len(P)-len(G)))
    print(f"{title}: {len(items)} photos, score threshold {thr}")
    for c,n in enumerate(M['classes']):
        p=tp[c]/(tp[c]+fp[c]) if tp[c]+fp[c] else 0;r=tp[c]/(tp[c]+fn[c]) if tp[c]+fn[c] else 0
        print(f"  {n:10s} truth={tp[c]+fn[c]:4d} TP={tp[c]:4d} FP={fp[c]:4d} FN={fn[c]:4d} precision={p:.2f} recall={r:.2f} mean|count err|/photo={np.mean(ce[c]) if ce[c] else 0:.2f}")
score(T,'ALL held-out test photos (mode '+mode+')')
score([t for t in T if not t.get('near_dup')],'test photos WITHOUT near-duplicates of training photos')
print('Software benchmark on a public photo set only. Not a medical or diagnostic accuracy claim.')
