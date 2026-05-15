/* ENSEI PASS Service Worker v1.0 */
const CACHE_NAME = 'enseipass-v1';
const SHELL_URLS = [
  './',
  './index.html'
];

/* ── インストール: シェルをキャッシュ ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

/* ── アクティベート: 古いキャッシュ削除 ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── フェッチ: Cache-First (シェル) / Network-First (他) ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts / CDN は常にネットワーク優先
  if (url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('cdnjs') ||
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('maps.google')) {
    return;
  }

  // 同一オリジンのHTMLはCache-First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        return cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', clone));
          return res;
        });
      })
    );
    return;
  }

  // その他はネットワーク優先
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

/* ── プッシュ通知受信 ── */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '✦ ENSEI PASS';
  const options = {
    body: data.body || 'ライブ遠征の準備はOKですか？',
    icon: data.icon || '',
    badge: '',
    vibrate: [200, 100, 200],
    tag: 'ensei-reminder',
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* ── 通知クリック ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(event.notification.data?.url || './');
    })
  );
});
