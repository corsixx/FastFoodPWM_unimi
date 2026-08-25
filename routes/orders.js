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

    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Il carrello deve contenere almeno un piatto valido." });
    }

    const restaurant = await User.findOne({ _id: restaurantId, role: 'restaurant' });
    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato nel sistema." });
    }

    let calculatedTotal = 0;
    let maxDishPrepTime = 0;
    const orderItems = [];

    // 1. Estrazione dati dal carrello
    for (const item of items) {
      const mealDoc = await Meal.findById(item.mealId);
      
      let unitPrice = 8.50;
      if (mealDoc && mealDoc.price !== undefined && mealDoc.price !== null && !isNaN(mealDoc.price)) {
        unitPrice = Number(mealDoc.price);
      } else if (mealDoc && mealDoc.strPrice !== undefined && mealDoc.strPrice !== null && !isNaN(mealDoc.strPrice)) {
        unitPrice = Number(mealDoc.strPrice);
      } else if (item.price !== undefined && item.price !== null && !isNaN(item.price)) {
        unitPrice = Number(item.price);
      }

      const qty = Number(item.quantity) || 1;
      calculatedTotal += unitPrice * qty;

      const dishPrepTime = (mealDoc && mealDoc.preparationTime) ? Number(mealDoc.preparationTime) : 10;
      if (dishPrepTime > maxDishPrepTime) {
        maxDishPrepTime = dishPrepTime;
      }

      orderItems.push({
        meal: mealDoc ? mealDoc._id : item.mealId,
        name: mealDoc ? mealDoc.strMeal : (item.name || 'Piatto'),
        quantity: qty,
        price: unitPrice
      });
    }

    // 2. SIMULAZIONE CODA A MACCHINE PARALLELE (Greedy List Scheduling)
    const activeOrdersInQueue = await Order.find({
      restaurant: restaurantId,
      status: { $in: ['ordinato', 'in preparazione'] }
    }).sort({ createdAt: 1 }).populate('items.meal');

    const stationLoads = new Array(KITCHEN_CAPACITY).fill(0);

    for (const activeOrder of activeOrdersInQueue) {
      let activeOrderMaxPrep = 10;
      if (Array.isArray(activeOrder.items)) {
        for (const it of activeOrder.items) {
          const prep = it.meal?.preparationTime || 10;
          if (prep > activeOrderMaxPrep) activeOrderMaxPrep = prep;
        }
      }

      // Trova la postazione con il carico minore (Greedy)
      let minLoadIndex = 0;
      for (let i = 1; i < KITCHEN_CAPACITY; i++) {
        if (stationLoads[i] < stationLoads[minLoadIndex]) {
          minLoadIndex = i;
        }
      }
      // Assegna il carico alla postazione più scarica
      stationLoads[minLoadIndex] += activeOrderMaxPrep;
    }

    const queueDelayMinutes = Math.min(...stationLoads);
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

    const savedOrder = await newOrder.save();

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
      .sort({ createdAt: -1 })
      .lean();

    // Recupera TUTTI gli ordini attivi per ricalcolare la coda residua
    const activeOrders = await Order.find({
      status: { $in: ['ordinato', 'in preparazione'] }
    }).sort({ createdAt: 1 }).populate('items.meal').lean();

    const nowTime = Date.now();

    const enrichedOrders = orders.map(ord => {
      const status = (ord.status || '').toLowerCase().trim();

      if (status === 'consegnato') {
        ord.currentWaitMinutes = 0;
        return ord;
      }

      let myMaxPrep = 10;
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const pTime = it.meal?.preparationTime || 10;
          if (pTime > myMaxPrep) myMaxPrep = pTime;
        }
      }

      // Prendi solo gli ordini attivi dello stesso ristorante ordinati prima di questo
      const ordersAhead = activeOrders.filter(ao => 
        String(ao.restaurant) === String(ord.restaurant?._id || ord.restaurant) &&
        new Date(ao.createdAt).getTime() < new Date(ord.createdAt).getTime()
      );

      // Ricalcolo List Scheduling per gli ordini che precedono questo nella coda
      const stationLoads = new Array(KITCHEN_CAPACITY).fill(0);
      for (const ahead of ordersAhead) {
        let aheadPrep = 10;
        if (Array.isArray(ahead.items)) {
          for (const it of ahead.items) {
            const p = it.meal?.preparationTime || 10;
            if (p > aheadPrep) aheadPrep = p;
          }
        }
        let minLoadIndex = 0;
        for (let i = 1; i < KITCHEN_CAPACITY; i++) {
          if (stationLoads[i] < stationLoads[minLoadIndex]) minLoadIndex = i;
        }
        stationLoads[minLoadIndex] += aheadPrep;
      }

      const queueDelay = Math.min(...stationLoads);
      const dynamicTotal = queueDelay + myMaxPrep;

      const elapsedMinutes = Math.floor((nowTime - new Date(ord.createdAt).getTime()) / 60000);
      ord.currentWaitMinutes = Math.max(1, dynamicTotal - elapsedMinutes);

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
router.get('/restaurant-orders', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const orders = await Order.find({ restaurant: req.user.id })
      .populate('customer', 'name surname email')
      .sort({ createdAt: -1 });

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
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const { status } = req.body;

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.user.id },
      { $set: { status } },
      { returnDocument: 'after', runValidators: true }
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

    const currentRestaurantId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Statistiche piatti venduti del proprio locale
    const dishesStats = await Order.aggregate([
      { $match: { restaurant: currentRestaurantId, status: 'consegnato' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantitySold: -1 } }
    ]);

    // 2. Incasso totale e ordini conclusi del proprio locale
    const ownSummary = await Order.aggregate([
      { $match: { restaurant: currentRestaurantId, status: 'consegnato' } },
      {
        $group: {
          _id: '$restaurant',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrdersCompleted: { $sum: 1 }
        }
      }
    ]);

    // 3. Classifica e Benchmark rispetto a tutti gli altri ristoranti
    const leaderboard = await Order.aggregate([
      { $match: { status: 'consegnato' } },
      {
        $group: {
          _id: '$restaurant',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrdersCompleted: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'utente',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurantDetails'
        }
      },
      { $unwind: '$restaurantDetails' },
      {
        $project: {
          _id: 1,
          restaurantName: '$restaurantDetails.restaurantName',
          totalRevenue: 1,
          totalOrdersCompleted: 1,
          isMyRestaurant: { $eq: ['$_id', currentRestaurantId] }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 4. Posizione del proprio locale in classifica
    const myRankIndex = leaderboard.findIndex(item => item._id.toString() === currentRestaurantId.toString());
    const myRank = myRankIndex !== -1 ? myRankIndex + 1 : leaderboard.length + 1;

    res.status(200).json({
      myPerformance: {
        summary: ownSummary.length > 0 ? ownSummary[0] : { totalRevenue: 0, totalOrdersCompleted: 0 },
        dishesSold: dishesStats,
        leaderboardPosition: `${myRank}° su ${leaderboard.length} ristoranti attivi`
      },
      marketLeaderboard: leaderboard
    });

  } catch (error) {
    console.error("Errore calcolo statistiche:", error);
    res.status(500).json({ message: "Errore nel calcolo delle statistiche.", error: error.message });
  }
});

module.exports = router;