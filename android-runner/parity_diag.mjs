// Shared diagnostics, run inside the runner page. Separates preprocessing (canvas vs PIL pixels) from the runtime (onnxruntime-web vs onnxruntime).
export async function diag(pg,fs,td,bin,z,T,kind){
  const buf=fs.readFileSync(bin),n=z*z*3,stats={n:T.length,meanAbs:[],maxAbs:0,rawDiff:[],agreeCanvas:0,agreePil:0,top1Same:0};const out=[];
  for(let i=0;i<T.length;i++){const it=T[i];const jpg=fs.readFileSync(td+'/'+it.file).toString('base64');const pil=Buffer.from(buf.subarray(i*n,(i+1)*n)).toString('base64');
    const r=await pg.evaluate(async(jpg,pil,z,kind)=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/jpeg;base64,'+jpg;});
      const c=document.createElement('canvas');c.width=c.height=z;const g=c.getContext('2d');g.drawImage(im,0,0,z,z);const d=g.getImageData(0,0,z,z).data;
      const p=Uint8Array.from(atob(pil),ch=>ch.charCodeAt(0));let s=0,mx=0;for(let k=0;k<z*z;k++)for(let ch=0;ch<3;ch++){const a=Math.abs(d[k*4+ch]-p[k*3+ch]);s+=a;if(a>mx)mx=a;}
      const {m,S}=MKAI_API.cur,M=m.meta,N=z*z,x=new Float32Array(3*N);
      const MEAN=[0.485,0.456,0.406],STD=[0.229,0.224,0.225];
      for(let k=0;k<N;k++)for(let ch=0;ch<3;ch++){const v=p[k*3+ch]/255;x[ch*N+k]=kind==='classify'?(v-MEAN[ch])/STD[ch]:v;}
      const o=await S.run({image:new ort.Tensor('float32',x,[1,3,z,z])});
      if(kind==='classify'){const f=o.feat.data;let nr=0;for(const v of f)nr+=v*v;nr=Math.sqrt(nr)||1;const K=M.classes.length,l=new Float32Array(K);for(let k=0;k<K;k++){let t=M.b[k];for(let j=0;j<M.D;j++)t+=f[j]/nr*M.W[j*K+k];l[k]=t;}return {mean:s/(z*z*3),max:mx,logits:Array.from(l),feat:Array.from(f,v=>v/nr)};}
      const res=[];for(let k=0;k<o.scores.data.length;k++)if(o.scores.data[k]>=M.score_threshold){const b=Array.from(o.boxes.data.slice(k*4,k*4+4));res.push({score:o.scores.data[k],cls:Number(o.labels.data[k]),box:b});}
      return {mean:s/(z*z*3),max:mx,dets:res};},jpg,pil,z,kind);
    stats.meanAbs.push(r.mean);stats.maxAbs=Math.max(stats.maxAbs,r.max);out.push(r);}
  stats.meanOfMeanAbs=stats.meanAbs.reduce((a,b)=>a+b,0)/T.length;delete stats.meanAbs;return {stats,out};}
