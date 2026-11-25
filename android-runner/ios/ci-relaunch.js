// CI-ONLY (iOS simulator test copy). Integrity, persistence-across-relaunch, deletion and error evidence for the iOS storage layer.
(function(){
const L=m=>console.log('MKAI_CI '+m);{const ol=console.log;console.log=function(){try{if(/MKAI_NATIVE_(OK|FAIL)|MKAI_REAL_(DONE|FAIL)/.test(String(arguments[0])))window.__nativeDone=true;}catch(e){}return ol.apply(console,arguments);};}
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
const oc=window.ort&&ort.InferenceSession&&ort.InferenceSession.create;if(oc){ort.InferenceSession.create=async function(){L('ort.create start');const T=setTimeout(()=>L('ort.create STILL PENDING after 60s'),60000);try{const r=await oc.apply(ort.InferenceSession,arguments);clearTimeout(T);L('ort.create ok');return r;}catch(e){clearTimeout(T);L('ort.create FAIL '+errs(e));throw e;}};}
const launch=+(localStorage.getItem('ci_launch')||0)+1;localStorage.setItem('ci_launch',launch);L('launch#'+launch);
const srcSha=async()=>{const m={};for(const z of ['real-classify.zip','real-detect.zip']){const b=await new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open('GET',z);x.responseType='arraybuffer';x.onload=()=>res(x.response);x.onerror=()=>rej(new Error('xhr '+z));x.send();});const zip=await JSZip.loadAsync(b);for(const k of Object.keys(zip.files)){if(zip.files[k].dir)continue;const u=await zip.files[k].async('uint8array');m[k.split('/').pop()]=(m[k.split('/').pop()]||[]).concat(await sha(u));}}return m;};
const check=async(tag,src)=>{const ks=(await idbAll()).filter(k=>/\|\/data\//.test(k));let ok=0,bad=0;for(const k of ks){const b=await idbGet(k);const h=await sha(b);const name=k.split('/').pop();const exp=src[name]||[];if(exp.includes(h))ok++;else{bad++;L(tag+' MISMATCH '+k+' got '+h+' bytes='+b.byteLength);}}L(tag+' stored files='+ks.length+' sha_match='+ok+' mismatch='+bad);return {n:ks.length,ok,bad};};
(async()=>{try{
 const t0=Date.now();while(!window.MKAI_API&&Date.now()-t0<20000)await sleep(200);
 const src=await srcSha();L('source sha entries='+Object.keys(src).length);
 let P=0,F=0;const A=(n,ok,d)=>{if(ok)P++;else F++;L('ASSERT '+n+' '+(ok?'PASS':'FAIL')+(d?' '+d:''));};
 const fixture=async t=>{const c=document.createElement('canvas');c.width=c.height=320;const g=c.getContext('2d');g.fillStyle=t==='classify'?'#d00':'#fff';g.fillRect(0,0,320,320);g.fillStyle='#d00';g.fillRect(80,80,100,100);const im=new Image();await new Promise(r=>{im.onload=r;im.src=c.toDataURL();});return im;};
 const sig=async m=>{await window.MKAI_API.openModel(m.id);const r=await window.MKAI_API.infer(await fixture(m.type));return m.type==='classify'?{t:'c',k:m.meta.classes.length,p:r.map(x=>+x.toFixed(4))}:{t:'d',k:m.meta.classes.length,d:r.slice(0,8).map(x=>[x.cls,+x.score.toFixed(4)].concat(x.box.map(v=>+v.toFixed(1))))};};
 const valid=(m,g)=>g.t==='c'?(g.p.length===g.k&&Math.abs(g.p.reduce((a,b)=>a+b,0)-1)<0.02&&g.p.every(x=>x>=0&&x<=1)):(g.d.every(x=>x[0]>=0&&x[0]<g.k&&x[1]>=0&&x[1]<=1&&x.slice(2).every(Number.isFinite)));
 const same=(a,b)=>a.t===b.t&&(a.t==='c'?a.p.every((x,i)=>Math.abs(x-b.p[i])<0.01):(a.d.length===b.d.length&&a.d.every((x,i)=>x[0]===b.d[i][0]&&Math.abs(x[1]-b.d[i][1])<0.02&&x.slice(2).every((v,j)=>Math.abs(v-b.d[i][j+2])<3))));
 const show=(m,g)=>g.t==='c'?m.meta.classes[g.p.indexOf(Math.max(...g.p))]+' p='+Math.max(...g.p).toFixed(3):'n='+g.d.length+(g.d.length?' top='+m.meta.classes[g.d[0][0]]+'@'+g.d[0][1]:'');
 if(launch===1){const t1=Date.now();while(window.MKAI_API.models().length<2&&Date.now()-t1<600000)await sleep(1000);const t2=Date.now();while(!window.__nativeDone&&Date.now()-t2<900000)await sleep(1000);A('launch1 native self-test finished',!!window.__nativeDone,'');L('launch1 models='+window.MKAI_API.models().length);A('launch1 two models imported',window.MKAI_API.models().length===2,'');const c1=await check('launch1',src);A('launch1 stored bytes sha256 equal source zip entries',c1.n>0&&c1.bad===0&&c1.ok===c1.n,'files='+c1.n+' match='+c1.ok);
  const S={};for(const m of window.MKAI_API.models()){try{const g=await sig(m);S[m.id]=g;A('launch1 inference valid '+m.type,valid(m,g),show(m,g));}catch(e){A('launch1 inference '+m.type,false,errs(e));}}
  localStorage.setItem('ci_sigs',JSON.stringify(S));L('launch1 fixture signatures saved for '+Object.keys(S).length+' models');L('ASSERT_SUMMARY launch1 pass='+P+' fail='+F);}
 else{const ms=window.MKAI_API.models();const S=JSON.parse(localStorage.getItem('ci_sigs')||'{}');A('relaunch both models persisted',ms.length===2,ms.map(m=>m.type+':'+m.id).join(','));const c2=await check('relaunch',src);A('relaunch stored bytes sha256 equal source zip entries',c2.n>0&&c2.bad===0&&c2.ok===c2.n,'files='+c2.n+' match='+c2.ok);
  for(const m of ms){try{const g=await sig(m);A('reopen ready '+m.type,window.ready!==false,'ready='+window.ready);A('reinfer valid '+m.type,valid(m,g),show(m,g));A('reinfer equals launch1 '+m.type,!!S[m.id]&&same(S[m.id],g),'launch1='+(S[m.id]?show(m,S[m.id]):'missing'));}catch(e){A('reopen '+m.type,false,errs(e));}}
  if(ms.length){const before=(await idbAll()).length;const id0=ms[0].id;await window.MKAI_API.removeModel(id0);const after=(await idbAll()).length;const left=window.MKAI_API.models();A('delete removed model '+ms[0].type,left.length===ms.length-1&&!left.some(x=>x.id===id0),'models '+ms.length+'->'+left.length);A('delete removed stored bytes',after<before,'stored keys '+before+'->'+after);}
  L('ASSERT_SUMMARY relaunch pass='+P+' fail='+F);L('RELAUNCH_DONE');}
}catch(e){L('CI HARNESS FAIL '+errs(e));}})();
})();
