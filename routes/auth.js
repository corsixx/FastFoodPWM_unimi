// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Libreria per la cifratura a una via (hashing) delle password
const jwt = require('jsonwebtoken'); // Libreria per la creazione e verifica dei JSON Web Token
const User = require('../models/User'); // Modello Mongoose per la collezione 'utente'
const Meal = require('../models/Meal'); // Modello Mongoose per la collezione 'meals'
const authMiddleware = require('../middleware/auth'); // Middleware per proteggere le rotte e verificare il JWT

// ============================================================================
// DOCUMENTAZIONE SWAGGER: REGISTRAZIONE UTENTE
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
 *                 description: Preferenza piatto per offerte speciali (es. Pasta, Beef, Vegetarian)
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

// ============================================================================
// ROTTA 1: REGISTRAZIONE UTENTE (POST /api/auth/register)
// ============================================================================
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

    // 1. Controllo validità campi obbligatori di base
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Tutti i campi obbligatori (name, email, password) devono essere compilati.' 
      });
    }

    // 2. Controllo duplicati email (normalizzata in minuscolo)
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email già presente nel sistema.' });
    }

    // 3. Cifratura password con bcrypt (Salt = 10 round)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Creazione documento Mongoose con tutti i campi del profilo
    const newUser = new User({
      name: name.trim(),
      surname: surname ? surname.trim() : '',
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'customer',
      favoriteCategory: favoriteCategory || null,
      paymentMethod: paymentMethod || 'carta_credito',
      restaurantName,
      restaurantAddress,
      restaurantPhone,
      IVAnumber
    });

    await newUser.save();

    // 5. Risposta HTTP 201 Created (escludendo la password)
    res.status(201).json({
      message: 'Registrazione completata con successo.',
      user: {
        id: newUser._id,
        name: newUser.name,
        surname: newUser.surname,
        email: newUser.email,
        role: newUser.role,
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
// DOCUMENTAZIONE SWAGGER: LOGIN UTENTE
// ============================================================================
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticazione utente e rilascio Token JWT
 *     description: Valida email e password cifrata; se corrette, genera un token JWT valido per 24h.
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

// ============================================================================
// ROTTA 2: LOGIN UTENTE (POST /api/auth/login)
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Controllo presenza credenziali
    if (!email || !password) {
      return res.status(400).json({ message: 'Inserisci sia email che password.' });
    }

    // 2. Ricerca utente
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Credenziali non valide.' });
    }

    // 3. Verifica hash password con bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenziali non valide.' });
    }

    // 4. Generazione Token JWT (con payload { id, role } conforme al middleware)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Risposta HTTP 200 OK con Token
    res.status(200).json({
      message: 'Autenticazione riuscita.',
      token,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
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
    // req.user.id viene iniettato da authMiddleware decodificando il token JWT
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
 *                 example: Pasta
 *               paymentMethod:
 *                 type: string
 *                 enum: [carta_credito, carta_prepagata, contanti]
 *                 example: carta_credito
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

    // Aggiorna solo i campi anagrafici e preferenze, lasciando intatti email e role
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
 *     summary: Elimina l'account dell'utente (e ripulisce i piatti custom se ristoratore)
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
    // Integrità referenziale: se il ristoratore chiude l'account, togliamo i suoi piatti custom
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

module.exports = router;