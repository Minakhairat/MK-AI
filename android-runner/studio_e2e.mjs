// CI: Studio (its own training code in headless Chrome) trains a classifier on real photos, exports the zip with its own export code, then the trusted Runner imports that zip and classifies held-out photos.
// usage: node studio_e2e.mjs STUDIO_DIR RUNNER_WWW DATA_DIR   (DATA_DIR has train/<class>/*.jpg and test/truth.json)
import puppeteer from 'puppeteer-core'; import http from 'http'; import fs from 'fs'; import path from 'path';
const [studio,www,data]=process.argv.slice(2);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.json':'application/json','.onnx':'application/octet-stream'};
const srv=(root,port)=>http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(r);}).listen(port);
const s1=srv(studio,8211),s2=srv(www,8212);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--headless=new']});
const log=m=>{console.log(m);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,m+'\n');};
const T=JSON.parse(fs.readFileSync(data+'/test/truth.json'));const classes=T.classes;
// 1) Studio
const st=await b.newPage();const errs=[];st.on('pageerror',e=>errs.push(String(e)));await st.goto('http://localhost:8211/');
await st.waitForFunction(()=>S.sess,{timeout:120000});
await st.evaluate(c=>{S.mode='classify';S.classes=c.map(n=>({name:n,imgs:[]}));},classes);
for(let ci=0;ci<classes.length;ci++){const dir=`${data}/train/${classes[ci]}`;for(const f of fs.readdirSync(dir).sort()){const d=fs.readFileSync(dir+'/'+f).toString('base64');await st.evaluate(async(ci,d)=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/jpeg;base64,'+d;});S.classes[ci].imgs.push(im);},ci,d);}}
const t0=Date.now();await st.evaluate(async()=>{await trainClassify(()=>{});});
const acc=await st.evaluate(()=>S.head.acc);log(`Studio trained in-browser on ${classes.length} classes x 30 real Oxford photos in ${((Date.now()-t0)/1000).toFixed(0)} s; training accuracy ${(acc*100).toFixed(0)}% (same photos, not a test).`);
await st.evaluate(()=>{const o=URL.createObjectURL.bind(URL);URL.createObjectURL=bl=>{window.__zip=bl;return o(bl);};HTMLAnchorElement.prototype.click=function(){};});
await st.evaluate(async()=>{await exportClassify();});
const zb64=await st.evaluate(async()=>{const bl=window.__zip;const buf=new Uint8Array(await bl.arrayBuffer());let s='';for(let i=0;i<buf.length;i+=32768)s+=String.fromCharCode.apply(null,buf.subarray(i,i+32768));return btoa(s);});
fs.writeFileSync('build/studio-export.zip',Buffer.from(zb64,'base64'));log(`Studio export zip written: ${fs.statSync('build/studio-export.zip').size} bytes, Studio page errors ${errs.length}`);
// 2) Runner
const rp=await b.newPage();const rerr=[];rp.on('pageerror',e=>rerr.push(String(e)));await rp.goto('http://localhost:8212/');
await (await rp.$('#f')).uploadFile('build/studio-export.zip');
await rp.waitForFunction(()=>window.ready||/فشل/.test(document.getElementById('st').textContent),{timeout:120000});
if(!(await rp.evaluate('window.ready')))throw new Error('Runner rejected the Studio export: '+await rp.evaluate("document.getElementById('log').textContent"));
let ok=0;const per={};for(const it of T.images){const d=fs.readFileSync(`${data}/test/${it.file}`).toString('base64');
 const p=await rp.evaluate(async d=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/jpeg;base64,'+d;});return await MKAI_API.infer(im);},d);
 const a=p.indexOf(Math.max(...p));per[classes[it.label]]=per[classes[it.label]]||[0,0];per[classes[it.label]][1]++;if(a===it.label){ok++;per[classes[it.label]][0]++;}}
log(`Runner imported the Studio-generated export and classified ${T.images.length} held-out Oxford test photos (never used in training): ${ok} correct (${(100*ok/T.images.length).toFixed(1)}%, chance 20%); per class ${JSON.stringify(per)}; Runner page errors ${rerr.length}`);
await b.close();s1.close();s2.close();
