"""Pipeline self-test: synthetic dataset -> 1-epoch fine-tune -> ONNX export -> ONNX loads and returns detections of the right shape.
It checks that the pipeline RUNS. It says nothing about model quality."""
import subprocess,sys,os,json,numpy as np
sys.path.insert(0,os.path.dirname(__file__));from make_synthetic import make
os.makedirs('build/selftest',exist_ok=True);make('build/selftest/ds.zip',8)
subprocess.check_call([sys.executable,'trainer/rt_pipeline.py','build/selftest/ds.zip','build/selftest/out','1'])
import onnxruntime as ort
s=ort.InferenceSession('build/selftest/out/app/detector.onnx');b,sc,lb=s.run(None,{'image':np.random.rand(1,3,320,320).astype('float32')})
assert b.shape[-1]==4 and b.shape[0]==sc.shape[0]==lb.shape[0] and b.shape[0]>0,(b.shape,sc.shape)
m=json.load(open('build/selftest/out/app/model.json'));assert m['classes']==['square','circle']
assert os.path.exists('build/selftest/out/app.zip');print('SELFTEST OK',b.shape)
