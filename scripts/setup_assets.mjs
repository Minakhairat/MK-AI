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
const T='studio/template';fs.rmSync(T,{recursive:true,force:true});fs.mkdirSync(T+'/base',{recursive:true});
for(const f of ['app.js','index.html'])cp('templates/classify/'+f,T+'/'+f);
for(const f of ORT)cp('studio/'+f,T+'/'+f);
for(const f of fs.readdirSync('studio/base'))cp('studio/base/'+f,T+'/base/'+f);
const files=fs.readdirSync(T,{recursive:true}).filter(f=>fs.statSync(T+'/'+f).isFile()).map(f=>f.split(path.sep).join('/'));
fs.writeFileSync(T+'/files.json',JSON.stringify(files));
// detector app template (ONNX runtime for the browser)
const D='build/detect-template';fs.rmSync(D,{recursive:true,force:true});fs.mkdirSync(D,{recursive:true});
for(const f of fs.readdirSync('templates/detect'))cp('templates/detect/'+f,D+'/'+f);
for(const f of ['ort.min.js','ort-wasm-simd-threaded.wasm','ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.jsep.wasm','ort-wasm-simd-threaded.jsep.mjs'])cp('node_modules/onnxruntime-web/dist/'+f,D+'/'+f);
cp('templates/detect/NOTICE-MODEL.txt',D+'/NOTICE-MODEL.txt');cp('studio/base/LICENSE-APACHE-2.0.txt',D+'/LICENSE-APACHE-2.0.txt');
console.log('assets ready');
