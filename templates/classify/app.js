(async()=>{
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
const H=await (await fetch('head.json')).json();
const full=await tf.loadLayersModel('base/model.json');
const feat=tf.model({inputs:full.inputs,outputs:full.getLayer('conv_pw_13_relu').output});
const W=tf.tensor2d(H.W,[H.D,H.classes.length]),B=tf.tensor1d(H.b);
window.classify=async el=>tf.tidy(()=>{const x=tf.browser.fromPixels(el).resizeBilinear([224,224]).toFloat().div(127.5).sub(1).expandDims(0);
 const e=feat.predict(x).mean([1,2]);return tf.softmax(e.matMul(W).add(B)).dataSync();});
st.textContent='جاهز (يعمل على الجهاز بدون إنترنت)';window.ready=true;
f.onchange=()=>{const u=URL.createObjectURL(f.files[0]);im.onload=async()=>{const p=await classify(im);res.textContent=H.classes.map((c,i)=>c+': '+(p[i]*100).toFixed(1)+'%').join('\n');window.lastPred=Array.from(p)};im.src=u;};
})();
