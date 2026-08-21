// public/js/profile.js

let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentLang = localStorage.getItem('appLang') || 'IT';
let currentUserRole = 'customer';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgeProfile: 'AREA PERSONALE',
    profileTitle: 'GESTISCI PROFILO',
    lblName: 'Nome Completo / Referente',
    lblEmail: 'Indirizzo Email',
    lblFavCat: 'Piatto/Cucina Preferita (Bacheca)',
    optFavNone: 'Nessuna preferenza specifica',
    lblRestName: 'Nome del Locale / Ristorante',
    lblRestAddr: 'Indirizzo Ritiro Asporto',
    lblRestPhone: 'Recapito Telefonico',
    btnSaveProfile: 'SALVA MODIFICHE',
    btnSaving: 'SALVATAGGIO...',
    payTitle: 'METODO DI PAGAMENTO',
    paySub: 'Inserisci o aggiorna la tua carta con rilevamento automatico del circuito.',
    lblCardHolder: 'Intestatario Carta',
    lblCardNum: 'Numero Carta',
    lblCardExp: 'Scadenza (MM/AA)',
    lblCardCvv: 'CVV',
    btnSaveCard: 'SALVA CARTA',
    cardSavedSuccess: 'Carta salvata con successo!',
    cardRemovedSuccess: 'Carta rimossa dal profilo.',
    errCardInvalid: 'Inserisci tutti i dati della carta in formato valido.',
    pwdTitle: 'SICUREZZA & PASSWORD',
    lblCurrPwd: 'Password Attuale',
    lblNewPwd: 'Nuova Password (min. 6 caratteri)',
    btnSavePwd: 'AGGIORNA PASSWORD',
    successProfile: 'Profilo aggiornato con successo!',
    successPwd: 'Password modificata con successo!',
    errLoad: 'Impossibile caricare i dati del profilo.',
    errSave: 'Errore durante il salvataggio dei dati.',
    dCatalog: 'CATALOGO COMPLETO',
    dRestaurants: 'I NOSTRI RISTORANTI',
    dOrders: 'I MIEI ORDINI',
    dStats: 'STATISTICHE LOCALE',
    login: 'ACCEDI',
    register: 'REGISTRATI',
    logout: 'LOGOUT',
    loggedAs: 'ACCESSO EFFETTUATO COME:',
    fService: 'SERVIZIO',
    fHow: 'Come Ordinare',
    fPickup: 'Ritiro al Bancone',
    fPartner: 'PARTNER',
    fJoin: 'Diventa un Ristorante Partner',
    fManage: 'Accedi al Gestionale',
    fSupport: 'SUPPORTO',
    fContact: 'Contatta Assistenza',
    fChat: 'Chat 24/7 Attiva',
    mInfoTitle: 'Informazioni Servizio',
    mInfoBody: 'Scegli i piatti dal menu, inoltra l\'ordine e ritira direttamente al punto cassa senza code.',
    mLegalTitle: 'Termini & Note Legali',
    mLegalBody: 'Piattaforma protetta con autenticazione JWT. Tutti i dati degli utenti e gli ordini sono gestiti in modo sicuro su database.'
  },
  EN: {
    btn: 'EN 🇬🇧',
    announcement: '24/7 Live Chat Support • Counter Pickup & Express Takeout',
    badgeProfile: 'PERSONAL AREA',
    profileTitle: 'MANAGE PROFILE',
    lblName: 'Full Name / Contact Person',
    lblEmail: 'Email Address',
    lblFavCat: 'Favorite Cuisine/Dish (Recommendations)',
    optFavNone: 'No specific preference',
    lblRestName: 'Restaurant / Venue Name',
    lblRestAddr: 'Takeout Pickup Address',
    lblRestPhone: 'Phone Number',
    btnSaveProfile: 'SAVE CHANGES',
    btnSaving: 'SAVING...',
    payTitle: 'PAYMENT METHOD',
    paySub: 'Enter or update your card with automatic brand detection.',
    lblCardHolder: 'Cardholder Name',
    lblCardNum: 'Card Number',
    lblCardExp: 'Expiry (MM/YY)',
    lblCardCvv: 'CVV',
    btnSaveCard: 'SAVE CARD',
    cardSavedSuccess: 'Card saved successfully!',
    cardRemovedSuccess: 'Card removed from profile.',
    errCardInvalid: 'Please enter valid card details.',
    pwdTitle: 'SECURITY & PASSWORD',
    lblCurrPwd: 'Current Password',
    lblNewPwd: 'New Password (min. 6 characters)',
    btnSavePwd: 'UPDATE PASSWORD',
    successProfile: 'Profile updated successfully!',
    successPwd: 'Password updated successfully!',
    errLoad: 'Unable to load profile data.',
    errSave: 'Error saving profile data.',
    dCatalog: 'FULL CATALOG',
    dRestaurants: 'OUR RESTAURANTS',
    dOrders: 'MY ORDERS',
    dStats: 'RESTAURANT STATS',
    login: 'LOGIN',
    register: 'REGISTER',
    logout: 'LOGOUT',
    loggedAs: 'LOGGED IN AS:',
    fService: 'SERVICE',
    fHow: 'How to Order',
    fPickup: 'Counter Pickup',
    fPartner: 'PARTNER',
    fJoin: 'Become a Partner Restaurant',
    fManage: 'Access Dashboard',
    fSupport: 'SUPPORT',
    fContact: 'Contact Support',
    fChat: '24/7 Chat Active',
    mInfoTitle: 'Service Information',
    mInfoBody: 'Choose dishes from the menu, place your order and pick up at the checkout counter.',
    mLegalTitle: 'Terms & Legal Notes',
    mLegalBody: 'Secure platform protected by JWT authentication. User data and orders are stored securely in database.'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  renderLanguageUI();
  renderCartBadge();
  loadUserProfile();
  initCardLiveBindings();
  renderSavedCard();
  renderDrawerAuth();
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT';
  localStorage.setItem('appLang', currentLang);
  renderLanguageUI();
  renderDrawerAuth();
}

function renderLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('lang-btn', t.btn);
  setT('txt-announcement', t.announcement);
  setT('txt-badge-profile', t.badgeProfile);
  setT('txt-profile-title', t.profileTitle);
  setT('lbl-name', currentUserRole === 'restaurant' ? t.lblName : t.lblName);
  setT('lbl-email', t.lblEmail);
  setT('lbl-fav-cat', t.lblFavCat);
  setT('opt-fav-none', t.optFavNone);
  setT('lbl-rest-name', t.lblRestName);
  setT('lbl-rest-addr', t.lblRestAddr);
  setT('lbl-rest-phone', t.lblRestPhone);
  setT('btn-save-profile', t.btnSaveProfile);

  setT('txt-pay-title', t.payTitle);
  setT('txt-pay-sub', t.paySub);
  setT('lbl-card-holder', t.lblCardHolder);
  setT('lbl-card-num', t.lblCardNum);
  setT('lbl-card-exp', t.lblCardExp);
  setT('lbl-card-cvv', t.lblCardCvv);
  setT('btn-save-card', t.btnSaveCard);

  setT('txt-pwd-title', t.pwdTitle);
  setT('lbl-curr-pwd', t.lblCurrPwd);
  setT('lbl-new-pwd', t.lblNewPwd);
  setT('btn-save-pwd', t.btnSavePwd);

  setT('txt-f-service', t.fService);
  setT('txt-f-how', t.fHow);
  setT('txt-f-pickup', t.fPickup);
  setT('txt-f-partner', t.fPartner);
  setT('txt-f-join', t.fJoin);
  setT('txt-f-manage', t.fManage);
  setT('txt-f-support', t.fSupport);
  setT('txt-f-contact', t.fContact);
  setT('txt-f-chat', t.fChat);
  setT('txt-m-info-title', t.mInfoTitle);
  setT('txt-m-info-body', t.mInfoBody);
  setT('txt-m-legal-title', t.mLegalTitle);
  setT('txt-m-legal-body', t.mLegalBody);

  setT('txt-d-catalog', t.dCatalog);
  setT('txt-d-restaurants', t.dRestaurants);
  setT('txt-d-orders', t.dOrders);
  setT('txt-d-stats', t.dStats);
}

/**
 * Rilevamento Circuito Carta da BIN
 */
function detectCardBrand(numberClean) {
  if (/^4/.test(numberClean)) {
    return { name: 'VISA', icon: 'bi-credit-card-2-front', label: 'VISA 💳' };
  } else if (/^(5[1-5]|2[2-7])/.test(numberClean)) {
    return { name: 'MASTERCARD', icon: 'bi-credit-card-fill', label: 'MASTERCARD 🔴🟠' };
  } else if (/^3[47]/.test(numberClean)) {
    return { name: 'AMEX', icon: 'bi-credit-card', label: 'AMEX 🔵' };
  } else if (/^(50|5[6-8]|6)/.test(numberClean)) {
    return { name: 'MAESTRO', icon: 'bi-credit-card-2-back', label: 'MAESTRO 🔴🔵' };
  }
  return { name: 'GENERIC', icon: 'bi-credit-card-2-front', label: 'CARD' };
}

/**
 * Binding Formattazione & Aggiornamento Live Carta Virtuale
 */
function initCardLiveBindings() {
  const numInput = document.getElementById('cardNumber');
  const holderInput = document.getElementById('cardHolder');
  const expInput = document.getElementById('cardExpiry');

  const liveNum = document.getElementById('live-card-num');
  const liveHolder = document.getElementById('live-card-holder');
  const liveExp = document.getElementById('live-card-exp');
  const liveBrand = document.getElementById('live-card-brand');
  const brandBadge = document.getElementById('card-type-badge');
  const brandAddon = document.getElementById('brand-addon-icon');

  // 1. Numero Carta + Riconoscimento Brand
  if (numInput) {
    numInput.addEventListener('input', (e) => {
      let raw = e.target.value.replace(/\D/g, '');
      if (raw.length > 16) raw = raw.substring(0, 16);

      // Formatta con spazi
      const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
      e.target.value = formatted;

      // Aggiorna anteprima
      liveNum.textContent = formatted || '•••• •••• •••• ••••';

      // Riconosci Circuito
      const brand = detectCardBrand(raw);
      liveBrand.innerHTML = `<span style="font-size: 0.9rem; font-weight: 800;">${brand.name !== 'GENERIC' ? brand.name : ''}</span> <i class="bi ${brand.icon}"></i>`;
      if (brandBadge) brandBadge.textContent = brand.label;
      if (brandAddon) brandAddon.innerHTML = `<i class="bi ${brand.icon}"></i>`;
    });
  }

  // 2. Intestatario
  if (holderInput) {
    holderInput.addEventListener('input', (e) => {
      liveHolder.textContent = e.target.value.toUpperCase() || 'NOME COGNOME';
    });
  }

  // 3. Scadenza
  if (expInput) {
    expInput.addEventListener('input', (e) => {
      let raw = e.target.value.replace(/\D/g, '');
      if (raw.length >= 3) {
        raw = raw.substring(0, 2) + '/' + raw.substring(2, 4);
      }
      e.target.value = raw;
      liveExp.textContent = raw || 'MM/AA';
    });
  }
}

/**
 * Caricamento Profilo da Backend / Sessione
 */
async function loadUserProfile() {
  const alertBox = document.getElementById('profile-alert');
  const t = i18n[currentLang];

  try {
    let userData = null;
    try {
      userData = await apiRequest('/auth/me');
    } catch (e) {
      userData = {
        name: localStorage.getItem('userName'),
        email: localStorage.getItem('userEmail') || '',
        role: localStorage.getItem('userRole') || 'customer',
        favoriteCategory: localStorage.getItem('userFavCat') || '',
        restaurantName: localStorage.getItem('restaurantName') || '',
        restaurantAddress: localStorage.getItem('restaurantAddress') || '',
        restaurantPhone: localStorage.getItem('restaurantPhone') || ''
      };
    }

    if (!userData) throw new Error(t.errLoad);

    currentUserRole = userData.role || 'customer';
    const roleBadge = document.getElementById('user-role-badge');
    if (roleBadge) roleBadge.textContent = currentUserRole.toUpperCase();

    document.getElementById('name').value = userData.name || '';
    document.getElementById('email').value = userData.email || '';

    const custFields = document.getElementById('customer-profile-fields');
    const restFields = document.getElementById('restaurant-profile-fields');
    const payCard = document.getElementById('payment-methods-card');

    if (currentUserRole === 'restaurant') {
      if (restFields) restFields.classList.remove('d-none');
      if (custFields) custFields.classList.add('d-none');
      if (payCard) payCard.classList.add('d-none');
      document.getElementById('restaurantName').value = userData.restaurantName || '';
      document.getElementById('restaurantAddress').value = userData.restaurantAddress || '';
      document.getElementById('restaurantPhone').value = userData.restaurantPhone || '';
    } else {
      if (custFields) custFields.classList.remove('d-none');
      if (restFields) restFields.classList.add('d-none');
      if (payCard) payCard.classList.remove('d-none');
      document.getElementById('favoriteCategory').value = userData.favoriteCategory || '';
    }

  } catch (err) {
    showAlert(alertBox, t.errLoad, 'danger');
  }
}

/**
 * Salvataggio Profilo
 */
async function handleProfileUpdate(e) {
  e.preventDefault();

  const alertBox = document.getElementById('profile-alert');
  const submitBtn = document.getElementById('btn-save-profile');
  const t = i18n[currentLang];

  const payload = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim()
  };

  if (currentUserRole === 'restaurant') {
    payload.restaurantName = document.getElementById('restaurantName').value.trim();
    payload.restaurantAddress = document.getElementById('restaurantAddress').value.trim();
    payload.restaurantPhone = document.getElementById('restaurantPhone').value.trim();
  } else {
    payload.favoriteCategory = document.getElementById('favoriteCategory').value;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t.btnSaving;

  try {
    await apiRequest('/auth/profile', 'PUT', payload);

    localStorage.setItem('userName', payload.name);
    if (payload.favoriteCategory !== undefined) localStorage.setItem('userFavCat', payload.favoriteCategory);
    if (payload.restaurantName) localStorage.setItem('restaurantName', payload.restaurantName);

    showAlert(alertBox, t.successProfile, 'success');
    submitBtn.disabled = false;
    submitBtn.textContent = t.btnSaveProfile;
    renderDrawerAuth();

  } catch (err) {
    showAlert(alertBox, err.message || t.errSave, 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = t.btnSaveProfile;
  }
}

/**
 * Salvataggio & Rendering Carta Salvata
 */
function renderSavedCard() {
  const saved = JSON.parse(localStorage.getItem('savedPaymentMethod'));
  const removeBtn = document.getElementById('btn-remove-card');

  if (saved && saved.last4) {
    document.getElementById('cardHolder').value = saved.holder || '';
    document.getElementById('cardNumber').value = `•••• •••• •••• ${saved.last4}`;
    document.getElementById('cardExpiry').value = saved.expiry || '';

    document.getElementById('live-card-holder').textContent = (saved.holder || 'NOME COGNOME').toUpperCase();
    document.getElementById('live-card-num').textContent = `•••• •••• •••• ${saved.last4}`;
    document.getElementById('live-card-exp').textContent = saved.expiry || 'MM/AA';
    
    const brand = detectCardBrand(saved.brandName || saved.last4);
    document.getElementById('live-card-brand').innerHTML = `<span style="font-size: 0.9rem; font-weight: 800;">${saved.brandName || ''}</span> <i class="bi bi-credit-card-2-front"></i>`;

    if (removeBtn) removeBtn.classList.remove('d-none');
  } else {
    if (removeBtn) removeBtn.classList.add('d-none');
  }
}

function handlePaymentSave(e) {
  e.preventDefault();

  const holder = document.getElementById('cardHolder').value.trim();
  const numRaw = document.getElementById('cardNumber').value.replace(/\D/g, '');
  const exp = document.getElementById('cardExpiry').value.trim();
  const alertBox = document.getElementById('payment-alert');
  const t = i18n[currentLang];

  if (!holder || numRaw.length < 15 || exp.length < 5) {
    showAlert(alertBox, t.errCardInvalid, 'danger');
    return;
  }

  const brand = detectCardBrand(numRaw);
  const paymentData = {
    holder: holder.toUpperCase(),
    last4: numRaw.slice(-4),
    expiry: exp,
    brandName: brand.name
  };

  localStorage.setItem('savedPaymentMethod', JSON.stringify(paymentData));
  showAlert(alertBox, t.cardSavedSuccess, 'success');
  renderSavedCard();
}

function removeSavedPaymentMethod() {
  localStorage.removeItem('savedPaymentMethod');
  const alertBox = document.getElementById('payment-alert');
  const t = i18n[currentLang];

  document.getElementById('payment-form').reset();
  document.getElementById('live-card-holder').textContent = 'NOME COGNOME';
  document.getElementById('live-card-num').textContent = '•••• •••• •••• ••••';
  document.getElementById('live-card-exp').textContent = 'MM/AA';
  document.getElementById('live-card-brand').innerHTML = '<i class="bi bi-credit-card-2-front"></i>';

  showAlert(alertBox, t.cardRemovedSuccess, 'info');
  renderSavedCard();
}

/**
 * Cambio Password
 */
async function handlePasswordUpdate(e) {
  e.preventDefault();

  const alertBox = document.getElementById('pwd-alert');
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const t = i18n[currentLang];

  if (newPassword.length < 6) {
    showAlert(alertBox, 'La nuova password deve essere di almeno 6 caratteri.', 'danger');
    return;
  }

  try {
    await apiRequest('/auth/password', 'PUT', { currentPassword, newPassword });
    showAlert(alertBox, t.successPwd, 'success');
    document.getElementById('password-form').reset();
  } catch (err) {
    showAlert(alertBox, err.message || 'Errore durante il cambio password.', 'danger');
  }
}

function togglePasswordVisibility(inputId, iconId) {
  const pwdInput = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!pwdInput || !icon) return;

  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    icon.classList.replace('bi-eye', 'bi-eye-slash');
  } else {
    pwdInput.type = 'password';
    icon.classList.replace('bi-eye-slash', 'bi-eye');
  }
}

function showAlert(box, message, type) {
  if (!box) return;
  box.className = `alert alert-${type} rounded-0 small py-2 px-3 mb-4`;
  box.textContent = message;
  box.classList.remove('d-none');
}

function renderCartBadge() {
  const count = cart.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const badge = document.getElementById('cart-badge');
  if (badge) badge.textContent = count;
}

function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName');
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;

  const t = i18n[currentLang];

  if (role === 'restaurant') {
    const statsLink = document.getElementById('drawer-stats-link');
    if (statsLink) statsLink.classList.remove('d-none');
  }

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1">${t.loggedAs}</div>
      <div class="fw-bold text-uppercase mb-3">${name || 'Utente'} (${role})</div>
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm" onclick="logout()">${t.logout}</button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${t.login}</a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem;">${t.register}</a>
    `;
  }
}