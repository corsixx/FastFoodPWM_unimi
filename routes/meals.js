const express = require('express');
const router = express.Router();
const Meal = require('../models/Meal'); // Importa il modello Mongoose per eseguire query sul database

/**
 * @swagger
 * /api/meals:
 *   get:
 *     summary: Recupera l'elenco dei piatti con filtri opzionali
 *     description: Endpoint per visualizzare il menu o filtrare i piatti per nome, categoria, area geografica, prezzo massimo o ingrediente.
 *     tags: [Piatti]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Ricerca testuale parziale sul nome del piatto (case-insensitive)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtra per categoria (es. Beef, Chicken, Dessert, Pasta)
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *         description: Filtra per cucina/nazione (es. Italian, British, Mexican)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Prezzo massimo del piatto
 *       - in: query
 *         name: ingredient
 *         schema:
 *           type: string
 *         description: Ricerca piatti che contengono uno specifico ingrediente
 *     responses:
 *       200:
 *         description: Elenco dei piatti recuperato con successo
 *       500:
 *         description: Errore interno del server durante l'interrogazione del database
 */
router.get('/', async (req, res) => {
    try {
        // 1. Estraiamo i parametri inviati tramite Query String (es. /api/meals?name=beef&maxPrice=15)
        const { name, category, area, maxPrice, ingredient } = req.query;
        
        // 2. Creiamo un oggetto filtro vuoto per comporre la query MongoDB in modo dinamico
        let filter = {};

        // 3. Se l'utente specifica un nome, applichiamo una Regular Expression per ricerca parziale e non sensibile al maiuscolo/minuscolo
        if (name) {
            filter.strMeal = { $regex: name, $options: 'i' };
        }

        // 4. Se è richiesta una specifica categoria (es. "Dessert"), filtriamo sul campo strCategory
        if (category) {
            filter.strCategory = { $regex: new RegExp(`^${category}$`, 'i') };
        }

        // 5. Se è richiesta una cucina specifica (es. "Italian"), filtriamo sul campo strArea
        if (area) {
            filter.strArea = { $regex: new RegExp(`^${area}$`, 'i') };
        }

        // 6. Se è specificato un prezzo massimo, cerchiamo piatti con prezzo minore o uguale ($lte: Less Than or Equal)
        if (maxPrice) {
            filter.price = { $lte: Number(maxPrice) };
        }

        // 7. Se è richiesto un ingrediente, cerchiamo all'interno dell'array "ingredients" con corrispondenza parziale
        if (ingredient) {
            filter.ingredients = { $elemMatch: { $regex: ingredient, $options: 'i' } };
        }

        // 8. Eseguiamo la query su MongoDB passando l'oggetto filter
        const meals = await Meal.find(filter);

        // 9. Restituiamo al client la lista dei piatti trovati in formato JSON con status HTTP 200 (OK)
        res.status(200).json(meals);

    } catch (error) {
        // In caso di problemi di connessione o sintassi query, restituiamo status 500
        res.status(500).json({ 
            message: "Errore durante il recupero dei piatti dal database.", 
            error: error.message 
        });
    }
});

module.exports = router;