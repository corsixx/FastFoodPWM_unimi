// public/js/register.js

let selectedRole = 'customer';
let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgeAuth: 'CREA UN ACCOUNT',
    registerTitle: 'REGISTRATI',
    registerSub: 'Crea il tuo profilo cliente o unisciti come ristorante partner',
    lblRole: 'Tipologia Account',
    roleCustomer: 'CLIENTE',
    roleRestaurant: 'RISTORANTE',
    lblName: 'Nome Completo',
    lblNameRest: 'Nome Referente',
    lblEmail: 'Indirizzo Email',
    lblPassword: 'Password (min. 6 caratteri)',
    lblFavCat: 'Piatto/Cucina Preferita',
    optFavNone: 'Nessuna preferenza specifica',
    lblRestName: 'Nome del Locale / Ristorante',
    lblRestAddr: 'Indirizzo Ritiro Asporto',
    lblRestPhone: 'Recapito Telefonico',
    btnSubmit: 'CREA ACCOUNT',
    btnSubmitting: 'REGISTRAZIONE IN CORSO...',
    haveAccount: 'Hai già un account registrato?',
    goLogin: 'ACCEDI QUI →',
    errFillAll: 'Compila tutti i campi obbligatori.',
    errPassLen: 'La password deve contenere almeno 6 caratteri.',
    errRegister: 'Errore durante la registrazione. Riprova con un\'altra email.',
    successRegister: 'Account creato con successo! Accesso in corso...',
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
    badgeAuth: 'CREATE AN ACCOUNT',
    registerTitle: 'REGISTER',
    registerSub: 'Create your customer profile or join as a partner restaurant',
    lblRole: 'Account Type',
    roleCustomer: 'CUSTOMER',
    roleRestaurant: 'RESTAURANT',
    lblName: 'Full Name',
    lblNameRest: 'Contact Person Name',
    lblEmail: 'Email Address',
    lblPassword: 'Password (min. 6 characters)',
    lblFavCat: 'Favorite Cuisine/Dish',
    optFavNone: 'No specific preference',
    lblRestName: 'Restaurant / Venue Name',
    lblRestAddr: 'Takeout Pickup Address',
    lblRestPhone: 'Phone Number',
    btnSubmit: 'CREATE ACCOUNT',
    btnSubmitting: 'REGISTERING...',
    haveAccount: 'Already have an account?',
    goLogin: 'LOGIN HERE →',
    errFillAll: 'Please fill in all required fields.',
    errPassLen: 'Password must be at least 6 characters long.',
    errRegister: 'Error during registration. Please try with another email.',
    successRegister: 'Account created successfully! Logging you in...',
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
  renderLanguageUI();
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
  setT('txt-badge-auth', t.badgeAuth);
  setT('txt-register-title', t.registerTitle);
  setT('txt-register-sub', t.registerSub);
  setT('lbl-role', t.lblRole);
  setT('txt-role-customer', t.roleCustomer);
  setT('txt-role-restaurant', t.roleRestaurant);
  setT('lbl-name', selectedRole === 'restaurant' ? t.lblNameRest : t.lblName);
  setT('lbl-email', t.lblEmail);
  setT('lbl-password', t.lblPassword);
  setT('lbl-fav-cat', t.lblFavCat);
  setT('opt-fav-none', t.optFavNone);
  setT('lbl-rest-name', t.lblRestName);
  setT('lbl-rest-addr', t.lblRestAddr);
  setT('lbl-rest-phone', t.lblRestPhone);
  setT('btn-submit-register', t.btnSubmit);
  setT('txt-have-account', t.haveAccount);
  setT('txt-go-login', t.goLogin);

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
 * Mostra / Nasconde la password al clic
 */
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

/**
 * Gestione switch ruolo
 */
function setRole(role) {
  selectedRole = role;

  const btnCust = document.getElementById('btn-role-customer');
  const btnRest = document.getElementById('btn-role-restaurant');
  const custFields = document.getElementById('customer-fields');
  const restFields = document.getElementById('restaurant-fields');
  
  const favCatInput = document.getElementById('favoriteCategory');
  const restNameInput = document.getElementById('restaurantName');
  const restAddrInput = document.getElementById('restaurantAddress');
  const restPhoneInput = document.getElementById('restaurantPhone');

  if (role === 'customer') {
    btnCust.className = 'btn btn-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    btnRest.className = 'btn btn-outline-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    custFields.classList.remove('d-none');
    restFields.classList.add('d-none');

    // Reset campi ristorante quando si passa a cliente
    if (restNameInput) { restNameInput.value = ''; restNameInput.required = false; }
    if (restAddrInput) { restAddrInput.value = ''; restAddrInput.required = false; }
    if (restPhoneInput) { restPhoneInput.value = ''; }
  } else {
    btnRest.className = 'btn btn-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    btnCust.className = 'btn btn-outline-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    custFields.classList.add('d-none');
    restFields.classList.remove('d-none');

    // Reset preferenza cliente quando si passa a ristorante
    if (favCatInput) { favCatInput.value = ''; }
    if (restNameInput) { restNameInput.required = true; }
    if (restAddrInput) { restAddrInput.required = true; }
  }

  renderLanguageUI();
}

/**
 * Invio form registrazione
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const alertBox = document.getElementById('register-alert');
  const submitBtn = document.getElementById('btn-submit-register');
  const t = i18n[currentLang];

  if (!name || !email || !password) {
    showAlert(alertBox, t.errFillAll, 'danger');
    return;
  }

  if (password.length < 6) {
    showAlert(alertBox, t.errPassLen, 'danger');
    return;
  }

  const payload = {
    name,
    email,
    password,
    role: selectedRole
  };

  if (selectedRole === 'customer') {
    const favCat = document.getElementById('favoriteCategory').value;
    if (favCat) payload.favoriteCategory = favCat;
  } else if (selectedRole === 'restaurant') {
    const restName = document.getElementById('restaurantName').value.trim();
    const restAddr = document.getElementById('restaurantAddress').value.trim();
    const restPhone = document.getElementById('restaurantPhone').value.trim();

    if (!restName || !restAddr) {
      showAlert(alertBox, t.errFillAll, 'danger');
      return;
    }

    payload.restaurantName = restName;
    payload.restaurantAddress = restAddr;
    if (restPhone) payload.restaurantPhone = restPhone;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t.btnSubmitting;

  try {
    const data = await apiRequest('/auth/register', 'POST', payload);

    if (!data) {
      throw new Error(t.errRegister);
    }

    showAlert(alertBox, t.successRegister, 'success');

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role || (data.user && data.user.role) || selectedRole);
      localStorage.setItem('userName', data.name || (data.user && (data.user.name || data.user.restaurantName)) || name);
      localStorage.setItem('userId', data.userId || (data.user && data.user._id) || '');
      if (data.restaurantName || (data.user && data.user.restaurantName)) {
        localStorage.setItem('restaurantName', data.restaurantName || data.user.restaurantName);
      }

      setTimeout(() => {
        if (selectedRole === 'restaurant') {
          window.location.href = 'stats.html';
        } else {
          window.location.href = 'catalog.html';
        }
      }, 1000);
    } else {
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    }

  } catch (err) {
    console.error('Errore Registrazione:', err);
    showAlert(alertBox, err.message || t.errRegister, 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = t.btnSubmit;
  }
}

function showAlert(box, message, type) {
  if (!box) return;
  box.className = `alert alert-${type} rounded-0 small py-2 px-3 mb-3`;
  box.textContent = message;
  box.classList.remove('d-none');
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