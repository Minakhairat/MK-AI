// CI-ONLY (iOS simulator test copy). Integrity, persistence-across-relaunch, deletion and error evidence for the iOS storage layer.
(function(){
const L=m=>console.log('MKAI_CI '+m);
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async b=>hex(await crypto.subtle.digest('SHA-256',b)).slice(0,16);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('mkai-cap-shim',1);r.onupgradeneeded=()=>r.result.createObjectStore('c');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const idbAll=async()=>{const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('c','readonly');const s=t.objectStore('c');const ks=s.getAllKeys();ks.onsuccess=()=>res(ks.result);t.onerror=()=>rej(t.error);});};
const idbGet=async k=>{const d=await idb();return new Promise((res,rej)=>{const q=d.transaction('c','readonly').objectStore('c').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});};
const errs=e=>(e&&e.name?e.name:'')+': '+(e&&e.message?e.message:e)+' | '+String(e&&e.stack||'').replace(/\n/g,' <- ').slice(0,400);
window.addEventListener('unhandledrejection',e=>L('UNHANDLED '+errs(e.reason)));
window.addEventListener('error',e=>L('JSERROR '+e.message+' @'+e.filename+':'+e.lineno));
// stage + stack evidence around the storage and runtime calls
if(window.caches&&caches.open){const o=caches.open.bind(caches);caches.open=async function(n){const c=await o(n);return new Proxy(c,{get(t,p){const v=t[p];if(typeof v!=='function')return v;return async function(){try{const r=await v.apply(t,arguments);if(p==='put')L('cache.put ok '+String(arguments[0]).slice(-40));return r;}catch(e){L('cache.'+String(p)+' FAIL '+errs(e));throw e;}};}});};}
const oc=window.ort&&ort.InferenceSession&&ort.InferenceSession.create;if(oc){ort.InferenceSession.create=async function(){L('ort.create start');try{const r=await oc.apply(ort.InferenceSession,arguments);L('ort.create ok');return r;}catch(e){L('ort.create FAIL '+errs(e));throw e;}};}
const launch=+(localStorage.getItem('ci_launch')||0)+1;localStorage.setItem('ci_launch',launch);L('launch#'+launch);
const srcSha=async()=>{const m={};for(const z of ['test-classify.zip','test-detect.zip']){const b=await new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open('GET',z);x.responseType='arraybuffer';x.onload=()=>res(x.response);x.onerror=()=>rej(new Error('xhr '+z));x.send();});const zip=await JSZip.loadAsync(b);for(const k of Object.keys(zip.files)){if(zip.files[k].dir)continue;const u=await zip.files[k].async('uint8array');m[k.split('/').pop()]=(m[k.split('/').pop()]||[]).concat(await sha(u));}}return m;};
const check=async(tag,src)=>{const ks=(await idbAll()).filter(k=>/\|\/data\//.test(k));let ok=0,bad=0;for(const k of ks){const b=await idbGet(k);const h=await sha(b);const name=k.split('/').pop();const exp=src[name]||[];if(exp.includes(h))ok++;else{bad++;L(tag+' MISMATCH '+k+' got '+h+' bytes='+b.byteLength);}}L(tag+' stored files='+ks.length+' sha_match='+ok+' mismatch='+bad);return ks.length;};
(async()=>{try{
 const t0=Date.now();while(!window.MKAI_API&&Date.now()-t0<20000)await sleep(200);
 const src=await srcSha();L('source sha entries='+Object.keys(src).length);
 if(launch===1){const t1=Date.now();while(window.MKAI_API.models().length<2&&Date.now()-t1<150000)await sleep(1000);L('launch1 models='+window.MKAI_API.models().length);await check('launch1',src);}
 else{const ms=window.MKAI_API.models();L('relaunch persisted models='+ms.map(m=>m.type+':'+m.id).join(','));await check('relaunch',src);
  for(const m of ms){try{await window.MKAI_API.openModel(m.id);L('reopen '+m.type+' ready='+window.ready);const c=document.createElement('canvas');c.width=c.height=320;const g=c.getContext('2d');g.fillStyle=m.type==='classify'?'#d00':'#fff';g.fillRect(0,0,320,320);g.fillStyle='#d00';g.fillRect(80,80,100,100);const im=new Image();await new Promise(r=>{im.onload=r;im.src=c.toDataURL();});const r=await window.MKAI_API.infer(im);L('reinfer '+m.type+' '+(m.type==='classify'?'top='+m.meta.classes[r.indexOf(Math.max(...r))]:'n='+r.length));}catch(e){L('FAIL reopen '+m.type+' '+errs(e));}}
  if(ms.length){const before=(await idbAll()).length;await window.MKAI_API.removeModel(ms[0].id);const after=(await idbAll()).length;L('delete '+ms[0].type+': models '+ms.length+'->'+window.MKAI_API.models().length+', stored keys '+before+'->'+after);}
  L('RELAUNCH_DONE');}
}catch(e){L('CI HARNESS FAIL '+errs(e));}})();
})();
