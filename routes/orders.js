// routes/orders.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Meal = require('../models/Meal');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const KITCHEN_CAPACITY = 2; // Numero di postazioni di cottura (macchine parallele)

// ============================================================================
// DOCUMENTAZIONE SWAGGER & ROTTA 1: CREAZIONE ORDINE (Algoritmo Greedy List Scheduling)
// ============================================================================
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Invia un nuovo ordine con calcolo dinamico del tempo di attesa (Solo Clienti)
 *     description: Verifica i piatti nel carrello, congela i prezzi dal database per sicurezza, calcola il tempo basandosi sulla cottura del piatto più lento e sulla simulazione della coda a 2 postazioni del locale.
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - items
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 example: 64a1b2c3d4e5f67890123456
 *               paymentMethod:
 *                 type: string
 *                 enum: [carta_credito, carta_prepagata, contanti]
 *                 example: carta_credito
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - mealId
 *                     - quantity
 *                   properties:
 *                     mealId:
 *                       type: string
 *                       example: 64a1b2c3d4e5f67890123999
 *                     quantity:
 *                       type: number
 *                       example: 2
 *     responses:
 *       201:
 *         description: Ordine accettato e registrato nella coda del locale
 *       400:
 *         description: Dati carrello non validi o vuoti
 *       403:
 *         description: Accesso negato (solo i clienti possono ordinare)
 *       404:
 *         description: Ristorante o piatto non trovato
 *       500:
 *         description: Errore interno del server
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: "Solo i clienti registrati possono effettuare ordini." });
    }

    const { restaurantId, items, paymentMethod } = req.body;

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) { //ne basta una che non sia valida per l'errore
      return res.status(400).json({ message: "Il carrello deve contenere almeno un piatto valido." });
    }

    const restaurant = await User.findOne({ _id: restaurantId, role: 'restaurant' });
    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato nel sistema." });
    }

    let calculatedTotal = 0;  // Totale calcolato basato sui prezzi congelati dei piatti(cambia col tempo)
    let maxDishPrepTime = 0;  // Tempo di preparazione del piatto più lento nel carrello
    const orderItems = [];  // Array per salvare i dettagli dei piatti ordinati

    // 1. Estrazione dati dal carrello
    for (const item of items) {
      const mealDoc = await Meal.findById(item.mealId); //carica dal database il piatto 
      
      let unitPrice = 8.50; // Prezzo di default se non trovato o non valido
      if (mealDoc && mealDoc.price !== undefined && mealDoc.price !== null && !isNaN(mealDoc.price)) {  //1. mealDoc esiste, è prezzo valido ed un numero allora
        unitPrice = Number(mealDoc.price);  //assigna il prezzo del piatto dal database
      } else if (mealDoc && mealDoc.strPrice !== undefined && mealDoc.strPrice !== null && !isNaN(mealDoc.strPrice)) { //2. mealDoc esiste, price non valido ma esiste strPrice
        unitPrice = Number(mealDoc.strPrice);
      } else if (item.price !== undefined && item.price !== null && !isNaN(item.price)) { //backup: se il piatto non esiste più nel database ma il client ha inviato un prezzo valido, lo usa
        unitPrice = Number(item.price);
      }

      const qty = Number(item.quantity) || 1; //quantità ordinata, default 1 se non valida
      calculatedTotal += unitPrice * qty;

      const dishPrepTime = (mealDoc && mealDoc.preparationTime) ? Number(mealDoc.preparationTime) : 10; //se il piatto esiste e ha un prep time, allora lo usa convertito in nujmero
      if (dishPrepTime > maxDishPrepTime) { //aggiorna il tempo di preparazione massimo se il prep time del piatto è maggiore
        maxDishPrepTime = dishPrepTime;
      }

      orderItems.push({ //pusha i dettagli del piatto ordinato nell'array orderItems
        meal: mealDoc ? mealDoc._id : item.mealId,
        name: mealDoc ? mealDoc.strMeal : (item.name || 'Piatto'),
        quantity: qty,
        price: unitPrice
      });
    }

    // 2. SIMULAZIONE CODA A MACCHINE PARALLELE (Greedy List Scheduling)
    const activeOrdersInQueue = await Order.find({  // Trova tutti gli ordini attivi(ordinato/in preparazione) per il ristorante specifico
      restaurant: restaurantId,
      status: { $in: ['ordinato', 'in preparazione'] } //controlla che sia uno dei due stati
    }).sort({ createdAt: 1 }).populate('items.meal'); // Ordina dal più vecchio al più recente e popola i dettagli dei piatti

    const stationLoads = new Array(KITCHEN_CAPACITY).fill(0); //crea array lungo 2 e lo rimepie di 0, rappresenta il carico di lavoro di ciascuna postazione di cottura

    for (const activeOrder of activeOrdersInQueue) {
      let activeOrderMaxPrep = 10;  // Tempo di preparazione massimo per l'ordine attivo (default 10 minuti)
      if (Array.isArray(activeOrder.items)) {
        for (const it of activeOrder.items) { //esamina tutti i piatti dell'ordine attivo 
          const prep = it.meal?.preparationTime || 10; //se il piatto non esiste usa 10 minuti come default
          if (prep > activeOrderMaxPrep) activeOrderMaxPrep = prep; //il piatto con tempo di preparazione maggiore determina il tempo di preparazione dell'ordine
        }
      }

      // Trova la postazione con il carico minore (Greedy)
      let minLoadIndex = 0; //assumere che la prima postazione sia la più scarica
      for (let i = 1; i < KITCHEN_CAPACITY; i++) {    //il confronto si ferma alla prima postazione, ma è scalabile a più postazioni
        if (stationLoads[i] < stationLoads[minLoadIndex]) { //confronta i minuti di lavoro e trova quella col carico minore
          minLoadIndex = i;
        }
      }
      // Assegna il carico alla postazione più scarica
      stationLoads[minLoadIndex] += activeOrderMaxPrep;
    }

    const queueDelayMinutes = Math.min(...stationLoads);  //spacchetta stationLoads, prende il valore minimo come delay
    const totalEstimatedMinutes = queueDelayMinutes + maxDishPrepTime;  

    const newOrder = new Order({
      customer: req.user.id,
      restaurant: restaurantId,
      items: orderItems,
      totalAmount: calculatedTotal,
      paymentMethod: paymentMethod || 'carta_credito',
      estimatedWaitTimeMinutes: totalEstimatedMinutes,
      status: 'ordinato'
    });

    const savedOrder = await newOrder.save(); //salva il documento sul DB

    res.status(201).json({
      message: "Ordine inviato con successo!",
      order: savedOrder,
      estimatedWaitTimeMinutes: totalEstimatedMinutes,
      breakdown: {
        cookingTime: maxDishPrepTime,
        queueDelay: queueDelayMinutes,
        kitchenCapacity: KITCHEN_CAPACITY,
        activeOrdersCount: activeOrdersInQueue.length
      }
    });

  } catch (error) {
    console.error("Errore creazione ordine:", error);
    res.status(500).json({ message: "Errore durante la creazione dell'ordine.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER & ROTTA 2: STORICO ACQUISTI CLIENTE (Con ricalcolo dinamico)
// ============================================================================
/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Recupera lo storico di tutti gli ordini del cliente loggato
 *     description: Restituisce l'elenco degli ordini del cliente calcolando dinamicamente il tempo residuo in base agli ordini ancora attivi nella coda del ristorante.
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Elenco degli ordini del cliente recuperato con successo
 *       500:
 *         description: Errore nel recupero dello storico acquisti
 */
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('restaurant', 'restaurantName restaurantAddress restaurantPhone')
      .populate('items.meal')
      .sort({ createdAt: -1 }) //dal più recente al più vecchio
      .lean();

    // Recupera TUTTI gli ordini attivi per ricalcolare la coda residua
    const activeOrders = await Order.find({
      status: { $in: ['ordinato', 'in preparazione'] }
    }).sort({ createdAt: 1 }).populate('items.meal').lean();

    const enrichedOrders = orders.map(ord => {  //arricchisce ogni ordine con tempo residuo e stato
      const status = (ord.status || '').toLowerCase().trim(); 

      if (status === 'consegnato') {
        ord.currentWaitMinutes = 0;
        return ord; //restituisce l'ordine così com'è se è già consegnato, senza ricalcolo
      }

      let myMaxPrep = 10; //fallback
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const pTime = it.meal?.preparationTime || 10; //se il piatto non esiste usa 10 minuti come default
          if (pTime > myMaxPrep) myMaxPrep = pTime; //aggiorna il tempo di preparazione massimo se il prep time del piatto è maggiore (specifico ordine)
        }
      }

      // Prendi solo gli ordini attivi dello stesso ristorante ordinati prima di questo
      const ordersAhead = activeOrders.filter(ao => 
        String(ao.restaurant) === String(ord.restaurant?._id || ord.restaurant) &&  //sceglie oridni dello stesso risotante
        new Date(ao.createdAt).getTime() < new Date(ord.createdAt).getTime()  //con data di creazione precedente a questo ordine
        //new date prende createdAt e lo trasforma in una data comprenbile, get time in millisecondi
      );

      // Ricalcolo List Scheduling per gli ordini che precedono questo nella coda
      const stationLoads = new Array(KITCHEN_CAPACITY).fill(0);
      for (const ahead of ordersAhead) {
        let aheadPrep = 10;
        if (Array.isArray(ahead.items)) {
          for (const it of ahead.items) {
            const p = it.meal?.preparationTime || 10;
            if (p > aheadPrep) aheadPrep = p; //calcolo del tempo di preparazione massimo per l'ordine che precede questo
          }
        }
        let minLoadIndex = 0;
        for (let i = 1; i < KITCHEN_CAPACITY; i++) {
          if (stationLoads[i] < stationLoads[minLoadIndex]) minLoadIndex = i;
        }
        stationLoads[minLoadIndex] += aheadPrep;  //come prima, individuo la stazione col carico minore e aggiungo l'ordine precendete alla piu scarica
      }

      const queueDelay = Math.min(...stationLoads);
      const dynamicTotal = queueDelay + myMaxPrep; //stessa cosa di prima

      ord.currentWaitMinutes = dynamicTotal;

      return ord;
    });

    res.status(200).json(enrichedOrders);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dello storico acquisti.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER & ROTTA 3: GESTIONALE COMANDE CUCINA (RISTORATORE)
// ============================================================================
/**
 * @swagger
 * /api/orders/restaurant-orders:
 *   get:
 *     summary: Visualizza tutte le comande ricevute dalla cucina del ristorante
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Elenco ordini ricevuti
 *       403:
 *         description: Accesso consentito solo ai ristoratori
 *       500:
 *         description: Errore nel recupero delle comande
 */
router.get('/restaurant-orders', authMiddleware, async (req, res) => { //non richiedo :id perchè l'identità è gia nel token
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const orders = await Order.find({ restaurant: req.user.id })  //cerca tutti gli ordini ricevuti da questo ristorante e li popola
      .populate('customer', 'name surname email')
      .sort({ createdAt: -1 }); //dal piu recente al meno recente

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero delle comande del ristorante.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER & ROTTA 4: CAMBIO STATO MANUALE (RISTORATORE)
// ============================================================================
/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Avanza lo stato di preparazione/consegna dell'ordine
 *     description: Il ristoratore seleziona a schermo l'avanzamento dello stato (ordinato -> in preparazione -> consegnato).
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco dell'ordine
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ordinato, in preparazione, in consegna, consegnato]
 *                 example: in preparazione
 *     responses:
 *       200:
 *         description: Stato dell'ordine aggiornato con successo
 *       403:
 *         description: Accesso consentito solo ai ristoratori
 *       404:
 *         description: Ordine non trovato o non appartenente alla tua cucina
 *       500:
 *         description: Errore durante l'aggiornamento dello stato
 */
router.patch('/:id/status', authMiddleware, async (req, res) => {//patch perchè si modifica solo una parte della risorsa
  //:id ci dice quale ordine prendiamo in considerazione
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const { status } = req.body;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.user.id },  //controlla che il ristorante sia lo stesso dell'ordine
      { $set: { status } },
      { returnDocument: 'after', runValidators: true } //run validatos fa rispetta il vincolo enum
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Ordine non trovato o non appartenente alla tua cucina." });
    }

    res.status(200).json({
      message: `Stato dell'ordine aggiornato a '${status}'!`,
      order: updatedOrder
    });

  } catch (error) {
    res.status(500).json({ message: "Errore durante l'aggiornamento dello stato.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER & ROTTA 5: STATISTICHE RISTORANTE E CLASSIFICA CONCORRENZA
// ============================================================================
/**
 * @swagger
 * /api/orders/restaurant-stats:
 *   get:
 *     summary: Statistiche del ristorante con classifica e confronto rispetto agli altri locali
 *     description: Mostra incassi, piatti top del locale e la classifica generale delle vendite tra tutti i ristoranti della piattaforma.
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche e classifica di mercato calcolate con successo
 *       403:
 *         description: Accesso riservato ai ristoratori
 *       500:
 *         description: Errore nel calcolo delle statistiche
 */
router.get('/restaurant-stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const currentRestaurantId = new mongoose.Types.ObjectId(req.user.id);   //utilizzo di aggregation pipeline di mongoDB, traduce req,user.id in un objectID per il confronto

    // 1. Statistiche piatti venduti del proprio locale
    const dishesStats = await Order.aggregate([ //inzio della pipeline sulla collezione orders
      { $match: { restaurant: currentRestaurantId, status: 'consegnato' } },  //prendi solo ordine del ristorante attuale che sono gia consegnati
      { $unwind: '$items' },  //prende l'array di itmes e lo divide
      {
        $group: { //raggruppa per criterio
          _id: '$items.name', //stesso nome
          totalQuantitySold: { $sum: '$items.quantity' }, //trova la quantità di porzioni vendute
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } //calcola incasso totale moltiplicando la quantita per il prezzo e sommando il uttto
        }
      },
      { $sort: { totalQuantitySold: -1 } } //sorta in ordine decrescente, dal piu venduto al meno
    ]);

    // 2. Incasso totale e ordini conclusi del proprio locale
    const ownSummary = await Order.aggregate([
      { $match: { restaurant: currentRestaurantId, status: 'consegnato' } },
      {
        $group: { //raggruppa
          _id: '$restaurant', //tutti gli ordini dello stesso ristorante
          totalRevenue: { $sum: '$totalAmount' }, //fa la somma di tutti gli incassi
          totalOrdersCompleted: { $sum: 1 } //somma tutti gli ordini portati a temine per capire il totale degl ordini
        }
      }
    ]);

    // 3. Classifica e Benchmark rispetto a tutti gli altri ristoranti
    const leaderboard = await Order.aggregate([
      { $match: { status: 'consegnato' } }, 
      {
        $group: { //raggruppa tutti i ristoranti per incassi e comande
          _id: '$restaurant',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrdersCompleted: { $sum: 1 }
        }
      },
      {
        $lookup: {  //fa una specie di join e trova per ogni id ristorante il nome
          from: 'utente',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurantDetails' //lo salva vcome restaurant details
        }
      },
      { $unwind: '$restaurantDetails' }, //estrae 
      {
        $project: {//riformattaziopne pulita
          _id: 1, //campi visibili
          restaurantName: '$restaurantDetails.restaurantName',
          totalRevenue: 1,//campi visibili
          totalOrdersCompleted: 1,//campi visibili
          isMyRestaurant: { $eq: ['$_id', currentRestaurantId] }  //true con confronto logico se il ristorante è il tuo
        }
      },
      { $sort: { totalRevenue: -1 } } //decrescente dal piu grande al piu piccolo
    ]);

    // 4. Posizione del proprio locale in classifica
    const myRankIndex = leaderboard.findIndex(item => item._id.toString() === currentRestaurantId.toString()); //cerca nella leaderboard un itm dove l'id è il tuo stesso id
    const myRank = myRankIndex !== -1 ? myRankIndex + 1 : leaderboard.length + 1; //se il ristorante non ompare in classfica allora ti psoizioni alla fine della classfica, altrimenti fai +1

    res.status(200).json({  //oayload strutturato
      myPerformance: {
        summary: ownSummary.length > 0 ? ownSummary[0] : { totalRevenue: 0, totalOrdersCompleted: 0 },
        dishesSold: dishesStats,
        leaderboardPosition: `${myRank}° su ${leaderboard.length} ristoranti attivi`
      },
      marketLeaderboard: leaderboard  //leaderboard
    });

  } catch (error) {
    console.error("Errore calcolo statistiche:", error);
    res.status(500).json({ message: "Errore nel calcolo delle statistiche.", error: error.message });
  }
});

module.exports = router;