// MK AI Runner. Trusted code only: an imported zip supplies DATA (labels, weights, two ONNX model files). Nothing from the zip is ever executed or served as a page.
const $=id=>document.getElementById(id);
const LIM={zip:300e6,file:200e6,json:20e6,entries:200};
const CAP='mkai-runner-data',KEY='mkai-runner-models-v2';
const models=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}};
const saveModels=a=>localStorage.setItem(KEY,JSON.stringify(a));
document.addEventListener('securitypolicyviolation',e=>console.log('MKAI_CSP_BLOCKED '+e.violatedDirective+' '+String(e.blockedURI).slice(0,80)));
function badPath(p){return !p||p.length>200||p.startsWith('/')||p.includes('\\')||p.includes('\0')||/^[A-Za-z]:/.test(p)||p.split('/').some(x=>x===''||x==='.'||x==='..');}
// Streamed read with a hard byte cap: stops the decompressor as soon as the cap is passed, never trusts declared sizes.
function readCapped(entry,cap){return new Promise((res,rej)=>{const parts=[];let n=0,done=false;const h=entry.internalStream('uint8array');
 h.on('data',ch=>{if(done)return;n+=ch.length;if(n>cap){done=true;h.pause();rej(new Error('size limit exceeded while unzipping'));return;}parts.push(ch);});
 h.on('error',e=>{if(!done){done=true;rej(e);}});h.on('end',()=>{if(done)return;done=true;const o=new Uint8Array(n);let k=0;for(const p of parts){o.set(p,k);k+=p.length;}res(o);});h.resume();});}
const isNum=(x,a,b)=>typeof x==='number'&&isFinite(x)&&x>=a&&x<=b;
const okLabels=c=>Array.isArray(c)&&c.length>=1&&c.length<=1000&&c.every(s=>typeof s==='string'&&s.length>=1&&s.length<=100);
function checkOnnx(b,what){if(b.length<1000||b[0]!==0x08)throw new Error(what+' is not an ONNX file');}
function checkHead(H){if(!H||!okLabels(H.classes))throw new Error('head.json: bad class names');const K=H.classes.length;if(!Number.isInteger(H.D)||H.D<1||H.D>8192)throw new Error('head.json: bad D');
 if(!Array.isArray(H.W)||H.W.length!==H.D*K||!H.W.every(v=>isNum(v,-1e6,1e6)))throw new Error('head.json: bad weights');if(!Array.isArray(H.b)||H.b.length!==K||!H.b.every(v=>isNum(v,-1e6,1e6)))throw new Error('head.json: bad bias');
 return{classes:H.classes,D:H.D,W:H.W,b:H.b};}
function checkModel(M){if(!M||!okLabels(M.classes))throw new Error('model.json: bad class names');if(!Number.isInteger(M.size)||M.size<32||M.size>2048)throw new Error('model.json: bad size');if(!isNum(M.score_threshold,0,1))throw new Error('model.json: bad threshold');
 return{classes:M.classes,size:M.size,score_threshold:M.score_threshold};}
async function importZip(file){
 if(file.size>LIM.zip)throw new Error('zip too large');
 const z=await JSZip.loadAsync(await file.arrayBuffer());
 const ents=Object.keys(z.files);if(ents.length>LIM.entries)throw new Error('too many files');
 for(const p of ents)if(badPath(p.replace(/\/$/,'')))throw new Error('unsafe path in zip');
 const get=async(n,cap)=>{const e=z.file(n);if(!e)return null;return readCapped(e,cap);};
 const hj=await get('head.json',LIM.json),mj=await get('model.json',LIM.json);let rec;
 const txt=b=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
 if(hj&&!mj){const H=checkHead(txt(hj));const f=await get('base/feat.onnx',LIM.file);if(!f)throw new Error('base/feat.onnx missing');checkOnnx(f,'base/feat.onnx');rec={type:'classify',meta:H,blobs:{'feat.onnx':f}};}
 else if(mj&&!hj){const M=checkModel(txt(mj));const d=await get('detector.onnx',LIM.file);if(!d)throw new Error('detector.onnx missing');checkOnnx(d,'detector.onnx');rec={type:'detect',meta:M,blobs:{'detector.onnx':d}};}
 else throw new Error('this is not an MK AI export (needs head.json or model.json)');
 const id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);const c=await caches.open(CAP);
 for(const [k,v] of Object.entries(rec.blobs))await c.put('/data/'+id+'/'+k,new Response(v));
 const a=models();a.push({id,name:file.name.replace(/[^\w.\- ]/g,'').slice(0,60)||'model',type:rec.type,meta:rec.meta,at:new Date().toISOString()});saveModels(a);
 console.log('MKAI_RUNNER_IMPORTED type='+rec.type+' classes='+rec.meta.classes.length);return id;}
async function removeModel(id){const c=await caches.open(CAP);for(const r of await c.keys())if(new URL(r.url).pathname.startsWith('/data/'+id+'/'))await c.delete(r);saveModels(models().filter(x=>x.id!==id));render();}
function render(){const l=$('list');l.textContent='';for(const a of models().slice().reverse()){const d=document.createElement('div');d.className='card';const t=document.createElement('div');t.textContent=a.name+' ('+(a.type==='detect'?'تحديد وعدّ':'تصنيف')+', '+a.meta.classes.length+' فئة)';
 const o=document.createElement('button');o.textContent='فتح';o.onclick=()=>openModel(a.id);const r=document.createElement('button');r.className='sec';r.textContent='حذف';r.onclick=()=>removeModel(a.id);d.append(t,o,r);l.append(d);}}
// ---- running a stored model (trusted code, same math as the exported apps) ----
ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths='./';
let cur=null,stream=null,live=false;
const blobOf=async(id,n)=>new Uint8Array(await(await(await caches.open(CAP)).match('/data/'+id+'/'+n)).arrayBuffer());
async function openModel(id){const m=models().find(x=>x.id===id);if(!m)return;stopCam();$('home').hidden=true;$('run').hidden=false;$('title').textContent=m.name;$('rst').textContent='جاري تحميل النموذج…';$('res').textContent='';cur=null;
 try{const S=await ort.InferenceSession.create(await blobOf(id,m.type==='detect'?'detector.onnx':'feat.onnx'),{executionProviders:['wasm']});cur={m,S};$('rst').textContent='جاهز (على الجهاز بدون إنترنت)';window.ready=true;}catch(e){$('rst').textContent='تعذّر تحميل النموذج.';console.log('MKAI_NATIVE_FAIL load '+e);}}
const MEAN=[0.485,0.456,0.406],STD=[0.229,0.224,0.225];
async function classify(el){const{m,S}=cur,H=m.meta,z=224,t=document.createElement('canvas');t.width=t.height=z;const g=t.getContext('2d');g.drawImage(el,0,0,z,z);const d=g.getImageData(0,0,z,z).data,n=z*z,x=new Float32Array(3*n);
 for(let i=0;i<n;i++)for(let c=0;c<3;c++)x[c*n+i]=(d[i*4+c]/255-MEAN[c])/STD[c];
 const o=(await S.run({image:new ort.Tensor('float32',x,[1,3,z,z])})).feat.data;let nr=0;for(const v of o)nr+=v*v;nr=Math.sqrt(nr)||1;
 const K=H.classes.length,l=new Float32Array(K);for(let k=0;k<K;k++){let s=H.b[k];for(let j=0;j<H.D;j++)s+=o[j]/nr*H.W[j*K+k];l[k]=s;}
 const mx=Math.max(...l),e=Array.from(l,v=>Math.exp(v-mx)),su=e.reduce((a,b)=>a+b);return e.map(v=>v/su);}
async function detect(im){const{m,S}=cur,M=m.meta,z=M.size,t=document.createElement('canvas');t.width=t.height=z;const g=t.getContext('2d');g.drawImage(im,0,0,z,z);const d=g.getImageData(0,0,z,z).data;const f=new Float32Array(3*z*z);
 for(let i=0;i<z*z;i++){f[i]=d[i*4]/255;f[z*z+i]=d[i*4+1]/255;f[2*z*z+i]=d[i*4+2]/255;}
 const o=await S.run({image:new ort.Tensor('float32',f,[1,3,z,z])}),res=[],W=im.naturalWidth||im.videoWidth,Hh=im.naturalHeight||im.videoHeight;
 for(let i=0;i<o.scores.data.length;i++)if(o.scores.data[i]>=M.score_threshold){const b=Array.from(o.boxes.data.slice(i*4,i*4+4));res.push({score:o.scores.data[i],cls:Number(o.labels.data[i]),box:[b[0]*W/z,b[1]*Hh/z,b[2]*W/z,b[3]*Hh/z]});}
 return res;}
const cols=['#e00','#07f','#0a0','#e90'];
async function infer(el){const c=$('c'),M=cur.m.meta;
 if(cur.m.type==='classify'){const p=await classify(el);$('res').textContent=M.classes.map((n,i)=>n+': '+(p[i]*100).toFixed(1)+'%').join('\n');window.lastPred=p;return p;}
 const w=el.naturalWidth||el.videoWidth,h=el.naturalHeight||el.videoHeight;c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(el,0,0);const r=await detect(el);g.lineWidth=Math.max(2,w/160);g.font=Math.max(14,w/22)+'px sans-serif';g.direction='ltr';g.textAlign='left';const cnt={};
 r.forEach(x=>{if(x.cls<0||x.cls>=M.classes.length)return;cnt[x.cls]=(cnt[x.cls]||0)+1;g.strokeStyle=cols[x.cls%4];g.fillStyle=cols[x.cls%4];g.strokeRect(x.box[0],x.box[1],x.box[2]-x.box[0],x.box[3]-x.box[1]);g.fillText(M.classes[x.cls]+' '+Math.round(x.score*100)+'%',x.box[0]+3,x.box[1]+16);});
 $('res').textContent=M.classes.map((n,i)=>n+': '+(cnt[i]||0)).join('\n');window.lastDet=r;return r;}
function stopCam(){live=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('v').style.display='none';$('camb').textContent='تشغيل الكاميرا مباشر';}
$('camb').onclick=async()=>{if(stream){stopCam();return;}const n=$('camn'),v=$('v');
 if(!window.isSecureContext||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){n.textContent='الكاميرا مش متاحة هنا.';return;}
 try{n.textContent='';stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});}catch(e){stream=null;n.textContent='تعذّر تشغيل الكاميرا: '+(e&&e.name?e.name:e);return;}
 v.srcObject=stream;await v.play();v.style.display='block';if(cur.m.type==='detect'){v.style.height='0';v.style.opacity=0;}$('camb').textContent='إيقاف الكاميرا';live=true;
 while(live){if(v.videoWidth&&cur)await infer(v);await new Promise(r=>setTimeout(r,50));}};
$('img').onchange=()=>{const f=$('img').files[0];if(!f||!cur)return;const im=new Image();im.onload=()=>infer(im);im.src=URL.createObjectURL(f);};
$('back').onclick=()=>{stopCam();cur=null;$('run').hidden=true;$('home').hidden=false;render();};
$('f').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;$('st').textContent='جاري الاستيراد…';try{const id=await importZip(f);$('st').textContent='تم.';render();await openModel(id);}catch(err){$('st').textContent='فشل الاستيراد: الملف مش تصدير سليم من MK AI.';$('log').textContent=String(err.message||err).slice(0,200);console.log('MKAI_IMPORT_REJECTED '+String(err.message||err).slice(0,120));}};
render();
window.MKAI_API={importZip,openModel,removeModel,infer,models,get cur(){return cur;}};
// CI-only self test (enabled only when the CI copy sets window.MKAI_TEST): imports bundled test zips, runs generated-image and live-camera-frame inference, logs the results.
if(window.MKAI_TEST){(async()=>{try{const out=[];for(const n of window.MKAI_TEST){const b=await(await fetch(n)).blob();const id=await importZip(new File([b],n));await openModel(id);
 const c=document.createElement('canvas');c.width=c.height=320;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,320,320);g.fillStyle='#d00';g.fillRect(80,80,100,100);const im=new Image();await new Promise(r=>{im.onload=r;im.src=c.toDataURL();});
 const r1=await infer(im);let cam='none';
 try{const st=await navigator.mediaDevices.getUserMedia({video:true,audio:false});const v=$('v');v.srcObject=st;v.muted=true;await v.play();await new Promise(r=>setTimeout(r,1500));const r2=await infer(v);cam=v.videoWidth+'x'+v.videoHeight+' frame_infer_ok='+(r2!==undefined);st.getTracks().forEach(t=>t.stop());}catch(e){cam='error '+(e&&e.name?e.name:e);}
 out.push(cur.m.type+' img_infer='+(Array.isArray(r1)?r1.length:r1.length)+' cam='+cam);}
 console.log('MKAI_NATIVE_OK secure='+window.isSecureContext+' origin='+location.origin+' online='+navigator.onLine+' | '+out.join(' | '));}catch(err){console.log('MKAI_NATIVE_FAIL '+err);}})();}
