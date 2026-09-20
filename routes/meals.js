// routes/meals.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Meal = require('../models/Meal');
const authMiddleware = require('../middleware/auth');

// ============================================================================
// 1. RICERCA E CATALOGO PIATTI
// ============================================================================
/**
 * @swagger
 * /api/meals:
 *   get:
 *     summary: Recupera i piatti con filtri di ricerca opzionali
 *     description: Permette di visualizzare tutti i piatti o filtrarli per nome, categoria, origine geografica, prezzo massimo, ingrediente o ristorante.
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
 *       - in: query
 *         name: restaurantId
 *         schema:
 *           type: string
 *         description: Filtra piatti associati a uno specifico ristorante
 *     responses:
 *       200:
 *         description: Array di piatti trovato con successo
 *       500:
 *         description: Errore del server
 */
router.get('/', async (req, res) => {
  try {
    const { name, category, area, maxPrice, ingredient, restaurantId } = req.query; // Estrae i parametri di query dalla richiesta
    let filter = {};  // Oggetto filtro iniziale vuoto, se ne aggiungono le condizioni in base ai parametri di query

    if (name && name.trim() !== '') { // se name è fatto di spazi bianchi o è vuoto, non aggiunge il filtro
      filter.strMeal = { $regex: name.trim(), $options: 'i' };
      // $regex: crea un'espressione regolare per la ricerca parziale, $options: 'i' rende la ricerca case-insensitive
    }
    if (category && category.trim() !== '') {
      filter.strCategory = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
      // ^ e $ assicurano che la categoria corrisponda esattamente, ma senza considerare maiuscole/minuscole, non posso 
      //cercare una categoria parziale, ad esempio "Beef" non corrisponderà a "Beefy" o "Beefsteak"
    }
    if (area && area.trim() !== '') {
      filter.strArea = { $regex: new RegExp(`^${area.trim()}$`, 'i') };
      // ^ e $ assicurano che l'area corrisponda esattamente, ma senza considerare maiuscole/minuscole
      //questo perchè le etichette di area sono standardizzate e non voglio che "Italian" corrisponda a "Italiano" o "Italiana"
    }
    if (maxPrice && !isNaN(maxPrice)) { //isNa (isNotANumber) verifica se il valore non è un numero, se lo è, aggiunge il filtro per il prezzo massimo
      filter.price = { $lte: Number(maxPrice) };  // $lte: "less than or equal", quindi il prezzo del piatto deve essere minore o uguale al prezzo massimo specificato
    }
    if (ingredient && ingredient.trim() !== '') {
      filter.ingredients = { $elemMatch: { $regex: ingredient.trim(), $options: 'i' } };
      // $elemMatch: cerca all'interno dell'array ingredients, $regex: ricerca parziale case-insensitive
      // questo permette di trovare piatti che contengono l'ingrediente specificato in qualsiasi posizione dell'array
    }

    const restaurants = await User.find({ role: 'restaurant' })
      .select('_id restaurantName name restaurantAddress restaurantPhone restaurantMenu') 
      .lean();
    // seleziona campi specifici per l'utente trovato, lean() restituisce oggetti JavaScript semplici invece di documenti Mongoose, migliorando le prestazioni
    const mealRestaurantsMap = new Map();
    //crea una mappa per associare ogni piatto ai ristoranti che lo offrono, la chiave è l'id del piatto e il valore è un array di ristoranti

    restaurants.forEach(r => {  //per ogni ristorante
      const restInfo = {
        _id: r._id,
        name: r.restaurantName || r.name || 'Ristorante Partner',
        address: r.restaurantAddress || 'Ritiro al bancone',
        phone: r.restaurantPhone || ''
      }; //info essenziali

      if (Array.isArray(r.restaurantMenu)) {  //se un ristorante non ha un menu, non lo considera
        const uniqueMealIds = [...new Set(r.restaurantMenu.map(id => String(id)))]; //array di id unici dei piatti nel menu del ristorante, convertiti in stringhe per evitare problemi di confronto
        uniqueMealIds.forEach(mId => {  //per ogni id di piatto unico nel menu del ristorante
          if (!mealRestaurantsMap.has(mId)) { //se la mappa non ha ancora l'id del piatto, crea un nuovo array vuoto associato a quell9'id
            mealRestaurantsMap.set(mId, []);
          }
          const exists = mealRestaurantsMap.get(mId).some(x => String(x._id) === String(r._id));
          //scorre l'array dei ristoranti associati a quel piatto per verificare se il ristorante corrente è già presente, confrontando gli id come stringhe
          //r._id è l'id del ristorante corrente, x._id è l'id del ristorante già presente nell'array associato al piatto
          if (!exists) {
            mealRestaurantsMap.get(mId).push(restInfo);
          }
        });
      }
    });//fine forEach ristoranti

    if (restaurantId && restaurantId.trim() !== '') { //controola che rID non sia vuoto o fatto di spazi bianchi
      const targetRest = restaurants.find(r => String(r._id) === String(restaurantId.trim()));  
      const validMealIds = targetRest && Array.isArray(targetRest.restaurantMenu) //controlla che il ristorante esista e abbia un menu
        ? [...new Set(targetRest.restaurantMenu.map(String))] //map(string) converte ogni id in stringa, Set rimuove duplicati
        : []; //se non esiste, crea un array vuoto, 
      filter._id = { $in: validMealIds }; //cerca solo i piatti il cui id è presente nell'array validMealIds, quindi solo i piatti offerti dal ristorante specificato
    }
    //serve a filtrare i piatti in base al ristorante specificato, se viene fornito un restaurantId valido. La mappa è stata creata appositamente per fare questo.
    //utile x scelta del ristorante in cui si vuole ordinare o per filtrare i piatti di un ristorante specifico nella ricerca avanzata

    const meals = await Meal.find(filter).lean(); //cerca i piatti nel database in base ai filtri costruiti dinamicamente
    const seenMealIds = new Set();  //tiene traccia degli id di piatti gia analizzati
    const enrichedMeals = []; //array finale di piatti arricchiti con info sui ristoranti disponibili, prezzo e tempo di preparazione

    meals.forEach(meal => { 
      const mId = String(meal._id);//prende i piatti filtrati, li cicla facedendo si che on ci siano duplicati(mettendoli in seeenMealIds)
      if (seenMealIds.has(mId)) return; //il piatto 
      seenMealIds.add(mId);

      const available = mealRestaurantsMap.get(mId) || [];  //prende l'array di tutti i ristoranti assegnati a questo piatto, se nessuno lo vende, crea un array vuoto

      let resolvedPrice = 8.50;
      if (meal.price !== undefined && meal.price !== null && !isNaN(meal.price) && Number(meal.price) > 0) {
        resolvedPrice = Number(meal.price); //se il prezzo è valido, lo usa come prezzo del piatto
      } else if (meal.strPrice && !isNaN(meal.strPrice) && Number(meal.strPrice) > 0) {
        resolvedPrice = Number(meal.strPrice);  //se il prezzo non è valido, ma esiste strPrice, lo usa come prezzo del piatto
      }//nel caso il prezzo sia salvatop come stringa, lo converte in numero e lo usa come prezzo del piatto

      enrichedMeals.push({  //aggiunge il piatto arricchito all'array finale
        ...meal,  //spread operator per copiare tutte le proprietà del piatto originale
        price: resolvedPrice,
        preparationTime: Number(meal.preparationTime) || 15,
        availableRestaurants: available,
        isAvailable: available.length > 0
      });
    });

    res.status(200).json(enrichedMeals);
  } catch (error) {
    console.error("Errore recupero piatti:", error);
    res.status(500).json({ message: "Errore durante il recupero dei piatti.", error: error.message });
  }
});

// ============================================================================
// 2. CATEGORIE UNICHE
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
router.get('/categories', async (req, res) => { //MIDDLEWARE: non richiede autenticazione, è pubblico, serve per la ricerca avanzata e per la bacheca consigliata
  try {
    const categories = await Meal.distinct('strCategory');  //estrae tutte le categorie uniche
    const validCategories = categories.filter(cat => cat && cat.trim() !== ''); //cat controlla che la categoria non sia vuota o fatta di spazi bianchi
    res.status(200).json(validCategories);
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero delle categorie", error: error.message });
  }
});

// ============================================================================
// 3. BACHECA CONSIGLIATI (SOLO CLIENTI)
// ============================================================================
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
    if (req.user.role !== 'customer') { //controllo RBAC: se l'utente non è un cliente, non può accedere alla bacheca consigliata
      return res.status(403).json({ message: "La bacheca personalizzata è riservata ai clienti." });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.favoriteCategory) {  //se l'utente non ha una categoria preferita, restituisce un messaggio e alcuni piatti in evidenza
      return res.status(200).json({ 
        message: "Nessuna preferenza impostata. Ecco alcuni piatti in evidenza.",
        recommendations: await Meal.find().limit(6) //restituisce 6 piatti a caso dal catalogo, senza filtri
      });
    }

    const recommendedMeals = await Meal.find({
      strCategory: new RegExp(`^${user.favoriteCategory}$`, 'i')  //cerca piatti che corrispondono esattamente alla categoria preferita dell'utente, senza considerare maiuscole/minuscole
    }).limit(16);

    res.status(200).json({  //invio oggetto json
      favoriteCategory: user.favoriteCategory,
      count: recommendedMeals.length,
      recommendations: recommendedMeals
    });
  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dei piatti consigliati.", error: error.message });
  }
});

// ============================================================================
// 4. DETTAGLIO SINGOLO PIATTO
// ============================================================================
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
 *         description: ID MongoDB (_id) oppure codice piatto (idMeal)
 *     responses:
 *       200:
 *         description: Dettagli del piatto recuperati con successo
 *       400:
 *         description: ID non valido o mancante
 *       404:
 *         description: Piatto non trovato
 */
router.get('/:id', async (req, res) => {  //:id è un parametro dinamico che rappresenta l'id del piatto da recuperare
  try {
    const { id } = req.params;  //estrae l'id del piatto dai parametri della richiesta

    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: "ID piatto mancante o non valido." });
    }

    let meal = null;
    if (mongoose.Types.ObjectId.isValid(id)) {  //controlla se l'id è un ObjectId valido di MongoDB
      meal = await Meal.findById(id).lean();  //se l'id è valido, cerca il piatto nel database usando findByID
    }
    if (!meal) {  //ricerca il piatto anche usando l'idMeal, nel caso in cui l'id fornito non sia un ObjectId valido ma un codice piatto esterno(importrandolo da un dataset esterno)
      meal = await Meal.findOne({ idMeal: id }).lean();
    }
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo." });
    }

    const matchingRestaurants = await User.find({
      role: 'restaurant',
      restaurantMenu: meal._id  //cerca tutti i ristoranti che hanno questo piatto nel loro menu
    }).select('_id restaurantName name restaurantAddress restaurantPhone').lean();  //seleziona solo campi essenziali

    meal.availableRestaurants = matchingRestaurants.map(r => ({ //crea una proprietà del piatto avaibleRestaurants
      _id: r._id,
      name: r.restaurantName || r.name || 'Ristorante Partner',
      address: r.restaurantAddress || 'Ritiro al bancone',
      phone: r.restaurantPhone || ''
    })); //prende i ristoranti nell'array e li mappa in modo che ogni ristorante abbiamo id, nome, idnirizzo e telefono

    meal.restaurant = meal.availableRestaurants.length > 0 ? meal.availableRestaurants[0] : null;
    //crea proprietà, se l'array dei ristoranti disponibili non è vuoto, prende il primo ristorante come riferimento, altrimenti lo imposta a null
    //x facilitare la visualizzazione del piatto in dettaglio, mostrando il primo ristorante disponibile come riferimento

    if (!meal.price || isNaN(meal.price) || Number(meal.price) <= 0) {  //controlla se il prezzo del piatto è valido 
      meal.price = Number(meal.strPrice) || 8.50;   //se non valido, cerca di usare strPrice come prezzo, altrimenti imposta il prezzo a 8.50 come default
    } else {  
      meal.price = Number(meal.price);  //se valido, mette il prezzo indicato in meal.price
    }
    meal.preparationTime = Number(meal.preparationTime) || 15;  //se il tempo di preparazione non è valido, lo imposta a 15 minuti come default

    res.status(200).json(meal);
  } catch (error) {
    console.error("Errore recupero piatto:", error);
    res.status(500).json({ message: "Errore nel recupero del piatto.", error: error.message });
  }
});

// ============================================================================
// 5. CREAZIONE PIATTO GENERALE ADMIN
// ============================================================================
/**
 * @swagger
 * /api/meals:
 *   post:
 *     summary: Inserisce un nuovo piatto nel catalogo globale di sistema (Solo Admin)
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
 *             properties:
 *               strMeal:
 *                 type: string
 *                 example: "Cheeseburger Classico"
 *               strCategory:
 *                 type: string
 *                 example: "Beef"
 *               strArea:
 *                 type: string
 *                 example: "American"
 *               strInstructions:
 *                 type: string
 *                 example: "Cuocere e assemblare."
 *               price:
 *                 type: number
 *                 example: 8.50
 *               preparationTime:
 *                 type: number
 *                 example: 10
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Manzo", "Cheddar", "Pane"]
 *               measures:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["150g", "1 fetta", "1"]
 *               strMealThumb:
 *                 type: string
 *                 example: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd"
 *     responses:
 *       201:
 *         description: Piatto globale inserito nel catalogo con successo
 *       403:
 *         description: Accesso negato (solo Admin)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Accesso negato: solo l'amministratore può inserire piatti nel catalogo globale." });
    }

    const {
      idMeal,
      strMeal,
      strMealAlternate,
      strCategory,
      strArea,
      strInstructions,
      strMealThumb,
      strTags,
      strYoutube,
      ingredients,
      measures,
      price,
      preparationTime
    } = req.body; //estrae i campi dal corpo della richiesta, che devono essere forniti in formato JSON

    const newMeal = new Meal({
      idMeal: idMeal || undefined,
      strMeal,
      strMealAlternate: strMealAlternate || null,
      strCategory,
      strArea: strArea || "General",
      strInstructions: strInstructions || "",
      strMealThumb: strMealThumb || "",
      strTags: strTags || null,
      strYoutube: strYoutube || "",
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      measures: Array.isArray(measures) ? measures : [],
      price: price !== undefined && !isNaN(price) ? Number(price) : 8.50,
      preparationTime: preparationTime !== undefined && !isNaN(preparationTime) ? Number(preparationTime) : 15,
      restaurantId: null // Nessun proprietario: appartiene al dataset comune
    });//crea un nuovo oggetto Meal con i campi forniti, se alcuni campi non sono forniti, vengono impostati valori di default

    const savedMeal = await newMeal.save(); //attente il salvataggio del nuovo piatto nel database, restituisce il piatto salvato con l'id generato da MongoDB
    res.status(201).json({ message: "Piatto globale creato con successo!", meal: savedMeal });
  } catch (error) {
    res.status(500).json({ message: "Errore durante la creazione del piatto.", error: error.message });
  }
});

// ============================================================================
// 6. MODIFICA PIATTO
// ============================================================================
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
 *         description: ID univoco del piatto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
    if (req.user.role !== 'admin' && req.user.role !== 'restaurant') {  //controllo RBAC: se l'utente non è admin o ristorante, non può modificare il piatto
      return res.status(403).json({ message: "Accesso negato: permessi insufficienti." });
    }

    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato nel catalogo." });
    }

    if (req.user.role === 'restaurant') {
      const user = await User.findById(req.user.id);
      const isOwner = user && Array.isArray(user.restaurantMenu) && user.restaurantMenu.some(id => String(id) === String(meal._id));
      //controlla se l'utente ristorante è il proprietario del piatto, confrontando gli id dei piatti nel menu del ristorante con l'id del piatto da modificare
      //some controlla se almeno un elemento dell'array soddisfa la condizione, in questo caso se l'id del piatto corrisponde a quello del menu del ristorante
      if (!isOwner && String(meal.restaurantId) !== String(req.user.id)) {  //controlla anche se l'id del ristorante proprietario del piatto corrisponde all'id dell'utente ristorante che sta tentando di modificare il piatto
        return res.status(403).json({ message: "Non hai i permessi per modificare questo piatto." });
      }
    }

    const updatedMeal = await Meal.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, //aggiorna il piatto con i campi forniti nel corpo della richiesta, $set: aggiorna solo i campi specificati senza sovrascrivere l'intero documento
      { returnDocument: 'after' } //opzione per restituire il documento aggiornato dopo la modifica, invece del documento originale
    );

    res.status(200).json({ message: "Piatto modificato con successo!", meal: updatedMeal });
  } catch (error) {
    res.status(500).json({ message: "Errore nella modifica del piatto.", error: error.message });
  }
});

// ============================================================================
// 7. ELIMINAZIONE PIATTO
// ============================================================================
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
 *         description: ID del piatto da cancellare
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
      return res.status(403).json({ message: "Accesso negato: permessi insufficienti." });
    }

    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: "Piatto non trovato." });
    }
    //se il ruolo è admin , può eliminare qualsiasi piatto, altrimenti se è un ristorante, deve essere il proprietario del piatto per poterlo eliminare
    if (req.user.role === 'restaurant') {
      const user = await User.findById(req.user.id);
      const isOwner = user && Array.isArray(user.restaurantMenu) && user.restaurantMenu.some(id => String(id) === String(meal._id));
      if (!isOwner && String(meal.restaurantId) !== String(req.user.id)) {
        return res.status(403).json({ message: "Non hai i permessi per eliminare questo piatto." });  //stessa cosa della modifica
      }
      await User.findByIdAndUpdate(req.user.id, { $pull: { restaurantMenu: req.params.id } });
      //rimuove l'id del piatto dal menu del ristorante, $pull: rimuove un elemento specifico da un array, in questo caso l'id del piatto eliminato
    } 

    await Meal.findByIdAndDelete(req.params.id);  //elimina il piatto dal database, findByIdAndDelete: trova il documento per id e lo elimina, restituendo il documento eliminato se necessario
    res.status(200).json({ message: "Piatto eliminato definitivamente.", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Errore durante l'eliminazione del piatto.", error: error.message });
  }
});

module.exports = router;