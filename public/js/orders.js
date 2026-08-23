let activeTab = 'history';
let ordersList = [];
let userProfile = null;

document.addEventListener('componentsLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  const tabGroup = document.getElementById('orders-tab-group');
  const viewBadge = document.getElementById('orders-view-badge');
  const viewTitle = document.getElementById('orders-view-title');
  const isIt = currentLang === 'IT';

  if (role === 'restaurant') {
    if (tabGroup) tabGroup.classList.add('d-none');
    if (viewBadge) viewBadge.textContent = isIt ? 'AREA GESTIONALE' : 'DASHBOARD';
    if (viewTitle) viewTitle.textContent = isIt ? 'COMANDE IN CUCINA' : 'KITCHEN ORDERS';
    
    activeTab = 'history';
    document.getElementById('view-checkout')?.classList.add('d-none');
    document.getElementById('view-history')?.classList.remove('d-none');
  } else {
    // Carica il profilo utente per ottenere il metodo di pagamento predefinito
    await fetchUserProfile();

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length > 0) {
      activeTab = 'checkout';
    } else {
      activeTab = 'history';
    }
    switchOrdersTab(activeTab);
  }

  await loadOrdersHistory();
});

async function fetchUserProfile() {
  try {
    const res = await apiRequest('/users/me');
    if (res && res.user) {
      userProfile = res.user;
    } else if (res) {
      userProfile = res;
    }
  } catch (err) {
    console.warn('Profilo non caricato da API, fallback su localStorage:', err);
    userProfile = {
      preferredPaymentMethod: localStorage.getItem('userPaymentMethod') || 'carta_credito'
    };
  }
}

window.updateView = function() {
  renderCheckoutView();
  renderHistoryView();
};

window.switchOrdersTab = function(tabName) {
  const role = localStorage.getItem('userRole');
  if (role === 'restaurant') return;

  activeTab = tabName;
  const viewCheckout = document.getElementById('view-checkout');
  const viewHistory = document.getElementById('view-history');
  const btnCheckout = document.getElementById('tab-btn-checkout');
  const btnHistory = document.getElementById('tab-btn-history');

  if (tabName === 'checkout') {
    viewCheckout.classList.remove('d-none');
    viewHistory.classList.add('d-none');

    btnCheckout.classList.replace('btn-outline-dark', 'btn-dark');
    btnHistory.classList.replace('btn-dark', 'btn-outline-dark');
    renderCheckoutView();
  } else {
    viewCheckout.classList.add('d-none');
    viewHistory.classList.remove('d-none');

    btnHistory.classList.replace('btn-outline-dark', 'btn-dark');
    btnCheckout.classList.replace('btn-dark', 'btn-outline-dark');
    renderHistoryView();
  }
};

function renderCheckoutView() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const listContainer = document.getElementById('checkout-items-list');
  const restNameEl = document.getElementById('checkout-restaurant-name');
  const totalItemsEl = document.getElementById('checkout-total-items');
  const totalTimeEl = document.getElementById('checkout-total-time');
  const finalPriceEl = document.getElementById('checkout-final-price');
  const submitBtn = document.getElementById('btn-submit-order');
  const paymentSelect = document.getElementById('order-payment-method');
  const isIt = currentLang === 'IT';

  if (!listContainer) return;

  if (cart.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-5 text-muted small">
        <i class="bi bi-cart-x fs-2 d-block mb-2"></i>
        ${isIt ? 'Il carrello è attualmente vuoto.' : 'Your cart is currently empty.'}
        <div class="mt-3">
          <a href="catalog.html" class="btn btn-outline-dark btn-sm rounded-0 fw-bold text-uppercase">
            ${isIt ? 'Sfoglia il catalogo' : 'Browse catalog'}
          </a>
        </div>
      </div>
    `;
    if (restNameEl) restNameEl.textContent = '---';
    if (totalItemsEl) totalItemsEl.textContent = '0';
    if (totalTimeEl) totalTimeEl.textContent = '0 min';
    if (finalPriceEl) finalPriceEl.textContent = '€ 0.00';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (submitBtn) submitBtn.disabled = false;

  // Imposta il metodo di pagamento predefinito dal profilo utente
  if (paymentSelect && !paymentSelect.dataset.userModified) {
    const defaultMethod = userProfile?.preferredPaymentMethod || userProfile?.paymentMethod || 'carta_credito';
    paymentSelect.value = defaultMethod;
    
    // Evita di resettarlo se l'utente lo modifica manualmente durante la sessione
    paymentSelect.addEventListener('change', () => {
      paymentSelect.dataset.userModified = 'true';
    }, { once: true });
  }

  const totalItems = cart.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  const totalPrice = cart.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.quantity) || 1)), 0);
  const maxPrepTime = Math.max(...cart.map(i => Number(i.preparationTime) || 15));
  const primaryRestName = cart[0].restaurantName || 'Ristorante Partner';

  if (restNameEl) restNameEl.textContent = primaryRestName;
  if (totalItemsEl) totalItemsEl.textContent = totalItems;
  if (totalTimeEl) totalTimeEl.textContent = `${maxPrepTime} min`;
  if (finalPriceEl) finalPriceEl.textContent = `€ ${totalPrice.toFixed(2)}`;

  listContainer.innerHTML = cart.map(item => {
    const itemPrice = Number(item.price) || 0;
    const itemQty = Number(item.quantity) || 1;
    return `
      <div class="border border-dark p-2 d-flex align-items-center justify-content-between gap-3 bg-light">
        <img src="${item.thumb || ''}" alt="${item.name}" style="width: 55px; height: 55px; object-fit: cover;" class="border">
        <div class="flex-grow-1 text-truncate">
          <div class="fw-bold text-uppercase small text-truncate">${item.name}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${item.restaurantName || ''}</div>
          <div class="font-monospace fw-bold text-dark">€ ${(itemPrice * itemQty).toFixed(2)} <span class="text-muted small fw-normal">(${itemPrice.toFixed(2)} cad.)</span></div>
        </div>
        <div class="d-flex align-items-center gap-1">
          <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQtyAndUpdate('${item.id}', '${item.restaurantId}', -1)">-</button>
          <span class="font-monospace fw-bold px-2">${itemQty}</span>
          <button type="button" class="btn btn-outline-dark btn-sm rounded-0 px-2 py-0 fw-bold" onclick="modifyCartQtyAndUpdate('${item.id}', '${item.restaurantId}', 1)">+</button>
        </div>
      </div>
    `;
  }).join('');
}

window.modifyCartQtyAndUpdate = function(id, restId, delta) {
  modifyCartQty(id, restId, delta);
  renderCheckoutView();
};

window.clearCartAndRefresh = function() {
  clearCart();
  renderCheckoutView();
};

window.submitOrder = async function() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const isIt = currentLang === 'IT';

  if (cart.length === 0) {
    alert(isIt ? 'Il carrello è vuoto!' : 'The cart is empty!');
    return;
  }

  const firstRestId = cart[0].restaurantId;
  const hasMixedRestaurants = cart.some(item => item.restaurantId && item.restaurantId !== firstRestId);
  
  if (hasMixedRestaurants) {
    alert(isIt ? 'Il carrello contiene piatti di ristoranti differenti. Svuota il carrello o ordina da un solo locale per volta.' : 'Cart contains items from different restaurants. Please order from a single restaurant at a time.');
    return;
  }

  const paymentSelect = document.getElementById('order-payment-method');
  const selectedPayment = paymentSelect ? paymentSelect.value : 'carta_credito';

  const submitBtn = document.getElementById('btn-submit-order');
  const restId = cart[0].restaurantId;
  const itemsPayload = cart.map(i => ({
    mealId: i.id,
    quantity: Number(i.quantity) || 1
  }));

  const payload = {
    restaurantId: restId,
    paymentMethod: selectedPayment,
    items: itemsPayload
  };

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>${isIt ? 'INOLTRO IN CORSO...' : 'SUBMITTING...'}</span> <div class="spinner-border spinner-border-sm"></div>`;
    }

    const res = await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res) {
      clearCart();
      await loadOrdersHistory();
      switchOrdersTab('history');
      
      const waitTime = res.estimatedWaitTimeMinutes || 15;
      alert(isIt ? `Ordine inviato con successo! Tempo stimato di attesa: ${waitTime} min.` : `Order submitted! Estimated wait time: ${waitTime} min.`);
    }
  } catch (err) {
    console.error('Errore durante l\'invio ordine:', err);
    alert(isIt ? 'Errore durante l\'invio dell\'ordine: ' + err.message : 'Error submitting order: ' + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span id="txt-co-submit-btn">${isIt ? 'INVIA ORDINE AL BANCONE' : 'SUBMIT ORDER'}</span> <i class="bi bi-arrow-right"></i>`;
    }
  }
};

async function loadOrdersHistory() {
  try {
    const role = localStorage.getItem('userRole');
    const endpoint = (role === 'restaurant') ? '/orders/restaurant-orders' : '/orders/my-orders';
    
    const data = await apiRequest(endpoint);
    ordersList = Array.isArray(data) ? data : (data.orders || []);
    renderHistoryView();
  } catch (err) {
    console.error('Errore recupero storico ordini:', err);
  }
}

function renderHistoryView() {
  const container = document.getElementById('orders-history-container');
  const noOrdersMsg = document.getElementById('no-orders-msg');
  const isIt = currentLang === 'IT';
  const role = localStorage.getItem('userRole');

  if (!container) return;

  if (ordersList.length === 0) {
    if (noOrdersMsg) noOrdersMsg.classList.remove('d-none');
    container.innerHTML = '';
    return;
  }

  if (noOrdersMsg) noOrdersMsg.classList.add('d-none');

  container.innerHTML = ordersList.map(order => {
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString(isIt ? 'it-IT' : 'en-GB') : '---';
    const total = (Number(order.totalAmount) || 0).toFixed(2);
    const status = (order.status || 'ordinato').toLowerCase();
    const restName = order.restaurant?.restaurantName || order.restaurant?.name || 'Ristorante Partner';
    const customerName = order.customer ? `${order.customer.name || ''} ${order.customer.surname || ''}`.trim() || order.customer.email : 'Cliente';

    // Formattazione label Metodo di Pagamento nello storico
    let paymentLabel = '💳 Carta di Credito';
    if (order.paymentMethod === 'carta_prepagata') paymentLabel = '💳 Carta Prepagata';
    if (order.paymentMethod === 'contanti') paymentLabel = '💵 Contanti al Ritiro';

    let badgeClass = 'bg-secondary';
    if (status === 'ordinato') badgeClass = 'bg-warning text-dark';
    if (status === 'in preparazione') badgeClass = 'bg-primary';
    if (status === 'in consegna') badgeClass = 'bg-info text-dark';
    if (status === 'consegnato') badgeClass = 'bg-success';

    const items = Array.isArray(order.items) ? order.items : [];

    let actionButtons = '';
    
    if (role === 'restaurant') {
      if (status === 'ordinato') {
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-end align-items-center">
            <button type="button" class="btn btn-outline-primary btn-sm rounded-0 fw-bold text-uppercase" onclick="updateOrderStatus('${order._id}', 'in preparazione')">
              Inizia Cottura (Metti in Preparazione) 👨‍🍳
            </button>
          </div>
        `;
      } else if (status === 'in preparazione' || status === 'in consegna') {
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-end align-items-center gap-2">
            <button type="button" class="btn btn-success btn-sm rounded-0 fw-bold text-uppercase text-white" onclick="updateOrderStatus('${order._id}', 'consegnato')">
              Segna come Pronto / Consegnato (Rimuovi dalla coda) ✓
            </button>
          </div>
        `;
      } else {
        actionButtons = `
          <div class="border-top pt-3 mt-3 d-flex justify-content-between align-items-center">
            <span class="small text-muted text-uppercase">Stato Ordine:</span>
            <span class="badge bg-success rounded-0 text-uppercase">Consegnato e Concluso</span>
          </div>
        `;
      }
    } else {
      let statusText = isIt ? 'In attesa di lavorazione' : 'Waiting for processing';
      if (status === 'in preparazione') statusText = isIt ? 'La cucina sta preparando i piatti' : 'Kitchen is preparing dishes';
      if (status === 'in consegna') statusText = isIt ? 'Ordine pronto al bancone per il ritiro!' : 'Order ready at counter for pickup!';
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
            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">METODO DI PAGAMENTO:</div>
            <div class="fw-bold small text-uppercase">${paymentLabel}</div>
          </div>
          <div class="col-12 col-md-4">
            <div class="small text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">TEMPO STIMATO DI ATTESA:</div>
            <div class="fw-bold font-monospace">${order.estimatedWaitTimeMinutes || 15} min (Coda attiva)</div>
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
  }).join('');
}

window.updateOrderStatus = async function(orderId, newStatus) {
  try {
    const res = await apiRequest(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });

    if (res) {
      await loadOrdersHistory();
    }
  } catch (err) {
    console.error('Errore aggiornamento stato ordine:', err);
    alert('Impossibile aggiornare lo stato dell\'ordine: ' + err.message);
  }
};