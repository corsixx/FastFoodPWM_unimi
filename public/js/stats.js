// public/js/stats.js

let revenueChartInstance = null;
let topDishesChartInstance = null;
let restaurantOrders = [];

// Inizializzazione coordinata all'iniezione dei componenti di utils.js
document.addEventListener('componentsLoaded', async () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  // Protezione rotta: solo i ristoratori possono accedere
  if (!token || role !== 'restaurant') {
    window.location.href = 'login.html';
    return;
  }

  await loadRestaurantStats();
});

window.updateView = function() {
  renderOrdersTable();
};

async function loadRestaurantStats() {
  try {
    // 1. Recupera dati del profilo ristorante, statistiche aggregate e lista ordini
    const [profileRes, statsRes, ordersRes] = await Promise.allSettled([
      apiRequest('/auth/me').catch(() => apiRequest('/users/me')),
      apiRequest('/orders/restaurant-stats'),
      apiRequest('/orders/restaurant-orders')
    ]);

    // Dati profilo
    const profile = profileRes.status === 'fulfilled' ? (profileRes.value.user || profileRes.value) : {};
    const nameEl = document.getElementById('restaurant-name-header');
    const addrEl = document.getElementById('restaurant-addr-header');
    if (nameEl) nameEl.textContent = profile.restaurantName || profile.name || 'IL TUO RISTORANTE';
    if (addrEl) addrEl.textContent = profile.restaurantAddress || 'Sede Operativa Principale';

    // Dati ordini
    restaurantOrders = ordersRes.status === 'fulfilled' 
      ? (Array.isArray(ordersRes.value) ? ordersRes.value : (ordersRes.value.orders || [])) 
      : [];

    // Dati statistiche avanzate (Rotta 5)
    const statsData = statsRes.status === 'fulfilled' ? statsRes.value : null;

    updateKPIs(statsData);
    renderCharts(statsData);
    renderOrdersTable();

  } catch (err) {
    console.error('Errore caricamento dashboard statistiche:', err);
  }
}

function updateKPIs(statsData) {
  const kpiRevenue = document.getElementById('kpi-revenue-val');
  const kpiOrders = document.getElementById('kpi-orders-val');
  const kpiPending = document.getElementById('kpi-pending-val');
  const kpiRank = document.getElementById('kpi-rank-val');

  const totalOrdersCount = restaurantOrders.length;
  const pendingOrders = restaurantOrders.filter(o => (o.status || '').toLowerCase() !== 'consegnato').length;
  
  // Incasso calcolato dagli ordini consegnati
  const completedOrders = restaurantOrders.filter(o => (o.status || '').toLowerCase() === 'consegnato');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  if (kpiRevenue) kpiRevenue.textContent = `€ ${totalRevenue.toFixed(2)}`;
  if (kpiOrders) kpiOrders.textContent = totalOrdersCount;
  if (kpiPending) kpiPending.textContent = pendingOrders;
  
  if (kpiRank) {
    kpiRank.textContent = statsData?.myPerformance?.leaderboardPosition || `${completedOrders.length > 0 ? '1°' : '---'}`;
  }
}

function renderCharts(statsData) {
  const isIt = currentLang === 'IT';

  // --- GRAFICO 1: Incassi Ultimi 7 Giorni ---
  const revCanvas = document.getElementById('revenueChart');
  if (revCanvas) {
    const last7Days = [];
    const revenueByDay = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7Days.push(key);
      revenueByDay[key] = 0;
    }

    restaurantOrders.forEach(o => {
      if ((o.status || '').toLowerCase() === 'consegnato' && o.createdAt) {
        const orderDate = o.createdAt.split('T')[0];
        if (revenueByDay[orderDate] !== undefined) {
          revenueByDay[orderDate] += Number(o.totalAmount) || 0;
        }
      }
    });

    const labels = last7Days.map(dateStr => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const dataValues = last7Days.map(d => revenueByDay[d]);

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(revCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: isIt ? 'Incasso (€)' : 'Revenue (€)',
          data: dataValues,
          backgroundColor: '#000000',
          borderColor: '#000000',
          borderRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `€ ${val}`
            }
          }
        }
      }
    });
  }

  // --- GRAFICO 2: Top Piatti Più Venduti ---
  const topCanvas = document.getElementById('topDishesChart');
  if (topCanvas) {
    let topLabels = [];
    let topData = [];

    if (statsData?.myPerformance?.dishesSold && statsData.myPerformance.dishesSold.length > 0) {
      const topSlice = statsData.myPerformance.dishesSold.slice(0, 5);
      topLabels = topSlice.map(d => d._id);
      topData = topSlice.map(d => d.totalQuantitySold);
    } else {
      // Calcolo al volo dai piatti venduti
      const countMap = {};
      restaurantOrders.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach(it => {
            countMap[it.name] = (countMap[it.name] || 0) + (Number(it.quantity) || 1);
          });
        }
      });
      const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      topLabels = sorted.map(s => s[0]);
      topData = sorted.map(s => s[1]);
    }

    if (topDishesChartInstance) topDishesChartInstance.destroy();

    topDishesChartInstance = new Chart(topCanvas, {
      type: 'doughnut',
      data: {
        labels: topLabels.length > 0 ? topLabels : [isIt ? 'Nessun piatto' : 'No meals'],
        datasets: [{
          data: topData.length > 0 ? topData : [1],
          backgroundColor: ['#000000', '#495057', '#6c757d', '#adb5bd', '#dee2e6'],
          borderWidth: 1,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

function renderOrdersTable() {
  const tbody = document.getElementById('stats-orders-tbody');
  const countBadge = document.getElementById('orders-count-badge');
  const isIt = currentLang === 'IT';

  if (!tbody) return;

  if (countBadge) {
    countBadge.textContent = `${restaurantOrders.length} ${isIt ? 'ordini complessivi' : 'total orders'}`;
  }

  if (restaurantOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          ${isIt ? 'Nessun ordine ricevuto al momento.' : 'No orders received yet.'}
        </td>
      </tr>
    `;
    return;
  }

  // Mostra i primi 10 ordini più recenti
  const recentOrders = restaurantOrders.slice(0, 10);

  tbody.innerHTML = recentOrders.map(order => {
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString(isIt ? 'it-IT' : 'en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '---';
    const total = (Number(order.totalAmount) || 0).toFixed(2);
    const status = (order.status || 'ordinato').toLowerCase().trim();
    const customerName = order.customer ? `${order.customer.name || ''} ${order.customer.surname || ''}`.trim() || order.customer.email : 'Cliente';

    let badgeClass = 'bg-secondary';
    if (status === 'ordinato') badgeClass = 'bg-warning text-dark';
    if (status === 'in preparazione') badgeClass = 'bg-primary';
    if (status === 'in consegna') badgeClass = 'bg-info text-dark';
    if (status === 'consegnato') badgeClass = 'bg-success';

    const itemsSummary = Array.isArray(order.items) 
      ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
      : 'Piatti';

    // Azione Rapida Diretta da riga
    let actionBtn = '';
    if (status === 'ordinato') {
      actionBtn = `
        <button type="button" class="btn btn-outline-primary btn-sm rounded-0 fw-bold py-1 px-2 text-uppercase" style="font-size: 0.72rem;" onclick="quickUpdateStatus('${order._id}', 'in preparazione')">
          Inizia Cottura 👨‍🍳
        </button>
      `;
    } else if (status === 'in preparazione' || status === 'in consegna') {
      actionBtn = `
        <button type="button" class="btn btn-success btn-sm rounded-0 fw-bold py-1 px-2 text-uppercase text-white" style="font-size: 0.72rem;" onclick="quickUpdateStatus('${order._id}', 'consegnato')">
          Consegna ✓
        </button>
      `;
    } else {
      actionBtn = `<span class="badge bg-light text-muted border rounded-0 font-monospace" style="font-size: 0.65rem;">CHIUSO</span>`;
    }

    return `
      <tr>
        <td class="font-monospace fw-bold">#${String(order._id).slice(-6)}</td>
        <td class="text-muted small">${dateStr}</td>
        <td class="fw-semibold text-uppercase">${customerName}</td>
        <td class="small text-truncate" style="max-width: 250px;" title="${itemsSummary}">${itemsSummary}</td>
        <td class="font-monospace fw-bold">€ ${total}</td>
        <td><span class="badge ${badgeClass} rounded-0 text-uppercase">${status}</span></td>
        <td class="text-center">${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

window.quickUpdateStatus = async function(orderId, newStatus) {
  try {
    const res = await apiRequest(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });

    if (res) {
      await loadRestaurantStats();
    }
  } catch (err) {
    alert('Errore aggiornamento: ' + err.message);
  }
};