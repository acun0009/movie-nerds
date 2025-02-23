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
     * addToCart
     * getCartList
     * addToRentals
     * getRentalsList
     * watchMovie
     */
    if ('action' in ev.data) {
        if (ev.data.action === 'addToCart') {
            addToCart(ev.data.movie);
        }
        if (ev.data.action === 'getCartList') {
            getCartOfMovies(ev);
        }
        if (ev.data.action === 'addToRentals') {
            addToRentals(ev.data.movie);
        }
        if (ev.data.action === 'getRentalsList') {

        }
       
        if (ev.data.action === 'watchMovie') {

        }
    }
});

function addToCart(movie) {
    let str = JSON.stringify(movie);
    let filename = movie.id + '.json';
    let file = new File([str], filename, { type: 'application/json'});
    let res = new Response(file, { status: 200, headers: { 'content-type': 'application/json'} });
    let req = new Request(`/${filename}`);

    caches
        .open(cartCache)
        .then((cache) => {
            return cache.put(req, res);
        })
        .then(() => {
            console.log('Saved movie (cart)');
            sendMessage({ action: 'addToCartSuccess', message: 'Movie successfully added to cart', movie })
        });
}

function addToRentals(movie) {
    let str = JSON.stringify(movie);
    let filename = movie.id + '.json';
    let file = new File([str], filename, { type: 'application/json'});
    let res = new Response(file, { status: 200, headers: { 'content-type': 'application/json'} });
    let req = new Request(`/${filename}`);

    caches
        .open(rentalCache)
        .then((cache) => {
            return cache.put(req, res);
        })
        .then(() => {
            console.log('Saved movie (rental)');
            sendMessage({ action: 'addToRentalsSuccess', message: 'Movie successfully added to rentals', movie })
        });
}

function getCartOfMovies(ev) {
    console.log('in get cart of movies')
    ev.waitUntil(
        caches.open(cartCache).then(async (cache) => {
            let requests = await cache.keys();
            let responses = await Promise.all(requests.map((req) => cache.match(req)));
            let movies = await Promise.all(responses.map((res) => res.json()))
            console.log(movies)
            let clientId = ev.source.id;
            let msg = {
                action: 'getCartOfMovies',
                movies,
            };
            sendMessage(msg, clientId);
        })
    );
}

function sendMessage(msg, client) {
    //client is falsey means send to all
  
    clients.matchAll().then((clientList) => {
      for (let client of clientList) {
        client.postMessage(msg);
      }
    });
}