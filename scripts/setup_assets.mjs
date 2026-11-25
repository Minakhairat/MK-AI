// Copies JS libraries from node_modules and exports the Apache-2.0 timm MobileNetV3-small backbone to ONNX.
// Nothing downloaded here is committed (see .gitignore). See README for the model license notes.
import fs from 'fs'; import path from 'path';
const cp=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);};
cp('node_modules/jszip/dist/jszip.min.js','studio/jszip.min.js');
import {execSync} from 'child_process';
const py=process.platform==='win32'?'python':'python3';
execSync(py+' scripts/export_backbone.py studio/base',{stdio:'inherit'});
const ORT=['ort.min.js','ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.jsep.wasm','ort-wasm-simd-threaded.jsep.mjs'];
for(const f of ORT)cp('node_modules/onnxruntime-web/dist/'+f,'studio/'+f);
// classify app template (served by the studio, filled with the trained head on export)
// Upstream ONNX Runtime license files for the pinned release tag (onnxruntime-web 1.31.1), fetched via jsDelivr's GitHub mirror and hash-checked.
import crypto from 'crypto';
const ORTV=JSON.parse(fs.readFileSync('node_modules/onnxruntime-web/package.json','utf8')).version;
if(ORTV!=='1.31.1')throw new Error('onnxruntime-web is '+ORTV+'; update the notice hashes in scripts/setup_assets.mjs after checking the new upstream files');
const NOTICES=[['LICENSE','ORT-LICENSE-MIT.txt','2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c'],['ThirdPartyNotices.txt','ORT-THIRD-PARTY-NOTICES.txt','143764b952fdb1a7c69ce653bfba74a7744d6a8a573bfb73e235fba356c83de3']];
for(const [src,dst,sha] of NOTICES){const r=await fetch('https://cdn.jsdelivr.net/gh/microsoft/onnxruntime@v1.31.1/'+src);if(!r.ok)throw new Error('could not download '+src+' for the license notices: HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());
 if(crypto.createHash('sha256').update(b).digest('hex')!==sha)throw new Error(src+' changed upstream; review before shipping');fs.mkdirSync('build/notices',{recursive:true});fs.writeFileSync('build/notices/'+dst,b);}
const BRAND=['favicon.svg','pwa-192x192.png','pwa-512x512.png','apple-touch-icon.png'];
const ICONS=JSON.parse(fs.readFileSync('brand/icons.json','utf8'));const putb=(dir)=>{for(const f of BRAND){if(ICONS[f])fs.writeFileSync(dir+'/'+f,Buffer.from(ICONS[f],'base64'));else cp('brand/'+f,dir+'/'+f);}};putb('studio');
const T='studio/template';fs.rmSync(T,{recursive:true,force:true});fs.mkdirSync(T+'/base',{recursive:true});
for(const f of ['app.js','index.html'])cp('templates/classify/'+f,T+'/'+f);
for(const f of ORT)cp('studio/'+f,T+'/'+f);
for(const f of fs.readdirSync('studio/base'))cp('studio/base/'+f,T+'/base/'+f);
putb(T);cp('templates/THIRD-PARTY-NOTICES.txt',T+'/THIRD-PARTY-NOTICES.txt');for(const f of ['ORT-LICENSE-MIT.txt','ORT-THIRD-PARTY-NOTICES.txt'])cp('build/notices/'+f,T+'/'+f);
const files=fs.readdirSync(T,{recursive:true}).filter(f=>fs.statSync(T+'/'+f).isFile()).map(f=>f.split(path.sep).join('/'));
fs.writeFileSync(T+'/files.json',JSON.stringify(files));
// detector app template (ONNX runtime for the browser)
const D='build/detect-template';fs.rmSync(D,{recursive:true,force:true});fs.mkdirSync(D,{recursive:true});
for(const f of fs.readdirSync('templates/detect'))cp('templates/detect/'+f,D+'/'+f);
for(const f of ['ort.min.js','ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.jsep.wasm','ort-wasm-simd-threaded.jsep.mjs'])cp('node_modules/onnxruntime-web/dist/'+f,D+'/'+f);
cp('templates/detect/NOTICE-MODEL.txt',D+'/NOTICE-MODEL.txt');cp('studio/base/LICENSE-APACHE-2.0.txt',D+'/LICENSE-APACHE-2.0.txt');
putb(D);cp('templates/THIRD-PARTY-NOTICES.txt',D+'/THIRD-PARTY-NOTICES.txt');for(const f of ['ORT-LICENSE-MIT.txt','ORT-THIRD-PARTY-NOTICES.txt'])cp('build/notices/'+f,D+'/'+f);
console.log('assets ready');
