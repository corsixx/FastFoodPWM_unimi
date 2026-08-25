// public/js/restaurantCatalog.js

let allRestaurants = [];
let filteredRestaurants = [];
let currentPage = 1;
const itemsPerPage = 6; // Mostra 6 card grandi per pagina (3 righe da 2)
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';

// Inizializzazione sincronizzata con l'evento di caricamento di utils.js
document.addEventListener('componentsLoaded', async () => {
  await loadRestaurantsData();
});

// Hook per il cambio lingua richiamato da utils.js
window.updateView = function() {
  renderGrid();
};

async function loadRestaurantsData() {
  const grid = document.getElementById('restaurants-grid');
  const countEl = document.getElementById('results-count');
  const isIt = currentLang === 'IT';

  try {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-dark" role="status"></div>
        <div class="small text-muted text-uppercase fw-bold mt-2">${isIt ? 'Caricamento ristoranti...' : 'Loading restaurants...'}</div>
      </div>
    `;

    // 1. Chiamata alla rotta GET /api/restaurants
    const restaurantsRes = await apiRequest('/restaurants');
    const rawRestaurants = Array.isArray(restaurantsRes) ? restaurantsRes : (restaurantsRes.data || []);

    // 2. Chiamata a meals e orders per ricavare foto e piatti venduti
    const [mealsRes, ordersRes] = await Promise.allSettled([
      apiRequest('/meals'),
      apiRequest('/orders')
    ]);

    const allMeals = mealsRes.status === 'fulfilled' 
      ? (Array.isArray(mealsRes.value) ? mealsRes.value : (mealsRes.value?.meals || [])) 
      : [];

    const allOrders = ordersRes.status === 'fulfilled' 
      ? (Array.isArray(ordersRes.value) ? ordersRes.value : (ordersRes.value?.orders || [])) 
      : [];

    // Mappa vendite piatti
    const salesByMeal = {};
    if (Array.isArray(allOrders)) {
      allOrders.forEach(ord => {
        if (Array.isArray(ord.items)) {
          ord.items.forEach(it => {
            const mId = it.meal?._id || it.meal || it.mealId;
            if (mId) {
              salesByMeal[mId] = (salesByMeal[mId] || 0) + (Number(it.quantity) || 1);
            }
          });
        }
      });
    }

    // 3. Mappatura dei dati per ciascun ristorante
    allRestaurants = rawRestaurants.map(rest => {
      const restId = rest._id || rest.id;
      const menuIds = Array.isArray(rest.restaurantMenu) ? rest.restaurantMenu.map(id => String(id)) : [];
      
      const restMeals = allMeals.filter(m => {
        const mRestId = m.restaurant?._id || m.restaurant || m.restaurantId;
        return String(mRestId) === String(restId) || menuIds.includes(String(m._id));
      });

      let coverImage = null;
      let topDishName = '';

      if (restMeals.length > 0) {
        restMeals.sort((a, b) => (salesByMeal[b._id] || 0) - (salesByMeal[a._id] || 0));
        const topDish = restMeals.find(m => m.strMealThumb || m.image) || restMeals[0];
        if (topDish) {
          coverImage = topDish.strMealThumb || topDish.image;
          topDishName = topDish.strMeal || topDish.name;
        }
      }

      return {
        ...rest,
        coverImage: coverImage || FALLBACK_IMAGE,
        topDishName: topDishName,
        totalDishes: restMeals.length || (rest.restaurantMenu ? rest.restaurantMenu.length : 0)
      };
    });

    filteredRestaurants = [...allRestaurants];
    currentPage = 1;
    renderGrid();
  } catch (err) {
    console.error('Errore durante il caricamento dei ristoranti:', err);
    grid.innerHTML = `
      <div class="col-12 text-center py-5 border border-dark bg-white">
        <i class="bi bi-exclamation-triangle fs-2 text-danger mb-2 d-block"></i>
        <h6 class="fw-bold text-uppercase">${isIt ? 'Impossibile caricare i ristoranti' : 'Failed to load restaurants'}</h6>
        <p class="small text-muted mb-3">${err.message}</p>
        <button class="btn btn-dark btn-sm rounded-0 fw-bold text-uppercase px-3" onclick="loadRestaurantsData()">${isIt ? 'Riprova' : 'Retry'}</button>
      </div>
    `;
    if (countEl) countEl.textContent = '0 locali disponibili';
  }
}

function renderGrid() {
  const grid = document.getElementById('restaurants-grid');
  const countEl = document.getElementById('results-count');
  const isIt = currentLang === 'IT';

  if (countEl) {
    countEl.textContent = `${filteredRestaurants.length} ${isIt ? 'locali disponibili' : 'restaurants available'}`;
  }

  if (filteredRestaurants.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5 border border-dark bg-white">
        <i class="bi bi-shop-window fs-1 text-muted mb-2 d-block"></i>
        <h5 class="fw-bold text-uppercase">${isIt ? 'Nessun ristorante trovato' : 'No restaurants found'}</h5>
        <p class="small text-muted m-0">${isIt ? 'Nessun locale partner registrato al momento.' : 'No partner restaurants registered yet.'}</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredRestaurants.slice(startIdx, startIdx + itemsPerPage);

  // Layout a card grandi (2 colonne su desktop)
  grid.innerHTML = pageItems.map(rest => {
    const restId = rest._id || rest.id;
    const name = rest.restaurantName || rest.name || 'Ristorante FastFood';
    const address = rest.restaurantAddress || rest.address || 'Ritiro al Bancone';
    const category = rest.favoriteCategory || rest.cuisine || 'Fast Food & Grill';
    const dishesCount = rest.totalDishes || 0;
    const topBadge = rest.topDishName 
      ? `<span class="badge bg-black text-white rounded-0 text-uppercase position-absolute top-0 start-0 m-3 px-3 py-2 shadow-sm" style="font-size: 0.75rem; letter-spacing: 0.05em;">
           <i class="bi bi-star-fill text-warning me-1"></i> Top: ${rest.topDishName}
         </span>` 
      : '';

    return `
      <div class="col-12 col-md-6 col-xl-6">
        <div class="card h-100 rounded-0 border-dark shadow-sm position-relative bg-white d-flex flex-column overflow-hidden">
          
          <!-- Immagine di Copertina Grande da 270px -->
          <div class="position-relative overflow-hidden border-bottom border-dark" style="height: 270px; background: #f0f0f0; cursor: pointer;" onclick="goToRestaurant('${restId}')">
            <img src="${rest.coverImage}" alt="${name}" class="w-100 h-100" 
                 style="object-fit: cover; transition: transform 0.4s ease;" 
                 onmouseover="this.style.transform='scale(1.06)'" 
                 onmouseout="this.style.transform='scale(1)'" 
                 onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';">
            ${topBadge}
            <span class="badge bg-white text-dark border border-dark rounded-0 font-monospace position-absolute bottom-0 end-0 m-3 px-2 py-1" style="font-size: 0.75rem;">
              <i class="bi bi-journal-text me-1"></i>${dishesCount} ${isIt ? 'piatti a menù' : 'menu dishes'}
            </span>
          </div>

          <!-- Informazioni Locale -->
          <div class="card-body p-4 d-flex flex-column justify-content-between">
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="text-muted small text-uppercase font-monospace fw-bold" style="font-size: 0.75rem; letter-spacing: 0.05em;">
                  <i class="bi bi-tag me-1"></i>${category}
                </span>
              </div>
              <h4 class="fw-bold text-uppercase mb-2 text-truncate" style="font-family: 'Space Grotesk', sans-serif; cursor: pointer;" onclick="goToRestaurant('${restId}')">
                ${name}
              </h4>
              <p class="text-muted small mb-0 text-truncate" style="font-size: 0.88rem;">
                <i class="bi bi-geo-alt-fill text-danger me-1"></i>${address}
              </p>
            </div>

            <!-- Tasto Full-Width diretto alla Scheda Dettaglio Locale (restaurantDetail.html) -->
            <a href="restaurantDetail.html?id=${encodeURIComponent(restId)}" class="btn btn-dark rounded-0 w-100 fw-bold text-uppercase py-3 d-flex justify-content-between align-items-center px-4 mt-2">
              <span style="letter-spacing: 0.05em;">${isIt ? 'ESPLORA IL MENÙ' : 'EXPLORE MENU'}</span>
              <i class="bi bi-arrow-right fs-5"></i>
            </a>
          </div>

        </div>
      </div>
    `;
  }).join('');

  renderPagination(totalPages);
}

window.goToRestaurant = function(restId) {
  window.location.href = `restaurantDetail.html?id=${encodeURIComponent(restId)}`;
};

function renderPagination(totalPages) {
  const container = document.getElementById('pagination-controls');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button type="button" class="btn btn-outline-dark btn-sm rounded-0 fw-bold px-3 ${currentPage === 1 ? 'disabled' : ''}" onclick="goToPage(${currentPage - 1})">
      <i class="bi bi-chevron-left"></i>
    </button>
    
    <span class="font-monospace small fw-bold px-3 py-1 border border-dark bg-white">
      ${currentPage} / ${totalPages}
    </span>
    
    <button type="button" class="btn btn-outline-dark btn-sm rounded-0 fw-bold px-3 ${currentPage === totalPages ? 'disabled' : ''}" onclick="goToPage(${currentPage + 1})">
      <i class="bi bi-chevron-right"></i>
    </button>
  `;
}

window.goToPage = function(page) {
  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderGrid();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.handleSearch = function(query) {
  const term = query.trim().toLowerCase();
  filteredRestaurants = allRestaurants.filter(r => {
    const name = (r.restaurantName || r.name || '').toLowerCase();
    const address = (r.restaurantAddress || r.address || '').toLowerCase();
    const category = (r.favoriteCategory || r.cuisine || '').toLowerCase();
    const dish = (r.topDishName || '').toLowerCase();
    return name.includes(term) || address.includes(term) || category.includes(term) || dish.includes(term);
  });
  currentPage = 1;
  renderGrid();
};