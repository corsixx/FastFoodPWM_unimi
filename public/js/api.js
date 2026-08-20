// public/js/app.js

let currentCategory = '';
let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
  renderCartBadge();
  loadCatalog();
  loadRecommendations();
  renderDrawerAuth();
});

// 1. CARICAMENTO DEL CATALOGO PIATTI
async function loadCatalog(searchQuery = '') {
  const grid = document.getElementById('meals-grid');
  try {
    let url = '/meals';
    const params = new URLSearchParams();
    if (searchQuery) params.append('name', searchQuery);
    if (currentCategory) params.append('category', currentCategory);

    if (params.toString()) url += `?${params.toString()}`;

    const meals = await apiRequest(url);

    if (!meals || meals.length === 0) {
      grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">NESSUN PIATTO TROVATO IN QUESTA CATEGORIA.</div>`;
      return;
    }

    grid.innerHTML = meals.map(m => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card" onclick="addToCart('${m._id}', '${m.strMeal.replace(/'/g, "\\'")}', ${m.price})">
          <div class="product-img-wrapper">
            <img src="${m.strMealThumb || 'https://via.placeholder.com/400x500?text=Fastfood'}" alt="${m.strMeal}" loading="lazy">
            <span class="product-tag">${m.strCategory}</span>
          </div>
          <div class="product-title">${m.strMeal}</div>
          <div class="product-price">€ ${m.price.toFixed(2)} &bull; <span class="small">${m.preparationTime || 10}m prep</span></div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    grid.innerHTML = `<div class="col-12 text-danger">Errore di connessione al database piatti.</div>`;
  }
}

// 2. CARICAMENTO BACHECA PERSONALIZZATA
async function loadRecommendations() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  if (!token || role !== 'customer') return;

  try {
    const data = await apiRequest('/meals/recommendations');
    if (data.recommendations && data.recommendations.length > 0) {
      document.getElementById('recommendations-wrapper').classList.remove('d-none');
      document.getElementById('user-pref-label').textContent = `Categoria: ${data.favoriteCategory || 'Consigliati'}`;
      
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
    // Silenzioso se l'utente non ha preferenze
  }
}

// 3. GESTIONE CARRELLO
function addToCart(mealId, name, price) {
  const existing = cart.find(item => item.mealId === mealId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ mealId, name, price, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();
  
  // Feedback discreto
  const badge = document.getElementById('cart-badge');
  badge.classList.add('bg-warning', 'text-dark');
  setTimeout(() => badge.classList.remove('bg-warning', 'text-dark'), 300);
}

function renderCartBadge() {
  const count = cart.reduce((acc, i) => acc + i.quantity, 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

// 4. FILTRI E RICERCA
function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.nav-category-link').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
  loadCatalog();
}

function handleSearch(val) {
  loadCatalog(val.trim());
}

function focusSearch() {
  document.getElementById('search-box').focus();
}

// 5. DRAWER STATO UTENTE
function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName');
  const drawerSec = document.getElementById('drawer-user-section');

  if (role === 'restaurant') {
    document.getElementById('drawer-stats-link').classList.remove('d-none');
    document.getElementById('drawer-orders-link').textContent = 'GESTIONALE COMANDE';
  }

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-2">AUTENTICATO COME:</div>
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