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
 *     description: Verifica i piatti nel carrello, congela i prezzi dal database per sicurezza, calcola il tempo basandosi sulla cottura del piatto più lento e sulla coda di comande del locale.
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
router.post('/', authMiddleware, async (req, res) => {
  try {
    // 1. Controllo di autorizzazione: solo i clienti registrati possono effettuare ordini
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: "Solo i clienti registrati possono effettuare ordini." });
    }

    const { restaurantId, items, paymentMethod } = req.body;

    // 2. Controllo integrità del carrello
    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Il carrello deve contenere almeno un piatto valido." });
    }

    // 3. Verifica esistenza del ristorante destinatario
    const restaurant = await User.findOne({ _id: restaurantId, role: 'restaurant' });
    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato nel sistema." });
    }

    // 4. Elaborazione carrello, congelamento prezzi e calcolo tempo di cottura
    let calculatedTotal = 0;
    let maxDishPrepTime = 0; // Memorizza il tempo di preparazione del piatto più lento
    const orderItems = [];

    for (const item of items) {
      // Interroga MongoDB per recuperare il piatto reale
      const mealDoc = await Meal.findById(item.mealId);
      if (!mealDoc) {
        return res.status(404).json({ message: `Piatto non trovato (ID: ${item.mealId})` });
      }

      const qty = Number(item.quantity) || 1;
      calculatedTotal += mealDoc.price * qty;

      // Legge il tempo di preparazione del piatto o usa 10 minuti di fallback
      const dishPrepTime = mealDoc.preparationTime || 10;
      if (dishPrepTime > maxDishPrepTime) {
        maxDishPrepTime = dishPrepTime;
      }

      // Snapshot del piatto nello scontrino
      orderItems.push({
        meal: mealDoc._id,
        name: mealDoc.strMeal,
        quantity: qty,
        price: mealDoc.price
      });
    }

    // 5. Calcolo ritardo dovuto alla coda di ordini non ancora completati
    const ordersInQueue = await Order.countDocuments({
      restaurant: restaurantId,
      status: { $in: ['ordinato', 'in preparazione'] }
    });

    const queueDelayMinutes = ordersInQueue * 5; // 5 minuti per ciascun ordine che precede
    const totalEstimatedMinutes = maxDishPrepTime + queueDelayMinutes;

    // 6. Creazione e salvataggio del documento ordine
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
        ordersAheadInQueue: ordersInQueue
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
      { new: true, runValidators: true }
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
    // Calcola il volume di vendite e fatturato di ogni ristorante registrato
    const leaderboard = await Order.aggregate([
      { $match: { status: 'consegnato' } },
      {
        $group: {
          _id: '$restaurant',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrdersCompleted: { $sum: 1 }
        }
      },
      // Popola i dati del ristorante (nome del locale)
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
          isMyRestaurant: { $eq: ['$_id', currentRestaurantId] } // Flag per evidenziare il proprio ristorante
        }
      },
      { $sort: { totalRevenue: -1 } } // Ordina dal locale con più fatturato a quello con meno
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