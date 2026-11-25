// CI-ONLY (iOS simulator test copy). Scores the app's own inference on the same real held-out photos the Android emulator run used.
(function(){
const API=window.MKAI_API;if(!API||!window.MKAI_REAL)return;
const T=window.MKAI_TRUTH||{cls:{}};const L=m=>console.log('MKAI_CI '+m);
const rec={cls:{},det:{}};const oi=API.infer;
API.infer=async function(im){const r=await oi.apply(this,arguments);try{const s=String(im&&im.src||'');const f=s.split('/').pop();const t=API.cur&&API.cur.m&&API.cur.m.type;
 if(/\/ph-cls\//.test(s)&&t==='classify')rec.cls[f]=r.indexOf(Math.max(...r));
 else if(/\/ph-det\//.test(s)&&t==='detect'){const c={};r.forEach(d=>{c[d.cls]=(c[d.cls]||0)+1;});rec.det[f]=c;}}catch(e){}return r;};
let done=false;const ol=console.log;
console.log=function(){ol.apply(console,arguments);const m=String(arguments[0]);
 if(done)return;if(/MKAI_REAL_FAIL|MKAI_REAL_JSERROR|MKAI_REAL_REJECT/.test(m)){L('REAL FAILED: '+m.slice(0,120));}
 if(!/MKAI_REAL_DONE/.test(m))return;done=true;
 let P=0,F=0;const A=(n,ok,d)=>{ok?P++:F++;L('ASSERT '+n+' '+(ok?'PASS':'FAIL')+(d?' '+d:''));};
 const fc=Object.keys(rec.cls);const correct=fc.filter(f=>T.cls[f]&&rec.cls[f]===T.cls[f][0]).length;const agree=fc.filter(f=>T.cls[f]&&rec.cls[f]===T.cls[f][1]).length;
 A('real classifier ran on 40 held-out Oxford photos',fc.length===40,'photos='+fc.length);
 A('real classifier top-1 correct >=32/40 (Android emulator: 34)',correct>=32,'correct='+correct+'/'+fc.length);
 A('real classifier agrees with Python pipeline >=35/40 (Android emulator: 37)',agree>=35,'agree='+agree+'/'+fc.length);
 const dm=(API.models().find(x=>x.type==='detect')||{meta:{classes:[]}}).meta.classes;const tot={};Object.values(rec.det).forEach(c=>Object.keys(c).forEach(k=>{tot[k]=(tot[k]||0)+c[k];}));
 const ref={platelets:35,rbc:443,wbc:35};
 A('real detector ran on 36 held-out blood-cell photos',Object.keys(rec.det).length===36,'photos='+Object.keys(rec.det).length);
 dm.forEach((n,i)=>{const key=String(n).toLowerCase();const got=tot[i]||0;if(ref[key]!==undefined){const tol=Math.max(3,Math.round(ref[key]*0.03));A('real detector count '+n+' within '+tol+' of Android emulator '+ref[key],Math.abs(got-ref[key])<=tol,'ios='+got);}else L('detector class '+n+' count='+got+' (no reference)');});
 L('ASSERT_SUMMARY real pass='+P+' fail='+F);
};
})();
