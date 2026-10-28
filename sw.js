'use strict';
// Caches only the app page so it opens without signal. Never touches the weather API or the form.
const CACHE = 'field-form-e4eb16e';
const PAGE = './';

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.add(PAGE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || req.mode !== 'navigate' || new URL(req.url).origin !== self.location.origin) return;
    // Network first so updates arrive; fall back to the cached page after 4 s or when offline.
    e.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const net = fetch(req).then((res) => {
            if (res.ok) cache.put(PAGE, res.clone());
            return res;
        });
        const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
        try {
            const res = await Promise.race([net, timeout]);
            if (res) return res;
        } catch (err) { /* offline */ }
        const cached = await cache.match(PAGE);
        return cached || net;
    })());
});
