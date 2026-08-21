// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Meal = require('../models/Meal');
const authMiddleware = require('../middleware/auth');

// ============================================================================
// ROTTA 1: REGISTRAZIONE UTENTE (POST /api/auth/register)
// ============================================================================
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrazione di un nuovo utente nel sistema
 *     description: Riceve i dati anagrafici, credenziali, preferenze o dati ristorante, cifra la password e crea un documento su MongoDB.
 *     tags: [Autenticazione]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mario
 *               surname:
 *                 type: string
 *                 example: Rossi
 *               email:
 *                 type: string
 *                 example: mario@test.it
 *               password:
 *                 type: string
 *                 example: PasswordSicura123
 *               role:
 *                 type: string
 *                 enum: [customer, restaurant, admin]
 *                 default: customer
 *                 example: customer
 *               favoriteCategory:
 *                 type: string
 *                 example: Pasta
 *               paymentMethod:
 *                 type: string
 *                 enum: [carta_credito, carta_prepagata, contanti]
 *                 default: carta_credito
 *                 example: carta_credito
 *               restaurantName:
 *                 type: string
 *                 example: Pizzeria Da Mario
 *               restaurantAddress:
 *                 type: string
 *                 example: Via Roma 10, Milano
 *               restaurantPhone:
 *                 type: string
 *                 example: "0212345678"
 *               IVAnumber:
 *                 type: string
 *                 example: IT12345678901
 *     responses:
 *       201:
 *         description: Utente creato con successo
 *       400:
 *         description: Campi obbligatori mancanti o email già registrata
 *       500:
 *         description: Errore interno del server
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      surname,
      email, 
      password, 
      role, 
      favoriteCategory, 
      paymentMethod,
      restaurantName, 
      restaurantAddress, 
      restaurantPhone, 
      IVAnumber 
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Tutti i campi obbligatori (name, email, password) devono essere compilati.' 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email già presente nel sistema.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      surname: surname ? surname.trim() : '',
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'customer',
      favoriteCategory: favoriteCategory || null,
      paymentMethod: paymentMethod || 'carta_credito',
      restaurantName: role === 'restaurant' ? (restaurantName || name) : undefined,
      restaurantAddress: role === 'restaurant' ? (restaurantAddress || 'Via Roma 10, Milano') : undefined,
      restaurantPhone: role === 'restaurant' ? (restaurantPhone || '') : undefined,
      IVAnumber: role === 'restaurant' ? (IVAnumber || '') : undefined
    });

    await newUser.save();

    res.status(201).json({
      message: 'Registrazione completata con successo.',
      user: {
        id: newUser._id,
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        role: newUser.role,
        restaurantName: newUser.restaurantName,
        restaurantAddress: newUser.restaurantAddress,
        favoriteCategory: newUser.favoriteCategory,
        paymentMethod: newUser.paymentMethod
      }
    });

  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ message: 'Errore interno del server.', error: error.message });
  }
});

// ============================================================================
// ROTTA 2: LOGIN UTENTE (POST /api/auth/login)
// ============================================================================
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticazione utente e rilascio Token JWT
 *     tags: [Autenticazione]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: mario@test.it
 *               password:
 *                 type: string
 *                 example: PasswordSicura123
 *     responses:
 *       200:
 *         description: Login riuscito, restituisce il Bearer Token e i dettagli utente
 *       400:
 *         description: Credenziali non valide o campi mancanti
 *       500:
 *         description: Errore interno del server
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Inserisci sia email che password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Credenziali non valide.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenziali non valide.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, restaurantName: user.restaurantName },
      process.env.JWT_SECRET || 'supersecretkey12345',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Autenticazione riuscita.',
      token,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        restaurantName: user.restaurantName,
        restaurantAddress: user.restaurantAddress,
        favoriteCategory: user.favoriteCategory,
        paymentMethod: user.paymentMethod
      }
    });

  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ message: 'Errore interno del server.', error: error.message });
  }
});

// ============================================================================
// ROTTA 3: RECUPERO DATI PROPRIO PROFILO (GET /api/auth/me)
// ============================================================================
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Recupera le informazioni complete dell'utente loggato
 *     tags: [Autenticazione]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dati del profilo recuperati con successo
 *       404:
 *         description: Utente non trovato
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: "Utente non trovato." });
    }

    res.status(200).json(user);

  } catch (error) {
    res.status(500).json({ message: "Errore nel recupero dei dati del profilo.", error: error.message });
  }
});

// ============================================================================
// ROTTA 4: MODIFICA DATI PROFILO E PREFERENZE (PUT /api/auth/me)
// ============================================================================
/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Aggiorna i dati personali, preferenze di cibo, pagamento o dati locale
 *     tags: [Autenticazione]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               favoriteCategory:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *               restaurantName:
 *                 type: string
 *               restaurantAddress:
 *                 type: string
 *               restaurantPhone:
 *                 type: string
 *               IVAnumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *       404:
 *         description: Utente non trovato
 */
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { 
      name, 
      surname, 
      favoriteCategory, 
      paymentMethod, 
      restaurantName, 
      restaurantAddress, 
      restaurantPhone, 
      IVAnumber 
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        $set: { 
          name, 
          surname, 
          favoriteCategory, 
          paymentMethod, 
          restaurantName, 
          restaurantAddress, 
          restaurantPhone, 
          IVAnumber 
        } 
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "Utente non trovato." });
    }

    res.status(200).json({ 
      message: "Dati del profilo e preferenze aggiornati con successo!", 
      user: updatedUser 
    });

  } catch (error) {
    res.status(500).json({ message: "Errore durante l'aggiornamento del profilo.", error: error.message });
  }
});

// ============================================================================
// ROTTA 5: ELIMINAZIONE DEFINITIVA DELL'ACCOUNT (DELETE /api/auth/me)
// ============================================================================
/**
 * @swagger
 * /api/auth/me:
 *   delete:
 *     summary: Elimina l'account dell'utente
 *     tags: [Autenticazione]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account eliminato definitivamente
 *       404:
 *         description: Utente non trovato
 */
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'restaurant') {
      await Meal.deleteMany({ restaurantId: req.user.id });
    }

    const deletedUser = await User.findByIdAndDelete(req.user.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Utente non trovato." });
    }

    res.status(200).json({ message: "Account eliminato definitivamente con successo dal sistema." });

  } catch (error) {
    res.status(500).json({ message: "Errore durante l'eliminazione dell'account.", error: error.message });
  }
});

// ============================================================================
// ROTTA 6: LISTA PUBBLICA DEI RISTORANTI PARTNER (GET /api/auth/restaurants)
// ============================================================================
/**
 * @swagger
 * /api/auth/restaurants:
 *   get:
 *     summary: Recupera la lista di tutti i ristoranti partner registrati
 *     tags: [Autenticazione]
 *     responses:
 *       200:
 *         description: Lista ristoranti partner recuperata con successo
 *       500:
 *         description: Errore del server
 */
router.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await User.find({ role: 'restaurant' }).select('-password');
    res.status(200).json(restaurants);
  } catch (err) {
    console.error("Errore recupero ristoranti:", err);
    res.status(500).json({ message: "Errore del server durante il recupero dei ristoranti.", error: err.message });
  }
});
// ============================================================================
// ROTTA 6: LISTA PUBBLICA DEI RISTORANTI PARTNER CON COPERTINA DA PIATTO REALE
// ============================================================================
/**
 * @swagger
 * /api/auth/restaurants:
 *   get:
 *     summary: Recupera la lista di tutti i ristoranti partner con foto copertina dal loro menu
 *     tags: [Autenticazione]
 *     responses:
 *       200:
 *         description: Lista ristoranti partner recuperata con successo
 *       500:
 *         description: Errore del server
 */
router.get('/restaurants', async (req, res) => {
  try {
    // 1. Prendi tutti gli utenti registrati come ristoranti
    const restaurants = await User.find({ role: 'restaurant' }).select('-password').lean();

    // 2. Per ogni ristorante, recupera il primo piatto per estrarre foto e categoria
    const results = await Promise.all(
      restaurants.map(async (r) => {
        // Cerca un piatto collegato al ristorante (controlla sia restaurantId che restaurant o id)
        const sampleMeal = await Meal.findOne({
          $or: [
            { restaurantId: r._id },
            { restaurant: r._id }
          ]
        }).lean();

        return {
          _id: r._id,
          name: r.restaurantName || r.name || 'Ristorante Partner',
          cuisine: (sampleMeal && sampleMeal.strCategory) ? sampleMeal.strCategory.toUpperCase() : 'MENU PARTNER',
          location: r.restaurantAddress || 'Ritiro al Bancone',
          phone: r.restaurantPhone || '',
          img: (sampleMeal && sampleMeal.strMealThumb) ? sampleMeal.strMealThumb : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'
        };
      })
    );

    res.status(200).json(results);
  } catch (err) {
    console.error("Errore recupero ristoranti:", err);
    res.status(500).json({ message: "Errore del server durante il recupero dei ristoranti.", error: err.message });
  }
});
module.exports = router;