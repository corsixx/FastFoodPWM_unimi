// public/js/stats.js

let revenueChartInstance = null;
let topDishesChartInstance = null;
let restaurantOrders = [];
let statsPollingInterval = null;

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

  // Auto-polling rapido ogni 3 secondi (3000 ms) per sincronizzazione live comande e incassi
  if (statsPollingInterval) clearInterval(statsPollingInterval);
  statsPollingInterval = setInterval(async () => {
    await loadRestaurantStats(true);
  }, 3000);
});

// Pulizia del timer al cambio pagina
window.addEventListener('beforeunload', () => {
  if (statsPollingInterval) clearInterval(statsPollingInterval);
});

async function loadRestaurantStats(isSilent = false) {
  try {
    // 1. Recupera dati del profilo ristorante, statistiche aggregate e lista ordini
    const [profileRes, statsRes, ordersRes] = await Promise.allSettled([  //chiamte in parallelo con la promise
      apiRequest('/auth/me').catch(() => apiRequest('/users/me')),
      apiRequest('/orders/restaurant-stats'),
      apiRequest('/orders/restaurant-orders')
    ]);

    // Dati profilo
    const profile = profileRes.status === 'fulfilled' ? (profileRes.value.user || profileRes.value) : {};
    const nameEl = document.getElementById('restaurant-name-header');   //riga 31
    const addrEl = document.getElementById('restaurant-addr-header'); //riga 34
    if (nameEl) nameEl.textContent = profile.restaurantName || profile.name || 'IL TUO RISTORANTE';
    if (addrEl) addrEl.textContent = profile.restaurantAddress || 'Sede Operativa Principale';

    // Dati ordini
    restaurantOrders = ordersRes.status === 'fulfilled'   //se la chiamta ha avcuto successo
      ? (Array.isArray(ordersRes.value) ? ordersRes.value : (ordersRes.value?.orders || []))  //cotnrolla il tipo della chiamta 
      : [];

    // Dati statistiche aggregate
    const statsData = statsRes.status === 'fulfilled' ? statsRes.value : null;

    updateKPIs(statsData);
    renderCharts(statsData);

  } catch (err) {
    if (!isSilent) console.error('Errore caricamento dashboard statistiche:', err);
  }
}

function updateKPIs(statsData) { //calcolo principali grazi ai dati statistici  del numero totale di ordini ricevuti e ecc (key performance indicator)
  // Seleziona l'elemento HTML che mostra il valore del fatturato/ricavi (es. "€ 1.500,00")
  const kpiRevenue = document.getElementById('kpi-revenue-val');
  // Seleziona l'elemento HTML che mostra il numero totale degli ordini ricevuti (es. "42")
  const kpiOrders = document.getElementById('kpi-orders-val');
  // Seleziona l'elemento HTML che mostra il numero di ordini in attesa/da preparare (es. "5")
  const kpiPending = document.getElementById('kpi-pending-val');
  // Seleziona l'elemento HTML che mostra il posizionamento o ranking del ristorante (es. "#3")
  const kpiRank = document.getElementById('kpi-rank-val');

  const totalOrdersCount = restaurantOrders.length;
  const pendingOrders = restaurantOrders.filter(o => (o.status || '').toLowerCase() !== 'consegnato').length; //qualsdiasi cosa diversa da cosneganto
  
  // Incasso calcolato dagli ordini consegnati
  const completedOrders = restaurantOrders.filter(o => (o.status || '').toLowerCase() === 'consegnato');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  if (kpiRevenue) kpiRevenue.textContent = `€ ${totalRevenue.toFixed(2)}`;
  if (kpiOrders) kpiOrders.textContent = totalOrdersCount;
  if (kpiPending) kpiPending.textContent = pendingOrders;
  
  if (kpiRank) {
    kpiRank.textContent = statsData?.myPerformance?.leaderboardPosition || `${completedOrders.length > 0 ? '1°' : '---'}`;  //usa il dato backend
  }
  // Prova a usare la posizione in classifica reale che arriva dal backend (se esiste), se è indefinito nulla controlla se un ruistorante ha compleatato piu o meno ordini 
}

function renderCharts(statsData) {
  const isIt = currentLang === 'IT';

  // --- GRAFICO 1: Incassi Ultimi 7 Giorni ---
  const revCanvas = document.getElementById('revenueChart'); 
  if (revCanvas) {
    const last7Days = [];
    const revenueByDay = {};

    for (let i = 6; i >= 0; i--) {  //genera le date degli ultimi 7 giorni
      const d = new Date();
      d.setDate(d.getDate() - i); //sottrae i giorni dalla data correnmte
      const key = d.toISOString().split('T')[0];  //estrae solo la data dalla stringa ISO che ha anche l'ora
      last7Days.push(key);  //pusha la data
      revenueByDay[key] = 0;  //ogni giorni inizializzato con incassi a 0
    }

    restaurantOrders.forEach(o => {
      if ((o.status || '').toLowerCase() === 'consegnato' && o.createdAt) { // per ogni ordine estrae la data
        const orderDate = o.createdAt.split('T')[0];
        if (revenueByDay[orderDate] !== undefined) {  //cerca il giorno e aggiugne il totale dell'ordine
          revenueByDay[orderDate] += Number(o.totalAmount) || 0;
        }
      }
    });

    const labels = last7Days.map(dateStr => { //TRASFORMA UNA LISTA DI DATE IN ETICHETTE LEGGIBILI
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const dataValues = last7Days.map(d => revenueByDay[d]);

    if (revenueChartInstance) revenueChartInstance.destroy(); //se essite gia un istanza del grafico la distruggi

    revenueChartInstance = new Chart(revCanvas, { //crea grafico a barre
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
        animation: false, // Disabilita animazione per non far sfarfallare il grafico durante il polling
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

    topDishesChartInstance = new Chart(topCanvas, { //grafico a torta
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
        animation: false, // Evita ridisegnamenti continui a ogni tick di 3 secondi
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}
//************************************************************************************************************************ */