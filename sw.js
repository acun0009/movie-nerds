const version = 1;
const appCache = 'appFiles_' + version;
const imgCache = 'imgFiles_' + version;
const searchCache = 'searchFiles_' + version;
const cartCache = 'cartFiles_' + version;
const rentalCache = 'rentalFiles_' + version;

const appFiles = [
    './',
    './index.html',
    './css/main.css',
    './js/main.js',
    './img/android-chrome-192x192.png',
    './img/apple-touch-icon.png',
    './img/favicon-96x96.png',
    './img/favicon.ico',
    './img/favicon.svg',
    './img/placeholder.jpg',
    './img/site.webmanifest',
    './img/web-app-manifest-512x512.png',
    './manifest.json'
]

self.addEventListener('install', (ev) => {
    // we can use ev.waitUntil() here
    //cache.addAll() is the same as fetch and put
    ev.waitUntil(
        caches.open(appCache).then((cache) => {
            cache.addAll(appFiles);
            console.log('cached all appfiles!')
        })
    )
});

self.addEventListener('activate', (ev) => {
    // this is where we delete old versions of cache
    caches.keys().then((cacheList) => {
        //filter out the ones that DO match the current cache names
        return Promise.all(cacheList.filter((cache) => ![appCache, imgCache, searchCache, cartCache, rentalCache].includes(cache)).map((cache) => caches.delete(cache)));
      });
});

self.addEventListener('fetch', (ev) => {
    console.log(`fetch request for ${ev.request.url}`);

    // look through cache first!!!
    // look up cacheing strategies
    // ev.respondWith(
    //     caches.match(ev.request).then( cacheRes => {
    //         return cacheRes || fetch(ev.request)
    //         .then(fetchResponse => {
    //             let type = fetchResponse.headers.get('content-type');
                
    //         })
    //     })
    // )
    // we respond with the response
    // ev.respondWith( fetch(ev.request) )

})

self.addEventListener('message', (ev) => {
    if ('type' in ev.data) {
        // update online/offline status
        if (ev.data.type === 'NETWORK_STATUS') {
            self.isOnline = ev.data.isOnline;
            console.log(`SW updated. status: ${self.isOnline}`);
        }
    }
    /** 'action' types
     * getCartList
     * getRentalsList
     * rentMovies
     * watchMovie
     */
    if ('action' in ev.data) {
        if (ev.data.action === 'getCartList') {
            console.log(ev.data.movie);
        }
        if (ev.data.action === 'getRentalsList') {

        }
        if (ev.data.action === 'rentMovies') {

        }
        if (ev.data.action === 'watchMovie') {
            
        }
    }
})