// public/js/utils.js

// ============================================================================
// 1. CARICATORE DEI COMPONENTI HTML (Header, Footer, Modali, Drawer)
// ============================================================================
window.loadComponents = async function() {  //window rende loadcomponents una variabile GLOBALE
  const components = [
    { id: 'app-header', url: 'components/header.html' },
    { id: 'app-footer', url: 'components/footer.html' },
    { id: 'app-drawer', url: 'components/drawer.html' },
    { id: 'app-modals', url: 'components/modals.html' }
  ];  //tutti i componenti da caricare

  //promise all esegue tutto in parallelo
  await Promise.all(components.map(async (comp) => { //per ciascuna components avvia funzione async che restituisce una promise
    const element = document.getElementById(comp.id); //cerca nella pagina il contenitore con un determinato id
    if (element) {
      try {
        const response = await fetch(comp.url); //scarica il componenete grazie all'url
        if (response.ok) {  //se è ok(200-299)
          element.innerHTML = await response.text(); //testo html iniettato dentro il contenitore, trasforma la risposta HTTpP in stringa di testo puro
        }
      } catch (error) {
        console.error(`Errore nel caricamento di ${comp.url}:`, error);
      }
    }
  }));

  // EVIDENZIATORE AUTOMATICO PAGINA ATTIVA NEL MENU LATERALE X EVITARE INCONSISTENZE VISIVE
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';  //prende l'url, la spezzetta e prende l'ultimo elemento della lista
  const navLinks = document.querySelectorAll('.drawer-nav-item'); //cerca tutti gli elementi HTML che hanno la classe del drawer
  //nodelist restituita contenente tutti i tag e bottoni trovati
  navLinks.forEach(link => {
    link.classList.remove('active');  //azzeriamo tutte le classi active
    if (link.getAttribute('href') === currentPage) { //assegnamo la classe active alla pagina in cui siamo
      link.classList.add('active');
    }
  });
};

// ============================================================================
// 2. GESTIONE GLOBALE DELLA LINGUA (i18n)
// ============================================================================
let currentLang = localStorage.getItem('appLang') || 'IT';  //salva la lingua dalla local Storage

const globalI18n = {
  IT: {
    'lang-btn': 'IT 🇮🇹',
    'txt-announcement': 'Supporto in Chat 24/7 &bull; Ordini al Bancone & Asporto Rapido',
    'txt-d-catalog': 'CATALOGO COMPLETO',
    'txt-d-restaurants': 'I NOSTRI RISTORANTI',
    'txt-d-orders': 'I MIEI ORDINI',
    'txt-d-stats': 'STATISTICHE LOCALE',
    'txt-f-service': 'SERVIZIO',
    'txt-f-how': 'Come Ordinare',
    'txt-f-pickup': 'Ritiro al Bancone',
    'txt-f-wait': 'Tempi di Attesa',
    'txt-f-partner': 'PARTNER',
    'txt-f-join': 'Diventa un Ristorante Partner',
    'txt-f-manage': 'Accedi al Gestionale',
    'txt-f-support': 'SUPPORTO',
    'txt-f-contact': 'Contatta Assistenza',
    'txt-f-chat': 'Chat 24/7 Attiva',
    'txt-f-legal': 'LEGAL',
    'txt-f-terms': 'Privacy & Termini',
    'txt-m-info-title': 'Informazioni Servizio',
    'txt-m-info-body': 'Scegli i piatti dal menu, inoltra l\'ordine e ritira direttamente al punto cassa senza code.',
    'txt-m-legal-title': 'Termini & Note Legali',
    'txt-m-legal-body': 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro.',
    'cartOffcanvasLabel': 'CARRELLO',
    'btn-checkout': 'VAI AL CHECKOUT'
  },
  EN: {
    'lang-btn': 'EN 🇬🇧',
    'txt-announcement': '24/7 Live Chat Support &bull; Counter Pickup & Express Takeout',
    'txt-d-catalog': 'FULL CATALOG',
    'txt-d-restaurants': 'OUR RESTAURANTS',
    'txt-d-orders': 'MY ORDERS',
    'txt-d-stats': 'RESTAURANT STATS',
    'txt-f-service': 'SERVICE',
    'txt-f-how': 'How to Order',
    'txt-f-pickup': 'Counter Pickup',
    'txt-f-wait': 'Wait Times',
    'txt-f-partner': 'PARTNER',
    'txt-f-join': 'Become a Partner Restaurant',
    'txt-f-manage': 'Access Dashboard',
    'txt-f-support': 'SUPPORT',
    'txt-f-contact': 'Contact Support',
    'txt-f-chat': '24/7 Chat Active',
    'txt-f-legal': 'LEGAL',
    'txt-f-terms': 'Privacy & Terms',
    'txt-m-info-title': 'Service Information',
    'txt-m-info-body': 'Choose dishes from the menu, place your order and pick up at the checkout counter.',
    'txt-m-legal-title': 'Terms & Legal Notes',
    'txt-m-legal-body': 'Secure platform protected by JWT authentication. User data and orders are stored securely.',
    'cartOffcanvasLabel': 'CART',
    'btn-checkout': 'GO TO CHECKOUT'
  }
};

window.toggleLanguage = function() {  //funzione assegnata all'oggetto globale window
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang); //persistenza cosi che se cambio pagina rimane quello
  
  //aggiorna a cascata i diversi componenti
  renderGlobalLanguageUI(); //testi generali 
  renderDrawerAuth(); //voci login logout
  renderDrawerCartUI(); //carrello

  //controlla se la specifica funzione esiste prima di invocarla
  if (typeof updateView === 'function') updateView(); //nel file catalog
  if (typeof renderMealsGrid === 'function') renderMealsGrid(); //nel file catalog
  if (typeof renderMenuGrid === 'function') renderMenuGrid(); //nel file crestaurant daetai
};

window.renderGlobalLanguageUI = function() {  //funzione che applica le traduzuioni
  const t = globalI18n[currentLang];  //dizionario settato alla lingua principale
  for (const [id, text] of Object.entries(t)) {
    const el = document.getElementById(id);   //cerca la frase da tradurere
    if (el) el.innerHTML = text;  //cambia il testo
  }
  
  const searchInput = document.getElementById('search-input');  //le barre di ricerca non hanno innerHTML quindi si fa cosi
  if (searchInput) {
    searchInput.placeholder = currentLang === 'IT' ? 'Cerca piatto o ingrediente...' : 'Search dish or ingredient...';
  }
};

// ============================================================================
// 3. GESTIONE AUTENTICAZIONE, ROUTE GUARD E MENU LATERALE
// ============================================================================
window.handleOrdersNav = function(event) {  //se non ce un token e tu accedi agli ordini , impedisci la navigazione e rimandi al login
  const token = localStorage.getItem('token');
  if (!token) {
    if (event) event.preventDefault();
    window.location.href = 'login.html?redirect=orders.html';
  }
};

window.renderDrawerAuth = function() {  //legge il token, ruolo nome utente e individua 2 eleemnti le statistiche e la sezione utente
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');
  const statsLink = document.getElementById('drawer-stats-link');

  if (statsLink) {
    if (role === 'restaurant') statsLink.classList.remove('d-none');
    else statsLink.classList.add('d-none'); //d-none di default, lo toglie o lo mette
  }

  if (!drawerSec) return; //se drawerSec non esiste allora va avanti ignorando l'if
  const isIt = currentLang === 'IT'; //se lenguage è !IT allora isIt è false, per cambiare testo piu avanti

  if (token) {  //utente loggato
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1 text-uppercase" style="font-size: 0.75rem;">
        ${isIt ? 'Accesso effettuato come:' : 'Logged in as:'}
      </div>
      <div class="fw-bold text-uppercase mb-3" style="font-family: 'Space Grotesk', sans-serif;">
        ${name} <span class="badge bg-black rounded-0 ms-1" style="font-size: 0.65rem;">${role}</span>
      </div>
      <a href="profile.html" class="btn btn-dark rounded-0 w-100 py-2 mb-2 fw-bold text-uppercase d-flex justify-content-between align-items-center" style="font-size: 0.8rem;">
        <span>${isIt ? 'Vedi il mio profilo' : 'View my profile'}</span>
        <i class="bi bi-arrow-right"></i>
      </a>
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm py-2 fw-bold text-uppercase" style="font-size: 0.75rem;" onclick="logout()">
        ${isIt ? 'Logout' : 'Logout'}
      </button>
    `;
  } else {  //utente non loggato
    drawerSec.innerHTML = ` 
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">
        ${isIt ? 'Accedi' : 'Login'}
      </a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">
        ${isIt ? 'Registrati' : 'Register'}
      </a>
    `;
  }
};

window.logout = function() {  //funzione logout che rimuove item da local storage e ritorna alla pagina iniziale
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
};

// ============================================================================
// 4. GESTIONE DEL CARRELLO GLOBALE
// ============================================================================
window.renderCartBadge = function() { //aggiorna nell'header il contatore dei piatti nel carrello
  let cart = JSON.parse(localStorage.getItem('cart')) || []; //prende il carrello e converte in JSON array, se non esiste (tipo primo accesso) allora null
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);  //reduce riduce un array  a un  numero, calcola la somma aggregata(non conta le righe) di elementi
  //es. ho pizza qty 2 e pasta qty 1 fa 2 + 1 tipo un ciclo, partendo da 0
  const badge = document.getElementById('cart-badge'); //prende il cart badge e aggiorna il dato
  if (badge) badge.textContent = count;
};

window.renderDrawerCartUI = function() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];  
  const container = document.getElementById('drawer-cart-items-container'); //schede prodotto
  const totalQtyEl = document.getElementById('drawer-cart-total-qty');  //pezzi ordinati 
  const subtotalEl = document.getElementById('drawer-cart-subtotal');
  
  const totalQty = cart.reduce((acc, i) => acc + (i.quantity || 1), 0); //trova la quantita dei piatti totale
  const subtotal = cart.reduce((acc, i) => acc + ((Number(i.price) || 0) * (i.quantity || 1)), 0);  //prezzo per quantità

  if (totalQtyEl) totalQtyEl.textContent = totalQty;  //aggiorna se esiste
  if (subtotalEl) subtotalEl.textContent = `€ ${subtotal.toFixed(2)}`; //aggiorna e fissa a 2 cifre decimali

  if (!container) return; //GUARDA CLAUSE: se la pagina non h il carrello esce senza generare errori

  if (cart.length === 0) {  //no elementi
    const msg = currentLang === 'IT' ? 'Il tuo carrello è vuoto.' : 'Your cart is empty.';
    container.innerHTML = `<div class="text-center py-5 text-muted small">${msg}</div>`;  
    return; //interrompe funzione
  }

  //scheda prodotto che trasforam ogni item del cart in una stringa HTML
  container.innerHTML = cart.map(item => `
    <div class="border border-dark p-2 bg-white d-flex align-items-center justify-content-between gap-2 mb-2">
      <img src="${item.thumb || ''}" alt="${item.name}" style="width: 45px; height: 45px; object-fit: cover;" class="border"> 
      <div class="flex-grow-1 text-truncate">
        <div class="fw-bold text-uppercase small text-truncate">${item.name}</div>
        <div class="text-muted" style="font-size: 0.7rem;">${item.restaurantName || 'Locale'}</div>
        <div class="font-monospace fw-bold text-dark" style="font-size: 0.8rem;">€ ${(Number(item.price) || 0).toFixed(2)}</div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQty('${item.id}', '${item.restaurantId}', -1)">-</button>
        <span class="font-monospace fw-bold px-1 small">${item.quantity}</span>
        <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQty('${item.id}', '${item.restaurantId}', 1)">+</button>
      </div>
    </div>
  `).join('');  //unisce array HTML in un0unica stringa continua da iniettaare
};

//manipola la quantità
window.modifyCartQty = function(id, restId, delta) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];  //prende array di items
  const item = cart.find(i => String(i.id) === String(id) && String(i.restaurantId) === String(restId));  //individua nel carrello gli item voluti
  if (!item) return; 

  item.quantity += delta; //+ O - QAULCHE NUMERO
  if (item.quantity <= 0) { //SE = 0 usa filter per rimuovere la voce dall'array, cioe crea un nuovo array cart con solo gli elemetni maggiori di 0
    cart = cart.filter(i => !(String(i.id) === String(id) && String(i.restaurantId) === String(restId)));
  }

  localStorage.setItem('cart', JSON.stringify(cart)); //trasforma in stringa e mette in localStorage
  renderCartBadge();  //invoca per aggiorrnare numerino
  renderDrawerCartUI(); //invoca per aggioranre subtotali ecc
};

window.clearCart = function() { //fa la clear del carrelo settando in local storage un array vuooto 
  localStorage.setItem('cart', '[]');
  renderCartBadge();
  renderDrawerCartUI();
};

// ============================================================================
// 5. HELPER DI INTERFACCIA
// ============================================================================
//slider scorrevole con mouse  per la barra categorie
window.setupBarMovement = function() {
  const slider = document.querySelector('.categories-bar-wrapper'); //seleziona la barra categorie
  if (!slider) return;

  slider.addEventListener('wheel', (e) => { //si mette in ascolto di quando la rotella del mouse è in funzione
    if (e.deltaY !== 0) { //rotellina mossa giu o su e di quanto es. -100 o +100
      e.preventDefault(); //blocca lo schemo 
      slider.scrollLeft += e.deltaY;  //converte i pixel verticali in movimento dentro la barra
    }
  }, { passive: false }); //obbligatorio per quando si usa preventDefualt

  let isDown = false; //true quando clicco tasto sinistroe
  let startX; //punto esatto in cui ho premuto il tasto tipo pixel 250 (solo cordinata x)
  let scrollLeft; //posizione iniziale della barra prima di cliccalre

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - slider.offsetLeft; //ottenuta sottrando alla posizione del cursore lo spazio a sinistra dello slider
    scrollLeft = slider.scrollLeft; 
  });

  slider.addEventListener('mouseleave', () => { isDown = false; }); //se l'utente esce dallo slider oppure non clicca isDown è false
  slider.addEventListener('mouseup', () => { isDown = false; });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;  //se non cliccci fa nulla
    e.preventDefault(); //blocca eventuali clic
    const x = e.pageX - slider.offsetLeft;  //dove mi trovo rispetto allo slider
    const walk = (x - startX) * 1.5;  //faccio posizione finale x meno poszione inziizale startX  e lo rendo fluido
    slider.scrollLeft = scrollLeft - walk; //contenuto spostato a destra
  });
};

// ============================================================================
// 6. INIZIALIZZAZIONE GLOBALE
// ============================================================================
//punto d'ingresso della intera pagina web
document.addEventListener('DOMContentLoaded', async () => { //async per usare awit, DOMContentListener avvisa che nessuno si deve  muvoere finche non carica tuitto
  await loadComponents(); //evoca la funzione che carica tutti i componenti
  
  renderGlobalLanguageUI();
  renderDrawerAuth();
  renderCartBadge();
  renderDrawerCartUI();
  setupBarMovement();
  //carica le funzioni di questo file

  document.dispatchEvent(new Event('componentsLoaded')); //nuovo evento che avverte diq uando il caricamento è finito
});