// CI-ONLY, added to the TEST apk only (never the clean APK). Imports real exported zips through the app's importer and runs REAL held-out photos through the app's own inference, logging stage progress and results to logcat.
(async()=>{const L=m=>console.log('MKAI_REAL_'+m);const T0=Date.now(),t=()=>((Date.now()-T0)/1000).toFixed(1)+'s';
 try{const cfg=window.MKAI_REAL;if(!cfg)return;await new Promise(r=>{const x=setInterval(()=>{if(window.MKAI_API){clearInterval(x);r();}},100);});L('STAGE start jobs='+cfg.length);
 for(const job of cfg){L('STAGE fetch-start '+job.zip+' '+t());const b=await(await fetch(job.zip)).blob();L('STAGE fetch-done '+job.zip+' bytes='+b.size+' '+t());
  const id=await MKAI_API.importZip(new File([b],job.zip));L('STAGE import-done '+job.zip+' '+t());
  window.ready=false;await MKAI_API.openModel(id);L('STAGE model-'+(window.ready?'ready':'NOT-ready')+' '+job.zip+' '+t());
  if(!window.ready)throw new Error('model not ready '+job.zip);L('IMPORTED '+job.type+' '+job.zip);
  let n=0;for(const f of job.photos){const im=new Image();await new Promise((r,j)=>{im.onload=r;im.onerror=j;im.src=job.dir+'/'+f;});const r=await MKAI_API.infer(im);n++;
   if(n<=2||n%10===0)L('STAGE photo '+job.type+' '+n+'/'+job.photos.length+' '+t());
   if(job.type==='classify'){L('CLS '+f+' '+r.indexOf(Math.max(...r))+' '+Math.max(...r).toFixed(4));}
   else{const s=JSON.stringify(r.map(d=>[d.cls,+d.score.toFixed(3),Math.round(d.box[0]),Math.round(d.box[1]),Math.round(d.box[2]),Math.round(d.box[3])]));
    for(let k=0,c=0;k<s.length;k+=2500,c++)L('DET '+f+' '+c+' '+s.slice(k,k+2500));L('DETEND '+f+' '+r.length);}}}
 L('DONE '+t());}catch(e){L('FAIL '+e+' at '+t());}})();
window.addEventListener('error',e=>console.log('MKAI_REAL_JSERROR '+e.message));window.addEventListener('unhandledrejection',e=>console.log('MKAI_REAL_REJECT '+e.reason));
