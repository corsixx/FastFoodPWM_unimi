const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Meal = require('../models/Meal');
const authMiddleware = require('../middleware/auth'); // Il middleware JWT già creato

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Cerca ristoranti per nome o luogo
 *     tags: [Ristoranti]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Ricerca per nome del ristorante
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Ricerca per luogo/città/indirizzo
 *     responses:
 *       200:
 *         description: Lista ristoranti trovati
 */
router.get('/', async (req, res) => {
  try {
    const { name, city } = req.query;
    let filter = { role: 'ristoratore' };

    if (name && name.trim() !== '') {
      filter.restaurantName = { $regex: name.trim(), $options: 'i' };
    }
    if (city && city.trim() !== '') {
      filter.address = { $regex: city.trim(), $options: 'i' };
    }

    // Seleziona solo i dati pubblici del ristorante escludendo la password
    const restaurants = await User.find(filter).select('-password');
    res.status(200).json(restaurants);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero ristoranti.", error: error.message });
  }
});

/**
 * @swagger
 * /api/restaurants/{id}/menu:
 *   get:
 *     summary: Visualizza il menu completo di un ristorante specifico
 *     tags: [Ristoranti]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del ristorante
 *     responses:
 *       200:
 *         description: Menu del ristorante recuperato con successo
 *       404:
 *         description: Ristorante non trovato
 */
router.get('/:id/menu', async (req, res) => {
  try {
    // .populate('menu') sostituisce gli ID dei pasti con l'intero oggetto del piatto
    const restaurant = await User.findOne({ _id: req.params.id, role: 'ristoratore' })
      .populate('menu')
      .select('-password');

    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato." });
    }

    res.status(200).json({
      restaurantName: restaurant.restaurantName,
      address: restaurant.address,
      menu: restaurant.menu
    });
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero del menu.", error: error.message });
  }
});

/**
 * @swagger
 * /api/restaurants/menu/add-existing:
 *   post:
 *     summary: Aggiunge un piatto del catalogo comune al proprio menu (Solo Ristoratore)
 *     tags: [Ristoranti]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mealId
 *             properties:
 *               mealId:
 *                 type: string
 *                 description: ID del piatto preso dal catalogo comune
 *     responses:
 *       200:
 *         description: Piatto aggiunto con successo al menu
 *       403:
 *         description: Accesso negato (utente non ristoratore)
 */
router.post('/menu/add-existing', authMiddleware, async (req, res) => {
  try {
    // req.user arriva dal token JWT verificato nel middleware
    if (req.user.role !== 'ristoratore') {
      return res.status(403).json({ message: "Operazione consentita solo ai ristoratori." });
    }

    const { mealId } = req.body;
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo." });
    }

    // Aggiunge l'ID all'array menu evitando duplicati ($addToSet)
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { menu: mealId } },
      { new: true }
    ).select('-password');

    res.status(200).json({ message: "Piatto aggiunto al menu con successo!", menu: updatedUser.menu });
  } catch (error) {
    res.status(500).json({ message: "Errore nell'aggiornamento del menu.", error: error.message });
  }
});

/**
 * @swagger
 * /api/restaurants/menu/create-custom:
 *   post:
 *     summary: Crea un piatto personalizzato e lo inserisce nel proprio menu (Solo Ristoratore)
 *     tags: [Ristoranti]
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
 *               - strCategory
 *               - price
 *             properties:
 *               strMeal:
 *                 type: string
 *               strCategory:
 *                 type: string
 *               price:
 *                 type: number
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *               strMealThumb:
 *                 type: string
 *     responses:
 *       201:
 *         description: Piatto personalizzato creato e inserito nel menu
 */
router.post('/menu/create-custom', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ristoratore') {
      return res.status(403).json({ message: "Operazione consentita solo ai ristoratori." });
    }

    const { strMeal, strCategory, price, ingredients, strMealThumb } = req.body;

    // 1. Crea il nuovo piatto associando il restaurantId
    const newMeal = new Meal({
      strMeal,
      strCategory,
      price,
      ingredients: ingredients || [],
      strMealThumb: strMealThumb || "",
      restaurantId: req.user.id
    });
    const savedMeal = await newMeal.save();

    // 2. Aggiunge subito il nuovo piatto al menu del ristoratore
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { menu: savedMeal._id } });

    res.status(201).json({ message: "Piatto personalizzato creato!", meal: savedMeal });
  } catch (error) {
    res.status(500).json({ message: "Errore nella creazione del piatto.", error: error.message });
  }
});

module.exports = router;