const CACHE = "franco-systems-classic-cloud-v110";
const SHELL = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/nueva-cotizacion.html",
  "/cotizaciones.html",
  "/clientes.html",
  "/productos.html",
  "/configuracion.html",
  "/cuentas.html",
  "/usuarios.html",
  "/ver-cotizacion.html",
  "/offline.html",
  "/css/estilos.css",
  "/js/api.js",
  "/js/app-shell.js",
  "/js/pwa.js",
  "/js/auth.js",
  "/js/dashboard.js",
  "/js/cotizacion.js",
  "/js/cotizaciones.js",
  "/js/clientes.js",
  "/js/productos.js",
  "/js/configuracion.js",
  "/js/cuentas.js",
  "/js/medios-pago-doc.js",
  "/js/usuarios.js",
  "/js/ver-cotizacion.js",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match("/offline.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
