// public/js/api.js

const BASE_URL = 'http://localhost:5000/api';

/**
 * Esegue le chiamate alle API aggiungendo il token JWT in automatico se presente.
 * Supporta sia apiData(endpoint, method, bodyData) sia apiData(endpoint, optionsObject).
 */
async function apiRequest(endpoint, methodOrOptions = 'GET', bodyData = null) {
  const token = localStorage.getItem('token');

  let method = 'GET';
  let customHeaders = {};
  let customBody = bodyData;

  // Se il secondo parametro è un oggetto di configurazione (es. { method: 'POST', body: ... })
  if (typeof methodOrOptions === 'object' && methodOrOptions !== null) {
    method = methodOrOptions.method || 'GET';
    customHeaders = methodOrOptions.headers || {};
    if (methodOrOptions.body) {
      customBody = methodOrOptions.body;
    }
  } else {
    method = methodOrOptions;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  // Se il body è già una stringa JSON la usa, altrimenti la converte
  if (customBody) {
    options.body = (typeof customBody === 'string') ? customBody : JSON.stringify(customBody);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    // Controlla se la risposta è vuota (es. 204 No Content)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

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
 * Rimuove i dati di sessione ed effettua il logout
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('cart');
  window.location.href = 'index.html';
}