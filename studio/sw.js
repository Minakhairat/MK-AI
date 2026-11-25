// MK AI Studio service worker. Cache name is bound to this registration scope and prefixed "mkai-studio-"; activation deletes ONLY older caches with that prefix AND the same scope tag.
const V='v1',T='@'+self.registration.scope,P='mkai-studio-',C=P+V+T;
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(P)&&k.endsWith(T)&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||!u.href.startsWith(self.registration.scope)||u.pathname.includes('/api/'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(C).then(k=>k.put(r,c));return x;}).catch(()=>caches.open(C).then(k=>k.match(r,{ignoreSearch:true})).then(m=>m||Response.error())));return;}
 e.respondWith(caches.open(C).then(k=>k.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok)k.put(r,x.clone());return x;}))));});
