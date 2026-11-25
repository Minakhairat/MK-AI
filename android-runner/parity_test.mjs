// CI: runs the real exported detector zip through the trusted runner (android-runner/www) in headless Chrome on the held-out test photos,
// writes the detections for trainer/eval_detect.py (dets mode). Usage: node parity_test.mjs WWWDIR EXPORT.zip TESTDIR OUT.json
import puppeteer from 'puppeteer-core'; import {diag} from './parity_diag.mjs'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [www,zip,td,out,bin]=process.argv.slice(2);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml'};
const s=http.createServer((q,r)=>{let p=path.join(www,q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';if(!fs.existsSync(p)){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r);}).listen(8199);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--headless=new']});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));const ext=[];pg.on('request',r=>{const u=r.url();if(!u.startsWith('http://localhost:8199')&&!u.startsWith('data:')&&!u.startsWith('blob:'))ext.push(u);});
await pg.goto('http://localhost:8199/');
await (await pg.$('#f')).uploadFile(zip);
await pg.waitForFunction(()=>window.ready||/فشل/.test(document.getElementById('st').textContent),{timeout:120000});
if(!(await pg.evaluate('window.ready')))throw new Error('import failed: '+await pg.evaluate("document.getElementById('log').textContent"));
const T=JSON.parse(fs.readFileSync(td+'/truth.json')).images;const dets={};
for(const it of T){const b64=fs.readFileSync(td+'/'+it.file).toString('base64');
 dets[it.file]=await pg.evaluate(async d=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/jpeg;base64,'+d;});return await MKAI_API.infer(im);},b64);}
fs.writeFileSync(out,JSON.stringify(dets));console.log('runner produced detections for',T.length,'photos; page errors',errs.length,'external requests',ext.length);
if(bin){const {stats,out:o}=await diag(pg,fs,td,bin,320,T,'detect');const dp={};o.forEach((r,i)=>{const it=T[i];dp[it.file]=r.dets.map(d=>({score:d.score,cls:d.cls,box:[d.box[0]*it.w/320,d.box[1]*it.h/320,d.box[2]*it.w/320,d.box[3]*it.h/320]}));});
 fs.writeFileSync(out.replace('.json','_pil.json'),JSON.stringify(dp));const l=`Diagnosis (detect): canvas vs PIL 320x320 pixels: mean abs diff ${stats.meanOfMeanAbs.toFixed(2)}/255, max ${stats.maxAbs}. Detections from PIL pixels via onnxruntime-web saved to ${out.replace('.json','_pil.json')}.`;console.log(l);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,l+'\n');}
await b.close();s.close();
