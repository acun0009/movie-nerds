self.addEventListener('install', (ev) => {
    // we can use ev.waitUntil() here
    //cache.addAll() is the same as fetch and put
});

self.addEventListener('activate', (ev) => {
    // this is where we delete old versions of cache
});

self.addEventListener('fetch', (ev) => {

})

self.addEventListener('message', (ev) => {

})