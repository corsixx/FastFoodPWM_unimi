// routes/orders.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import dei modelli necessari
const Order = require('../models/Order');
const Meal = require('../models/Meal');
const User = require('../models/User');

// Middleware di autenticazione per estrarre l'utente dal token JWT
const authMiddleware = require('../middleware/auth');


// ============================================================================
// DOCUMENTAZIONE SWAGGER: 1. CREAZIONE ORDINE
// ============================================================================
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crea un nuovo ordine (Solo Clienti)
 *     description: Riceve i piatti scelti dal carrello, calcola il prezzo totale effettivo dal database e stima i minuti di attesa in base alla coda.
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
 *         description: Ordine creato e registrato nella coda del locale
 *       400:
 *         description: Dati del carrello mancanti o non validi
 *       403:
 *         description: Accesso negato (solo i clienti possono ordinare)
 *       404:
 *         description: Ristorante o piatto non trovato
 */

// ============================================================================
// ROTTA 1: CREAZIONE ORDINE (POST /api/orders)
// ============================================================================
router.post('/', authMiddleware, async (req, res) => {
  try {
    // 1. Controllo permessi: solo i clienti possono effettuare acquisti
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: "Solo i clienti registrati possono effettuare ordini." });
    }

    const { restaurantId, items, paymentMethod } = req.body;

    // 2. Controllo integrità carrello
    if (!restaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Il carrello deve contenere almeno un piatto valido." });
    }

    // 3. Verifica esistenza del ristorante
    const restaurant = await User.findOne({ _id: restaurantId, role: 'restaurant' });
    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato nel sistema." });
    }

    // 4. Calcolo totale e preparazione scontrino leggendo i prezzi reali dal DB
    let calculatedTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const mealDoc = await Meal.findById(item.mealId);
      if (!mealDoc) {
        return res.status(404).json({ message: `Piatto non trovato (ID: ${item.mealId})` });
      }

      const qty = Number(item.quantity) || 1;
      calculatedTotal += mealDoc.price * qty;

      // Salviamo una copia con nome e prezzo congelati
      orderItems.push({
        meal: mealDoc._id,
        name: mealDoc.strMeal,
        quantity: qty,
        price: mealDoc.price
      });
    }

    // 5. Calcolo tempo di attesa stimato (10 min base + 5 min per ogni ordine già in coda)
    const activeOrdersCount = await Order.countDocuments({
      restaurant: restaurantId,
      status: { $in: ['ordinato', 'in preparazione'] }
    });
    const estimatedMinutes = 10 + (activeOrdersCount * 5);

    // 6. Salvataggio su MongoDB
    const newOrder = new Order({
      customer: req.user.id,
      restaurant: restaurantId,
      items: orderItems,
      totalAmount: calculatedTotal,
      paymentMethod: paymentMethod || 'carta_credito',
      estimatedWaitTimeMinutes: estimatedMinutes,
      status: 'ordinato'
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      message: "Ordine inviato con successo!",
      order: savedOrder,
      estimatedWaitTimeMinutes: estimatedMinutes
    });

  } catch (error) {
    console.error("Errore creazione ordine:", error);
    res.status(500).json({ message: "Errore durante la creazione dell'ordine.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER: 2. STORICO ACQUISTI CLIENTE
// ============================================================================
/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Visualizza tutti gli ordini del cliente loggato (presenti e passati)
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Elenco degli ordini del cliente
 */

// ============================================================================
// ROTTA 2: STORICO ACQUISTI CLIENTE (GET /api/orders/my-orders)
// ============================================================================
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    // Trova tutti gli ordini effettuati dal cliente loggato e popola i dati del locale
    const orders = await Order.find({ customer: req.user.id })
      .populate('restaurant', 'restaurantName restaurantAddress restaurantPhone')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);

  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dello storico acquisti.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER: 3. VISUALIZZAZIONE ORDINI RICEVUTI (RISTORATORE)
// ============================================================================
/**
 * @swagger
 * /api/orders/restaurant-orders:
 *   get:
 *     summary: Visualizza tutti gli ordini inviati alla cucina del ristorante
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Elenco ordini ricevuti
 *       403:
 *         description: Accesso negato (solo ristoratori)
 */

// ============================================================================
// ROTTA 3: ORDINI RICEVUTI (GET /api/orders/restaurant-orders)
// ============================================================================
router.get('/restaurant-orders', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    // Trova gli ordini destinati a questo ristorante e mostra chi li ha ordinati
    const orders = await Order.find({ restaurant: req.user.id })
      .populate('customer', 'name surname email')
      .sort({ createdAt: -1 });

    res.status(200).json(orders);

  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero degli ordini del ristorante.", error: error.message });
  }
});


// ============================================================================
// DOCUMENTAZIONE SWAGGER: 4. GESTIONE AVANZAMENTO STATO ORDINE
// ============================================================================
/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Aggiorna lo stato di un ordine (Solo Ristoratore)
 *     description: Permette al ristoratore di avanzare lo stato (ordinato -> in preparazione -> consegnato).
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco dell'ordine da aggiornare
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
 *         description: Stato aggiornato con successo
 *       404:
 *         description: Ordine non trovato o non appartenente al ristorante
 */

// ============================================================================
// ROTTA 4: AGGIORNAMENTO STATO (PATCH /api/orders/:id/status)
// ============================================================================
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const { status } = req.body;

    // Aggiorna solo se l'ordine appartiene effettivamente a questo ristoratore
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
// DOCUMENTAZIONE SWAGGER: 5. STATISTICHE DI VENDITA
// ============================================================================
/**
 * @swagger
 * /api/orders/restaurant-stats:
 *   get:
 *     summary: Visualizza incassi complessivi e lista dei piatti più venduti (Solo Ristoratore)
 *     tags: [Ordini]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiche aggregate calcolate con successo
 */

// ============================================================================
// ROTTA 5: STATISTICHE DEL RISTORANTE (GET /api/orders/restaurant-stats)
// ============================================================================
router.get('/restaurant-stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    // 1. Calcolo del venduto per singolo piatto tramite Aggregation Pipeline
    const dishesStats = await Order.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(req.user.id),
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

    // 2. Calcolo complessivo totale incassato e numero ordini chiusi
    const summaryStats = await Order.aggregate([
      {
        $match: {
          restaurant: new mongoose.Types.ObjectId(req.user.id),
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

    res.status(200).json({
      summary: summaryStats.length > 0 ? summaryStats[0] : { totalRevenue: 0, totalOrdersCompleted: 0 },
      dishesSold: dishesStats
    });

  } catch (error) {
    res.status(500).json({ message: "Errore nel calcolo delle statistiche.", error: error.message });
  }
});

module.exports = router;