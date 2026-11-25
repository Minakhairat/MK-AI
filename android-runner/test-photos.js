// CI-ONLY, added to the TEST apk only (never the clean APK). Imports real exported zips through the app's importer and runs REAL held-out photos through the app's own inference, logging results to logcat.
(async()=>{try{const cfg=window.MKAI_REAL;if(!cfg)return;await new Promise(r=>{const t=setInterval(()=>{if(window.MKAI_API){clearInterval(t);r();}},100);});
 for(const job of cfg){const b=await(await fetch(job.zip)).blob();const id=await MKAI_API.importZip(new File([b],job.zip));await MKAI_API.openModel(id);
  for(let i=0;i<60&&!window.ready;i++)await new Promise(r=>setTimeout(r,500));
  if(!window.ready)throw new Error('model not ready '+job.zip);console.log('MKAI_REAL_IMPORTED '+job.type+' '+job.zip);
  for(const f of job.photos){const im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=j;im.src=job.dir+'/'+f;});const r=await MKAI_API.infer(im);
   if(job.type==='classify'){console.log('MKAI_REAL_CLS '+f+' '+r.indexOf(Math.max(...r))+' '+Math.max(...r).toFixed(4));}
   else{const s=JSON.stringify(r.map(d=>[d.cls,+d.score.toFixed(3),Math.round(d.box[0]),Math.round(d.box[1]),Math.round(d.box[2]),Math.round(d.box[3])]));
    for(let k=0,n=0;k<s.length;k+=2500,n++)console.log('MKAI_REAL_DET '+f+' '+n+' '+s.slice(k,k+2500));console.log('MKAI_REAL_DETEND '+f+' '+r.length);}}}
 console.log('MKAI_REAL_DONE');}catch(e){console.log('MKAI_REAL_FAIL '+e);}})();
