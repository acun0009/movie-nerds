const API_KEY = '0e8faef333f9bae4c69e220ac0f29889';
const API_READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZThmYWVmMzMzZjliYWU0YzY5ZTIyMGFjMGYyOTg4OSIsIm5iZiI6MTczOTg5NjI0MC4xMzIsInN1YiI6IjY3YjRiNWIwMjBiOGRjNTQ5YWUwYzUxOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ojm6gCvFPNrY1mdyVeetc9dIi4RzI5wjOZFVZAr-Iq0'

const BASE_URL = 'https://api.themoviedb.org/3/search/movie';

let isOnline = navigator.onLine;

document.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('in init: DOMContentLoaded');
    setUpWorker();
    addListeners();
    pageSpecific();
    let hash = location.hash ? location.hash : '#';
    showPage(hash); //maybe move this in pageSpecific???
    console.log(isOnline)
}

/* Registers our service worker */
function setUpWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
      console.log('sw registered');
    }

    navigator.serviceWorker.addEventListener('message', gotMessage);
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
//TODO
}

async function showPage(hash) {
    // if hash is not one of our preset IDs,
    if(!['#', '#cart', '#rented'].includes(hash)) {
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
    console.log(id)
    switch (id) {
        case 'home':
            // add listener to the form
            document.querySelector('#searchForm').addEventListener('submit', handleSearch); //TODO
            // add listnever to the movie cards
            // document.querySelector('main').addEventListener('click', handleAddCart); //TODO main to card section
            break;
        case 'cart':
            // get movies in cart
            getMoviesInCart(); //TODO
            break;
        default:
    }
}

async function handleSearch(ev) {
    ev.preventDefault();
    console.log('IN: handleSearch')
    let searchInput = document.getElementById('search').value;

    console.log(searchInput);

    try {
        const res = await fetch(BASE_URL + `?query=${searchInput}`, {
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
        console.log(data);
        parseData(data);
        return data
    } catch(error) {
        console.error(`There was an error when fetching your data: ${error.status}`);
    }
}

function parseData(data) {
    // image, movie title, duration, release date, description
}

// function handleAddCart(ev) {
//     ev.preventDefault();
//     console.log('IN: handleAddCart')
// }


/**
 * ADD functionality to check for offline vs online (should do this in the sw)
 * caching stretegies??? network first and revalidate (check if online first!!)
 * need
 * CACHES NEEDED
 * 1. search results
 * 2. cart items
 * 3. rented movies
 * 4. movie images
 * 5. app files
 * 
 * SPA SPECIFIC
 * - need to clear page whenever we navigate to a new one
 * 
 * OTHER
 * CART:
 * - need functional cart icon with logic!!
 * - have button to rent whole cart
 * - need to send msg to sw that updating cart needs to be relayed on all the open tabs
 * after renting whole cart, need to redirect
 */