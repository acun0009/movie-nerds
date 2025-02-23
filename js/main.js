const API_KEY = '0e8faef333f9bae4c69e220ac0f29889';
const API_READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZThmYWVmMzMzZjliYWU0YzY5ZTIyMGFjMGYyOTg4OSIsIm5iZiI6MTczOTg5NjI0MC4xMzIsInN1YiI6IjY3YjRiNWIwMjBiOGRjNTQ5YWUwYzUxOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ojm6gCvFPNrY1mdyVeetc9dIi4RzI5wjOZFVZAr-Iq0'

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
                scope: './'
            });
            if (registration.active) {
                navigator.serviceWorker.addEventListener('message', gotMessage);
            }
        } catch(error) {
            console.error(`Registration failed: ${error}`);
        }
    }
  }

function addListeners() {
    window.addEventListener('popstate', popped);
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)  
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

    if(ev.type === 'online') {
        isOnline = true;
        sendMessage({ type: 'NETWORK_STATUS', isOnline });
    }
    if(ev.type === 'offline') {
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

        if(ev.data.action === 'getCartOfMovies') {
            let movies = ev.data.movies;
            buildMovieCards(movies, 'cart');
            // TODO dynamically update num movies in cart
        }
    }
}

async function showPage(hash) {
    // if hash is not one of our preset IDs,
    if(!['#', '#cart', '#rentals'].includes(hash)) {
        // replace the current history stack with '#' (home),
        history.replaceState(null, '', '#');
        // navigate to it
        history.go();
        // then set hash to '#'
        hash = '#';
    }
    // sets the body's class name to whatever the hash is (home, users, details)
    hash === '#' ? document.body.className = 'home' : document.body.className = hash.replace('#', '');
    window.scrollTo(0, 0); // and scroll to the top
}

function pageSpecific() {
    const id = document.body.className;
    switch (id) {
        case 'home':
             console.log('home')
            // add listener to the form
            document.querySelector('#searchForm').addEventListener('submit', handleSearch);
            // add listnever to the movie cards
            document.querySelector('#movies-search-ul').addEventListener('click', handleAddCart);
            break;
        case 'cart':
            console.log('cart')
            // get movies in cart
            getCartList();
            document.querySelector('#checkout').addEventListener('click', handleAddRentals);
            break;
        case 'rentals':
            console.log('rentals')
        default:
    }
}

async function handleSearch(ev) {
    ev.preventDefault();
    console.log('IN: handleSearch')
    let searchInput = document.getElementById('search').value;

    // clear search results first, if there are any
    let ul = document.querySelector('#movies-search-ul')
    if(ul.children.length > 0) {
        clearList('search');
    }

    try {
        const res = await fetch(BASE_URL + `3/search/movie?query=${searchInput}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_READ_ACCESS_TOKEN}`
            }
        });

        if(!res.ok) {
            throw new Error(`Oops! Something bad happened!: ${res.status}`);
        }

        const data = await res.json();
        const dataArr = data.results;

        const movies = []
        dataArr.forEach((movie) => {
            let movieUrl = new URL(
                movie?.poster_path
                ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                : './img/placeholder.jpg', window.location.origin
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
        buildMovieCards(movies, 'search');
    } catch(error) {
        console.error(`There was an error when fetching your data: ${error.status} ${error.message}`);
    }
}

/* handles adding a movie into our cart */
function handleAddCart(ev) {
    console.log('IN: handleAddCart');
    ev.preventDefault();
    let target = ev.target;
    let card = target.closest('.card');
    let id = card.dataset.ref;
    let src = card.querySelector('img').src
    let title = card.querySelector('.card__title').textContent;
    let release_date = card.querySelector('[data-ref="release-date"] span').nextSibling.textContent.trim();
    let rating = card.querySelector('[data-ref="rating"] span').nextSibling.textContent.trim();
    let description = card.querySelector('[data-ref="description"] span').nextSibling.textContent.trim();

    let msg = {
        action: 'addToCart',
        movie: { id, src, title, release_date, rating, description }
    };
    sendMessage(msg);
}

function handleAddRentals(ev) {
    console.log('IN: handleAddRental');
    ev.preventDefault();
    clearList('cart');
    this.textContent = 'Go to Rentals';
    //instead of this, were gonna have two anchor links, and hide the checkout vs go to rentals

    let msg = {
        action: 'addToRentals',
    };
    sendMessage(msg);
}

/** Builds movie cards using <template>
 * first arg: an array of movie objects
 * second arg: a string indication which page we are building cards for (possible values = 'search', 'cart', 'rentals')
 */
function buildMovieCards(movies, page = null) {
    console.log('IN: build movie cards')
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
        clone.querySelector('[data-ref="release-date"] span').after(document.createTextNode(` ${movie.release_date}`));
        clone.querySelector('[data-ref="rating"] span').after(document.createTextNode(` ${movie.rating}`));
        clone.querySelector('[data-ref="description"] span').after(document.createTextNode(` ${movie.description}`));
        let btn = clone.querySelector('#movieBtn');
        if (page === 'search') {
            btn.textContent = 'Add to Cart';
            btn.href = '#cart'
        }
        if (page === 'cart') {
            btn.textContent = 'Remove';
            btn.href = '#rent'
        }
        if (page === 'rentals') {
            btn.textContent = 'Watch Now';
            btn.href = '#watch'
        }
        moviesUl.appendChild(clone);
    });
}

function getCartList() {
    let msg = {
        action: 'getCartList',
    }
    sendMessage(msg)
}

/* clears any previous search results */
function clearList(page = null) {
    const parent = document?.querySelector(`#movies-${page}-ul`);
    console.log(parent)
    parent.replaceChildren();
}

/**
 * caching stretegies??? network first and revalidate (check if online first!!)
 * need
 * CACHES NEEDED
 * 1. search results
 * 4. movie images
 * 5. app files
 * 
 * 
 * OTHER
 * CART:
 * - need functional cart icon with logic!!
 * - need to send msg to sw that updating cart needs to be relayed on all the open tabs
 * do i need the 'added to cart' to persist between searches???
 */