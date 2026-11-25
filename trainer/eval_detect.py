"""Held-out evaluation of an exported detector.onnx on photos it never saw. Usage: eval_detect.py detector.onnx model.json testdir
Greedy IoU>=0.5 matching per class. Prints per-class precision/recall and image-level count error. Run on the exported ONNX itself (the graph the app runs)."""
import sys,json,numpy as np,onnxruntime as ort
from PIL import Image
onnx_p,model_p,td=sys.argv[1:4];M=json.load(open(model_p));z=M['size'];thr=M['score_threshold'];T=json.load(open(td+'/truth.json'))
S=ort.InferenceSession(onnx_p,providers=['CPUExecutionProvider'])
def iou(a,b):
    x1,y1=max(a[0],b[0]),max(a[1],b[1]);x2,y2=min(a[2],b[2]),min(a[3],b[3]);i=max(0,x2-x1)*max(0,y2-y1);u=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-i;return i/u if u>0 else 0
K=len(M['classes']);tp=[0]*K;fp=[0]*K;fn=[0]*K;cerr=[[] for _ in range(K)]
for it in T['images']:
    im=Image.open(td+'/'+it['file']).convert('RGB');W,H=im.size;x=(np.asarray(im.resize((z,z),Image.BILINEAR),np.float32)/255).transpose(2,0,1)[None]
    b,sc,lb=S.run(None,{'image':x});pred=[([b[i][0]*W/z,b[i][1]*H/z,b[i][2]*W/z,b[i][3]*H/z],int(lb[i]),float(sc[i])) for i in range(len(sc)) if sc[i]>=thr]
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
        fn[c]+=used.count(False);cerr[c].append(abs(len(P)-len(G)))
print(f"held-out test images: {len(T['images'])}, score threshold {thr}")
for c,n in enumerate(M['classes']):
    p=tp[c]/(tp[c]+fp[c]) if tp[c]+fp[c] else 0;r=tp[c]/(tp[c]+fn[c]) if tp[c]+fn[c] else 0
    print(f"{n:10s} truth={tp[c]+fn[c]:4d} TP={tp[c]:4d} FP={fp[c]:4d} FN={fn[c]:4d} precision={p:.2f} recall={r:.2f} mean|count err|/image={np.mean(cerr[c]):.2f}")
