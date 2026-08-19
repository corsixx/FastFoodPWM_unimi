const express = require('express');
const router = express.Router();
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

module.exports = router;