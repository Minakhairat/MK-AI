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
 const l2=`Diagnosis (classify): canvas vs PIL 224x224 pixels: mean abs diff ${stats.meanOfMeanAbs.toFixed(2)}/255, max ${stats.maxAbs}. With the PIL pixels fed to onnxruntime-web (preprocessing removed): agrees with Python on ${ag}/${T.length}, max |logit diff| ${md.toExponential(2)}. With the app's canvas pixels: agrees on ${agree}/${T.length}.`;console.log(l2);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,l2+'\n');}
await b.close();s.close();
