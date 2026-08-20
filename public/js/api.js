// public/js/api.js

// Indirizzo base del backend Node.js
const BASE_URL = 'http://localhost:5000/api';

/**
 * Funzione centralizzata per eseguire tutte le chiamate API
 * @param {string} endpoint - Il percorso della rotta (es. '/meals', '/orders')
 * @param {string} method - Metodo HTTP: 'GET', 'POST', 'PATCH', 'DELETE', 'PUT'
 * @param {object|null} bodyData - Dati JSON da inviare nel corpo della richiesta
 */
async function apiRequest(endpoint, method = 'GET', bodyData = null) {
  // Recupera il token salvato al momento del login
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json'
  };

  // Se l'utente è autenticato, allega automaticamente il Bearer Token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  // Se ci sono dati da inviare (POST/PATCH/PUT), serializzali in formato JSON
  if (bodyData) {
    options.body = JSON.stringify(bodyData);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    // Se lo status code HTTP non è nel range 200-299, lancia un'eccezione
    if (!response.ok) {
      throw new Error(data.message || 'Errore durante la comunicazione con il server.');
    }

    return data;
  } catch (error) {
    console.error(`Errore chiamata API [${method} ${endpoint}]:`, error.message);
    throw error;
  }
}

/**
 * Funzione globale per disconnettere l'utente
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('cart');
  window.location.href = 'index.html';
}