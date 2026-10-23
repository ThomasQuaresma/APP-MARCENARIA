// Guarda as telas do app para abrir sem internet, na casa do cliente ou na obra.
// Com internet, busca sempre a versão nova; sem internet, usa a última guardada.
// O nome do cache leva a versão do build: cada publicação gera um sw.js diferente,
// e o navegador instala sozinho a versão nova.
const CACHE = 'plano-de-corte-__VERSAO__';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const resposta = await fetch(req);
        if (resposta.ok) cache.put(req, resposta.clone());
        return resposta;
      } catch (erro) {
        const guardada = (await cache.match(req)) || (req.mode === 'navigate' && (await cache.match(self.registration.scope)));
        if (guardada) return guardada;
        throw erro;
      }
    }),
  );
});
