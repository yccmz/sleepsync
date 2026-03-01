/* ============================================================
   Sleep Sync — Service Worker v4
   ネットワーク優先戦略（開発中の変更が即時反映される）
   ============================================================ */

const CACHE_NAME = 'sleep-sync-v4';

// インストール時：skipWaiting で即時有効化
self.addEventListener('install', event => {
    self.skipWaiting();
});

// アクティベート時：古いキャッシュを全削除 + すぐにページを制御
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// フェッチ：ネットワーク優先 → 失敗時のみキャッシュ
self.addEventListener('fetch', event => {
    // Firebase / CDN は SW を素通りさせる
    const url = event.request.url;
    if (
        url.includes('firebaseio.com') ||
        url.includes('googleapis.com') ||
        url.includes('gstatic.com') ||
        url.includes('unpkg.com') ||
        url.includes('fonts.googleapis.com')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 成功したらキャッシュにも保存
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // オフライン時のみキャッシュから返す
                return caches.match(event.request)
                    .then(cached => cached || caches.match('./index.html'));
            })
    );
});
