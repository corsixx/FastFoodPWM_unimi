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

document.addEventListener('DOMContentLoaded', () => { //ascolta se l'evento di carimento dei html iniettati è finito
  // Se già loggato, reindirizza subito in base al ruolo
  const existingToken = localStorage.getItem('token');
  const existingRole = localStorage.getItem('userRole');
  if (existingToken) {  //se esiste token
    redirectUserByRole(existingRole); //ti redirige con una funzione in base al ruolo
    return;
  }

  renderLanguageUI(); //carica la ringua
  renderDrawerAuth(); //e la barra laterale
});

function toggleLanguage() {
  currentLang = (currentLang === 'IT') ? 'EN' : 'IT'; 
  localStorage.setItem('appLang', currentLang); //setta sulla local storage la lingua attuale
  renderLanguageUI();
  renderDrawerAuth();
}

function renderLanguageUI() { //stessa cosa in registrazione
  const t = i18n[currentLang];
  const setT = (id, text) => {  //prende id del testo da cambiare e quello nuovo da inserire
    const el = document.getElementById(id); //salva in el l'id da tradurre
    if (el) el.textContent = text;  //se el esiste allora carichi in textcontext text cioe carichi il testo da inserire nel testo di id
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
function togglePasswordVisibility(inputId, iconId) {  //STESSA COSA CHE IN REGISTER
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
  e.preventDefault(); //blocca comportamento di defualt del brawser che ricarica la pagina perdendo tutto

  const emailInput = document.getElementById('email');  //riga 70
  const passwordInput = document.getElementById('password');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('btn-submit-login');
  const t = i18n[currentLang]; 
  //salva in delle variabili i box delle varie cose

  const email = emailInput ? emailInput.value.trim() : '';  //taglia gli spazi bianchi
  const password = passwordInput ? passwordInput.value : '';  //prende il valore

  if (!email || !password) {  
    showAlert(alertBox, t.errFillAll, 'danger');
    return;
  }

  submitBtn.disabled = true;  //disabilita il bottone
  submitBtn.textContent = t.btnSubmitting;  //cambia testo

  try {
    //chiama la rotta post login
    const data = await apiRequest('/auth/login', 'POST', { email, password });

    if (!data || !data.token) { //se data è vuoto e non ce token lancia un errore
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

    showAlert(alertBox, t.loginSuccess, 'success'); //lascia una alertbox di successo

    setTimeout(() => {  //con successp  allora fa il redirect
      redirectUserByRole(data.role || (data.user && data.user.role));
    }, 800);

  } catch (err) {
    console.error('Errore Login:', err);
    showAlert(alertBox, err.message || t.errLogin, 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = t.btnSubmit;
  }
}

function showAlert(box, message, type) {  //STESSA COSA CHE IN REGISTER
  if (!box) return;
  box.className = `alert alert-${type} rounded-0 small py-2 px-3 mb-3`;
  box.textContent = message;
  box.classList.remove('d-none');
}

function redirectUserByRole(role) { //ti redireziona nel caso tu sia loggato con determinati ruoli
  if (role === 'restaurant') {
    window.location.href = 'stats.html';
  } else {
    window.location.href = 'catalog.html';
  }
}
