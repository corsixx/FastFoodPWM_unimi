// public/js/profile.js

let currentUserRole = 'customer';

const i18n = {
  IT: {
    badgeProfile: 'AREA PERSONALE',
    profileTitle: 'GESTISCI PROFILO',
    lblName: 'Nome Completo / Referente',
    lblEmail: 'Indirizzo Email',
    lblFavCat: 'Piatto/Cucina Preferita (Bacheca)',
    optFavNone: 'Nessuna preferenza specifica',
    lblPaymentMethod: 'Metodo di Pagamento Preferito',
    lblRestName: 'Nome del Locale / Ristorante',
    lblRestAddr: 'Indirizzo Ritiro Asporto',
    lblRestPhone: 'Recapito Telefonico',
    lblIva: 'Partita IVA',
    btnSaveProfile: 'SALVA MODIFICHE',
    btnSaving: 'SALVATAGGIO...',
    pwdTitle: 'SICUREZZA & PASSWORD',
    lblCurrPwd: 'Password Attuale',
    lblNewPwd: 'Nuova Password (min. 6 caratteri)',
    btnSavePwd: 'AGGIORNA PASSWORD',
    btnSavingPwd: 'AGGIORNAMENTO...',
    dangerTitle: 'ZONA PERICOLOSA',
    dangerSub: 'Eliminando l\'account perderai definitivamente l\'accesso e tutti i dati associati (ordini, preferenze, menu). L\'operazione non è reversibile.',
    dangerConfirmLabel: 'Digita ELIMINA per confermare la cancellazione definitiva dell\'account:',
    errDeleteConfirmText: 'Devi digitare ELIMINA esattamente per confermare.',
    successProfile: 'Profilo aggiornato con successo!',
    successPwd: 'Password modificata con successo!',
    errPwdMismatchLen: 'La nuova password deve essere di almeno 6 caratteri.',
    errPwdSave: 'Errore durante il cambio password.',
    errLoad: 'Impossibile caricare i dati del profilo.',
    errSave: 'Errore durante il salvataggio dei dati.',
    accountDeleted: 'Account eliminato. Verrai reindirizzato alla home...'
  },
  EN: {
    badgeProfile: 'PERSONAL AREA',
    profileTitle: 'MANAGE PROFILE',
    lblName: 'Full Name / Contact Person',
    lblEmail: 'Email Address',
    lblFavCat: 'Favorite Cuisine/Dish (Recommendations)',
    optFavNone: 'No specific preference',
    lblPaymentMethod: 'Preferred Payment Method',
    lblRestName: 'Restaurant / Venue Name',
    lblRestAddr: 'Takeout Pickup Address',
    lblRestPhone: 'Phone Number',
    lblIva: 'VAT Number',
    btnSaveProfile: 'SAVE CHANGES',
    btnSaving: 'SAVING...',
    pwdTitle: 'SECURITY & PASSWORD',
    lblCurrPwd: 'Current Password',
    lblNewPwd: 'New Password (min. 6 characters)',
    btnSavePwd: 'UPDATE PASSWORD',
    btnSavingPwd: 'UPDATING...',
    dangerTitle: 'DANGER ZONE',
    dangerSub: 'Deleting your account permanently removes your access and all associated data (orders, preferences, menu). This action cannot be undone.',
    dangerConfirmLabel: 'Type DELETE to confirm permanent account deletion:',
    errDeleteConfirmText: 'You must type DELETE exactly to confirm.',
    successProfile: 'Profile updated successfully!',
    successPwd: 'Password updated successfully!',
    errPwdMismatchLen: 'The new password must be at least 6 characters long.',
    errPwdSave: 'Error changing password.',
    errLoad: 'Unable to load profile data.',
    errSave: 'Error saving profile data.',
    accountDeleted: 'Account deleted. Redirecting to home...'
  }
};

// ============================================================================
// AVVIO: aspetta che utils.js abbia iniettato header/footer/drawer
// ============================================================================
document.addEventListener('componentsLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  renderProfileLanguageUI();
  await loadFavoriteCategories();
  await loadUserProfile();
});

/**
 * Traduzioni specifiche di questa pagina (header/footer/drawer sono già
 * gestiti globalmente da utils.js).
 */
function renderProfileLanguageUI() {
  const t = i18n[currentLang];
  const setT = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setT('txt-badge-profile', t.badgeProfile);
  setT('txt-profile-title', t.profileTitle);
  setT('lbl-name', t.lblName);
  setT('lbl-email', t.lblEmail);
  setT('lbl-fav-cat', t.lblFavCat);
  setT('opt-fav-none', t.optFavNone);
  setT('lbl-payment-method', t.lblPaymentMethod);
  setT('lbl-rest-name', t.lblRestName);
  setT('lbl-rest-addr', t.lblRestAddr);
  setT('lbl-rest-phone', t.lblRestPhone);
  setT('lbl-iva', t.lblIva);
  setT('btn-save-profile', t.btnSaveProfile);

  setT('txt-pwd-title', t.pwdTitle);
  setT('lbl-curr-pwd', t.lblCurrPwd);
  setT('lbl-new-pwd', t.lblNewPwd);
  setT('btn-save-pwd', t.btnSavePwd);

  setT('txt-danger-title', t.dangerTitle);
  setT('txt-danger-sub', t.dangerSub);
  setT('txt-danger-confirm-label', t.dangerConfirmLabel);
}

/**
 * Recupera le categorie reali dal backend e popola la select preferenze.
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
  }
}

/**
 * Caricamento Profilo da Backend (GET /api/auth/me)
 */
async function loadUserProfile() {
  const alertBox = document.getElementById('profile-alert');
  const t = i18n[currentLang];

  try {
    const userData = await apiRequest('/auth/me');
    if (!userData) throw new Error(t.errLoad);

    currentUserRole = userData.role || 'customer';
    const roleBadge = document.getElementById('user-role-badge');
    if (roleBadge) roleBadge.textContent = currentUserRole.toUpperCase();

    document.getElementById('name').value = userData.name || '';
    document.getElementById('email').value = userData.email || '';

    const custFields = document.getElementById('customer-profile-fields');
    const restFields = document.getElementById('restaurant-profile-fields');

    if (currentUserRole === 'restaurant') {
      if (restFields) restFields.classList.remove('d-none');
      if (custFields) custFields.classList.add('d-none');
      document.getElementById('restaurantName').value = userData.restaurantName || '';
      document.getElementById('restaurantAddress').value = userData.restaurantAddress || '';
      document.getElementById('restaurantPhone').value = userData.restaurantPhone || '';
      document.getElementById('IVAnumber').value = userData.IVAnumber || '';
    } else {
      if (custFields) custFields.classList.remove('d-none');
      if (restFields) restFields.classList.add('d-none');
      document.getElementById('favoriteCategory').value = userData.favoriteCategory || '';
      // Mostra il metodo di pagamento attualmente salvato, con fallback su carta_credito
      document.getElementById('paymentMethod').value = userData.paymentMethod || 'carta_credito';
    }

  } catch (err) {
    console.error('Errore caricamento profilo:', err);
    showAlert(alertBox, t.errLoad, 'danger');
  }
}

/**
 * Salvataggio Profilo (PUT /api/auth/me - endpoint corretto)
 */
async function handleProfileUpdate(e) {
  e.preventDefault();

  const alertBox = document.getElementById('profile-alert');
  const submitBtn = document.getElementById('btn-save-profile');
  const t = i18n[currentLang];

  const payload = {
    name: document.getElementById('name').value.trim()
  };

  if (currentUserRole === 'restaurant') {
    payload.restaurantName = document.getElementById('restaurantName').value.trim();
    payload.restaurantAddress = document.getElementById('restaurantAddress').value.trim();
    payload.restaurantPhone = document.getElementById('restaurantPhone').value.trim();
    payload.IVAnumber = document.getElementById('IVAnumber').value.trim();
  } else {
    payload.favoriteCategory = document.getElementById('favoriteCategory').value;
    payload.paymentMethod = document.getElementById('paymentMethod').value;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t.btnSaving;

  try {
    // Endpoint corretto: PUT /auth/me (prima puntava erroneamente a /auth/profile)
    await apiRequest('/auth/me', 'PUT', payload);

    localStorage.setItem('userName', payload.name);
    if (payload.restaurantName) localStorage.setItem('restaurantName', payload.restaurantName);

    showAlert(alertBox, t.successProfile, 'success');
    renderDrawerAuth();

  } catch (err) {
    console.error('Errore salvataggio profilo:', err);
    showAlert(alertBox, err.message || t.errSave, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t.btnSaveProfile;
  }
}

/**
 * Cambio Password (PUT /api/auth/password - ora esiste anche lato backend)
 */
async function handlePasswordUpdate(e) {
  e.preventDefault();

  const alertBox = document.getElementById('pwd-alert');
  const submitBtn = document.getElementById('btn-save-pwd');
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const t = i18n[currentLang];

  if (newPassword.length < 6) {
    showAlert(alertBox, t.errPwdMismatchLen, 'danger');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = t.btnSavingPwd;

  try {
    await apiRequest('/auth/password', 'PUT', { currentPassword, newPassword });
    showAlert(alertBox, t.successPwd, 'success');
    document.getElementById('password-form').reset();
  } catch (err) {
    console.error('Errore cambio password:', err);
    showAlert(alertBox, err.message || t.errPwdSave, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t.btnSavePwd;
  }
}

/**
 * Mostra/nasconde la password digitata nei campi
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

// ============================================================================
// ELIMINAZIONE ACCOUNT (DELETE /api/auth/me - già esistente sul backend)
// ============================================================================

/**
 * Passo 1: mostra il box di conferma testuale
 */
function showDeleteConfirmation() {
  document.getElementById('delete-confirm-box').classList.remove('d-none');
  document.getElementById('btn-delete-account-start').classList.add('d-none');
  document.getElementById('delete-confirm-input').value = '';
  document.getElementById('delete-confirm-input').focus();
}

/**
 * Annulla la richiesta di eliminazione e richiude il box
 */
function hideDeleteConfirmation() {
  document.getElementById('delete-confirm-box').classList.add('d-none');
  document.getElementById('btn-delete-account-start').classList.remove('d-none');
  const alertBox = document.getElementById('delete-alert');
  if (alertBox) alertBox.classList.add('d-none');
}

/**
 * Passo 2: verifica che l'utente abbia digitato "ELIMINA" e, solo in quel
 * caso, invia la richiesta DELETE al backend.
 */
async function handleDeleteAccount() {
  const alertBox = document.getElementById('delete-alert');
  const t = i18n[currentLang];
  const confirmInput = document.getElementById('delete-confirm-input').value.trim();
  const expectedWord = currentLang === 'IT' ? 'ELIMINA' : 'DELETE';

  if (confirmInput.toUpperCase() !== expectedWord) {
    showAlert(alertBox, t.errDeleteConfirmText, 'danger');
    return;
  }

  const confirmBtn = document.getElementById('btn-delete-account-confirm');
  confirmBtn.disabled = true;

  try {
    await apiRequest('/auth/me', 'DELETE');
    showAlert(alertBox, t.accountDeleted, 'success');

    setTimeout(() => {
      localStorage.clear();
      window.location.href = 'index.html';
    }, 1500);

  } catch (err) {
    console.error('Errore eliminazione account:', err);
    showAlert(alertBox, err.message || 'Errore durante l\'eliminazione dell\'account.', 'danger');
    confirmBtn.disabled = false;
  }
}

function showAlert(box, message, type) {
  if (!box) return;
  box.className = `alert alert-${type} rounded-0 small py-2 px-3 mb-4`;
  box.textContent = message;
  box.classList.remove('d-none');
}