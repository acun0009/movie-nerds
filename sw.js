self.addEventListener('install', (ev) => {
    // we can use ev.waitUntil() here
    //cache.addAll() is the same as fetch and put
});

self.addEventListener('activate', (ev) => {
    // this is where we delete old versions of cache
});

self.addEventListener('fetch', (ev) => {
    console.log(`fetch request for ${ev.request.url}`);

    // look through cache first!!!
    // look up cacheing strategies
    ev.respondWith(
        caches.match(ev.request).then( cacheRes => {
            return cacheRes || fetch(ev.request)
            .then(fetchResponse => {
                let type = fetchResponse.headers.get('content-type');
                
            })
        })
    )
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
     * getRentedList
     * rentMovies
     * watchMovie
     */
    if ('action' in ev.data) {
        if (ev.data.action === 'getCartList') {
            
        }
        if (ev.data.action === 'getRentedList') {

        }
        if (ev.data.action === 'rentMovies') {

        }
        if (ev.data.action === 'watchMovie') {

        }
    }
})