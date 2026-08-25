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
// ROTTA 1: CREAZIONE ORDINE (Algoritmo Greedy List Scheduling)
// ============================================================================
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

    // 2. SIMULAZIONE CODA A MACCHINE PARALLELE
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
      // Assegna il lavoro alla postazione più scarica
      stationLoads[minLoadIndex] += activeOrderMaxPrep;
    }

    // Il ritardo della coda per il nuovo ordine è pari al carico della postazione che si libera per prima
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
// ROTTA 2: STORICO ACQUISTI CLIENTE (Con ricalcolo dinamico)
// ============================================================================
router.get('/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('restaurant', 'restaurantName restaurantAddress restaurantPhone')
      .populate('items.meal')
      .sort({ createdAt: -1 })
      .lean();

    // Recupera TUTTI gli ordini attivi per ricalcolare la coda
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

      // Tempo proprio di cottura
      let myMaxPrep = 10;
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const pTime = it.meal?.preparationTime || 10;
          if (pTime > myMaxPrep) myMaxPrep = pTime;
        }
      }

      // Prendi SOLO gli ordini attivi dello stesso ristorante, ordinati PRIMA di questo
      // (Se un ordine prima di questo è stato consegnato, non apparirà qui dentro!)
      const ordersAhead = activeOrders.filter(ao => 
        String(ao.restaurant) === String(ord.restaurant?._id || ord.restaurant) &&
        new Date(ao.createdAt).getTime() < new Date(ord.createdAt).getTime()
      );

      // Riesegue l'algoritmo di scheduling per calcolare la coda residua
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

      // Minuti trascorsi dalla creazione dell'ordine
      const elapsedMinutes = Math.floor((nowTime - new Date(ord.createdAt).getTime()) / 60000);

      // Tempo residuo = Tempo calcolato ricalcolando la coda - i minuti che hai già aspettato
      ord.currentWaitMinutes = Math.max(1, dynamicTotal - elapsedMinutes);

      return ord;
    });

    res.status(200).json(enrichedOrders);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dello storico acquisti.", error: error.message });
  }
});


// ============================================================================
// ROTTA 3: GESTIONALE COMANDE CUCINA (RISTORATORE)
// ============================================================================
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
// ROTTA 4: CAMBIO STATO MANUALE (RISTORATORE)
// ============================================================================
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
// ROTTA 5: STATISTICHE RISTORANTE E CLASSIFICA
// ============================================================================
router.get('/restaurant-stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso consentito solo ai ristoratori." });
    }

    const currentRestaurantId = new mongoose.Types.ObjectId(req.user.id);

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