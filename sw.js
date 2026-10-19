
const CACHE = "minhas-tabelas-v8";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(chaves =>
      Promise.all(
        chaves
          .filter(chave => chave !== CACHE)
          .map(chave => caches.delete(chave))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(arquivoEmCache => {
      if (arquivoEmCache) return arquivoEmCache;

      return fetch(event.request).then(resposta => {
        if (
          resposta &&
          resposta.status === 200 &&
          new URL(event.request.url).origin === self.location.origin
        ) {
          const copia = resposta.clone();

          caches.open(CACHE).then(cache => {
            cache.put(event.request, copia);
          });
        }

        return resposta;
      });
    })
  );
});
