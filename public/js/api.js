// public/js/api.js

// URL base delle tue rotte backend
const BASE_URL = '/api';

/**
 * Funzione centralizzata per eseguire chiamate HTTP con gestione automatica del Token JWT
 */
async function apiRequest(endpoint, method = 'GET', bodyData = null) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json'
  };

  // Se l'utente è loggato, inserisce il Bearer Token nell'header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (bodyData) {
    options.body = JSON.stringify(bodyData);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Errore durante la richiesta al server');
    }

    return data;
  } catch (error) {
    console.error(`Errore API [${method} ${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Gestione dello stato di autenticazione nella Navbar
 */
function updateNavbar() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');

  const authNav = document.getElementById('auth-nav-items');
  if (!authNav) return;

  if (token) {
    // Utente loggato
    let extraLink = '';
    if (userRole === 'restaurant') {
      extraLink = `
        <li class="nav-item"><a class="nav-link text-light" href="orders.html">Comande Cucina</a></li>
        <li class="nav-item"><a class="nav-link text-light" href="stats.html">Statistiche</a></li>
      `;
    } else {
      extraLink = `
        <li class="nav-item"><a class="nav-link text-light" href="orders.html">I Miei Ordini</a></li>
      `;
    }

    authNav.innerHTML = `
      ${extraLink}
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle text-light" href="#" role="button" data-bs-toggle="dropdown">
          Ciao, <strong>${userName || 'Utente'}</strong>
        </a>
        <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
          <li><a class="dropdown-item text-danger" href="#" onclick="logout()">Disconnetti</a></li>
        </ul>
      </li>
    `;
  } else {
    // Utente ospite / non autenticato
    authNav.innerHTML = `
      <li class="nav-item"><a class="nav-link text-light" href="login.html">Accedi</a></li>
      <li class="nav-item"><a class="btn btn-accent btn-sm ms-2" href="register.html">Registrati</a></li>
    `;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
}

// Inizializza la navbar al caricamento di ogni pagina
document.addEventListener('DOMContentLoaded', updateNavbar);