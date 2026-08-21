const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const Meal = require('../models/Meal');

// *****************************************************************************
// RICERCA E CATALOGO PIATTI (Supporta anche restaurantId)
// *****************************************************************************
/**
 * @swagger
 * /api/meals:
 *   get:
 *     summary: Recupera i piatti con filtri di ricerca opzionali
 *     tags: [Piatti]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Ricerca parziale sul nome del piatto
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: ingredient
 *         schema:
 *           type: string
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *         description: Filtra i piatti per uno specifico ristorante
 *     responses:
 *       200:
 *         description: Array di piatti trovato con successo
 *       500:
 *         description: Errore del server
 */
router.get('/', async (req, res) => {
  try {
    const { name, category, area, maxPrice, ingredient, restaurantId } = req.query;
    let filter = {};

    // 1. Filtro per ristorante specifico
    if (restaurantId && restaurantId.trim() !== '') {
      const rId = restaurantId.trim();
      const objId = mongoose.Types.ObjectId.isValid(rId) ? new mongoose.Types.ObjectId(rId) : null;
      
      filter.$or = [
        { restaurantId: rId },
        { restaurant: rId },
        { "availableRestaurants._id": rId }
      ];

      if (objId) {
        filter.$or.push(
          { restaurantId: objId },
          { restaurant: objId },
          { "availableRestaurants._id": objId }
        );
      }
    }

    // 2. Filtro per nome (case-insensitive)
    if (name && name.trim() !== '') {
      filter.strMeal = { $regex: name.trim(), $options: 'i' };
    }

    // 3. Filtro per categoria esatta
    if (category && category.trim() !== '') {
      filter.strCategory = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // 4. Filtro per cucina/area
    if (area && area.trim() !== '') {
      filter.strArea = { $regex: new RegExp(`^${area.trim()}$`, 'i') };
    }

    // 5. Filtro per prezzo massimo
    if (maxPrice && !isNaN(maxPrice)) {
      filter.price = { $lte: Number(maxPrice) };
    }

    // 6. Ricerca per ingrediente dentro l'array ingredients
    if (ingredient && ingredient.trim() !== '') {
      filter.ingredients = { $elemMatch: { $regex: ingredient.trim(), $options: 'i' } };
    }

    const meals = await Meal.find(filter);
    res.status(200).json(meals);

  } catch (error) {
    res.status(500).json({ 
      message: "Errore durante il recupero dei piatti.", 
      error: error.message 
    });
  }
});

// ============================================================================
// RECUPERO CATEGORIE UNICHE DAL DATABASE
// ============================================================================
/**
 * @swagger
 * /api/meals/categories:
 *   get:
 *     summary: Recupera l'elenco di tutte le categorie uniche presenti a catalogo
 *     tags: [Piatti]
 *     responses:
 *       200:
 *         description: Array di stringhe con i nomi delle categorie
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Meal.distinct('strCategory');
    const validCategories = categories.filter(cat => cat && cat.trim() !== '');
    res.status(200).json(validCategories);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero delle categorie", error: error.message });
  }
});

// ******************************************************************************
// BACHECA: PIATTI CONSIGLIATI (SOLO CLIENTI)
// ******************************************************************************
/**
 * @swagger
 * /api/meals/recommendations:
 *   get:
 *     summary: Recupera i piatti consigliati per la bacheca in base alla categoria preferita
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista dei piatti raccomandati recuperata con successo
 *       403:
 *         description: Accesso riservato ai clienti registrati
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: "La bacheca personalizzata è riservata ai clienti." });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.favoriteCategory) {
      return res.status(200).json({ 
        message: "Nessuna preferenza impostata. Ecco alcuni piatti casuali in evidenza.",
        recommendations: await Meal.find().limit(6)
      });
    }

    const recommendedMeals = await Meal.find({
      strCategory: new RegExp(`^${user.favoriteCategory}$`, 'i')
    }).limit(10);

    res.status(200).json({
      favoriteCategory: user.favoriteCategory,
      count: recommendedMeals.length,
      recommendations: recommendedMeals
    });

  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dei piatti consigliati.", error: error.message });
  }
});

// ******************************************************************************
// DETTAGLIO SINGOLO PIATTO
// ******************************************************************************
/**
 * @swagger
 * /api/meals/{id}:
 *   get:
 *     summary: Recupera le informazioni dettagliate di un singolo piatto
 *     tags: [Piatti]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dettagli del piatto recuperati con successo
 *       404:
 *         description: Piatto non trovato
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: "ID piatto mancante o non valido." });
    }

    let meal = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      meal = await Meal.findById(id).lean();
    }

    if (!meal) {
      meal = await Meal.findOne({ idMeal: id }).lean();
    }

    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo." });
    }

    let restData = null;
    const restId = meal.restaurantId || meal.restaurant;

    if (restId && mongoose.Types.ObjectId.isValid(restId)) {
      try {
        restData = await User.findById(restId).select('restaurantName name restaurantAddress restaurantPhone').lean();
      } catch (e) {
        // Silenzioso
      }
    }

    meal.restaurant = restData ? {
      _id: restData._id,
      name: restData.restaurantName || restData.name || 'Ristorante Partner',
      address: restData.restaurantAddress || 'Ritiro presso il locale',
      phone: restData.restaurantPhone || ''
    } : null;

    res.status(200).json(meal);
  } catch (error) {
    console.error("Errore recupero piatto:", error);
    res.status(500).json({ message: "Errore nel recupero del piatto.", error: error.message });
  }
});

// ******************************************************************************
// CREAZIONE PIATTO (Admin e Ristoratori Partner)
// ******************************************************************************
/**
 * @swagger
 * /api/meals:
 *   post:
 *     summary: Inserisce un nuovo piatto nel catalogo (Admin o Ristorante)
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - strMeal
 *               - price
 *     responses:
 *       201:
 *         description: Piatto inserito con successo
 *       403:
 *         description: Accesso negato
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Permesso consentito ad admin e restaurant
    if (req.user.role !== 'admin' && req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso negato: operazione riservata ad amministratori e ristoratori." });
    }

    const mealData = { ...req.body };

    // Se l'utente è un ristorante, assegna automaticamente il suo ID come proprietario
    if (req.user.role === 'restaurant') {
      mealData.restaurantId = req.user.id;
    }

    const newMeal = new Meal(mealData);
    const savedMeal = await newMeal.save();

    res.status(201).json(savedMeal);
  } catch (error) {
    res.status(500).json({ message: "Errore durante la creazione del piatto.", error: error.message });
  }
});

// ******************************************************************************
// MODIFICA PIATTO (Admin o Proprietario del Piatto)
// ******************************************************************************
/**
 * @swagger
 * /api/meals/{id}:
 *   put:
 *     summary: Modifica un piatto (Admin o Ristorante proprietario)
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Piatto modificato con successo
 *       403:
 *         description: Non autorizzato a modificare questo piatto
 *       404:
 *         description: Piatto non trovato
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso negato." });
    }

    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo." });
    }

    // Se è un ristorante, può modificare solo i suoi piatti
    if (req.user.role === 'restaurant') {
      const mealRestId = String(meal.restaurantId?._id || meal.restaurantId || meal.restaurant || '');
      if (mealRestId !== String(req.user.id)) {
        return res.status(403).json({ message: "Non hai i permessi per modificare questo piatto." });
      }
    }

    const updatedMeal = await Meal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.status(200).json(updatedMeal);
  } catch (error) {
    res.status(500).json({ message: "Errore nella modifica del piatto.", error: error.message });
  }
});

// ******************************************************************************
// ELIMINAZIONE PIATTO (Admin o Proprietario del Piatto)
// ******************************************************************************
/**
 * @swagger
 * /api/meals/{id}:
 *   delete:
 *     summary: Elimina un piatto (Admin o Ristorante proprietario)
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Piatto eliminato con successo
 *       403:
 *         description: Non autorizzato a eliminare questo piatto
 *       404:
 *         description: Piatto non trovato
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Accesso negato." });
    }

    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato." });
    }

    // Se è un ristorante, può eliminare solo i propri piatti
    if (req.user.role === 'restaurant') {
      const mealRestId = String(meal.restaurantId?._id || meal.restaurantId || meal.restaurant || '');
      if (mealRestId !== String(req.user.id)) {
        return res.status(403).json({ message: "Non hai i permessi per eliminare questo piatto." });
      }
    }

    await Meal.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Piatto eliminato con successo.", id: req.params.id });

  } catch (error) {
    res.status(500).json({ message: "Errore durante l'eliminazione del piatto.", error: error.message });
  }
});

module.exports = router;