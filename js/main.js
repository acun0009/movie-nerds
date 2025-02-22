const API_KEY = '0e8faef333f9bae4c69e220ac0f29889';
const API_READ_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZThmYWVmMzMzZjliYWU0YzY5ZTIyMGFjMGYyOTg4OSIsIm5iZiI6MTczOTg5NjI0MC4xMzIsInN1YiI6IjY3YjRiNWIwMjBiOGRjNTQ5YWUwYzUxOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ojm6gCvFPNrY1mdyVeetc9dIi4RzI5wjOZFVZAr-Iq0'

const URL = 'https://api.themoviedb.org/3/search/movie';

document.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('in init: DOMContentLoaded');
    addListeners();
    let hash = location.hash ? location.hash : '#';
    showPage(hash);
}

function addListeners() {
    document.querySelector('searchForm')?.addEventListener('submit', handleSearch);
    window.addEventListener('popstate', popped);
}

function popped(ev) {
    console.log('popstate event occured!');
    let w = ev.target;
    let hash = w.location.hash ? w.location.hash : '#';
    showPage(hash);
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