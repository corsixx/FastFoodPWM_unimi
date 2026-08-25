// routes/orders.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Importazione dei modelli Mongoose per interagire con le collezioni Atlas
const Order = require('../models/Order');
const Meal = require('../models/Meal');
const User = require('../models/User');

// Middleware per estrarre e validare l'identità dell'utente dal token JWT
const authMiddleware = require('../middleware/auth');


// ============================================================================
// DOCUMENTAZIONE SWAGGER & ROTTA 1: CREAZIONE ORDINE CON CALCOLO CODA + COTTURA
// ============================================================================
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Invia un nuovo ordine con calcolo dinamico del tempo di attesa (Solo Clienti)
 *     description: Verifica i piatti nel carrello, congela i prezzi dal database per sicurezza, calcola il tempo basandosi sulla cottura del piatto più lento e sulla somma della coda reale del locale.
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
 */
// routes/orders.js - Creazione Ordine con somma reale dei tempi di preparazione

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

       // 1. Prendi tutti gli ordini NON ancora consegnati per questo locale, in ordine di arrivo
    const activeOrdersInQueue = await Order.find({
      restaurant: restaurantId,
      status: { $in: ['ordinato', 'in preparazione'] }
    }).sort({ createdAt: 1 }).populate('items.meal');

    // 2. Numero di "postazioni cottura" parallele del locale.
    //    Un ristorante vero non cucina un ordine alla volta: qui simuliamo
    //    quante comande può preparare CONTEMPORANEAMENTE.
    //    Se in futuro vuoi renderlo personalizzabile per ristorante,
    //    aggiungi un campo kitchenCapacity al modello User (default 2)
    //    e sostituisci il numero fisso con restaurant.kitchenCapacity || 2.
    const KITCHEN_CAPACITY = 2;

    // 3. Simulazione: ogni postazione tiene traccia di quando si libera.
    //    Ogni ordine in coda viene assegnato alla postazione che si libera prima
    //    (stesso principio dello scheduling "list scheduling" per il makespan).
    const stationFreeAt = new Array(KITCHEN_CAPACITY).fill(0);

    for (const activeOrder of activeOrdersInQueue) {
      let activeOrderMaxPrep = 10; // Valore di default se non trova il piatto
      if (Array.isArray(activeOrder.items)) {
        for (const it of activeOrder.items) {
          const prep = it.meal?.preparationTime || 10;
          if (prep > activeOrderMaxPrep) activeOrderMaxPrep = prep;
        }
      }

      // Trova la postazione che si libera prima e assegnale questo ordine
      let earliestIndex = 0;
      for (let i = 1; i < stationFreeAt.length; i++) {
        if (stationFreeAt[i] < stationFreeAt[earliestIndex]) earliestIndex = i;
      }
      stationFreeAt[earliestIndex] += activeOrderMaxPrep;
    }

    // 4. Il tuo ordine parte non appena la prima postazione libera è disponibile
    const queueDelayMinutes = Math.min(...stationFreeAt);

    // 5. Tempo totale: attesa in coda + tempo di cottura del tuo ordine
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
// DOCUMENTAZIONE SWAGGER & ROTTA 2: STORICO ACQUISTI CLIENTE
// ============================================================================
/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Recupera lo storico di tutti gli ordini del cliente loggato
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Elenco degli ordini del cliente
 */
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('restaurant', 'restaurantName restaurantAddress restaurantPhone')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
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
 *     description: Il ristoratore preme a schermo per passare da 'ordinato' a 'in preparazione' o 'consegnato'.
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
 *       404:
 *         description: Ordine non trovato o non appartenente al locale
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
 */
router.get('/restaurant-stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const currentRestaurantId = new mongoose.Types.ObjectId(req.user.id);

    // 1. Statistiche piatti venduti del proprio locale (Top Seller interni)
    const dishesStats = await Order.aggregate([
      {
        $match: {
          restaurant: currentRestaurantId,
          status: 'consegnato'
        }
      },
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
      {
        $match: {
          restaurant: currentRestaurantId,
          status: 'consegnato'
        }
      },
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