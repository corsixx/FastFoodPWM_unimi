// public/js/api.js
//centralizziamo uttte le chiamate all'API BACKEND
const BASE_URL = 'http://localhost:5000/api';

/**
 * Esegue le chiamate alle API aggiungendo il token JWT in automatico se presente.
 * Supporta sia apiData(endpoint, method, bodyData) sia apiData(endpoint, optionsObject).
 */
async function apiRequest(endpoint, methodOrOptions = 'GET', bodyData = null) { //se non specificati valgono cosi
//endpoint viene attaccato dopo il base url
  const token = localStorage.getItem('token');

  let method = 'GET';
  let customHeaders = {}; //metadati come token o formato
  let customBody = bodyData;  //body è dove salviamo i dati tipo mail passwrod ecc

  // Se il secondo parametro è un oggetto di configurazione (es. { method: 'POST', body: ... }) quindi nn è una seplice parola come POST
  if (typeof methodOrOptions === 'object' && methodOrOptions !== null) {
    method = methodOrOptions.method || 'GET'; //estrare la proprietà method e la mette in method
    customHeaders = methodOrOptions.headers || {};
    if (methodOrOptions.body) {
      customBody = methodOrOptions.body;
    }
  } else {
    method = methodOrOptions;
  }

  const headers = {
    'Content-Type': 'application/json', //dati sottoforma di json
    ...customHeaders  //unisce eventauali hader personalizzati
  };

  if (token) {  //se token esiste aggiunge l'oggetto autorizzazione  con lo schema bearer <JWT>
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { //oggetto standard passato alla funzione di fetch(), istruzioni accessorie 
    method,
    headers
  };

  // Se il body è già una stringa JSON la usa, altrimenti la converte
  if (customBody) {
    options.body = (typeof customBody === 'string') ? customBody : JSON.stringify(customBody);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);  //richiesta HTTP all'url salavata in response
    
    // Controlla se la risposta è vuota (es. 204 No Content)
    const text = await response.text(); //scarica il corpo della rispsota
    const data = text ? JSON.parse(text) : {};  // se txt vuoto oggetto vuoto oppure li trasforma in un oggetto array utilizzabile

    if (!response.ok) { //risposta diversa da numeri da 200 a 299
      throw new Error(data.message || 'Errore durante la comunicazione con il server.');
    }

    return data; //dati decodificati restituti a chi ha chimato
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