// public/js/app.js

let allMeals = [];
let userFavoriteCategory = '';
let selectedMealForCart = null;

// Avvio dopo il caricamento componenti da utils.js
document.addEventListener('componentsLoaded', async () => { //listener asicrono per la funzioni dentro utils.js
  await loadUserProfilePreference();
  await loadCategories();
  await loadHomeMeals();
  if (typeof setupBarMovement === 'function') setupBarMovement(); 
});

window.updateView = function() {  //permette di forzare il ricalcolo delle intestazioni e il ridisegno della griglia dei piatti
  updateSectionHeaders(); 
  renderMealsGrid();
};

/**
 * 1. Recupera la preferenza del cliente
 */
async function loadUserProfilePreference() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token || role !== 'customer') {  //se non è customer
    userFavoriteCategory = '';  //preferenza azzerata
    return;
  }

  try {
    const profile = await apiRequest('/auth/me');
    const user = profile.user || profile;   //se aggiungi dei metadati nella risposta della rotta arriva "imbustato", altrimenti una risposta diretta 
    //es. res.json ({ success: true,message: "Profilo recuperato",user: { id: 1, name: "Mario", favoriteCategory: "Scarpe" } oppure la risposta classica con res.status(200).json(user);
    if (user && user.favoriteCategory && user.favoriteCategory.trim() !== '') {
      userFavoriteCategory = user.favoriteCategory.trim();  //salva la categoria preferita
    }
  } catch (err) {
    userFavoriteCategory = '';
  }
}

/**
 * 2. Caricamento categorie e reindirizzamento al catalogo
 */
async function loadCategories() {
  try {
    const categories = await apiRequest('/meals/categories'); //usa la rotta per le categorie
    const container = document.getElementById('categories-nav');
    if (!container || !Array.isArray(categories)) return; //verfica la presenza del container e la valenza dell'array

    const allLabel = currentLang === 'IT' ? 'ALL / TUTTO' : 'ALL / FULL';
    //backtick per iniettare dentro inner html
    container.innerHTML = ` 
      <button type="button" class="nav-category-link active" onclick="goToCatalogCategory('')" id="btn-cat-all">
        ${allLabel}
      </button>
      ${categories.map(cat => `
        <button type="button" class="nav-category-link" onclick="goToCatalogCategory('${cat.replace(/'/g, "\\'")}')">
          ${cat.toUpperCase()}
        </button>
      `).join('')}
    `;
    //trasforma ogni riga dell'array in un elemento html, regex per sostituire la virgoletta con / e join riunisce tutto in un unica stringa che era stata seprata da map
  } catch (err) {
    console.error('Errore caricamento categorie:', err);
  }
}
// cat == categoria
window.goToCatalogCategory = function(cat) {
  if (!cat || cat.trim() === '') {
    window.location.href = 'catalog.html';  //vai a catalogo
  } else {
    window.location.href = `catalog.html?category=${encodeURIComponent(cat.trim())}`; //vai a catalogo e filtra per categoria con encodeURIcomponet cosi evitando i simboli
  }
};

window.filterCategory = function(cat) {
  window.goToCatalogCategory(cat);  //usa la funzione di prima per rendere piu pulito il tutto
};

/**
 * 3. Caricamento piatti: Nuove Aggiunte (New In)
 */
async function loadHomeMeals() {
  try {
    const mealsData = await apiRequest('/meals'); //usa la rotta per ottenere i paitti
    const rawList = Array.isArray(mealsData) ? mealsData : (mealsData.meals || []); //controllo se è array valido e non è un contenitore arricchitto

    // Deduplicazione per ID
    const uniqueMap = new Map();  //mappa per accesso veloce
    rawList.forEach(m => {
      const key = String(m._id || m.id); //chiave unicoca meal meals id come chiave
      if (!uniqueMap.has(key)) {  //controlla se la chiave non esiste
        uniqueMap.set(key, m);  //nel caso aggiung ela coppia chiave piatto
      }
    });

    const uniqueList = Array.from(uniqueMap.values()); //estrae gli oggetti piatti senza duplicati e li mette nell'array

    // Ordine NEW IN: i piatti aggiunti più di recente in cima
    allMeals = uniqueList.sort((a, b) => {  //ordina confrontando 2 valori per data di creazioene, se risultato positivo allora b>a, 0 se b=a altrimenti b<a
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt); //li confronta
      }
      return String(b._id || b.id).localeCompare(String(a._id || a.id));  //confronta id in ordine alfabeticp 
    });

    updateSectionHeaders(); //aggiorna titoli e sottotitoli
    renderMealsGrid();  //riesegue la funzione che dispone e crea la griglia con le card
  } catch (err) {
    console.error('Errore caricamento piatti home:', err);
    document.getElementById('meals-grid').innerHTML = `
      <div class="col-12 text-center py-5 text-danger">Impossibile caricare i piatti dal server.</div>  
    `;
    //messaggio errore
  }
}

/**
 * 4. Intestazioni dinamiche: Preferenze per cliente loggato, NEW IN per tutti gli altri
 */
function updateSectionHeaders() {
  const badgeEl = document.getElementById('home-section-badge');  //scopri i piatti
  const titleEl = document.getElementById('txt-popular-title'); //i piu popolari
  const subLabel = document.getElementById('user-pref-label');  //riga 59
  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  const isIt = currentLang === 'IT'; //recypera i puntatori agli elementi di testo del banner e cose utili da local storage

  if (!titleEl) return;

  // CASO 1: Cliente loggato con preferenza impostata
  if (token && role === 'customer' && userFavoriteCategory) {
    if (badgeEl) badgeEl.textContent = isIt ? 'SCELTI PER TE' : 'RECOMMENDED FOR YOU';
    titleEl.textContent = `${isIt ? 'PIATTI A BASE DI' : 'DISHES WITH'} ${userFavoriteCategory.toUpperCase()}`; //non uso l'operazione di concatenazione e posso usare variabile e codice JS nel literal template con backtick
    if (subLabel) subLabel.textContent = isIt ? `In base alla tua preferenza: ${userFavoriteCategory}` : `Based on your preference: ${userFavoriteCategory}`;
    return;
  }

  // CASO 2: Utente non loggato, Ristoratore o Cliente senza preferenza -> NEW IN
  if (badgeEl) badgeEl.textContent = isIt ? 'NUOVE AGGIUNTE' : 'JUST ADDED';
  titleEl.textContent = isIt ? 'NEW IN / GLI ULTIMI ARRIVI' : 'NEW IN / LATEST ARRIVALS';
  if (subLabel) subLabel.textContent = isIt ? 'Le ultime ricette e specialità inserite nel menu' : 'Latest recipes and specialties added to the menu';
}

/**
 * 5. Rendering della griglia piatti
 */
window.renderMealsGrid = function() {
  const grid = document.getElementById('meals-grid'); //prende la griglia
  if (!grid) return;

  const role = localStorage.getItem('userRole');
  const token = localStorage.getItem('token');
  const isRestaurant = role === 'restaurant'; //se role == restaurant allora isRestaurant è true
  const isIt = currentLang === 'IT';
  let list = [...allMeals]; //prende i piatti e li mette dentro unaltro array

  // Se cliente loggato con preferenza, filtra solo i piatti della sua categoria
  if (token && role === 'customer' && userFavoriteCategory) {
    const prefList = list.filter(m => (m.strCategory || '').toLowerCase() === userFavoriteCategory.toLowerCase());  //filtra solo i piatti della catergoria pref
    list = prefList.length > 0 ? prefList : list; //se esiste allora in list mette prefList
  }

  // De-duplicazione finale prima del taglio a 16
  const finalUnique = [];
  const seen = new Set();
  for (const m of list) { //per ogni paitto della lista
    const key = String(m._id || m.id);  //prende la key
    if (!seen.has(key)) { //se seen non ha la chiave
      seen.add(key);  //la aggiunge
      finalUnique.push(m);  //pusha meals dentro final unique
    }
  } //cosi riusciamo a togliere i duplicati

  const pageItems = finalUnique.slice(0, 16); //prende solo 16 piatti di quelli non doppi

  if (pageItems.length === 0) {
    const noMealsMsg = isIt ? 'Nessun piatto trovato per questa selezione.' : 'No meals found for this selection.';
    grid.innerHTML = `<div class="col-12 text-center py-5 text-muted small">${noMealsMsg}</div>`;
    return; //inietta un messaggio di errore e fa return
  }

  //inner html di meals-grid, map è una specie di ciclo for per la trasformazione
  grid.innerHTML = pageItems.map(m => {
    const hasRest = Array.isArray(m.availableRestaurants) && m.availableRestaurants.length > 0; //controllo che ci sia alemno un ristorante che contiene il piatto e che la'rray sia valido, 
    const thumbUrl = m.strMealThumb || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; //IMMAGINE PIATTO
    const price = (Number(m.price) || 8.50).toFixed(2); 
    const prepTime = m.preparationTime || 15;

    const canAddToCart = !isRestaurant && hasRest;  //puoi aggiugnere  il piatto se sei costumer ed è disponibile

    //se canAdddToCart è vero allora bottone disponibile e che ti porta al modale altrimenti disabilitato con cursore di diveito
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
      `;

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card">
          <div class="product-img-wrapper" onclick="goToMealPage('${m._id}')">
            <img src="${thumbUrl}" alt="${m.strMeal || ''}" loading="lazy">
            <span class="product-tag">${m.strCategory || 'MENU'}</span> <!--label con categoria-->
          </div>

          <div class="product-info-body">
            <div class="product-title text-truncate" title="${m.strMeal}">${m.strMeal || 'Piatto'}</div>  <!--taglia il testo con 3 punti-->
            <div class="product-price">
              € ${price} 
              <span class="small text-muted fw-normal">&bull; ${prepTime}m prep</span>
            </div>
          </div>

          <div class="card-action-group"> 
            <button type="button" class="btn-card-action btn-card-view" onclick="goToMealPage('${m._id}')">
              <i class="bi bi-eye"></i> ${isIt ? 'VEDI' : 'VIEW'} <!--cliccando vai alla funzione goToMealPage-->
            </button>
            ${cartBtnHtml}  <!--inserisce il pulsante creato in precedenza per comrpare-->
          </div>
        </div>
      </div>
    `;
  }).join(''); 
};  //join per unire le stringhe separate create da map e le das in pasto al grid.innerHTML
//il return restituisce il modello visivo

window.goToMealPage = function(mealId) {
  window.location.href = `meal.html?id=${encodeURIComponent(mealId)}`;  //cambiare la pagina all'indirizzo specificato
};

/**
 * 6. Modale di scelta ristorante per il carrello
 */
window.promptRestaurantSelection = function(mealId) { //funzione usata prima quando schiacci aggiungi piatto
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant') return;

  const meal = allMeals.find(m => String(m._id) === String(mealId));  //trova tra tutti i piatti quello che ha il meal id dato in pasto alla funzione
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

  const available = Array.isArray(meal.availableRestaurants) ? meal.availableRestaurants : [];  //controlla se esiste l'rray e mette in avaible i ristoranti ch ehanno il piatto

  if (listEl) {
    if (available.length === 0) {
      const msg = currentLang === 'IT' ? 'Nessun ristorante partner ha attualmente questo piatto a menu.' : 'No partner restaurant currently offers this dish.';
      listEl.innerHTML = `<div class="text-muted small p-2">${msg}</div>`;  //testo grigio piccolo con msg
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

  const modalEl = document.getElementById('modalChooseRestaurant'); //riquadro che si scurisce quando ci clicchi sopra
  if (modalEl) {
    const modalInst = bootstrap.Modal.getOrCreateInstance(modalEl); //se il modale è gia stato inizializzato in precedenza recupera l'istanza altrimenti ne crea una nuova
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