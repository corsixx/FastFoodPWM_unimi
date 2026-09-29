// public/js/catalog.js

const ITEMS_PER_PAGE = 8;
let currentPage = 1;

//costanti e variabili di stato globali
let currentCategory = '';
let currentSearch = '';
let currentSort = 'default';
let rawMealsList = [];
let selectedMealForCart = null;

// Avvio coordinato dopo l'iniezione dei componenti da utils.js
document.addEventListener('componentsLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);  //analizza la barra URL dopo il punto di doamanda
  const catParam = urlParams.get('category'); //cerca se è definito un filtro sulla categoria

  if (catParam) {
    currentCategory = decodeURIComponent(catParam); //una stringa sporca tipo Dolci%20&26%20&dessert viene trasforamta in DOlci & Dessert
  }

  await loadBackendCategories();  //carica le categorie di backend
  await loadFullCatalog();  //carica il catalogo
  if (typeof setupBarMovement === 'function') setupBarMovement(); //carica la funzione dello slider ecc
});

// Chiamata da toggleLanguage() in utils.js
window.updateView = function() {
  updateLanguageLabels(); 
  renderCatalogView();
};

function updateLanguageLabels() {
  const isIt = currentLang === 'IT';
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('txt-catalog-title', isIt ? 'MENU COMPLETO' : 'FULL MENU CATALOG');
  setT('btn-cat-all', isIt ? 'ALL / TUTTO' : 'ALL / FULL');
  setT('opt-sort-default', isIt ? 'Ordina: Predefinito' : 'Sort: Default');
  setT('opt-sort-price-asc', isIt ? 'Prezzo: Crescente' : 'Price: Low to High');
  setT('opt-sort-price-desc', isIt ? 'Prezzo: Decrescente' : 'Price: High to Low');
  setT('opt-sort-time', isIt ? 'Tempo preparazione' : 'Preparation time');
  setT('opt-sort-name', isIt ? 'Nome (A - Z)' : 'Name (A - Z)');

  const searchInput = document.getElementById('search-input');  //cerca la casella di ricerca e la cambia
  if (searchInput) {
    searchInput.placeholder = isIt ? 'Cerca piatto o ingrediente...' : 'Search dish or ingredient...';
  }
}

async function loadBackendCategories() {
  const navContainer = document.getElementById('categories-nav'); //prende la navbar riga 22 circa
  if (!navContainer) return;

  try {
    const categories = await apiRequest('/meals/categories'); //fa la get delle categorie
    const allLabel = currentLang === 'IT' ? 'ALL / TUTTO' : 'ALL / FULL';

    if (Array.isArray(categories) && categories.length > 0) { //verifica la validita e se contiene almeno una categoria
      const buttons = categories.map(cat => `
        <button class="nav-category-link ${currentCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" 
                onclick="filterCategory('${cat.replace(/'/g, "\\'")}', this)">
          ${cat.toUpperCase()}
        </button>
      `).join('');  //crea un bottono per ogni categoria che si evidenzia se è quello scelto come filtro in current category e al click filtra gfrazie a filterCategory

      navContainer.innerHTML = `
        <button class="nav-category-link ${currentCategory === '' ? 'active' : ''}" 
                onclick="filterCategory('', this)" id="btn-cat-all">${allLabel}</button>
        ${buttons}
      `;  //inietta anche il bottone all tutto attivo se la categoria scelta è vuota seguito da tutti i bottoni creati prima
    }
  } catch (err) {
    console.error('Errore caricamento categorie:', err);
  }
}

async function loadFullCatalog() {
  const grid = document.getElementById('catalog-grid'); //prende la griglia riga 67
  if (!grid) return;

  try {
    const res = await apiRequest('/meals'); //fa una get dei piatti
    const rawData = Array.isArray(res) ? res : (res.meals || []); //normalizza i dati, se ritorna un arrya top sennò prende la proprietà meals

    // De-duplicazione per ID
    const uniqueMap = new Map();  
    rawData.forEach(m => {  //per ogni piatto
      const key = String(m._id || m.id);  //converte id in stringa
      if (!uniqueMap.has(key)) {  //inserisce il paitto nella mappa solo se l'id non ce ancora
        uniqueMap.set(key, m);
      }
    });

    rawMealsList = Array.from(uniqueMap.values());  //array pulito di soli piatti

    currentPage = 1;  //prima pagina
    updateLanguageLabels(); //aggiorna lingua
    renderCatalogView();  //aggiorna la vista del catalogo
  } catch (err) {
    console.error('Errore chiamata catalogo:', err);
    grid.innerHTML = `<div class="col-12 text-danger text-center py-5">Errore caricamento piatti dal database.</div>`;
  }
}

function getFilteredAndSortedMeals() {
  let list = [...rawMealsList]; //clona l'rray orginale

  if (currentCategory) {  //filtro categoria
    list = list.filter(m => m.strCategory && m.strCategory.toLowerCase() === currentCategory.toLowerCase());
  }

  if (currentSearch) {  
    const term = currentSearch.toLowerCase(); 
    list = list.filter(m => 
      (m.strMeal && m.strMeal.toLowerCase().includes(term)) ||
      (m.strInstructions && m.strInstructions.toLowerCase().includes(term)) ||
      (Array.isArray(m.ingredients) && m.ingredients.some(i => i.toLowerCase().includes(term)))
    );  //filtra per nome, istruzioni/descrizione oppure ingredienti
  }

  if (currentSort === 'price-asc') {   //crescente
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); //confronto a 2 dove se il risultato a-b >0 a prima di b, <0 b prima di a o posizione invariata
  } else if (currentSort === 'price-desc') {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); //confronto a 2 dove se il risultato b-a >0 b prima di a, <0 a prima di b o posizione invariata
  } else if (currentSort === 'time-asc') {
    list.sort((a, b) => (Number(a.preparationTime) || 0) - (Number(b.preparationTime) || 0));
  } else if (currentSort === 'name-asc') {
    list.sort((a, b) => (a.strMeal || '').localeCompare(b.strMeal || ''));  //orinamento alfabetico corretto grazie a  local compare
  }

  return list;  
}

function renderCatalogView() {  //prendo l'output precedente e decido l'impaginazione
  const allFiltered = getFilteredAndSortedMeals();  //prende i piatti filtrati
  const totalItems = allFiltered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1; //fai numero piatti diviso piatti per pagina a trovi quante pagine

  if (currentPage > totalPages) currentPage = totalPages; //ti porta all'ultima pagina se current page è maggiore di totalpages
  if (currentPage < 1) currentPage = 1;

  const countLabel = document.getElementById('results-count');  //prende l'etichetta dove sono contati i paitti riga 36
  const isIt = currentLang === 'IT';
  if (countLabel) {
    countLabel.textContent = `${totalItems} ${isIt ? 'piatti trovati' : 'dishes found'}`;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;  //cosi sappiamo dove parte la pagina a livello di piatti, la prima pagina (i=1) inizia dal paitto 0 a 8
  const pageMeals = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE); //estrae i piatti di una pagina, tramite indirizzodi partezza e numero items per pagfina

  renderMealsGrid(pageMeals); //passi i piatti filtrati
  renderMinimalPagination(totalPages);
}

function renderMealsGrid(meals) { //genera visivamente le card
  const grid = document.getElementById('catalog-grid'); //prendo la griglia riga 57
  if (!grid) return;

  const isIt = currentLang === 'IT';
  const role = localStorage.getItem('userRole');
  const isRestaurant = role === 'restaurant';

  if (meals.length === 0) {
    const noMsg = isIt ? 'NESSUN PIATTO TROVATO CON I FILTRI SELEZIONATI.' : 'NO DISHES FOUND MATCHING YOUR FILTERS.';
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${noMsg}</div>`;//MESSAGGIO HTML
    return;
  }

  grid.innerHTML = meals.map(m => { //per ogni elemento m
    const hasRest = Array.isArray(m.availableRestaurants) && m.availableRestaurants.length > 0; //veriofica se il piatto è dispo
    const thumbUrl = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const price = (Number(m.price) || 8.50).toFixed(2);
    const prepTime = m.preparationTime || 15;
    //carica tutte le cose utili

    const canAddToCart = !isRestaurant && hasRest;  //lo puoi aggiugnere sse non sei ristoratore e è disponibiule

    const cartBtnHtml = canAddToCart
      ? `
        <button type="button" class="btn-card-action btn-card-cart" onclick="promptRestaurantSelection('${m._id}')">
          <i class="bi bi-bag-plus"></i> ${isIt ? '+ CARRELLO' : '+ ADD'}
        </button>
      `
      : `
        <button type="button" class="btn-card-action btn-card-cart disabled text-muted" style="cursor: not-allowed; opacity: 0.65;" title="${isRestaurant ? (isIt ? 'Ordini disabilitati per account ristoratore' : 'Ordering disabled for restaurant account') : (isIt ? 'Piatto non disponibile nei ristoranti' : 'Dish currently unavailable')}">
          <i class="bi bi-slash-circle"></i> ${isIt ? 'NON DISP.' : 'UNAVAIL.'}
        </button>
      `;  //operatore ternario per i tasti add o non dispobile

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card">
          <div class="product-img-wrapper" onclick="goToMealPage('${m._id}')">
            <img src="${thumbUrl}" alt="${m.strMeal || ''}" loading="lazy">
            <span class="product-tag">${m.strCategory || 'MENU'}</span>
          </div>

          <div class="product-info-body">
            <div class="product-title text-truncate" title="${m.strMeal}">${m.strMeal || 'Piatto'}</div>
            <div class="product-price">
              € ${price} 
              <span class="small text-muted fw-normal">&bull; ${prepTime}m prep</span>
            </div>
          </div>

          <div class="card-action-group">
            <button type="button" class="btn-card-action btn-card-view" onclick="goToMealPage('${m._id}')">
              <i class="bi bi-eye"></i> ${isIt ? 'VEDI' : 'VIEW'}
            </button>
            ${cartBtnHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');  //tasto per vedere il piatto sempre disponibile, in piu viene aggiunto il bottone
}

window.goToMealPage = function(mealId) {  //funzione per la funzione sopra per andare alla pagina del piatto
  window.location.href = `meal.html?id=${encodeURIComponent(mealId)}`;
};

function renderMinimalPagination(totalPages) {  //funzione che decide se motrare i comandi di paginazione o meno 
  const container = document.getElementById('pagination-controls'); //freccettine di paginazione riag 65
  const wrapper = document.getElementById('pagination-wrapper');  //box contenitore
  if (!container || !wrapper) return;

  if (totalPages <= 1) {
    wrapper.classList.add('d-none');
    return;
  }

  wrapper.classList.remove('d-none'); //mette visibile il box 
  const isIt = currentLang === 'IT';
  const label = isIt ? 'PAG.' : 'PAGE';
  
  const currentFormatted = String(currentPage).padStart(2, '0');  //forza i numeri ad avere almeno 2 caratteri quindi lo 9 davanti 
  const totalFormatted = String(totalPages).padStart(2, '0');

  container.innerHTML = `
    <button class="page-arrow-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
      <i class="bi bi-chevron-left"></i>
    </button>
    <div class="page-counter-text">${label} ${currentFormatted} / ${totalFormatted}</div>
    <button class="page-arrow-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="bi bi-chevron-right"></i>
    </button>
  `;  //freccetta sinistra e a destra che chiama gotopage +- 1
}

window.goToPage = function(page) { //passi la pagina in cui vuoi andare
  currentPage = page; //la setta
  renderCatalogView();  //ricarica i nuovi 7 piatti
  window.scrollTo({ top: 0, behavior: 'smooth' });  //riporta in alto al catalogo in modo smooth
};

window.filterCategory = function(categoryName, btnElement) {  //usata in loadBackendCategories  riceve anche il bottone cliccato 
  currentCategory = categoryName; //riceve la stringa della categforia passata
  currentPage = 1;  //resetr della paginazione
  document.querySelectorAll('#categories-nav .nav-category-link').forEach(el => el.classList.remove('active')); //toglie la classe visiva active da tutti i bottoni delle categorie
  if (btnElement) btnElement.classList.add('active'); //la agigugen solo al bototno schiacciato
  renderCatalogView();  //riga 138 prendo l'output cioe i piatti filtrati precedente e decido l'impaginazione
};

window.handleSearchInput = function(e) {  //con un evento, solitasmente Viene eseguita sull'evento di digitazione (tipicamente oninput o onkeyup) del campo di ricerca testuale.
  currentSearch = e.target.value.trim();  //preleva il testo digitato dall'utente, toglie psazi vuoit
  currentPage = 1;  //reset della paginazione
  renderCatalogView();  //ricarica
};  //riga 43

window.handleSort = function(val) { //riga 46 
  currentSort = val; //memoriazza il nuovo valore di ordinamento
  renderCatalogView();  //ricarica
};

window.promptRestaurantSelection = function(mealId) { //apertura modale on click
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant') return;

  const meal = rawMealsList.find(m => String(m._id) === String(mealId));  //trova tra tutti i piatti quello che ha il meal id dato in pasto alla funzione
  if (!meal) return;

  selectedMealForCart = meal; //let selectedMealForCart istanziata all'inzio
  const price = (Number(meal.price) || 8.50).toFixed(2);

  const thumbEl = document.getElementById('modal-meal-thumb');  //immagine modale
  const nameEl = document.getElementById('modal-picker-meal-name'); //nome del modale
  const priceEl = document.getElementById('modal-picker-meal-price'); //prezzo del modale
  const listEl = document.getElementById('modal-restaurant-list');  //in modals si riempe con i ristoranti

  if (thumbEl) thumbEl.src = meal.strMealThumb || '';
  if (nameEl) nameEl.textContent = meal.strMeal;
  if (priceEl) priceEl.textContent = `€ ${price}`;

  const available = Array.isArray(meal.availableRestaurants) ? meal.availableRestaurants : [];
  //controlla se esiste l'rray e mette in avaible i ristoranti ch ehanno il piatto

  if (listEl) {
    if (available.length === 0) {
      const msg = currentLang === 'IT' ? 'Nessun ristorante partner ha attualmente questo piatto in menu.' : 'No partner restaurant currently offers this dish.';
      listEl.innerHTML = `<div class="text-muted small p-2">${msg}</div>`;
    } else {
      listEl.innerHTML = available.map(r => `
        <button type="button" class="btn btn-outline-dark rounded-0 text-start p-2 d-flex justify-content-between align-items-center mb-2 w-100" onclick="confirmAddToCartWithRestaurant('${r._id}', '${(r.name || 'Ristorante').replace(/'/g, "\\'")}')">
          <div>
            <div class="fw-bold text-uppercase small">${r.name || 'Ristorante Partner'}</div>
            <div class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-geo-alt me-1"></i>${r.address || 'Ritiro al bancone'}</div>
          </div>
          <span class="badge bg-black rounded-0 font-monospace">RITIRA QUI →</span>
        </button>
      `).join('');
      //stessa cosa di prima, join unisce quello che map spezza in una stringa ch eviene iniettatta
      //crea dei bottoni che se clicchi su ritira qui ti confermano l'aggiunta al carrello
    }
  }

  const modalEl = document.getElementById('modalChooseRestaurant'); //riquadro che si scurisce quando ci clicchi sopra riga 32 modals
  if (modalEl) {
    const modalInst = bootstrap.Modal.getOrCreateInstance(modalEl);//se il modale è gia stato inizializzato in precedenza recupera l'istanza
    modalInst.show(); //mostra il modale
  }
  //tutta la funzione prepara il modale e quaesto utlimo pezzo lo apre
};

window.confirmAddToCartWithRestaurant = function(restId, restName) {  //aggiunge al carrello
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant' || !selectedMealForCart) return;  //se non ce nessun piatto selezionato da mettere nel carrello

  const priceNum = Number(selectedMealForCart.price) || 8.50;
  let cart = JSON.parse(localStorage.getItem('cart')) || [];  //prende il carrello
  const mId = String(selectedMealForCart._id);  //prende l'ID del piatto

  const existing = cart.find(i => String(i.id) === mId && String(i.restaurantId) === String(restId)); //vede se trova piatto gia nel carrello

  if (existing) {
    existing.quantity += 1; //se sia ggiunge la quantita
  } else {
    cart.push({ //senno pusha le informazioni del meal nel cart
      id: mId,
      name: selectedMealForCart.strMeal,
      price: priceNum,
      thumb: selectedMealForCart.strMealThumb || '',
      preparationTime: selectedMealForCart.preparationTime || 15,
      restaurantId: restId,
      restaurantName: restName,
      quantity: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart)); //rimette nel localstorage il cart
  
  if (typeof renderCartBadge === 'function') renderCartBadge(); //aggiorna il numerino sopra il carrello con i piatti 
  if (typeof renderDrawerCartUI === 'function') renderDrawerCartUI(); //sistema anche la visualizzazione del carrelo

  const modalEl = document.getElementById('modalChooseRestaurant'); //trovas nel modale l0intero modale
  if (modalEl) {
    const modalInst = bootstrap.Modal.getInstance(modalEl); //se il modale è gia stato inizializzato in precedenza recupera l'istanza altrimenti ne crea una nuova
    if (modalInst) modalInst.hide();  //chiude il modale  visto che confermi un determinato piatto da ordinare
  }

  const cartDrawerEl = document.getElementById('cartOffcanvas');  //prende il coso del carrello e lo mostra
  if (cartDrawerEl) {
    bootstrap.Offcanvas.getOrCreateInstance(cartDrawerEl).show();
  }
};