// public/js/register.js

let selectedRole = 'customer';

const i18n = {
  IT: {
    badgeAuth: 'CREA UN ACCOUNT',
    registerTitle: 'REGISTRATI',
    registerSub: 'Crea il tuo profilo cliente o unisciti come ristorante partner',
    lblRole: 'Tipologia Account',
    roleCustomer: 'CLIENTE',
    roleRestaurant: 'RISTORANTE',
    lblName: 'Nome Completo',
    lblSurname: 'Cognome',
    lblNameRest: 'Nome Referente',
    lblEmail: 'Indirizzo Email',
    lblPassword: 'Password (min. 6 caratteri)',
    lblFavCat: 'Piatto/Cucina Preferita',
    optFavNone: 'Nessuna preferenza specifica',
    lblPaymentMethod: 'Metodo di Pagamento Preferito',
    lblRestName: 'Nome del Locale / Ristorante',
    lblRestAddr: 'Indirizzo Ritiro Asporto',
    lblRestPhone: 'Recapito Telefonico',
    lblIva: 'Partita IVA',
    btnSubmit: 'CREA ACCOUNT',
    btnSubmitting: 'REGISTRAZIONE IN CORSO...',
    haveAccount: 'Hai già un account registrato?',
    goLogin: 'ACCEDI QUI →',
    errFillAll: 'Compila tutti i campi obbligatori.',
    errPassLen: 'La password deve contenere almeno 6 caratteri.',
    errRegister: 'Errore durante la registrazione. Riprova con un\'altra email.',
    successRegister: 'Account creato con successo! Accesso in corso...'
  },
  EN: {
    badgeAuth: 'CREATE AN ACCOUNT',
    registerTitle: 'REGISTER',
    registerSub: 'Create your customer profile or join as a partner restaurant',
    lblRole: 'Account Type',
    roleCustomer: 'CUSTOMER',
    roleRestaurant: 'RESTAURANT',
    lblName: 'Full Name',
    lblSurname: 'Surname',
    lblNameRest: 'Contact Person Name',
    lblEmail: 'Email Address',
    lblPassword: 'Password (min. 6 characters)',
    lblFavCat: 'Favorite Cuisine/Dish',
    optFavNone: 'No specific preference',
    lblPaymentMethod: 'Preferred Payment Method',
    lblRestName: 'Restaurant / Venue Name',
    lblRestAddr: 'Takeout Pickup Address',
    lblRestPhone: 'Phone Number',
    lblIva: 'VAT Number',
    btnSubmit: 'CREATE ACCOUNT',
    btnSubmitting: 'REGISTERING...',
    haveAccount: 'Already have an account?',
    goLogin: 'LOGIN HERE →',
    errFillAll: 'Please fill in all required fields.',
    errPassLen: 'Password must be at least 6 characters long.',
    errRegister: 'Error during registration. Please try with another email.',
    successRegister: 'Account created successfully! Logging you in...'
  }
};

// ============================================================================
// AVVIO: si aggancia all'evento sparato da utils.js dopo che header/footer/
// drawer/modali sono stati iniettati nella pagina
// ============================================================================
document.addEventListener('componentsLoaded', async () => {
  renderRegisterLanguageUI();
  await loadFavoriteCategories();
});

/**
 * Recupera le categorie reali dal backend (GET /api/meals/categories)
 * e popola dinamicamente la select "Piatto/Cucina Preferita".
 */
async function loadFavoriteCategories() {
  const select = document.getElementById('favoriteCategory');
  if (!select) return;

  try {
    const categories = await apiRequest('/meals/categories');

    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Errore nel caricamento delle categorie:', err);
    // Se la chiamata fallisce, la select resta con la sola opzione "Nessuna preferenza"
  }
}

/**
 * Applica le traduzioni specifiche di questa pagina.
 * Le traduzioni comuni (header, footer, drawer) sono già gestite da utils.js.
 */
function renderRegisterLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('txt-badge-auth', t.badgeAuth);
  setT('txt-register-title', t.registerTitle);
  setT('txt-register-sub', t.registerSub);
  setT('lbl-role', t.lblRole);
  setT('txt-role-customer', t.roleCustomer);
  setT('txt-role-restaurant', t.roleRestaurant);
  setT('lbl-name', selectedRole === 'restaurant' ? t.lblNameRest : t.lblName);
  setT('lbl-surname', t.lblSurname);
  setT('lbl-email', t.lblEmail);
  setT('lbl-password', t.lblPassword);
  setT('lbl-fav-cat', t.lblFavCat);
  setT('opt-fav-none', t.optFavNone);
  setT('lbl-payment-method', t.lblPaymentMethod);
  setT('lbl-rest-name', t.lblRestName);
  setT('lbl-rest-addr', t.lblRestAddr);
  setT('lbl-rest-phone', t.lblRestPhone);
  setT('lbl-iva', t.lblIva);
  setT('btn-submit-register', t.btnSubmit);
  setT('txt-have-account', t.haveAccount);
  setT('txt-go-login', t.goLogin);
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
  const paymentMethodInput = document.getElementById('paymentMethod');
  const restNameInput = document.getElementById('restaurantName');
  const restAddrInput = document.getElementById('restaurantAddress');
  const restPhoneInput = document.getElementById('restaurantPhone');
  const ivaInput = document.getElementById('IVAnumber');

  if (role === 'customer') {
    btnCust.className = 'btn btn-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    btnRest.className = 'btn btn-outline-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    custFields.classList.remove('d-none');
    restFields.classList.add('d-none');

    // Reset campi ristorante quando si passa a cliente
    if (restNameInput) { restNameInput.value = ''; restNameInput.required = false; }
    if (restAddrInput) { restAddrInput.value = ''; restAddrInput.required = false; }
    if (restPhoneInput) { restPhoneInput.value = ''; }
    if (ivaInput) { ivaInput.value = ''; }
  } else {
    btnRest.className = 'btn btn-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    btnCust.className = 'btn btn-outline-dark rounded-0 flex-grow-1 fw-bold small text-uppercase py-2';
    custFields.classList.add('d-none');
    restFields.classList.remove('d-none');

    // Reset preferenze cliente quando si passa a ristorante
    if (favCatInput) { favCatInput.value = ''; }
    if (paymentMethodInput) { paymentMethodInput.value = 'carta_credito'; }
    if (restNameInput) { restNameInput.required = true; }
    if (restAddrInput) { restAddrInput.required = true; }
  }

  renderRegisterLanguageUI();
}

/**
 * Invio form registrazione
 */
async function handleRegisterSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const alertBox = document.getElementById('register-alert');
  const submitBtn = document.getElementById('btn-submit-register');
  const t = i18n[currentLang];

  if (!name || !surname || !email || !password) {
    showAlert(alertBox, t.errFillAll, 'danger');
    return;
  }

  if (password.length < 6) {
    showAlert(alertBox, t.errPassLen, 'danger');
    return;
  }

  const payload = {
    name,
    surname,
    email,
    password,
    role: selectedRole
  };

  if (selectedRole === 'customer') {
    const favCat = document.getElementById('favoriteCategory').value;
    if (favCat) payload.favoriteCategory = favCat;

    const paymentMethod = document.getElementById('paymentMethod').value;
    if (paymentMethod) payload.paymentMethod = paymentMethod;
  } else if (selectedRole === 'restaurant') {
    const restName = document.getElementById('restaurantName').value.trim();
    const restAddr = document.getElementById('restaurantAddress').value.trim();
    const restPhone = document.getElementById('restaurantPhone').value.trim();
    const ivaNumber = document.getElementById('IVAnumber').value.trim();

    if (!restName || !restAddr) {
      showAlert(alertBox, t.errFillAll, 'danger');
      return;
    }

    payload.restaurantName = restName;
    payload.restaurantAddress = restAddr;
    if (restPhone) payload.restaurantPhone = restPhone;
    if (ivaNumber) payload.IVAnumber = ivaNumber;
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