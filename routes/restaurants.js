const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Meal = require('../models/Meal');
const authMiddleware = require('../middleware/auth');

// ******************************************************************************
// 1. RICERCA E CATALOGO RISTORANTI
// ******************************************************************************

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
 *         description: Ricerca testuale per nome del ristorante
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Ricerca per città o indirizzo
 *     responses:
 *       200:
 *         description: Elenco ristoranti recuperato con successo
 */
router.get('/', async (req, res) => {
  try {
    const { name, city } = req.query;

    // Filtriamo alla radice: consideriamo solo gli account con ruolo 'restaurant'
    let filter = { role: 'restaurant' };

    // $regex permette la ricerca parziale (es. "mil" trova "Milano"), 'i' ignora maiuscole/minuscole
    if (name && name.trim() !== '') {
      filter.restaurantName = { $regex: name.trim(), $options: 'i' };
    }
    if (city && city.trim() !== '') {
      filter.restaurantAddress = { $regex: city.trim(), $options: 'i' };
    }

    // select('-password') esclude l'hash della password dai dati inviati al client
    const restaurants = await User.find(filter).select('-password');
    res.status(200).json(restaurants);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dei ristoranti.", error: error.message });
  }
});


// ******************************************************************************
// 2. RECUPERO DEL MENU DI UN SINGOLO RISTORANTE
// ******************************************************************************

/**
 * @swagger
 * /api/restaurants/{id}/menu:
 *   get:
 *     summary: Visualizza il menu completo di uno specifico ristorante
 *     tags: [Ristoranti]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco del ristorante
 *     responses:
 *       200:
 *         description: Dati del ristorante e lista piatti nel menu
 *       404:
 *         description: Ristorante non trovato
 */
router.get('/:id/menu', async (req, res) => {
  try {
    // .populate('restaurantMenu') trasforma l'array di soli ID in oggetti piatto completi (nome, prezzo, foto)
    const restaurant = await User.findOne({ _id: req.params.id, role: 'restaurant' })
      .populate('restaurantMenu')
      .select('-password');

    if (!restaurant) {
      return res.status(404).json({ message: "Ristorante non trovato." });
    }

    res.status(200).json({
      restaurantName: restaurant.restaurantName,
      restaurantAddress: restaurant.restaurantAddress,
      menu: restaurant.restaurantMenu
    });
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero del menu.", error: error.message });
  }
});


// ******************************************************************************
// 3. GESTIONE MENU: AGGIUNTA PIATTO DAL CATALOGO GENERALE
// ******************************************************************************

/**
 * @swagger
 * /api/restaurants/menu/add-existing:
 *   post:
 *     summary: Aggiunge un piatto dal catalogo comune al proprio menu (Solo Ristoratori)
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
 *                 description: ID del piatto dal dataset comune
 *     responses:
 *       200:
 *         description: Piatto inserito nel menu con successo
 *       403:
 *         description: Accesso negato (non sei un ristoratore)
 */
router.post('/menu/add-existing', authMiddleware, async (req, res) => {
  try {
    // Controllo di autorizzazione basato sul ruolo estratto dal token JWT
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Operazione consentita solo ai ristoratori." });
    }

    const { mealId } = req.body;
    const meal = await Meal.findById(mealId);
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo comune." });
    }

    // $addToSet inserisce l'ID solo se non è già presente, prevenendo voci duplicate a menu
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { restaurantMenu: mealId } },
      { new: true }
    ).select('-password');

    res.status(200).json({ message: "Piatto aggiunto al menu!", menu: updatedUser.restaurantMenu });
  } catch (error) {
    res.status(500).json({ message: "Errore nell'aggiornamento del menu.", error: error.message });
  }
});


// ******************************************************************************
// 4. GESTIONE MENU: CREAZIONE PIATTO PERSONALIZZATO
// ******************************************************************************

/**
 * @swagger
 * /api/restaurants/menu/create-custom:
 *   post:
 *     summary: Crea un nuovo piatto personalizzato e lo inserisce nel menu (Solo Ristoratori)
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
 *         description: Piatto creato e collegato al ristorante
 */
router.post('/menu/create-custom', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ message: "Operazione consentita solo ai ristoratori." });
    }

    const { strMeal, strCategory, price, ingredients, strMealThumb } = req.body;

    // 1. Salvataggio della nuova pietanza associandola all'ID del ristoratore
    const newMeal = new Meal({
      strMeal,
      strCategory,
      price,
      ingredients: ingredients || [],
      strMealThumb: strMealThumb || "",
      restaurantId: req.user.id
    });
    const savedMeal = await newMeal.save();

    // 2. Collegamento immediato del piatto appena creato al menu del ristoratore
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { restaurantMenu: savedMeal._id } });

    res.status(201).json({ message: "Piatto personalizzato creato con successo!", meal: savedMeal });
  } catch (error) {
    res.status(500).json({ message: "Errore durante la creazione del piatto.", error: error.message });
  }
});

module.exports = router;