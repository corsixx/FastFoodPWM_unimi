// public/js/meal.js

let currentMeal = null;
let selectedRestaurantId = null;
let selectedRestaurantName = '';
let selectedQty = 1;

// Avvio dopo che utils.js ha iniettato componenti e traduzioni
document.addEventListener('componentsLoaded', async () => {
  await loadMealDetails();
});

// Chiamato da toggleLanguage() in utils.js
window.updateView = function() {
  const backText = document.getElementById('txt-back-catalog');
  if (backText) {
    backText.textContent = currentLang === 'IT' ? 'Torna al Menu Completo' : 'Back to Full Menu';
  }
  if (currentMeal) renderMealView();
};

/**
 * Caricamento dati piatto dal backend
 */
async function loadMealDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const mealId = urlParams.get('id');
  const queryRestId = urlParams.get('restaurantId');

  if (!mealId) {
    renderNotFound();
    return;
  }

  try {
    const data = await apiRequest(`/meals/${mealId}`);
    if (!data) throw new Error('Piatto non trovato');

    currentMeal = data;
    if (queryRestId) selectedRestaurantId = queryRestId;

    renderMealView();
  } catch (err) {
    console.error('Errore caricamento scheda piatto:', err);
    renderNotFound();
  }
}

/**
 * Renderizza la scheda piatto
 */
function renderMealView() {
  const container = document.getElementById('meal-detail-container');
  if (!container || !currentMeal) return;

  const isIt = currentLang === 'IT';
  const thumb = currentMeal.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
  const priceNum = (typeof currentMeal.price === 'number' && currentMeal.price > 0) ? currentMeal.price : (parseFloat(currentMeal.price) || 8.50);
  const priceStr = priceNum.toFixed(2);
  const cat = currentMeal.strCategory || 'PIATTO';
  const prepTime = currentMeal.preparationTime || 15;
  const desc = currentMeal.description || currentMeal.strInstructions || (isIt ? 'Piatto preparato fresco con ingredienti selezionati.' : 'Freshly prepared dish with selected ingredients.');

  let ingrText = isIt ? 'Ingredienti freschi di stagione.' : 'Fresh seasonal ingredients.';
  if (Array.isArray(currentMeal.ingredients) && currentMeal.ingredients.length > 0) {
    ingrText = currentMeal.ingredients.join(', ');
  } else if (typeof currentMeal.ingredients === 'string' && currentMeal.ingredients.trim()) {
    ingrText = currentMeal.ingredients;
  }

  // Lista ristoranti associati
  const available = Array.isArray(currentMeal.availableRestaurants) ? currentMeal.availableRestaurants : [];
  let restaurantBox = '';
  const canOrder = available.length > 0;

  if (canOrder) {
    if (!selectedRestaurantId) {
      selectedRestaurantId = available[0]._id;
      selectedRestaurantName = available[0].name || available[0].restaurantName || 'Ristorante Partner';
    }

    if (available.length === 1) {
      restaurantBox = `
        <div class="border border-dark p-3 bg-white mb-4">
          <div class="small text-muted text-uppercase fw-bold mb-1" style="font-size: 0.7rem;">
            ${isIt ? 'PUNTO DI RITIRO' : 'PICKUP LOCATION'}
          </div>
          <div class="fw-bold text-uppercase" style="font-family: 'Space Grotesk', sans-serif;">
            <i class="bi bi-shop me-1"></i> ${available[0].name || available[0].restaurantName}
          </div>
          <div class="small text-muted mt-1">
            <i class="bi bi-geo-alt me-1"></i> ${available[0].address || available[0].restaurantAddress || 'Ritiro presso il locale'}
          </div>
        </div>
      `;
    } else {
      restaurantBox = `
        <div class="border border-dark p-3 bg-white mb-4">
          <label class="form-label small text-muted text-uppercase fw-bold mb-2" style="font-size: 0.7rem;">
            <i class="bi bi-shop me-1"></i> ${isIt ? 'SCEGLI IL PUNTO DI RITIRO' : 'CHOOSE PICKUP LOCATION'}
          </label>
          <select class="form-select rounded-0 border-dark shadow-none" id="select-pickup-restaurant" onchange="handleSelectRestaurant(event)">
            ${available.map(r => `
              <option value="${r._id}" data-name="${(r.name || r.restaurantName).replace(/'/g, "\\'")}" ${String(r._id) === String(selectedRestaurantId) ? 'selected' : ''}>
                ${(r.name || r.restaurantName).toUpperCase()} &bull; ${r.address || r.restaurantAddress || 'Sede'}
              </option>
            `).join('')}
          </select>
        </div>
      `;
    }
  } else {
    restaurantBox = `
      <div class="border border-dark p-3 bg-light mb-4">
        <div class="fw-bold text-uppercase text-danger mb-1" style="font-family: 'Space Grotesk', sans-serif;">
          <i class="bi bi-exclamation-circle me-1"></i> ${isIt ? 'NON DISPONIBILE AL MOMENTO' : 'CURRENTLY UNAVAILABLE'}
        </div>
        <div class="small text-muted">
          ${isIt ? 'Nessun ristorante partner ha attualmente questo piatto a listino.' : 'No partner restaurant currently offers this dish on their menu.'}
        </div>
      </div>
    `;
  }

  // Barra di acquisto
  let actionBox = '';
  if (canOrder) {
    actionBox = `
      <div class="border-top pt-4 mt-auto d-flex gap-2 align-items-stretch" style="height: 75px;">
        <div class="d-flex align-items-center border border-dark bg-white">
          <button type="button" class="btn btn-light rounded-0 px-3 h-100 fw-bold border-0" onclick="changeQty(-1)">-</button>
          <span class="px-3 fw-bold font-monospace fs-5" id="meal-qty-display">${selectedQty}</span>
          <button type="button" class="btn btn-light rounded-0 px-3 h-100 fw-bold border-0" onclick="changeQty(1)">+</button>
        </div>

        <button type="button" class="btn btn-dark rounded-0 flex-grow-1 fw-bold text-uppercase d-flex justify-content-between align-items-center px-3 px-md-4" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: 0.05em;" onclick="addToCart()">
          <span><i class="bi bi-box-seam me-2"></i> <span>${isIt ? 'AGGIUNGI AL CARRELLO' : 'ADD TO CART'}</span></span>
          <span class="font-monospace fs-5">€ ${(priceNum * selectedQty).toFixed(2)}</span>
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- COLONNA SINISTRA: FOTO -->
    <div class="col-12 col-md-5 col-lg-5">
      <div class="border border-dark position-relative bg-white">
        <img src="${thumb}" alt="${currentMeal.strMeal}" class="w-100" style="aspect-ratio: 4/3; object-fit: cover;">
        <span class="badge bg-black text-white position-absolute top-0 start-0 m-3 rounded-0 text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.05em;">
          ${cat}
        </span>
      </div>
    </div>

    <!-- COLONNA DESTRA: DETTAGLI E ACQUISTO -->
    <div class="col-12 col-md-7 col-lg-7">
      <div class="border border-dark p-4 p-md-5 bg-white h-100 d-flex flex-column justify-content-between">
        
        <div>
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h2 class="fw-bold text-uppercase m-0" style="font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em;">
              ${currentMeal.strMeal}
            </h2>
            <div class="fs-3 fw-bold font-monospace text-dark text-nowrap">
              € ${priceStr}
            </div>
          </div>

          <div class="d-flex align-items-center gap-2 mb-4">
            <span class="badge border border-dark text-dark rounded-0 px-2 py-1 small">
              <i class="bi bi-clock me-1"></i> ${isIt ? 'Tempo di preparazione:' : 'Preparation time:'} <strong>${prepTime} min</strong>
            </span>
          </div>

          ${restaurantBox}

          <div class="mb-4">
            <div class="small text-muted text-uppercase fw-bold border-bottom pb-1 mb-2" style="font-size: 0.75rem;">
              ${isIt ? 'Descrizione & Note' : 'Description & Notes'}
            </div>
            <p class="small text-muted mb-3" style="line-height: 1.6;">
              ${desc}
            </p>

            <div class="small text-muted text-uppercase fw-bold border-bottom pb-1 mb-2" style="font-size: 0.75rem;">
              ${isIt ? 'Ingredienti' : 'Ingredients'}
            </div>
            <p class="small text-dark fw-semibold mb-0">
              ${ingrText}
            </p>
          </div>
        </div>

        ${actionBox}

      </div>
    </div>
  `;
}

window.handleSelectRestaurant = function(e) {
  selectedRestaurantId = e.target.value;
  const opt = e.target.options[e.target.selectedIndex];
  selectedRestaurantName = opt.getAttribute('data-name') || 'Ristorante Partner';
};

window.changeQty = function(delta) {
  selectedQty += delta;
  if (selectedQty < 1) selectedQty = 1;
  renderMealView();
};

window.addToCart = function() {
  if (!currentMeal) return;
  const isIt = currentLang === 'IT';

  if (!selectedRestaurantId) {
    alert(isIt ? 'Seleziona un ristorante per il ritiro prima di continuare.' : 'Please select a pickup restaurant before proceeding.');
    return;
  }

  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const mealId = String(currentMeal._id || currentMeal.idMeal || currentMeal.id);
  const priceNum = (typeof currentMeal.price === 'number' && currentMeal.price > 0) ? currentMeal.price : (parseFloat(currentMeal.price) || 8.50);

  const existing = cart.find(i => String(i.id) === mealId && String(i.restaurantId) === String(selectedRestaurantId));

  if (existing) {
    existing.quantity += selectedQty;
  } else {
    cart.push({
      id: mealId,
      name: currentMeal.strMeal,
      price: priceNum,
      thumb: currentMeal.strMealThumb || '',
      preparationTime: currentMeal.preparationTime || 15,
      restaurantId: selectedRestaurantId,
      restaurantName: selectedRestaurantName,
      quantity: selectedQty
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  
  // Aggiorna il carrello globale definito in utils.js
  if (typeof renderCartBadge === 'function') renderCartBadge();
  if (typeof renderDrawerCartUI === 'function') renderDrawerCartUI();

  // Apre il carrello laterale
  const cartDrawerEl = document.getElementById('cartOffcanvas');
  if (cartDrawerEl) {
    bootstrap.Offcanvas.getOrCreateInstance(cartDrawerEl).show();
  }
};

function renderNotFound() {
  const container = document.getElementById('meal-detail-container');
  if (!container) return;

  const isIt = currentLang === 'IT';
  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="border border-dark p-5 bg-white d-inline-block text-center" style="max-width: 500px;">
        <i class="bi bi-exclamation-octagon fs-1 mb-3 d-block"></i>
        <h4 class="fw-bold text-uppercase mb-2">${isIt ? 'PIATTO NON TROVATO' : 'MEAL NOT FOUND'}</h4>
        <p class="small text-muted mb-4">${isIt ? 'Il piatto richiesto non esiste o è stato rimosso.' : 'The requested meal does not exist or has been removed.'}</p>
        <a href="catalog.html" class="btn btn-dark rounded-0 px-4 py-2 fw-bold text-uppercase">
          ${isIt ? 'TORNA AL CATALOGO' : 'BACK TO CATALOG'}
        </a>
      </div>
    </div>
  `;
}