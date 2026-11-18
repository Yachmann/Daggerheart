// Service worker: o site abre offline. Rede primeiro (sem cache do navegador) para tudo do próprio site; cache só como reserva.
const C = "dh-fichas-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  const mesmo = u.origin === location.origin;
  if (e.request.method !== "GET" || (!mesmo && !/fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(u.host))) return;
  const pedido = mesmo && e.request.mode !== "navigate" ? new Request(e.request, { cache: "reload" }) : e.request;
  e.respondWith(fetch(pedido).then(r => { if (r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
