// iOS-only compatibility layer (loaded only by the iOS project, NOT by the Android APK).
// Capacitor iOS serves the app from capacitor://localhost. WebKit's Cache API rejects non-http(s) request URLs
// ("Request url is not HTTP/HTTPS") and fetch() of app files fails the same way. This layer keeps the Runner's own storage
// code working: a Cache-API-shaped store on IndexedDB, used only when the scheme is not http(s), and the ONNX runtime wasm
// handed over as bytes. Nothing here changes behaviour on http(s) origins.
(function(){
if(/^https?:$/.test(location.protocol))return;
const DB='mkai-cap-shim';
const db=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('c');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const tx=async(mode,f)=>{const d=await db();return new Promise((res,rej)=>{const t=d.transaction('c',mode);const q=f(t.objectStore('c'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});};
const path=u=>{try{return new URL(typeof u==='string'?u:u.url,'https://shim.invalid').pathname;}catch(e){return String(u);}};
const open=name=>({
 put:async(u,r)=>{const b=await r.arrayBuffer();await tx('readwrite',s=>s.put(b,name+'|'+path(u)));},
 match:async u=>{const b=await tx('readonly',s=>s.get(name+'|'+path(u)));return b?new Response(b):undefined;},
 delete:async u=>{await tx('readwrite',s=>s.delete(name+'|'+path(u)));return true;},
 keys:async()=>{const ks=await tx('readonly',s=>s.getAllKeys());return ks.filter(k=>k.startsWith(name+'|')).map(k=>({url:'https://shim.invalid'+k.slice(name.length+1)}));}
});
Object.defineProperty(window,'caches',{value:{open:async n=>open(n)},configurable:true});
console.log('MKAI_IOS cache shim active origin='+location.origin);
// ORT: give the wasm as bytes so the runtime does not fetch() a capacitor:// URL.
const xhrBytes=u=>new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open('GET',u);x.responseType='arraybuffer';x.onload=()=>(x.status===0||x.status===200)&&x.response&&x.response.byteLength?res(x.response):rej(new Error(u+' status '+x.status));x.onerror=()=>rej(new Error(u+' xhr failed'));x.send();});
// v11: the stack trace showed the .jsep.mjs loader, so pair it with the .jsep.wasm (v9/v10 gave it the non-jsep wasm: mismatch is a hypothesis). Sizes of both are logged.
const wasmReady=(async()=>{for(const n of ['ort-wasm-simd-threaded.jsep.wasm','ort-wasm-simd-threaded.wasm']){try{const b=await xhrBytes(n);console.log('MKAI_IOS wasm candidate '+n+' bytes='+b.byteLength);if(n.indexOf('jsep')>0){ort.env.wasm.wasmBinary=b;console.log('MKAI_IOS wasmBinary=jsep bytes='+b.byteLength);}}catch(e){console.log('MKAI_IOS wasm candidate FAIL '+n+' '+e);}}console.log('MKAI_IOS ort.env.wasm numThreads='+ort.env.wasm.numThreads+' proxy='+ort.env.wasm.proxy+' paths='+ort.env.wasm.wasmPaths+' hasBinary='+!!ort.env.wasm.wasmBinary);})();
const oc=ort.InferenceSession.create.bind(ort.InferenceSession);
ort.InferenceSession.create=async function(){await wasmReady;return oc.apply(null,arguments);};
})();
