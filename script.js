// =============================================================================
// AniWiki Frontend Logic
// - Hash-based routing
// - Search + pagination
// - Detail page
// - Theme toggling (light/dark)
// - Skeleton loaders
// - Error handling
// =============================================================================

(() => {
    // === DOM REFS ===
    const app = document.getElementById('app');
    const tmpl = {
      home: document.getElementById('home-template'),
      results: document.getElementById('results-template'),
      details: document.getElementById('details-template'),
      card: document.getElementById('card-template'),
      skeleton: document.getElementById('skeleton-template'),
      error: document.getElementById('error-template'),
    };
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const themeToggle = document.getElementById('theme-toggle');
  
    // === STATE ===
    let currentQuery = '';
    let currentPage = 1;
  
    // === CONFIG ===
    const API_BASE = '/api'; // your backend proxy
  
    // === THEME HANDLING ===
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    function loadTheme() {
      const saved = localStorage.getItem('theme') || 'light';
      applyTheme(saved);
    }
    themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'light'
        : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
    loadTheme();
  
    // === ROUTER ===
    window.addEventListener('hashchange', router);
    function router() {
      const hash = location.hash.slice(1);
      if (!hash || hash === 'home') return renderHome();
      if (hash.startsWith('search')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        currentQuery = params.get('q') || '';
        currentPage = parseInt(params.get('page')) || 1;
        return renderResults(currentQuery, currentPage);
      }
      if (hash.startsWith('details')) {
        const id = hash.split('/')[1];
        return renderDetails(id);
      }
      renderHome();
    }
  
    // === RENDER HELPER ===
    function clearApp() {
      app.innerHTML = '';
    }
  
    // === HOME ===
    function renderHome() {
      clearApp();
      app.appendChild(tmpl.home.content.cloneNode(true));
    }
  
    // === RESULTS ===
    async function renderResults(query, page) {
      clearApp();
      app.appendChild(tmpl.results.content.cloneNode(true));
  
      const container = document.getElementById('results-container');
      const prevBtn = document.getElementById('prev-page');
      const nextBtn = document.getElementById('next-page');
      const pageInfo = document.getElementById('page-info');
  
      // show skeleton placeholders
      for (let i = 0; i < 8; i++) {
        container.appendChild(tmpl.skeleton.content.cloneNode(true));
      }
  
      try {
        const { results, hasMore } = await fetchAnimeList(query, page);
        container.innerHTML = '';
        if (results.length === 0) {
          container.innerHTML = '<p>No results found.</p>';
        } else {
          results.forEach(anime => {
            const card = renderCard(anime);
            container.appendChild(card);
          });
        }
        // pagination logic
        pageInfo.textContent = `Page ${page}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = !hasMore;
        prevBtn.onclick = () => navigatePage(page - 1);
        nextBtn.onclick = () => navigatePage(page + 1);
  
      } catch (err) {
        showError(err.message || 'Failed to load search results.');
        console.error(err);
      }
    }
  
    // === DETAILS ===
    async function renderDetails(id) {
      clearApp();
      app.appendChild(tmpl.details.content.cloneNode(true));
  
      document.getElementById('back-btn').onclick = () => {
        location.hash = `#search?q=${encodeURIComponent(currentQuery)}&page=${currentPage}`;
      };
  
      const detailsContainer = document.getElementById('anime-details');
      detailsContainer.innerHTML = '<p>Loading details…</p>';
  
      try {
        const info = await fetchAnimeDetails(id);
        detailsContainer.innerHTML = '';
        populateDetails(info, detailsContainer);
      } catch (err) {
        showError(err.message || 'Failed to load details.');
        console.error(err);
      }
    }
  
    // === FETCH FUNCTIONS ===
    async function fetchAnimeList(q, page) {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&page=${page}`);
      if (!res.ok) throw new Error(`Search API error: ${res.status}`);
      return res.json(); // { results: [...], hasMore: bool }
    }
    async function fetchAnimeDetails(id) {
      const res = await fetch(`${API_BASE}/anime/${id}`);
      if (!res.ok) throw new Error(`Details API error: ${res.status}`);
      return res.json();
    }
  
    // === RENDER CARD ===
    function renderCard(anime) {
      const frag = tmpl.card.content.cloneNode(true);
      frag.querySelector('.card-img').src = anime.image_url;
      frag.querySelector('.card-img').alt = anime.title;
      frag.querySelector('.card-title').textContent = anime.title;
      frag.querySelector('.card-score').textContent = `★ ${anime.score ?? 'N/A'}`;
      frag.querySelector('.card').addEventListener('click', () => {
        location.hash = `#details/${anime.mal_id}`;
      });
      return frag;
    }
  
    // === POPULATE DETAILS ===
    function populateDetails(info, container) {
      const img = document.createElement('img');
      img.src = info.image_url;
      img.alt = info.title;
  
      const title = document.createElement('h2');
      title.textContent = info.title;
  
      const synopsis = document.createElement('p');
      synopsis.textContent = info.synopsis || 'No synopsis available.';
  
      const meta = document.createElement('div');
      meta.className = 'detail-meta';
      meta.innerHTML = `
        <strong>Type:</strong> ${info.type || '—'}<br/>
        <strong>Episodes:</strong> ${info.episodes ?? '—'}<br/>
        <strong>Score:</strong> ${info.score ?? '—'}<br/>
        <strong>Aired:</strong> ${info.aired?.string || '—'}
      `;
  
      container.append(img, title, meta, synopsis);
    }
  
    // === ERROR VIEW ===
    function showError(message) {
      clearApp();
      const err = tmpl.error.content.cloneNode(true);
      err.querySelector('#error-message').textContent = message;
      app.appendChild(err);
    }
  
    // === NAVIGATE PAGE ===
    function navigatePage(page) {
      location.hash = `#search?q=${encodeURIComponent(currentQuery)}&page=${page}`;
    }
  
    // === EVENTS ===
    searchBtn.addEventListener('click', () => {
      const q = searchInput.value.trim();
      if (!q) return;
      currentQuery = q;
      currentPage = 1;
      navigatePage(1);
    });
    searchInput.addEventListener('keyup', e => {
      if (e.key === 'Enter') searchBtn.click();
    });
  
    // === INITIALIZE ===
    router();
  })();  