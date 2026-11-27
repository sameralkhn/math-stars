// يجعل اللعبة تعمل بدون إنترنت بعد أول فتح، ويجلب أحدث نسخة عند توفر الاتصال.
const C='math-stars-2.33.0',FILES=['./','index.html','firebase-config.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!='GET'||u.origin!=location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const k=r.clone();caches.open(C).then(c=>c.put(e.request,k));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})))});
self.addEventListener('push',e=>{let j={};try{j=e.data.json()}catch(x){}const d=j.data||{},n=j.notification||{};const title=d.title||n.title||'نجوم الضرب',body=d.body||n.body||'';
e.waitUntil(self.registration.showNotification(title,{body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',lang:'ar',dir:'rtl',tag:'inv'+(d.code||''),renotify:true,requireInteraction:true,vibrate:[500,250,500,250,500],data:{k:d.k,code:d.code}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const d=e.notification.data||{},url=d.k?'./?join='+d.k+'&code='+d.code:'./';
e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{for(const c of L)if('focus'in c){if(d.k)c.postMessage({join:{k:d.k,code:d.code}});return c.focus()}return self.clients.openWindow(url)}))});
