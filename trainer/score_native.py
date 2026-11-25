"""usage: score_native.py NATIVE_LOG DETS_OUT.json OX_TESTDIR  -> parses MKAI_REAL_* lines the emulator app logged. Writes detections for eval_detect.py; scores classifier photos."""
import re,sys,json,collections
log,outp,oxd=sys.argv[1:4];txt=open(log,errors='ignore').read()
cls=dict();det=collections.defaultdict(dict);cnt={}
for m in re.finditer(r'MKAI_REAL_CLS (\S+) (\d+) ([0-9.]+)',txt):cls[m.group(1)]=(int(m.group(2)),float(m.group(3)))
for m in re.finditer(r'MKAI_REAL_DET (\S+) (\d+) ([\[\],0-9.\-]*)',txt):det[m.group(1)][int(m.group(2))]=m.group(3)
for m in re.finditer(r'MKAI_REAL_DETEND (\S+) (\d+)',txt):cnt[m.group(1)]=int(m.group(2))
D={}
for f,ch in det.items():
    s=''.join(ch[k] for k in sorted(ch));a=json.loads(s);assert len(a)==cnt.get(f,len(a)),f
    D[f]=[{'cls':x[0],'score':x[1],'box':x[2:6]} for x in a]
for f,n in cnt.items():D.setdefault(f,[])
json.dump(D,open(outp,'w'));print('native detections for',len(D),'photos')
T=json.load(open(oxd+'/truth.json'))['images'];sel=[t for t in T if t['file'] in cls]
ok=sum(cls[t['file']][0]==t['label'] for t in sel);ag=sum(cls[t['file']][0]==t['py_pred'] for t in sel)
print(f'native classify on {len(sel)} held-out Oxford photos: top-1 correct {ok}, agrees with Python pipeline on {ag}')
