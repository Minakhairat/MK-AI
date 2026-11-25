# usage: python rt_pipeline.py dataset.zip outdir epochs  -> outdir/app (generated detector PWA) ; prints PROGRESS lines
import sys,zipfile,json,io,random,time,os,shutil,warnings;warnings.filterwarnings('ignore')
import torch;from PIL import Image;from torchvision.transforms.functional import to_tensor
from transformers import RTDetrForObjectDetection
zp,out,EP=sys.argv[1],sys.argv[2],int(sys.argv[3]);torch.set_num_threads(max(1,os.cpu_count() or 1));torch.manual_seed(0)
z=zipfile.ZipFile(zp);meta=json.loads(z.read('annotations.json'));data=[]
for it in meta['images']:
    if not it['boxes']:continue
    im=Image.open(io.BytesIO(z.read(it['file']))).convert('RGB');W,H=im.size;im=im.resize((320,320));b=it['boxes']
    data.append((to_tensor(im),{'class_labels':torch.tensor([x[4] for x in b]),'boxes':torch.tensor([[(x[0]+x[2])/2/W,(x[1]+x[3])/2/H,(x[2]-x[0])/W,(x[3]-x[1])/H] for x in b],dtype=torch.float32)}))
print('PROGRESS loading',flush=True)
m=RTDetrForObjectDetection.from_pretrained('PekingU/rtdetr_r18vd',num_labels=len(meta['classes']),ignore_mismatched_sizes=True)
for p in m.model.backbone.parameters():p.requires_grad=False
opt=torch.optim.AdamW([p for p in m.parameters() if p.requires_grad],lr=2e-4);m.train()
for ep in range(EP):
    idx=list(range(len(data)));random.seed(ep);random.shuffle(idx);tot=n=0
    for i in range(0,len(idx),4):
        bt=[data[j] for j in idx[i:i+4]];o=m(pixel_values=torch.stack([x for x,_ in bt]),labels=[t for _,t in bt]);o.loss.backward();torch.nn.utils.clip_grad_norm_(m.parameters(),0.1);opt.step();opt.zero_grad();tot+=o.loss.item();n+=1
    print(f'PROGRESS epoch {ep+1}/{EP} loss {tot/n:.2f}',flush=True)
m.eval()
class Wr(torch.nn.Module):
    def __init__(s,m):super().__init__();s.m=m
    def forward(s,x):
        o=s.m(pixel_values=x);p=o.logits.sigmoid()[0];sc,lb=p.max(-1);b=o.pred_boxes[0]
        return torch.stack([(b[:,0]-b[:,2]/2)*320,(b[:,1]-b[:,3]/2)*320,(b[:,0]+b[:,2]/2)*320,(b[:,1]+b[:,3]/2)*320],-1),sc,lb
app=out+'/app';shutil.rmtree(app,ignore_errors=True);shutil.copytree('build/detect-template',app)
torch.onnx.export(Wr(m).eval(),(torch.rand(1,3,320,320),),app+'/detector.onnx',opset_version=17,input_names=['image'],output_names=['boxes','scores','labels'],dynamo=False)
json.dump({'task':'detect','classes':meta['classes'],'size':320,'score_threshold':0.5},open(app+'/model.json','w'))
# refresh service worker file list
fl=['./'+f for f in sorted(os.listdir(app)) if f!='sw.js']+['./']
import uuid;aid=uuid.uuid4().hex[:10]
json.dump({'name':'MK AI detector '+aid,'short_name':'MK AI '+aid[:4],'id':'mkai-det-'+aid,'start_url':'./','scope':'./','display':'standalone','background_color':'#1e2127','theme_color':'#1e2127','icons':[{'src':'pwa-192x192.png','sizes':'192x192','type':'image/png'},{'src':'pwa-512x512.png','sizes':'512x512','type':'image/png'}]},open(app+'/manifest.json','w'))
open(app+'/sw.js','w').write("const P='mkai-det-',T='@'+self.registration.scope,C='mkai-det-"+aid+"'+T;const F=%s;self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)));});self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(P)&&k.endsWith(T)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.open(C).then(c=>c.match(e.request).then(r=>r||fetch(e.request))));});"%json.dumps(fl))
shutil.make_archive(out+'/app','zip',app);print('PROGRESS done',flush=True)
