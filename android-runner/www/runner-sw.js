// Serves imported MK AI apps (stored on this device in Cache Storage) under /app/<id>/ . Nothing is fetched from the network for them.
// Imported apps may only talk to their own files: no outbound network requests from them.
const CSP="default-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:; connect-src 'self' blob: data:; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'";
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.origin!==location.origin||!u.pathname.includes('/app/'))return;
 e.respondWith((async()=>{const c=await caches.open('mkai-runner-apps');let k=u.origin+u.pathname;if(k.endsWith('/'))k+='index.html';const r=await c.match(k);if(!r)return new Response('not found',{status:404});const h=new Headers(r.headers);h.set('Content-Security-Policy',CSP);h.set('X-Content-Type-Options','nosniff');return new Response(r.body,{status:200,headers:h});})());});
