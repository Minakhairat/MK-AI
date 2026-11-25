const $=id=>document.getElementById(id);
const MIME={html:'text/html',js:'text/javascript',mjs:'text/javascript',json:'application/json',wasm:'application/wasm',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',txt:'text/plain'};
const KEY='mkai-runner-apps-list';
const apps=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch(e){return[];}};
const saveApps=a=>localStorage.setItem(KEY,JSON.stringify(a));
async function ready(){if(!('serviceWorker' in navigator))throw new Error('service worker unavailable');await navigator.serviceWorker.register('runner-sw.js');await navigator.serviceWorker.ready;}
const OKEXT=new Set(['html','js','mjs','json','wasm','svg','png','jpg','jpeg','txt','onnx','css','ico']);
const MAX_ZIP=300*1024*1024,MAX_FILE=200*1024*1024,MAX_TOTAL=400*1024*1024,MAX_FILES=200;
function badPath(p){return !p||p.startsWith('/')||p.includes('\\')||p.includes('..')||/^[A-Za-z]:/.test(p)||p.includes('\0')||p.split('/').some(x=>x==='.'||x==='');}
async function importZip(buf,name){
 if(buf.byteLength>MAX_ZIP)throw new Error('zip too large');
 const z=await JSZip.loadAsync(buf);
 const names=Object.keys(z.files).filter(p=>!z.files[p].dir);
 if(names.length>MAX_FILES)throw new Error('too many files');
 let total=0;for(const p of names){if(badPath(p))throw new Error('unsafe path in zip: '+p.slice(0,60));if(!OKEXT.has(p.split('.').pop().toLowerCase()))throw new Error('file type not allowed: '+p.slice(0,60));const sz=z.files[p]._data&&z.files[p]._data.uncompressedSize;if(sz>MAX_FILE)throw new Error('file too large: '+p.slice(0,60));total+=sz||0;}
 if(total>MAX_TOTAL)throw new Error('zip expands too large');
 if(!z.file('index.html')||!z.file('app.js'))throw new Error('index.html or app.js missing, this is not an MK AI export');
 const det=z.file('model.json')&&z.file('detector.onnx'),cls=z.file('head.json');
 if(!det&&!cls)throw new Error('no MK AI model found (needs model.json+detector.onnx or head.json)');
 const id=Date.now().toString(36);const base=location.origin+'/app/'+id+'/';const c=await caches.open('mkai-runner-apps');let n=0;
 for(const [p,f] of Object.entries(z.files)){if(f.dir)continue;
  if(p==='sw.js'){await c.put(base+p,new Response("self.addEventListener('fetch',()=>{});",{headers:{'content-type':'text/javascript'}}));continue;}
  const data=await f.async('arraybuffer');if(data.byteLength>MAX_FILE)throw new Error('file too large after unzip: '+p.slice(0,60));await c.put(base+p,new Response(data,{headers:{'content-type':MIME[p.split('.').pop()]||'application/octet-stream'}}));n++;}
 const a=apps();a.push({id,name,files:n,at:new Date().toISOString()});saveApps(a);console.log('MKAI_RUNNER_IMPORTED files='+n);return id;}
async function removeApp(id){const c=await caches.open('mkai-runner-apps');for(const r of await c.keys())if(r.url.startsWith(location.origin+'/app/'+id+'/'))await c.delete(r);saveApps(apps().filter(x=>x.id!==id));render();}
function render(){const l=$('list');l.textContent='';for(const a of apps().slice().reverse()){const d=document.createElement('div');d.className='card';const t=document.createElement('div');t.textContent=a.name+' ('+a.files+' ملف)';const o=document.createElement('button');o.textContent='فتح';o.onclick=()=>{location.href='/app/'+a.id+'/index.html';};const r=document.createElement('button');r.className='sec';r.textContent='حذف';r.onclick=()=>removeApp(a.id);d.append(t,o,r);l.append(d);}}
$('f').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('st').textContent='جاري الاستيراد…';try{await ready();const id=await importZip(await f.arrayBuffer(),f.name);$('st').textContent='تم. بيتفتح التطبيق…';location.href='/app/'+id+'/index.html';}catch(err){$('st').textContent='فشل الاستيراد.';$('log').textContent=String(err);}};
render();
if(window.MKAI_TEST){(async()=>{try{await ready();const r=await fetch('test-export.zip');const id=await importZip(await r.arrayBuffer(),'selftest');location.href='/app/'+id+'/index.html';}catch(err){console.log('MKAI_NATIVE_FAIL runner '+err);}})();}
