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
	'./manifest.json',
];

self.addEventListener('install', (ev) => {
	// we can use ev.waitUntil() here
	//cache.addAll() is the same as fetch and put
	ev.waitUntil(
		caches.open(appCache).then((cache) => {
			cache.addAll(appFiles);
			console.log('cached all appfiles!');
		})
	);
});

self.addEventListener('activate', (ev) => {
	// this is where we delete old versions of cache
	caches.keys().then((cacheList) => {
		//filter out the ones that DO match the current cache names
		return Promise.all(
			cacheList
				.filter(
					(cache) =>
						![appCache, imgCache, searchCache, cartCache, rentalCache].includes(
							cache
						)
				)
				.map((cache) => caches.delete(cache))
		);
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
});

self.addEventListener('message', (ev) => {
	if ('type' in ev.data) {
		// update online/offline status
		if (ev.data.type === 'NETWORK_STATUS') {
			self.isOnline = ev.data.isOnline;
			console.log(`SW updated. status: ${self.isOnline}`);
		}
	}
	/** 'action' types
	 * addToSearch
	 * addToCart
	 * getCartList
	 * removeFromCart
	 * addToRentals
	 * getRentalsList
	 * watchMovie
     * returnMovie
	 */
	if ('action' in ev.data) {
		if (ev.data.action === 'addToSearch') {
			ev.waitUntil(caches.delete(searchCache)); // delete previous search results before adding to searchCache
			addToSearch(ev.data.movies);
		}

		if (ev.data.action === 'addToCart') {
			addToCart(ev.data.movie);
		}

		if (ev.data.action === 'getCartList') {
			ev.waitUntil(getCartOfMovies(ev));
			console.log('Got movies in cart!');
		}

		if (ev.data.action === 'removeFromCart') {
			ev.waitUntil(removeReqFromCart(ev));
			ev.waitUntil(getCartOfMovies(ev));
		}

		if (ev.data.action === 'addToRentals') {
			ev.waitUntil(addToRentals());
			console.log('Movies rented! Cart is clear.');
		}

		if (ev.data.action === 'getRentalsList') {
			ev.waitUntil(getRentalMovies(ev));
			console.log('Got movies in rentals!');
		}

		if (ev.data.action === 'watchMovie') {
			ev.waitUntil(
				getMovie(ev.data.movie_id)
					.then((movie) => {
						sendMessage({
							action: 'getWatchMovieSuccess',
							movie: movie || 'Movie not found',
						});
					})
					.catch((error) => {
						console.error('Error retrieving movie:', error);
					})
			);
		}

        if(ev.data.action === 'returnMovie') {
            ev.waitUntil(removeReqFromRentals(ev.data.movie_id));
            ev.waitUntil(getRentalMovies(ev));
        }
	}
});

function removeReqFromRentals(movieId) {
    const req = new Request(`/${movieId}.json`);

	caches.open(rentalCache).then((cache) => {
		cache.delete(req).then((success) => {
			if (success) {
				console.log(`Movie removed from cache.`);
			} else {
				console.log(`Oop! Movie not found in cache`);
			}
		});
	});
}

function removeReqFromCart(ev) {
	const req = new Request(`/${ev.data.movie_id}.json`);

	caches.open(cartCache).then((cache) => {
		cache.delete(req).then((success) => {
			if (success) {
				console.log(`Movie removed from cache.`);
			} else {
				console.log(`Oop! Movie not found in cache`);
			}
		});
	});
}

function addToSearch(movies) {
	caches
		.open(searchCache)
		.then((cache) => {
			let cachePromises = movies.map((movie) => {
				let str = JSON.stringify(movie);
				let filename = movie.id + '.json';
				let file = new File([str], filename, { type: 'application/json' });
				let res = new Response(file, {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
				let req = new Request(`/${filename}`);

				return cache.put(req, res);
			});
			return Promise.all(cachePromises);
		})
		.then(() => {
			console.log('Saved movies in search cache');
			sendMessage({
				action: 'addToSearchSuccess',
				message: 'Movies successfully added to search cache',
				movies,
			});
		});
}

function addToCart(movie) {
	let str = JSON.stringify(movie);
	let filename = movie.id + '.json';
	let file = new File([str], filename, { type: 'application/json' });
	let res = new Response(file, {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});
	let req = new Request(`/${filename}`);

	caches
		.open(cartCache)
		.then((cache) => {
			return cache.put(req, res);
		})
		.then(() => {
			console.log('Saved movie (cart)');
			sendMessage({
				action: 'addToCartSuccess',
				message: 'Movie successfully added to cart',
				movie,
			});
		});
}

async function addToRentals() {
	const cart = await caches.open(cartCache);
	const rentals = await caches.open(rentalCache);
	const cartRequests = await cart.keys();

	for (const request of cartRequests) {
		const res = await cart.match(request);
		if (res) {
			await rentals.put(request, res.clone());
			await cart.delete(request);
		}
	}
	sendMessage({
		action: 'addToRentalsSuccess',
		message: 'Movies successfully added to rentals',
	});
}

async function getCartOfMovies(ev) {
	try {
		const cache = await caches.open(cartCache);
		const requests = await cache.keys();
		const responses = await Promise.all(
			requests.map((req) => cache.match(req))
		);
		const movies = await Promise.all(responses.map((res) => res.json()));

		console.log(ev);
		let clientId = ev.source.id;
		let msg = {
			action: 'getCartOfMovies',
			movies,
		};
		sendMessage(msg, clientId);
	} catch (error) {
		console.error('Error fetching cart movies:', error);
	}
}

async function getRentalMovies(ev) {
	caches.open(rentalCache).then(async (cache) => {
		let requests = await cache.keys();
		let responses = await Promise.all(requests.map((req) => cache.match(req)));
		let movies = await Promise.all(responses.map((res) => res.json()));
		let clientId = ev.source.id;
		let msg = {
			action: 'getRentalMovies',
			movies,
		};
		sendMessage(msg, clientId);
	});
}

async function getMovie(movieID) {
	try {
		const cache = await caches.open(rentalCache);
		const req = new Request(`/${movieID}.json`);
		const res = await cache.match(req);

		if (res) {
			const movie = await res.json();
			return movie;
		} else {
			return null;
		}
	} catch (error) {
		console.error('Oops! Error retrieving movie from cache:', error);
		return null;
	}
}

function sendMessage(msg, client) {
	//client is falsey means send to all

	clients.matchAll().then((clientList) => {
		for (let client of clientList) {
			client.postMessage(msg);
		}
	});
}
