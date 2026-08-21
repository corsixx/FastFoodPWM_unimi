// public/js/login.js

let currentLang = localStorage.getItem('appLang') || 'IT';

const i18n = {
  IT: {
    btn: 'IT 🇮🇹',
    announcement: 'Supporto in Chat 24/7 • Ordini al Bancone & Asporto Rapido',
    badgeAuth: 'AUTENTICAZIONE',
    loginTitle: 'ACCEDI AL TUO ACCOUNT',
    loginSub: 'Inserisci le tue credenziali per ordinare o gestire il tuo locale',
    lblEmail: 'Indirizzo Email',
    lblPassword: 'Password',
    btnSubmit: 'ACCEDI',
    btnSubmitting: 'ACCESSO IN CORSO...',
    noAccount: 'Non hai ancora un account?',
    goRegister: 'REGISTRATI QUI →',
    errFillAll: 'Inserisci sia l\'email che la password.',
    errLogin: 'Credenziali non valide o errore del server.',
    loginSuccess: 'Accesso effettuato con successo! Reindirizzamento...',
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
    badgeAuth: 'AUTHENTICATION',
    loginTitle: 'LOGIN TO YOUR ACCOUNT',
    loginSub: 'Enter your credentials to place orders or manage your restaurant',
    lblEmail: 'Email Address',
    lblPassword: 'Password',
    btnSubmit: 'LOGIN',
    btnSubmitting: 'LOGGING IN...',
    noAccount: 'Don\'t have an account yet?',
    goRegister: 'REGISTER HERE →',
    errFillAll: 'Please enter both email and password.',
    errLogin: 'Invalid credentials or server error.',
    loginSuccess: 'Logged in successfully! Redirecting...',
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
  // Se già loggato, reindirizza subito in base al ruolo
  const existingToken = localStorage.getItem('token');
  const existingRole = localStorage.getItem('userRole');
  if (existingToken) {
    redirectUserByRole(existingRole);
    return;
  }

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
  setT('txt-login-title', t.loginTitle);
  setT('txt-login-sub', t.loginSub);
  setT('lbl-email', t.lblEmail);
  setT('lbl-password', t.lblPassword);
  setT('btn-submit-login', t.btnSubmit);
  setT('txt-no-account', t.noAccount);
  setT('txt-go-register', t.goRegister);

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
 * Gestione invio Form di Login
 */
async function handleLoginSubmit(e) {
  e.preventDefault();

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('btn-submit-login');
  const t = i18n[currentLang];

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!email || !password) {
    showAlert(alertBox, t.errFillAll, 'danger');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t.btnSubmitting;

  try {
    const data = await apiRequest('/auth/login', 'POST', { email, password });

    if (!data || !data.token) {
      throw new Error(data && data.message ? data.message : t.errLogin);
    }

    // Salvataggio dati di sessione
    localStorage.setItem('token', data.token);
    localStorage.setItem('userRole', data.role || (data.user && data.user.role) || 'customer');
    localStorage.setItem('userName', data.name || (data.user && (data.user.name || data.user.restaurantName)) || email);
    localStorage.setItem('userId', data.userId || (data.user && data.user._id) || '');
    if (data.restaurantName || (data.user && data.user.restaurantName)) {
      localStorage.setItem('restaurantName', data.restaurantName || data.user.restaurantName);
    }

    showAlert(alertBox, t.loginSuccess, 'success');

    setTimeout(() => {
      redirectUserByRole(data.role || (data.user && data.user.role));
    }, 800);

  } catch (err) {
    console.error('Errore Login:', err);
    showAlert(alertBox, err.message || t.errLogin, 'danger');
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

function redirectUserByRole(role) {
  if (role === 'restaurant') {
    window.location.href = 'stats.html';
  } else {
    window.location.href = 'catalog.html';
  }
}

function renderDrawerAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Utente';
  const drawerSec = document.getElementById('drawer-user-section');

  if (!drawerSec) return;

  const currentLang = localStorage.getItem('appLang') || 'IT';
  const isIt = currentLang === 'IT';

  // Se è un ristorante, rendiamo visibile il link alle statistiche/gestionale
  const statsLink = document.getElementById('drawer-stats-link');
  if (statsLink && role === 'restaurant') {
    statsLink.classList.remove('d-none');
  }

  if (token) {
    drawerSec.innerHTML = `
      <div class="small text-muted mb-1 text-uppercase" style="font-size: 0.75rem; letter-spacing: 0.05em;">
        ${isIt ? 'Accesso effettuato come:' : 'Logged in as:'}
      </div>
      <div class="fw-bold text-uppercase mb-3" style="font-family: 'Space Grotesk', sans-serif;">
        ${name} <span class="badge bg-black rounded-0 ms-1" style="font-size: 0.65rem;">${role}</span>
      </div>

      <!-- Tasto Vai al Profilo -->
      <a href="profile.html" class="btn btn-dark rounded-0 w-100 py-2 mb-2 fw-bold text-uppercase d-flex justify-content-between align-items-center" style="font-size: 0.8rem; letter-spacing: 0.05em;">
        <span>${isIt ? 'Vedi il mio profilo' : 'View my profile'}</span>
        <i class="bi bi-arrow-right"></i>
      </a>

      <!-- Tasto Logout -->
      <button class="btn btn-outline-dark rounded-0 w-100 btn-sm py-2 fw-bold text-uppercase" style="font-size: 0.75rem;" onclick="logout()">
        ${isIt ? 'Logout' : 'Logout'}
      </button>
    `;
  } else {
    drawerSec.innerHTML = `
      <a href="login.html" class="btn btn-dark rounded-0 w-100 mb-2 py-2 fw-bold text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.05em;">
        ${isIt ? 'Accedi' : 'Login'}
      </a>
      <a href="register.html" class="btn btn-outline-dark rounded-0 w-100 py-2 fw-bold text-uppercase" style="font-size: 0.8rem; letter-spacing: 0.05em;">
        ${isIt ? 'Registrati' : 'Register'}
      </a>
    `;
  }
}