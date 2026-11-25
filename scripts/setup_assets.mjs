// Copies JS libraries from node_modules and downloads the MobileNet base model from Google's tfjs-models bucket.
// Nothing downloaded here is committed (see .gitignore). The weights' license is NOT confirmed, see README.
import fs from 'fs'; import path from 'path';
const BASE='https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/';
const cp=(a,b)=>{fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(a,b);};
cp('node_modules/@tensorflow/tfjs/dist/tf.min.js','studio/tf.min.js');cp('node_modules/jszip/dist/jszip.min.js','studio/jszip.min.js');
fs.mkdirSync('studio/base',{recursive:true});
const mj=await (await fetch(BASE+'model.json')).json();fs.writeFileSync('studio/base/model.json',JSON.stringify(mj));
for(const g of mj.weightsManifest)for(const p of g.paths)fs.writeFileSync('studio/base/'+p,Buffer.from(await (await fetch(BASE+p)).arrayBuffer()));
// classify app template (served by the studio, filled with the trained head on export)
const T='studio/template';fs.rmSync(T,{recursive:true,force:true});fs.mkdirSync(T+'/base',{recursive:true});
for(const f of fs.readdirSync('templates/classify'))cp('templates/classify/'+f,T+'/'+f);
cp('studio/tf.min.js',T+'/tf.min.js');for(const f of fs.readdirSync('studio/base'))cp('studio/base/'+f,T+'/base/'+f);
const files=fs.readdirSync(T,{recursive:true}).filter(f=>fs.statSync(T+'/'+f).isFile()).map(f=>f.split(path.sep).join('/'));
fs.writeFileSync(T+'/sw.js',`const C='mkai-v1';const F=${JSON.stringify(['./',...files.map(f=>'./'+f),'./head.json','./sw.js'])};self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));`);
fs.writeFileSync(T+'/files.json',JSON.stringify([...files,'sw.js']));
// detector app template (ONNX runtime for the browser)
const D='build/detect-template';fs.rmSync(D,{recursive:true,force:true});fs.mkdirSync(D,{recursive:true});
for(const f of fs.readdirSync('templates/detect'))cp('templates/detect/'+f,D+'/'+f);
for(const f of ['ort.min.js','ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.jsep.wasm','ort-wasm-simd-threaded.jsep.mjs'])cp('node_modules/onnxruntime-web/dist/'+f,D+'/'+f);
console.log('assets ready');
