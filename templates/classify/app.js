(async()=>{
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths='./';
const H=await (await fetch('head.json')).json();
const S=await ort.InferenceSession.create('base/feat.onnx',{executionProviders:['wasm']});
const MEAN=[0.485,0.456,0.406],STD=[0.229,0.224,0.225];
window.classify=async el=>{const z=224,t=document.createElement('canvas');t.width=t.height=z;const g=t.getContext('2d');g.drawImage(el,0,0,z,z);const d=g.getImageData(0,0,z,z).data,n=z*z,x=new Float32Array(3*n);
 for(let i=0;i<n;i++)for(let c=0;c<3;c++)x[c*n+i]=(d[i*4+c]/255-MEAN[c])/STD[c];
 const o=(await S.run({image:new ort.Tensor('float32',x,[1,3,z,z])})).feat.data;let nr=0;for(const v of o)nr+=v*v;nr=Math.sqrt(nr)||1;
 const K=H.classes.length,l=new Float32Array(K);for(let k=0;k<K;k++){let s=H.b[k];for(let j=0;j<H.D;j++)s+=o[j]/nr*H.W[j*K+k];l[k]=s;}
 const m=Math.max(...l),e=Array.from(l,v=>Math.exp(v-m)),su=e.reduce((a,b)=>a+b);return e.map(v=>v/su);};
st.textContent='جاهز (يعمل على الجهاز بدون إنترنت)';window.ready=true;
f.onchange=()=>{const u=URL.createObjectURL(f.files[0]);im.onload=async()=>{const p=await classify(im);res.textContent=H.classes.map((c,i)=>c+': '+(p[i]*100).toFixed(1)+'%').join('\n');window.lastPred=p};im.src=u;};
})();
