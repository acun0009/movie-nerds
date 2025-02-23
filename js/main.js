const API_KEY = '0e8faef333f9bae4c69e220ac0f29889';
const API_READ_ACCESS_TOKEN =
	'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZThmYWVmMzMzZjliYWU0YzY5ZTIyMGFjMGYyOTg4OSIsIm5iZiI6MTczOTg5NjI0MC4xMzIsInN1YiI6IjY3YjRiNWIwMjBiOGRjNTQ5YWUwYzUxOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ojm6gCvFPNrY1mdyVeetc9dIi4RzI5wjOZFVZAr-Iq0';

const BASE_URL = 'https://api.themoviedb.org/';

let isOnline = navigator.onLine;

document.addEventListener('DOMContentLoaded', init);

function init() {
	console.log('in init: DOMContentLoaded');
	setUpWorker();
	addListeners();
	pageSpecific();
}

/* Registers our service worker */
async function setUpWorker() {
	if ('serviceWorker' in navigator) {
		try {
			const registration = await navigator.serviceWorker.register('./sw.js', {
				scope: './',
			});
			if (registration.active) {
				navigator.serviceWorker.addEventListener('message', gotMessage);
				sendMessage({ type: 'NETWORK_STATUS', isOnline });
			}
		} catch (error) {
			console.error(`Registration failed: ${error}`);
		}
	}
}

function addListeners() {
	window.addEventListener('popstate', popped);
	window.addEventListener('online', updateOnlineStatus);
	window.addEventListener('offline', updateOnlineStatus);
}

/* Called whenever a popstate event occurs */
function popped(ev) {
	console.log('popstate event occured!');
	let w = ev.target;
	let hash = w.location.hash ? w.location.hash : '#';
	showPage(hash);
	pageSpecific();
}

/* updates our service worker on our online/offline status */
function updateOnlineStatus(ev) {
	console.log('IN: updateOnlineStatus');

	if (ev.type === 'online') {
		isOnline = true;
		sendMessage({ type: 'NETWORK_STATUS', isOnline });
	}
	if (ev.type === 'offline') {
		isOnline = false;
		sendMessage({ type: 'NETWORK_STATUS', isOnline });
	}
}

/* Sends message to service worker */
function sendMessage(msg) {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.ready.then((reg) => {
			reg.active.postMessage(msg);
		});
	}
}

/* Listens to messages from our service worker */
function gotMessage(ev) {
	if ('action' in ev.data) {
		if (ev.data.action === 'addToCartSuccess') {
			let card = document.querySelector(`[data-ref="${ev.data.movie.id}"]`);
			card.classList.add('in-cart'); //TODO style items in cart differently
			const a = card.querySelector('#movieBtn');
			const span = document.createElement('span');
			span.textContent = 'Added to Cart!';
			a.parentNode.replaceChild(span, a);
		}

		if (ev.data.action === 'getCartOfMovies') {
			let movies = ev.data.movies;
			if (movies.length > 0) {
				// if sw sends us an array with movies, build the cards
				clearList('cart'); // clear first
				buildMovieCards(movies, 'cart');
				showNumMoviesCart(movies.length);
			} else {
				// else show empty cart state
				showEmptyCart();
			}
			// TODO dynamically update num movies in cart
		}

		if (ev.data.action === 'getRentalMovies') {
			let movies = ev.data.movies;
			if (movies.length > 0) {
				clearList('rentals');
				buildMovieCards(movies, 'rentals');
			} else {
				showEmptyRentals();
			}
		}

		if (ev.data.action === 'getWatchMovieSuccess') {
			let movie = ev.data.movie;
			actuallyWatchTheMovie(movie);
		}
	}
}

async function showPage(hash) {
	// if hash is not one of our preset IDs,
	if (!['#', '#cart', '#rentals', '#watch'].includes(hash)) {
		// replace the current history stack with '#' (home),
		history.replaceState(null, '', '#');
		// navigate to it
		history.go();
		// then set hash to '#'
		hash = '#';
	}
	// sets the body's class name to whatever the hash is (home, users, details)
	hash === '#'
		? (document.body.className = 'home')
		: (document.body.className = hash.replace('#', ''));
	window.scrollTo(0, 0); // and scroll to the top
}

function pageSpecific() {
	const id = document.body.className;
	switch (id) {
		case 'home':
			// add listener to the form
			document
				.querySelector('#searchForm')
				.addEventListener('submit', handleSearch);
			// add listnever to the movie cards
			document
				.querySelector('#movies-search-ul')
				.addEventListener('click', handleAddCart);
			break;
		case 'cart':
			getCartList(); //get movies in cart
			document
				.querySelector('#cart-checkout')
				.addEventListener('click', handleAddRentals);
			document
				.querySelector('#cart-checkout--rentals')
				.addEventListener('click', showEmptyCart); //when user clicks to see rentals, clear cart
			document
				.querySelector('#movies-cart-ul')
				.addEventListener('click', handleRemoveFromCart);
			break;
		case 'rentals':
			getRentalsList(); //get movie rentals
			// add listener for movie cards
			document
				.querySelector('#movies-rentals-ul')
				.addEventListener('click', handleWatchMovie);
		case 'watch':
			document.addEventListener('click', handleRentalReturn); //listener for when a user returns a movie
			window.addEventListener('orientationchange', detectOrientation); // add listener for screen orientation
		default:
	}
}

function detectOrientation(ev) {
    const video = document.querySelector('video');
	if (screen.orientation.type === 'portrait-primary') {
		return;
	} else if (video && screen.orientation.type === 'landscape-primary') {
        video.requestFullscreen();
	}
}

/* handles search to TMDB API */
async function handleSearch(ev) {
	ev.preventDefault();
	console.log('IN: handleSearch');
	let searchInput = document.getElementById('search').value;

	// clear search results first, if there are any
	let ul = document.querySelector('#movies-search-ul');
	if (ul.children.length > 0) {
		clearList('search');
	}

	try {
		const res = await fetch(BASE_URL + `3/search/movie?query=${searchInput}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${API_READ_ACCESS_TOKEN}`,
			},
		});

		if (!res.ok) {
			throw new Error(`Oops! Something bad happened!: ${res.status}`);
		}

		const data = await res.json();
		const dataArr = data.results;

		const movies = [];
		dataArr.forEach((movie) => {
			let movieUrl = new URL(
				movie?.poster_path
					? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
					: './img/placeholder.jpg',
				window.location.origin
			);

			let movieEntry = {
				id: movie.id,
				src: movieUrl.href,
				title: movie?.title || 'None',
				release_date: movie?.release_date || 'N/A',
				rating: movie?.vote_average || 'None',
				description: movie?.overview || 'No description found!',
			};
			movies.push(movieEntry);
		});
		buildMovieCards(movies, 'search'); // builds movie cards
		let msg = {
			action: 'addToSearch',
			movies,
		}; // send msg to sw to save search results to cache
		sendMessage(msg);
	} catch (error) {
		console.error(
			`There was an error when fetching your data: ${error.status} ${error.message}`
		);
	}
}

/* handles adding a movie into our cart */
function handleAddCart(ev) {
	console.log('IN: handleAddCart');
	ev.preventDefault();
	let target = ev.target;
	let card = target.closest('.card');
	let id = card.dataset.ref;
	let src = card.querySelector('img').src;
	let title = card.querySelector('.card__title').textContent;
	let release_date = card
		.querySelector('[data-ref="release-date"] span')
		.nextSibling.textContent.trim();
	let rating = card
		.querySelector('[data-ref="rating"] span')
		.nextSibling.textContent.trim();
	let description = card
		.querySelector('[data-ref="description"] span')
		.nextSibling.textContent.trim();

	let msg = {
		action: 'addToCart',
		movie: { id, src, title, release_date, rating, description },
	};
	sendMessage(msg);
}

/* Handles event when user clicks btn to rent entire cart */
function handleAddRentals(ev) {
	console.log('IN: handleAddRental');
	ev.preventDefault();
	clearList('cart'); //clear cart page
	this.classList.add('hidden'); //hide checkout button
	const goToRentalsBtn = document.querySelector('#cart-checkout--rentals');
	goToRentalsBtn.classList.remove('hidden'); // get button that navigates user to rentals and makes it visible

	let msg = {
		action: 'addToRentals',
	};
	sendMessage(msg);
}

function handleWatchMovie(ev) {
	console.log('IN: handleWatchMovie');
	let target = ev.target;
	let card = target.closest('.card');
	let id = card.dataset.ref;

	let msg = {
		action: 'watchMovie',
		movie_id: id,
	};
	sendMessage(msg);
}

function actuallyWatchTheMovie(movie) {
	// clear movie section
	const parent = document.querySelector('.section-video');
	parent.replaceChildren();

	const temp = document.querySelector('#video-template');
	const clone = temp.content.cloneNode(true);
	clone.querySelector('source').src = './img/placeholder.mp4';
	const section = document.querySelector('.section-video');
	section.appendChild(clone);
	document.querySelector('#watch > a').setAttribute('data-ref', `${movie.id}`);
}

/** Builds movie cards using <template>
 * first arg: an array of movie objects
 * second arg: a string indication which page we are building cards for (possible values = 'search', 'cart', 'rentals')
 */
function buildMovieCards(movies, page = null) {
	console.log('IN: build movie cards');
	let moviesUl;
	if (page === 'search') {
		moviesUl = document.querySelector('#movies-search-ul');
	}
	if (page === 'cart') {
		moviesUl = document.querySelector('#movies-cart-ul');
	}
	if (page === 'rentals') {
		moviesUl = document.querySelector('#movies-rentals-ul');
	}
	const temp = document.querySelector('#movies-template');

	movies.forEach((movie) => {
		const clone = temp.content.cloneNode(true);
		clone.querySelector('.card').setAttribute('data-ref', movie.id);
		clone.querySelector('.card__img > img').src = movie.src;
		clone.querySelector('.card__title').textContent = movie.title;
		// for the next three pieces of data, we need to insert text after our nested <span>, so we will insert a textNode
		clone
			.querySelector('[data-ref="release-date"] span')
			.after(document.createTextNode(` ${movie.release_date}`));
		clone
			.querySelector('[data-ref="rating"] span')
			.after(document.createTextNode(` ${movie.rating}`));
		clone
			.querySelector('[data-ref="description"] span')
			.after(document.createTextNode(` ${movie.description}`));
		let btn = clone.querySelector('#movieBtn');
		if (page === 'search') {
			btn.textContent = 'Add to Cart';
			btn.href = '#cart';
		}
		if (page === 'cart') {
			btn.textContent = 'Remove';
			btn.href = '#cart';
		}
		if (page === 'rentals') {
			btn.textContent = 'Watch Now';
			btn.href = '#watch';
		}
		moviesUl.appendChild(clone);
	});
}

function getCartList() {
	let msg = {
		action: 'getCartList',
	};
	sendMessage(msg);
}

function getRentalsList() {
	let msg = {
		action: 'getRentalsList',
	};
	sendMessage(msg);
}

function handleRemoveFromCart(ev) {
	let target = ev.target;
	let card = target.closest('.card');
	let id = card.dataset.ref;
	let msg = {
		action: 'removeFromCart',
		movie_id: id,
	};
	sendMessage(msg);
}

function handleRentalReturn(ev) {
	let target = ev.target;
	let id = target.dataset.ref;
	let msg = {
		action: 'returnMovie',
		movie_id: id,
	};
	sendMessage(msg);
}

/* resets specific pages */
function clearList(page = null) {
	const h3 = document.querySelector(`#${page} > h3`);
	if (h3) h3.remove();

	if (page === 'cart') {
		// clears elements related to the cart page
		const cartEmptyBtn = document.querySelector('#cart-empty');
		if (!cartEmptyBtn.classList.contains('hidden')) {
			cartEmptyBtn.classList.add('hidden');
		}
		const checkoutBtn = document.querySelector('#cart-checkout');
		if (checkoutBtn.classList.contains('hidden')) {
			checkoutBtn.classList.remove('hidden');
		}
	}
	if (page === 'rentals') {
		//clears elements related to the rentals page
		const rentalsEmptyBtn = document.querySelector('#rentals-empty');
		if (!rentalsEmptyBtn.classList.contains('hidden')) {
			rentalsEmptyBtn.classList.add('hidden');
		}
	}
	const parent = document?.querySelector(`#movies-${page}-ul`);
	parent.replaceChildren();
}

/* shows if cart has an empty state */
function showEmptyCart() {
	clearList('cart'); // clear first
	const h2 = document.querySelector('#cart > h2');
	const h3 = document.createElement('h3');
	h3.textContent =
		'Your cart is empty! Click home or the button below to search for movies to rent.'; // create empty state message
	h2.insertAdjacentElement('afterend', h3); //append h3
	const cartEmptyBtn = document.querySelector('#cart-empty');
	cartEmptyBtn.classList.remove('hidden');
	const checkoutBtn = document.querySelector('#cart-checkout');
	const checkoutRentalsBtn = document.querySelector('#cart-checkout--rentals');
	if (!checkoutBtn.classList.contains('hidden')) {
		checkoutBtn.classList.add('hidden');
	}
	if (!checkoutRentalsBtn.classList.contains('hidden')) {
		checkoutRentalsBtn.classList.add('hidden');
	}
}

/* shows if rentals has an empty state */
function showEmptyRentals() {
	clearList('rentals'); //clear first
	const h2 = document.querySelector('#rentals > h2');
	const h3 = document.createElement('h3');
	h3.textContent =
		'You have no rentals! Click home or the button below to search for movies to rent.'; // create empty state message
	h2.insertAdjacentElement('afterend', h3);
	const rentalsEmptyBtn = document.querySelector('#rentals-empty');
	rentalsEmptyBtn.classList.remove('hidden');
}

function showNumMoviesCart(num) {
	const cart = document.getElementById('show-num-items');
	cart.textContent = `cart (${num})`;
}
