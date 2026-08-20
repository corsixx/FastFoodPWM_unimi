const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Modello Mongoose per interrogare la collezione 'users'
const authMiddleware = require('../middleware/auth'); // Assicurati di averlo importato in cima al file
const Meal = require('../models/Meal'); // Modello Mongoose per interrogare la collezione 'meals'

/**
 * @swagger
 * /api/meals:
 *   get:
 *     summary: Recupera i piatti con filtri di ricerca opzionali
 *     description: Permette di visualizzare tutti i piatti o filtrarli per nome, categoria, origine geografica, prezzo massimo o ingrediente.
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
 *         description: Categoria (es. Chicken, Beef, Dessert, Pasta)
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *         description: Area geografica/cucina (es. Italian, British, Mexican)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Prezzo massimo
 *       - in: query
 *         name: ingredient
 *         schema:
 *           type: string
 *         description: Cerca piatti contenenti questo ingrediente
 *     responses:
 *       200:
 *         description: Array di piatti trovato con successo
 *       500:
 *         description: Errore del server
 */
//*****************************************************************************
// RICERCA E CATALOGO PIATTI
// *****************************************************************************
router.get('/', async (req, res) => {
    try {
        const { name, category, area, maxPrice, ingredient } = req.query;
        let filter = {};

        // 1. Filtro per nome (case-insensitive)
        if (name && name.trim() !== '') {
            filter.strMeal = { $regex: name.trim(), $options: 'i' };
        }

        // 2. Filtro per categoria esatta
        if (category && category.trim() !== '') {
            filter.strCategory = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
        }

        // 3. Filtro per cucina/area
        if (area && area.trim() !== '') {
            filter.strArea = { $regex: new RegExp(`^${area.trim()}$`, 'i') };
        }

        // 4. Filtro per prezzo massimo
        if (maxPrice && !isNaN(maxPrice)) {
            filter.price = { $lte: Number(maxPrice) };
        }

        // 5. Ricerca per ingrediente dentro l'array ingredients
        if (ingredient && ingredient.trim() !== '') {
            filter.ingredients = { $elemMatch: { $regex: ingredient.trim(), $options: 'i' } };
        }

        // Esegue la query con i filtri applicati
        const meals = await Meal.find(filter);
        res.status(200).json(meals);

    } catch (error) {
        res.status(500).json({ 
            message: "Errore durante il recupero dei piatti.", 
            error: error.message 
        });
    }
});

// ******************************************************************************
// BACHECA: PIATTI CONSIGLIATI / OFFERTE IN BASE ALLE PREFERENZE (SOLO CLIENTI)
// ******************************************************************************

/**
 * @swagger
 * /api/meals/recommendations:
 *   get:
 *     summary: Recupera i piatti consigliati per la bacheca in base alla categoria preferita
 *     description: Legge la preferenza (favoriteCategory) impostata nel profilo del cliente autenticato e restituisce i piatti corrispondenti.
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista dei piatti raccomandati recuperata con successo
 *       400:
 *         description: L'utente non ha ancora impostato una categoria preferita
 *       403:
 *         description: Accesso riservato ai clienti registrati
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    // 1. Controllo ruolo: solo i clienti hanno preferenze personalizzate per la bacheca
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: "La bacheca personalizzata è riservata ai clienti." });
    }

    // 2. Recuperiamo il profilo dell'utente loggato per leggere la sua preferenza
    const user = await User.findById(req.user.id);
    if (!user || !user.favoriteCategory) {
      return res.status(200).json({ 
        message: "Nessuna preferenza impostata. Ecco alcuni piatti casuali in evidenza.",
        recommendations: await Meal.find().limit(6)
      });
    }

    // 3. Cerchiamo i piatti che appartengono alla sua categoria preferita (es. 'Pasta', 'Beef', 'Vegetarian')
    // Usiamo una RegExp case-insensitive ('i') così trova corrispondenze anche con maiuscole/minuscole diverse
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
// GESTIONE AMMINISTRATORE: CREAZIONE PIATTO GLOBALE
// ******************************************************************************

/**
 * @swagger
 * /api/meals:
 *   post:
 *     summary: Inserisce un nuovo piatto nel catalogo globale (Solo Admin)
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
 *               - strCategory
 *               - price
 *             properties:
 *               strMeal:
 *                 type: string
 *               strCategory:
 *                 type: string
 *               strArea:
 *                 type: string
 *               price:
 *                 type: number
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *               measures:
 *                 type: array
 *                 items:
 *                   type: string
 *               strMealThumb:
 *                 type: string
 *     responses:
 *       201:
 *         description: Piatto globale inserito con successo
 *       403:
 *         description: Operazione riservata agli amministratori
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Controllo di autorizzazione: solo l'admin può intervenire sul catalogo globale
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accesso negato: operazione riservata all'amministratore." });
    }

    const newMeal = new Meal(req.body);
    const savedMeal = await newMeal.save();

    res.status(201).json({ message: "Piatto globale creato!", meal: savedMeal });
  } catch (error) {
    res.status(500).json({ message: "Errore durante la creazione del piatto.", error: error.message });
  }
});


// ******************************************************************************
// GESTIONE AMMINISTRATORE: MODIFICA PIATTO GLOBALE
// ******************************************************************************

/**
 * @swagger
 * /api/meals/{id}:
 *   put:
 *     summary: Modifica qualsiasi piatto nel catalogo globale (Solo Admin)
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco del piatto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Piatto globale modificato con successo
 *       403:
 *         description: Operazione riservata agli amministratori
 *       404:
 *         description: Piatto non trovato
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accesso negato: solo l'amministratore può modificare il catalogo globale." });
    }

    const updatedMeal = await Meal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedMeal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo." });
    }

    res.status(200).json({ message: "Piatto globale modificato!", meal: updatedMeal });
  } catch (error) {
    res.status(500).json({ message: "Errore nella modifica del piatto.", error: error.message });
  }
});


// ******************************************************************************
// GESTIONE AMMINISTRATORE: ELIMINAZIONE PIATTO GLOBALE
// ******************************************************************************

/**
 * @swagger
 * /api/meals/{id}:
 *   delete:
 *     summary: Elimina un piatto dal catalogo globale (Solo Admin)
 *     tags: [Piatti]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del piatto da cancellare
 *     responses:
 *       200:
 *         description: Piatto eliminato dal catalogo
 *       403:
 *         description: Operazione riservata agli amministratori
 *       404:
 *         description: Piatto non trovato
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accesso negato: solo l'amministratore può eliminare piatti globali." });
    }

    const deletedMeal = await Meal.findByIdAndDelete(req.params.id);

    if (!deletedMeal) {
      return res.status(404).json({ message: "Piatto non trovato." });
    }

    res.status(200).json({ message: "Piatto eliminato definitivamente dal catalogo." });
  } catch (error) {
    res.status(500).json({ message: "Errore durante l'eliminazione del piatto.", error: error.message });
  }
});
module.exports = router;