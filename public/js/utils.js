// public/js/utils.js

// ============================================================================
// 1. CARICATORE DEI COMPONENTI HTML (Header, Footer, Modali, Drawer)
// ============================================================================
window.loadComponents = async function() {
  const components = [
    { id: 'app-header', url: 'components/header.html' },
    { id: 'app-footer', url: 'components/footer.html' },
    { id: 'app-drawer', url: 'components/drawer.html' },
    { id: 'app-modals', url: 'components/modals.html' }
  ];

  await Promise.all(components.map(async (comp) => {
    const element = document.getElementById(comp.id);
    if (element) {
      try {
        const response = await fetch(comp.url);
        if (response.ok) {
          element.innerHTML = await response.text();
        }
      } catch (error) {
        console.error(`Errore nel caricamento di ${comp.url}:`, error);
      }
    }
  }));

  // EVIDENZIATORE AUTOMATICO PAGINA ATTIVA NEL MENU LATERALE
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.drawer-nav-item');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
};

// ============================================================================
// 2. GESTIONE GLOBALE DELLA LINGUA (i18n)
// ============================================================================
let currentLang = localStorage.getItem('appLang') || 'IT';

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

window.toggleLanguage = function() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  
  renderGlobalLanguageUI();
  renderDrawerAuth();
  renderDrawerCartUI();
  
  if (typeof updateView === 'function') updateView();
  if (typeof renderMealsGrid === 'function') renderMealsGrid();
  if (typeof renderMenuGrid === 'function') renderMenuGrid();
};

window.renderGlobalLanguageUI = function() {
  const t = globalI18n[currentLang];
  for (const [id, text] of Object.entries(t)) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = text; 
  }
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.placeholder = currentLang === 'IT' ? 'Cerca piatto o ingrediente...' : 'Search dish or ingredient...';
  }
};

// ============================================================================
// 3. GESTIONE AUTENTICAZIONE, ROUTE GUARD E MENU LATERALE
// ============================================================================
window.handleOrdersNav = function(event) {
  const token = localStorage.getItem('token');
  if (!token) {
    if (event) event.preventDefault();
    window.location.href = 'login.html?redirect=orders.html';
  }
};

window.renderDrawerAuth = function() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');
  const statsLink = document.getElementById('drawer-stats-link');

  if (statsLink) {
    if (role === 'restaurant') statsLink.classList.remove('d-none');
    else statsLink.classList.add('d-none');
  }

  if (!drawerSec) return;
  const isIt = currentLang === 'IT';

  if (token) {
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
  } else {
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

window.logout = function() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
};

// ============================================================================
// 4. GESTIONE DEL CARRELLO GLOBALE
// ============================================================================
window.renderCartBadge = function() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
};

window.renderDrawerCartUI = function() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const container = document.getElementById('drawer-cart-items-container');
  const totalQtyEl = document.getElementById('drawer-cart-total-qty');
  const subtotalEl = document.getElementById('drawer-cart-subtotal');
  
  const totalQty = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const subtotal = cart.reduce((acc, i) => acc + ((Number(i.price) || 0) * (i.quantity || 1)), 0);

  if (totalQtyEl) totalQtyEl.textContent = totalQty;
  if (subtotalEl) subtotalEl.textContent = `€ ${subtotal.toFixed(2)}`;

  if (!container) return;

  if (cart.length === 0) {
    const msg = currentLang === 'IT' ? 'Il tuo carrello è vuoto.' : 'Your cart is empty.';
    container.innerHTML = `<div class="text-center py-5 text-muted small">${msg}</div>`;
    return;
  }

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
  `).join('');
};

window.modifyCartQty = function(id, restId, delta) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const item = cart.find(i => String(i.id) === String(id) && String(i.restaurantId) === String(restId));
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => !(String(i.id) === String(id) && String(i.restaurantId) === String(restId)));
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartBadge();
  renderDrawerCartUI();
};

window.clearCart = function() {
  localStorage.setItem('cart', '[]');
  renderCartBadge();
  renderDrawerCartUI();
};

// ============================================================================
// 5. HELPER DI INTERFACCIA
// ============================================================================
window.setupBarMovement = function() {
  const slider = document.querySelector('.categories-bar-wrapper');
  if (!slider) return;

  slider.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      slider.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });

  slider.addEventListener('mouseleave', () => { isDown = false; });
  slider.addEventListener('mouseup', () => { isDown = false; });

  slider.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5;
    slider.scrollLeft = scrollLeft - walk;
  });
};

// ============================================================================
// 6. INIZIALIZZAZIONE GLOBALE
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadComponents();
  
  renderGlobalLanguageUI();
  renderDrawerAuth();
  renderCartBadge();
  renderDrawerCartUI();
  setupBarMovement();

  document.dispatchEvent(new Event('componentsLoaded'));
});