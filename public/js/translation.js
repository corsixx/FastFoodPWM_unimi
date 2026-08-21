// public/js/translations.js

let currentLang = localStorage.getItem('appLang') || 'IT';

const translations = {
  IT: {
    langBtn: 'IT 🇮🇹',
    topAnnouncement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    heroBadge: 'CATALOGO PIATTI',
    heroCta: 'SCOPRI IL MENU COMPLETO →',
    recomHeading: 'SCELTI PER TE (IN BACHECA)',
    popularHeading: 'NEW IN / I PIÙ POPOLARI',
    viewAll: 'Vedi Tutto il Menu',
    allCategories: 'ALL / TUTTO',
    prepTime: 'prep',
    drawerCatalog: 'CATALOGO COMPLETO',
    drawerRestaurants: 'I NOSTRI RISTORANTI',
    drawerOrders: 'I MIEI ORDINI',
    drawerStats: 'STATISTICHE LOCALE',
    loginBtn: 'ACCEDI',
    regBtn: 'REGISTRATI',
    logoutBtn: 'LOGOUT',
    loggedInAs: 'ACCESSO EFFETTUATO COME:',
    footerService: 'SERVIZIO',
    footerHow: 'Come Ordinare',
    footerPickup: 'Ritiro al Bancone',
    footerWait: 'Tempi di Attesa',
    footerPartner: 'PARTNER',
    footerJoin: 'Diventa un Ristorante Partner',
    footerManage: 'Accedi al Gestionale',
    footerSupport: 'SUPPORTO',
    footerHelp: 'Contatta Assistenza',
    footerChat: 'Chat 24/7 Attiva',
    modalInfoTitle: 'Informazioni Servizio',
    modalInfoBody: 'Scegli i piatti dal menu, inoltra l\'ordine e ritira direttamente al punto cassa senza code.',
    modalLegalTitle: 'Termini & Note Legali',
    modalLegalBody: 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro su database.'
  },
  EN: {
    langBtn: 'EN 🇬🇧',
    topAnnouncement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    heroBadge: 'FULL CATALOG',
    heroCta: 'EXPLORE FULL MENU →',
    recomHeading: 'CHOSEN FOR YOU (RECOMMENDED)',
    popularHeading: 'NEW IN / MOST POPULAR',
    viewAll: 'View Full Menu',
    allCategories: 'ALL',
    prepTime: 'prep',
    drawerCatalog: 'FULL CATALOG',
    drawerRestaurants: 'OUR RESTAURANTS',
    drawerOrders: 'MY ORDERS',
    drawerStats: 'RESTAURANT STATS',
    loginBtn: 'LOGIN',
    regBtn: 'REGISTER',
    logoutBtn: 'LOGOUT',
    loggedInAs: 'LOGGED IN AS:',
    footerService: 'SERVICE',
    footerHow: 'How to Order',
    footerPickup: 'Counter Pickup',
    footerWait: 'Wait Times',
    footerPartner: 'PARTNER',
    footerJoin: 'Become a Partner Restaurant',
    footerManage: 'Access Dashboard',
    footerSupport: 'SUPPORT',
    footerHelp: 'Contact Support',
    footerChat: '24/7 Chat Active',
    modalInfoTitle: 'Service Information',
    modalInfoBody: 'Choose dishes from the menu, place your order and pick up at the checkout counter.',
    modalLegalTitle: 'Terms & Legal Notes',
    modalLegalBody: 'Secure platform protected by JWT authentication. User data and orders are stored securely in the database.'
  }
};

/**
 * Traduzione diretta e sicura di tutti i tag con data-i18n
 */
function applyLanguage(lang) {
  const dict = translations[lang] || translations.IT;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict && dict[key]) {
      // Se l'elemento contiene un'icona (es. nel drawer), preserva l'icona interna
      const icon = el.querySelector('i');
      if (icon) {
        el.innerHTML = `${dict[key]} ${icon.outerHTML}`;
      } else {
        el.innerHTML = dict[key];
      }
    }
  });

  const langBtn = document.getElementById('lang-current');
  if (langBtn && dict.langBtn) {
    langBtn.textContent = dict.langBtn;
  }
}

/**
 * Funzione trigger per il tasto lingua
 */
function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  
  applyLanguage(currentLang);
  
  if (typeof renderDrawerAuth === 'function') renderDrawerAuth();
  if (typeof loadCatalog === 'function') loadCatalog();
  if (typeof loadBackendCategories === 'function') loadBackendCategories();
}