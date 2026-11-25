# CI only: builds a classify-format export zip (head.json + base/feat.onnx) from the real backbone, with an untrained RANDOM head. Pipeline test only, no quality meaning.
import sys,json,zipfile,random,onnx
feat,out=sys.argv[1],sys.argv[2]
m=onnx.load(feat);D=int(m.graph.output[0].type.tensor_type.shape.dim[-1].dim_value)
K=3;random.seed(1)
head={'classes':['a','b','c'],'D':D,'W':[random.uniform(-1,1) for _ in range(D*K)],'b':[0.0]*K}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('head.json',json.dumps(head));z.write(feat,'base/feat.onnx')
print('classify test zip D=',D)
