(async()=>{try{
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths='./';
const M=await (await fetch('model.json')).json();const S=await ort.InferenceSession.create('detector.onnx',{executionProviders:['wasm']});
const z=M.size;const cols=['#e00','#07f','#0a0','#e90'];
window.detect=async im=>{const t=document.createElement('canvas');t.width=t.height=z;const g=t.getContext('2d');g.drawImage(im,0,0,z,z);const d=g.getImageData(0,0,z,z).data;const f=new Float32Array(3*z*z);
 for(let i=0;i<z*z;i++){f[i]=d[i*4]/255;f[z*z+i]=d[i*4+1]/255;f[2*z*z+i]=d[i*4+2]/255;}
 const o=await S.run({image:new ort.Tensor('float32',f,[1,3,z,z])});const res=[];
 for(let i=0;i<o.scores.data.length;i++)if(o.scores.data[i]>=M.score_threshold){const b=Array.from(o.boxes.data.slice(i*4,i*4+4));res.push({score:o.scores.data[i],cls:Number(o.labels.data[i]),box:[b[0]*im.naturalWidth/z,b[1]*im.naturalHeight/z,b[2]*im.naturalWidth/z,b[3]*im.naturalHeight/z]});}
 return res;};
st.textContent='جاهز (نموذج تجريبي، اختُبر على متصفح واحد)';window.ready=true;
f.onchange=()=>{const im=new Image();im.onload=async()=>{c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');g.drawImage(im,0,0);const r=await detect(im);g.lineWidth=Math.max(2,c.width/160);g.font=Math.max(14,c.width/22)+'px sans-serif';g.direction='ltr';g.textAlign='left';
 const cnt={};r.forEach(x=>{cnt[x.cls]=(cnt[x.cls]||0)+1;g.strokeStyle=cols[x.cls%4];g.fillStyle=cols[x.cls%4];g.strokeRect(x.box[0],x.box[1],x.box[2]-x.box[0],x.box[3]-x.box[1]);g.fillText(M.classes[x.cls]+' '+Math.round(x.score*100)+'%',x.box[0]+3,x.box[1]+16);});
 res.textContent=M.classes.map((n,i)=>n+': '+(cnt[i]||0)).join('\n');window.lastDet=r;};im.src=URL.createObjectURL(f.files[0]);};
}catch(e){document.getElementById('st').textContent='خطأ: '+e;window.err=String(e);}})();
