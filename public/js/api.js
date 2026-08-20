// public/js/app.js

let currentCategory = '';
let currentSearch = '';
let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
  renderCartBadge();
  loadCatalog();
  loadRecommendations();
  renderDrawerAuth();
  setupHorizontalWheelScroll();
});

/**
 * 1. SCORRIMENTO ORIZZONTALE DELLA BARRA CON LA ROTELLA DEL MOUSE
 */
function setupHorizontalWheelScroll() {
  const scrollNav = document.getElementById('categories-nav');
  if (scrollNav) {
    scrollNav.addEventListener('wheel', (evt) => {
      evt.preventDefault();
      scrollNav.scrollLeft += evt.deltaY;
    }, { passive: false });
  }
}

/**
 * 2. CARICAMENTO CATALOGO PIATTI
 */
async function loadCatalog() {
  const grid = document.getElementById('meals-grid');
  grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">CARICAMENTO IN CORSO...</div>`;

  try {
    let url = '/meals';
    const params = new URLSearchParams();
    if (currentSearch) params.append('name', currentSearch);
    if (currentCategory) params.append('category', currentCategory);

    if (params.toString()) url += `?${params.toString()}`;

    const meals = await apiRequest(url);

    if (!meals || meals.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">NESSUN PRODOTTO PRESENTE PER QUESTA SELEZIONE.</div>`;
      return;
    }

    grid.innerHTML = meals.map(m => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card" onclick="addToCart('${m._id}', '${m.strMeal.replace(/'/g, "\\'")}', ${m.price})">
          <div class="product-img-wrapper">
            <img src="${m.strMealThumb || 'https://via.placeholder.com/400x500?text=Fastfood'}" alt="${m.strMeal}" loading="lazy">
            <span class="product-tag">${m.strCategory || 'PIATTO'}</span>
          </div>
          <div class="product-title">${m.strMeal}</div>
          <div class="product-price">€ ${m.price.toFixed(2)} &bull; <span class="small">${m.preparationTime || 10}m prep</span></div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore di connessione al database piatti.</div>`;
  }
}

/**
 * 3. CARICAMENTO BACHECA RACCOMANDAZIONI
 */
async function loadRecommendations() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  if (!token || role !== 'customer') return;

  try {
    const data = await apiRequest('/meals/recommendations');
    if (data.recommendations && data.recommendations.length > 0) {
      document.getElementById('recommendations-wrapper').classList.remove('d-none');
      document.getElementById('user-pref-label').textContent = `Preferenza: ${data.favoriteCategory || 'In evidenza'}`;
      
      const container = document.getElementById('recommendations-container');
      container.innerHTML = data.recommendations.slice(0, 4).map(m => `
        <div class="col-6 col-md-3">
          <div class="product-card" onclick="addToCart('${m._id}', '${m.strMeal.replace(/'/g, "\\'")}', ${m.price})">
            <div class="product-img-wrapper">
              <img src="${m.strMealThumb}" alt="${m.strMeal}">
              <span class="product-tag" style="background-color: var(--ff-yellow); color: #000;">PER TE</span>
            </div>
            <div class="product-title">${m.strMeal}</div>
            <div class="product-price">€ ${m.price.toFixed(2)}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    // Silenzioso se l'utente non ha preferenze impostate
  }
}

/**
 * 4. FILTRI, RICERCA E STATO ATTIVO
 */
function filterCategory(categoryName, btnElement) {
  currentCategory = categoryName;

  // Rimuove e assegna la classe .active al bottone cliccato
  document.querySelectorAll('.nav-category-link').forEach(el => el.classList.remove('active'));
  if (btnElement) {
    btnElement.classList.add('active');
  }

  loadCatalog();
}

function handleSearch(value) {
  currentSearch = value.trim();
  loadCatalog();
}

function focusSearch() {
  const searchInput = document.getElementById('search-box');
  if (searchInput) {
    searchInput.focus();
    searchInput.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * 5. CARRELLO E BADGE
 */
function addToCart(mealId, name, price) {
  const existing = cart.find(item => item.mealId === mealId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ mealId, name, price, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();

  const badge = document.getElementById('cart-badge');
  badge.classList.add('bg-warning', 'text-dark');
  setTimeout(() => badge.classList.remove('bg-warning', 'text-dark'), 300);
}

function renderCartBadge() {
  const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = totalItems;
}

/**
 * 6. GESTIONE AUTENTICAZIONE NEL DRAWER
 */
function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName');
  const drawerSec = document.getElementById('drawer-user-section');

  if (role === 'restaurant') {
    const statsLink = document.getElementById('drawer-stats-link');
    const ordersLink = document.getElementById('drawer-orders-link');
    if (statsLink) statsLink.classList.remove('d-none');
    if (ordersLink) ordersLink.textContent = 'GESTIONALE COMANDE';
  }

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1">ACCESSO EFFETTUATO COME:</div>
      <div class="fw-bold text-uppercase mb-3">${name || 'Utente'} (${role})</div>
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm" onclick="logout()">LOGOUT</button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-black mb-2">ACCEDI</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100">REGISTRATI</a>
    `;
  }
}