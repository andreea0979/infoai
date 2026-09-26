const VERSION = 'infoai-v14';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    // pagina: întâi internetul (ca să primești mereu ultima versiune), apoi copia salvată
    if (req.mode === 'navigate' && url.origin === location.origin) {
        e.respondWith((async () => {
            try {
                const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
                const res = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
                const c = await caches.open(VERSION); c.put('./index.html', res.clone());
                return res;
            } catch (err) {
                return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
            }
        })());
        return;
    }
    // fișierele aplicației: din copia salvată, actualizate în fundal
    if (url.origin === location.origin || CDN.includes(url.hostname)) {
        e.respondWith((async () => {
            const c = await caches.open(VERSION);
            const hit = await c.match(req);
            const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; }).catch(() => null);
            return hit || (await net) || Response.error();
        })());
    }
    // restul (AI, compilator, InfoHoot) merg direct pe internet
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
