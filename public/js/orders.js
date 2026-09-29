// public/js/orders.js
//abbiamo quindi rendercheckout view e renderhistory view che renderizzano la grafica mentre loadOrederHistory carica lo storico
let activeTab = 'history'; 
let ordersList = [];
let userProfile = null;
let ordersPollingInterval = null;

document.addEventListener('componentsLoaded', async () => {
  const token = localStorage.getItem('token'); 
  const role = localStorage.getItem('userRole');

  if (!token) {
    window.location.href = 'login.html?redirect=orders.html'; //redirezione a login
    return;
  }

  const viewBadge = document.getElementById('orders-view-badge'); //riga 19 badge area riservata
  const viewTitle = document.getElementById('orders-view-title'); //titolo
  const btnCheckoutTxt = document.getElementById('txt-tab-checkout'); //tab cassa e checkout 27
  const btnHistoryTxt = document.getElementById('txt-tab-history'); //tab storico
  const iconCheckout = document.querySelector('#tab-btn-checkout i'); //seleziona l'icona interna tag identro il primo pulsante
  const isIt = currentLang === 'IT';

  if (role === 'restaurant') {
    if (viewBadge) viewBadge.textContent = isIt ? 'AREA GESTIONALE' : 'DASHBOARD';
    if (viewTitle) viewTitle.textContent = isIt ? 'COMANDE & STORICO' : 'ORDERS & HISTORY';
    
    if (btnCheckoutTxt) btnCheckoutTxt.textContent = isIt ? 'Comande in Corso' : 'Active Orders';
    if (btnHistoryTxt) btnHistoryTxt.textContent = isIt ? 'Ordini Completati' : 'Completed Orders';
    if (iconCheckout) iconCheckout.className = 'bi bi-fire me-1'; 
    //cambia la pagina per i ristoratori
    activeTab = 'active'; //comande attive in lavorazione
    
    document.getElementById('view-checkout')?.classList.add('d-none');  //opearatore ? se esiste
    document.getElementById('view-history')?.classList.remove('d-none');
    
    document.getElementById('tab-btn-checkout')?.classList.replace('btn-outline-dark', 'btn-dark'); //evidenza il comando comande attive
    document.getElementById('tab-btn-history')?.classList.replace('btn-dark', 'btn-outline-dark');  //ordini completati come disattivo

  } else {
    await fetchUserProfile(); //funzione per recueprare il profilo utente dal backedn
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');  //prende il carrello
    if (cart.length > 0) {
      activeTab = 'checkout';
    } else {
      activeTab = 'history';
    }
    switchOrdersTab(activeTab); //riga 85
  } //cliente checkout e history ristorante active hsitory

  await loadOrdersHistory();  //riga 249

  // Polling automatico silenzioso ogni 5 secondi per aggiornare stati e tempi coda in tempo reale
  if (ordersPollingInterval) clearInterval(ordersPollingInterval);  //se cera gia polling attivo lo distrugge
  ordersPollingInterval = setInterval(async () => { //risetta il polling a 5 ms
    await loadOrdersHistory(true); //mopdalita sileziosa
  }, 5000);
});

window.addEventListener('beforeunload', () => {
  if (ordersPollingInterval) clearInterval(ordersPollingInterval);  //Si mette in ascolto dell'evento beforeunload, cancella il timer con clearInterval
}); //beforeunload scatenato quando l'utente chiude la scheda o cambia pagina

async function fetchUserProfile() {
  try {
    const res = await apiRequest('/auth/me'); //get per prendere le mie info
    if (res && res.user) {
      userProfile = res.user;
    } else if (res) {
      userProfile = res;
    } //normalizzazione
  } catch (err) { //non fa crushare lo script
    userProfile = {
      preferredPaymentMethod: localStorage.getItem('userPaymentMethod') || 'carta_credito'
    };
  }
}

window.updateView = function() {  //aggiornamento vista
  const role = localStorage.getItem('userRole');
  if (role !== 'restaurant') renderCheckoutView();  //ridisegna il checkout e storico ordini per il customer
  renderHistoryView();  //riga 261
};

window.switchOrdersTab = function(tabName) {  //riga 48 accetta la nuova pagina
  const role = localStorage.getItem('userRole');
  const viewCheckout = document.getElementById('view-checkout');
  const viewHistory = document.getElementById('view-history');
  const btnCheckout = document.getElementById('tab-btn-checkout');
  const btnHistory = document.getElementById('tab-btn-history');
  //prende le box e i tasti
  activeTab = tabName;  //la mette in active tab

  if (role === 'restaurant') {
    if (tabName === 'checkout' || tabName === 'active') {
      activeTab = 'active'; //mette comande attive
      btnCheckout?.classList.replace('btn-outline-dark', 'btn-dark'); //evidenza i pulsanti e spegne quello non utilizzato
      btnHistory?.classList.replace('btn-dark', 'btn-outline-dark');
    } else {
      activeTab = 'history';  //o storico
      btnHistory?.classList.replace('btn-outline-dark', 'btn-dark');
      btnCheckout?.classList.replace('btn-dark', 'btn-outline-dark');
    }
    renderHistoryView();  //disegna lo storico e comande attive 261
    return;
  }

  if (tabName === 'checkout') {
    viewCheckout?.classList.remove('d-none'); //fa rivedere il checkout
    viewHistory?.classList.add('d-none'); //nasconde storico
    btnCheckout?.classList.replace('btn-outline-dark', 'btn-dark');
    btnHistory?.classList.replace('btn-dark', 'btn-outline-dark');
    renderCheckoutView(); //123 popola la lista piatti
  } else {
    viewCheckout?.classList.add('d-none');  
    viewHistory?.classList.remove('d-none');
    btnHistory?.classList.replace('btn-outline-dark', 'btn-dark');
    btnCheckout?.classList.replace('btn-dark', 'btn-outline-dark');
    renderHistoryView();
  }
};

function renderCheckoutView() { //costruisce la schemata di riepilogo del ccarrello per il cliente
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const listContainer = document.getElementById('checkout-items-list'); //riga 49
  const restNameEl = document.getElementById('checkout-restaurant-name'); //riga 61
  const totalItemsEl = document.getElementById('checkout-total-items'); //riga 85
  const totalTimeEl = document.getElementById('checkout-total-time'); //riga 89
  const finalPriceEl = document.getElementById('checkout-final-price'); //riga 93
  const submitBtn = document.getElementById('btn-submit-order');  //riga 97
  const paymentSelect = document.getElementById('order-payment-method');  //riga 72
  const isIt = currentLang === 'IT';
  //recupera elementi testo

  if (!listContainer) return; //se non esiste

  if (cart.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-5 text-muted small">
        <i class="bi bi-cart-x fs-2 d-block mb-2"></i>
        ${isIt ? 'Il carrello è attualmente vuoto.' : 'Your cart is currently empty.'}
      </div>
    `;
    if (restNameEl) restNameEl.textContent = '---';
    if (totalItemsEl) totalItemsEl.textContent = '0';
    if (totalTimeEl) totalTimeEl.textContent = '0 min';
    if (finalPriceEl) finalPriceEl.textContent = '€ 0.00';
    if (submitBtn) submitBtn.disabled = true;
    return;
  } //se non ci sono articoli azzera tutto e disabilita il pulsante di inoltro

  if (submitBtn) submitBtn.disabled = false;  //riabilita 

  if (paymentSelect && !paymentSelect.dataset.userModified) { //Controlla se la tendina del metodo di pagamento esiste e se l'utente non l'ha ancora toccata manualmente
    const defaultMethod = userProfile?.preferredPaymentMethod || userProfile?.paymentMethod || 'carta_credito'; //prende il metodo di defualt
    paymentSelect.value = defaultMethod;
    paymentSelect.addEventListener('change', () => { paymentSelect.dataset.userModified = 'true'; }, { once: true }); //aggiunge un listener che permetet di "salvare" il metodo di poagamento nonstante venga riavviata la funzione
  }

  const totalItems = cart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0); //somma le quantita di tutti i piatti
  const totalPrice = cart.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);  //moltiplica prezzo per quantita per ogni meals nel carrello
  const maxPrepTime = Math.max(...cart.map(i => Number(i.preparationTime) || 15));  //trova il massimo tempo di prep 
  const primaryRestName = cart[0].restaurantName || 'Ristorante Partner';

  if (restNameEl) restNameEl.textContent = primaryRestName;
  if (totalItemsEl) totalItemsEl.textContent = totalItems;
  if (totalTimeEl) totalTimeEl.textContent = `${maxPrepTime} min`;
  if (finalPriceEl) finalPriceEl.textContent = `€ ${totalPrice.toFixed(2)}`;
  //aggiorna tutti i campi

  listContainer.innerHTML = cart.map(item => {  //rendering righe prodotto
    const itemPrice = Number(item.price) || 0;
    const itemQty = Number(item.quantity) || 1;
    return `
      <div class="border border-dark p-2 d-flex align-items-center justify-content-between gap-3 bg-light">
        <img src="${item.thumb || ''}" alt="${item.name}" style="width: 55px; height: 55px; object-fit: cover;" class="border">
        <div class="flex-grow-1 text-truncate">
          <div class="fw-bold text-uppercase small text-truncate">${item.name}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${item.restaurantName || ''}</div>
          <div class="font-monospace fw-bold text-dark">€ ${(itemPrice * itemQty).toFixed(2)}</div>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQtyAndUpdate('${item.id}', '${item.restaurantId}', -1)">-</button>
          <span class="font-monospace fw-bold px-2">${itemQty}</span>
          <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQtyAndUpdate('${item.id}', '${item.restaurantId}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');  //fa le box pe rogni prodotto nel carrello da mettere in list container
}

window.modifyCartQtyAndUpdate = function(id, restId, delta) { //messa nelle box dei prodotti +-
  modifyCartQty(id, restId, delta); //aggiorna con delta da utils.js
  renderCheckoutView(); //aggiorna il render dei prodotti nel carrello
};

window.clearCartAndRefresh = function() {
  clearCart();  //sempre di utils
  renderCheckoutView(); //aggiorna il render dei prodotti nel carrello
};

window.submitOrder = async function() { //invio dell'ordine al db
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const isIt = currentLang === 'IT';

  if (cart.length === 0) return;

  const firstRestId = cart[0].restaurantId; //prende il rest id del primo ristorante del carrello
  const hasMixedRestaurants = cart.some(item => item.restaurantId && item.restaurantId !== firstRestId);  //ontrollara se esiste anche solo un elemento con un restaurantId differente.
  
  if (hasMixedRestaurants) {
    alert(isIt ? 'Ordina da un solo locale per volta.' : 'Please order from a single restaurant at a time.');
    return;
  }

  const paymentSelect = document.getElementById('order-payment-method');
  const selectedPayment = paymentSelect ? paymentSelect.value : 'carta_credito';  //estrae metodo di pagamento
  const submitBtn = document.getElementById('btn-submit-order');  

  const payload = {
    restaurantId: firstRestId,
    paymentMethod: selectedPayment,
    items: cart.map(i => ({ mealId: i.id, quantity: Number(i.quantity) || 1 }))
  };  //nel payload mette metodo i pgamento restauratn ID e array con mappatura mealID quantità

  try {
    if (submitBtn) {
      submitBtn.disabled = true;  //disabilita il submit
      submitBtn.innerHTML = `<span>${isIt ? 'INOLTRO...' : 'SUBMITTING...'}</span> <div class="spinner-border spinner-border-sm"></div>`; //modifica il testo
    }

    const res = await apiRequest('/orders', { method: 'POST', body: JSON.stringify(payload) }); //manda la post del con l'ordine

    if (res) {
      clearCart();  //pulisce il carrello
      await loadOrdersHistory();  //scarica elennco ordini aggioranto
      switchOrdersTab('history'); //cambia a storico ordini
      const waitTime = res.estimatedWaitTimeMinutes || 15;
      alert(isIt ? `Ordine inviato con successo!\nTempo stimato totale con coda: ${waitTime} min.` : `Order placed!\nTotal estimated wait with queue: ${waitTime} min.`);
    }
  } catch (err) {
    alert(isIt ? 'Errore invio: ' + err.message : 'Error: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span id="txt-co-submit-btn">${isIt ? 'INVIA ORDINE AL BANCONE' : 'SUBMIT ORDER'}</span> <i class="bi bi-arrow-right"></i>`;
    }
  }
};

async function loadOrdersHistory(isSilent = false) {  //carica lo storico ordini
  try {
    const role = localStorage.getItem('userRole');
    const endpoint = (role === 'restaurant') ? '/orders/restaurant-orders' : '/orders/my-orders'; //seleziona o la rotta dello storico ristoranti o per veder ei miii ordini
    const data = await apiRequest(endpoint);  //manda la richiesta api
    ordersList = Array.isArray(data) ? data : (data.orders || []);  //normalizzazione
    renderHistoryView();  //renderizza lo storico
  } catch (err) {
    if (!isSilent) console.error('Errore recupero storico ordini:', err); //se issilent false quando la funzione non è chiamta dall'autopolling
  }
}

function renderHistoryView() {
  const container = document.getElementById('orders-history-container');  //recupera il container principale dove vegnono inietttate le scehde degli ordini
  const noOrdersMsg = document.getElementById('no-orders-msg'); //elemento che vine mpostratto quando non ci sono ordini
  const isIt = currentLang === 'IT';
  const role = localStorage.getItem('userRole');

  if (!container) return;

  let displayList = ordersList; //copia in displaylist
  if (role === 'restaurant') {  //divide gli ordini in base alla scheda aperta
    displayList = ordersList.filter(o => {
      const currentStatus = (o.status || '').toLowerCase().trim();  //salva lo stato dell'ordine
      if (activeTab === 'active') {
        return currentStatus !== 'consegnato';  //se è nella scehda attivi mette ordini non cosegnati
      } else {
        return currentStatus === 'consegnato';
      }
    });
  }

  if (displayList.length === 0) { //se non ci sono ordini
    if (noOrdersMsg) {
      noOrdersMsg.classList.remove('d-none');
      const titleEl = document.getElementById('txt-no-orders-title');
      const subEl = document.getElementById('txt-no-orders-sub');
      const btnEl = document.getElementById('txt-no-orders-btn'); //mostra il no ordersmessag
      
      if (role === 'restaurant') {
        titleEl.textContent = isIt ? 'NESSUNA COMANDA' : 'NO ORDERS';
        subEl.textContent = activeTab === 'active'  //se nella tab actgive mostra nessuna comanda
          ? (isIt ? 'La cucina è libera!' : 'Kitchen is clear!')
          : (isIt ? 'Nessun ordine completato finora.' : 'No completed orders yet.');
        if (btnEl) btnEl.classList.add('d-none');
      } else {
        titleEl.textContent = isIt ? 'NESSUN ORDINE TROVATO' : 'NO ORDERS FOUND'; //altrimenti nessun ordine trovato
        subEl.textContent = isIt ? 'Non hai ancora effettuato nessun ordine.' : 'You haven\'t placed any orders yet.';
        if (btnEl) btnEl.classList.remove('d-none');
      }
    }
    container.innerHTML = ''; //svoa container
    return;
  }

  if (noOrdersMsg) noOrdersMsg.classList.add('d-none'); //se la lista ha qualche roba dentro nasconde il messaggio

  container.innerHTML = displayList.map(order => {  //per ogni rodine
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString(isIt ? 'it-IT' : 'en-GB') : '---'; //formatta data
    const total = (Number(order.totalAmount) || 0).toFixed(2);  //totale prezzo
    const status = (order.status || 'ordinato').toLowerCase().trim(); //status
    const restName = order.restaurant?.restaurantName || order.restaurant?.name || 'Ristorante Partner';  //nome reistorante
    const customerName = order.customer ? `${order.customer.name || ''} ${order.customer.surname || ''}`.trim() || order.customer.email : 'Cliente';  //nome cosumer

    let paymentLabel = '💳 Carta di Credito';
    if (order.paymentMethod === 'carta_prepagata') paymentLabel = '💳 Carta Prepagata';
    if (order.paymentMethod === 'contanti') paymentLabel = '💵 Contanti al Ritiro';

    let badgeClass = 'bg-secondary';  //assegna i clori corrispodenti allo stato
    if (status === 'ordinato') badgeClass = 'bg-warning text-dark';
    if (status === 'in preparazione') badgeClass = 'bg-primary';
    if (status === 'in consegna') badgeClass = 'bg-info text-dark';
    if (status === 'consegnato') badgeClass = 'bg-success';

    const items = Array.isArray(order.items) ? order.items : [];  //capsice si itesm è calido
    const isCompleted = status === 'consegnato';  //capisce se l'ordine p chisuo
    
    // Tempo ricalcolato dinamicamente dalla coda reale del backend
    const waitVal = order.currentWaitMinutes !== undefined 
      ? order.currentWaitMinutes 
      : (order.estimatedWaitTimeMinutes || 15);

    const waitDisplay = isCompleted 
      ? (isIt ? 'RITIRATO AL BANCONE ✓' : 'PICKED UP ✓') 
      : `${waitVal} min`; //minuti residui se non è stato ritirato al bancone

    let actionButtons = '';
    
    if (role === 'restaurant') {
      if (status === 'ordinato') {  // Se ordinato, mostra il tasto per avviare la preparazione in cucina
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-end align-items-center">
            <button type="button" class="btn btn-outline-primary btn-sm rounded-0 fw-bold text-uppercase" onclick="updateOrderStatus('${order._id}', 'in preparazione')">
              Inizia Cottura (In Prep.) 👨‍🍳
            </button>
          </div>
        `;
      } else if (status === 'in preparazione') {  // Se in preparazione, mostra il tasto per portarlo pronto al bancone
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-end align-items-center gap-2">
            <button type="button" class="btn btn-info btn-sm rounded-0 fw-bold text-uppercase text-dark" onclick="updateOrderStatus('${order._id}', 'in consegna')">
              Pronto al Bancone (In Consegna) 🛎️
            </button>
          </div>
        `;
      } else if (status === 'in consegna') {  // [CORRETTO: aggiunta la graffa aperta { ] Se pronto al bancone, mostra il tasto per chiudere l'ordine
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-end align-items-center gap-2">
            <button type="button" class="btn btn-success btn-sm rounded-0 fw-bold text-uppercase text-white" onclick="updateOrderStatus('${order._id}', 'consegnato')">
              Segna come Consegnato ✓
            </button>
          </div>
        `;
      } else {  // Stato 'consegnato': l'ordine è concluso, mostra solo il badge informativo senza pulsanti di azione
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-between align-items-center">
            <span class="small text-muted text-uppercase">Stato Ordine:</span>
            <span class="badge bg-success rounded-0 text-uppercase">Completato e Chiuso</span>
          </div>
        `;
      }
    } else {  // Vista Cliente: non ci sono pulsanti interattivi, solo barra informativa tradotta e badge dello stato attuale
      let statusText = isIt ? 'In attesa di lavorazione' : 'Waiting for processing';
      if (status === 'in preparazione') statusText = isIt ? 'La cucina sta preparando i piatti' : 'Kitchen is preparing dishes';
      if (status === 'in consegna') statusText = isIt ? 'Ordine pronto al bancone!' : 'Order ready at counter!';
      if (status === 'consegnato') statusText = isIt ? 'Ordine ritirato e concluso' : 'Order picked up and completed';

      actionButtons = `
        <div class="border-top pt-3 mt-3 d-flex justify-content-between align-items-center bg-light p-2 border">
          <span class="small text-dark text-uppercase fw-bold" style="font-size: 0.75rem;">
            <i class="bi bi-shop me-1"></i> ${statusText}
          </span>
          <span class="badge ${badgeClass} rounded-0 px-3 py-2 text-uppercase font-monospace">
            ${status}
          </span>
        </div>
      `;
    }
    return `
      <div class="border border-dark bg-white p-4 mb-3">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center border-bottom pb-2 mb-3 gap-2">
          <div>
            <span class="badge ${badgeClass} rounded-0 text-uppercase me-2">${status}</span>
            <strong class="text-uppercase font-monospace" style="font-size: 0.9rem;">#${String(order._id).slice(-6)}</strong>
            <span class="text-muted small ms-2">&bull; ${dateStr}</span>
          </div>
          <div class="fs-5 font-monospace fw-bold text-dark">
            € ${total}
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-12 col-md-4">
            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">${role === 'restaurant' ? 'CLIENTE:' : 'LOCALE DI RITIRO:'}</div>
            <div class="fw-bold text-uppercase">${role === 'restaurant' ? customerName : restName}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">METODO PAGAMENTO:</div>
            <div class="fw-bold small text-uppercase">${paymentLabel}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">${isCompleted ? 'STATO ATTUALE:' : 'TEMPO STIMATO:'}</div>
            <div class="fw-bold font-monospace fs-6 ${isCompleted ? 'text-success' : 'text-danger'}">
              ${waitDisplay}
            </div>
          </div>
        </div>

        <div class="border-top pt-2">
          <div class="small text-muted text-uppercase fw-bold mb-2" style="font-size: 0.7rem;">PIATTI ORDINATI:</div>
          <div class="d-flex flex-column gap-1">
            ${items.map(it => {
              const p = Number(it.price) || 0;
              const q = Number(it.quantity) || 1;
              return `
                <div class="d-flex justify-content-between small">
                  <span>${q}x ${it.name || 'Piatto'}</span>
                  <span class="font-monospace text-muted">€ ${(p * q).toFixed(2)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${actionButtons}
      </div>
    `;
  }).join('');  //lista paitti
}

window.updateOrderStatus = async function(orderId, newStatus) { //per updatare lo stauts
  try {
    const res = await apiRequest(`/orders/${orderId}/status`, { 
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    }); //metodo patch per fare upodate dello status con newstatus come body

    if (res) {
      await loadOrdersHistory(true);  //ricarica orderHisotry
    }
  } catch (err) {
    console.error('Errore aggiornamento stato:', err);
    alert('Impossibile aggiornare lo stato: ' + err.message);
  }
};