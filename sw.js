// Service worker for Miegstāsts.
// Change this number only if you want to force-refresh the icons or the manifest.
var CACHE = 'nk-v1';

// App shell: the files needed to open the app without internet.
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

// Install: save the app shell and activate right away.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: remove caches from older versions and take control of open pages.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: only same-origin GET requests without a Range header are handled.
// Everything else (YouTube, Google Fonts, other sites, blob:/data:, audio streaming) passes through untouched.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The page itself: network first, so edits to index.html show up immediately.
  // The cache is used only when there is no internet.
  var isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isPage) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put('./index.html', copy);
          });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Manifest and icons: cache first, network as a fallback.
  var isShell = SHELL.some(function (path) {
    return new URL(path, self.location).pathname === url.pathname;
  });
  if (isShell) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req);
      })
    );
  }
  // Anything else on this site: no special handling.
});
