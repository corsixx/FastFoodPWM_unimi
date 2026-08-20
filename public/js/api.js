const BASE_URL = 'http://localhost:5000/api';

/**
 * Esegue le chiamate alle API aggiungendo il token JWT in automatico se presente
 */
async function apiRequest(endpoint, method = 'GET', bodyData = null) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json'
  };

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