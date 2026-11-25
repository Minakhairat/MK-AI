// CI: imports the classify export in the trusted runner (headless Chrome), predicts the held-out photos, compares with the Python pipeline. Usage: node parity_classify.mjs WWWDIR EXPORT.zip TESTDIR
import puppeteer from 'puppeteer-core'; import {diag} from './parity_diag.mjs'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [www,zip,td,bin]=process.argv.slice(2);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml'};
const s=http.createServer((q,r)=>{let p=path.join(www,q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';if(!fs.existsSync(p)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r);}).listen(8198);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--headless=new']});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
await pg.goto('http://localhost:8198/');await (await pg.$('#f')).uploadFile(zip);
await pg.waitForFunction(()=>window.ready,{timeout:180000});
const T=JSON.parse(fs.readFileSync(td+'/truth.json')).images;let agree=0,ok=0;
for(const it of T){const d=fs.readFileSync(td+'/'+it.file).toString('base64');
 const p=await pg.evaluate(async d=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/jpeg;base64,'+d;});return await MKAI_API.infer(im);},d);
 const a=p.indexOf(Math.max(...p));if(a===it.py_pred)agree++;if(a===it.label)ok++;}
const line=`Runner (headless Chrome) on ${T.length} held-out photos: agrees with Python pipeline on ${agree}, top-1 correct ${ok} (${(100*ok/T.length).toFixed(1)}%); page errors ${errs.length}`;console.log(line);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,line+'\n');
if(bin){const {stats,out}=await diag(pg,fs,td,bin,224,T,'classify');let md=0,ag=0,same=0;
 out.forEach((r,i)=>{const L=T[i].py_logits;let m=0;for(let k=0;k<L.length;k++)m=Math.max(m,Math.abs(L[k]-r.logits[k]));md=Math.max(md,m);const a=r.logits.indexOf(Math.max(...r.logits));if(a===T[i].py_pred)ag++;});
 let fd=0,fsum=0,lsc=0,flip=[];out.forEach((r,i)=>{const F=T[i].py_feat;let m=0;for(let k=0;k<F.length;k++){m=Math.max(m,Math.abs(F[k]-r.feat[k]));}fd=Math.max(fd,m);fsum+=m;const L=T[i].py_logits;const mean=L.reduce((a,b)=>a+b,0)/L.length;lsc+=Math.sqrt(L.reduce((a,b)=>a+(b-mean)**2,0)/L.length);const a=r.logits.indexOf(Math.max(...r.logits));if(a!==T[i].py_pred){const so=[...L].sort((x,y)=>y-x);flip.push(`${T[i].file}: python top1-top2 margin ${(so[0]-so[1]).toFixed(3)}, wasm margin ${(()=>{const q=[...r.logits].sort((x,y)=>y-x);return (q[0]-q[1]).toFixed(3);})()}`);}});
 const l3=`Residual (PIL pixels, onnxruntime-web vs onnxruntime): normalised feature vector max |diff| ${fd.toExponential(2)} (mean of per-photo max ${(fsum/T.length).toExponential(2)}); typical logit spread (std) ${(lsc/T.length).toFixed(2)}; changed predictions: ${flip.length?flip.join('; '):'none'}`;console.log(l3);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,l3+'\n');
 const l2=`Diagnosis (classify): canvas vs PIL 224x224 pixels: mean abs diff ${stats.meanOfMeanAbs.toFixed(2)}/255, max ${stats.maxAbs}. With the PIL pixels fed to onnxruntime-web (preprocessing removed): agrees with Python on ${ag}/${T.length}, max |logit diff| ${md.toExponential(2)}. With the app's canvas pixels: agrees on ${agree}/${T.length}.`;console.log(l2);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,l2+'\n');}
await b.close();s.close();
