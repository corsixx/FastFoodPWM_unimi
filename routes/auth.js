const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Libreria per la cifratura a una via (hashing) delle password
const jwt = require('jsonwebtoken'); // Libreria per la creazione e verifica dei JSON Web Token
const User = require('../models/User'); //c:/Users/User/Desktop/PROGETTO WEB E MOBILE/FASTFOOD WEBSITE/models/user

// ============================================================================
// DOCUMENTAZIONE SWAGGER: REGISTRAZIONE UTENTE
// ============================================================================
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrazione di un nuovo utente nel sistema
 *     description: Riceve i dati anagrafici e credenziali, cifra la password con bcrypt e crea un documento su MongoDB Atlas.
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
 *                 example: Mario Rossi
 *               email:
 *                 type: string
 *                 example: mario@test.it
 *               password:
 *                 type: string
 *                 example: PasswordSicura123
 *               role:
 *                 type: string
 *                 description: Ruolo dell'utente (default 'customer')
 *                 example: customer
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
        const { name, email, password, role } = req.body;
        // 1. Controllo validità input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                message: 'Tutti i campi obbligatori (name, email, password) devono essere compilati.' 
            });
        }
        // 2. Controllo duplicati email
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
        return res.status(400).json({ message: 'Email già presente nel sistema.' });
        }
        // 3. Cifratura password con bcrypt (Salt = 10 round)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Creazione e salvataggio documento su Atlas
        const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: role || 'customer' // Default: cliente base
        });

        await newUser.save();   //"query di inserimento" del nuovo utente nel database MongoDB con await per attendere il completamento dell'operazione prima di procedere.

        // 5. Risposta HTTP 201 Created (escludendo la password)
        res.status(201).json({
        message: 'Registrazione completata con successo.',
        user: {
            id: newUser._id,    // ID univoco generato da MongoDB per il nuovo utente
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        }
        });
        } catch (errore) {
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
 *     description: Valida email e password cifrata; se corrette, genera un token JWT stateless valido per 24h.
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
            return res.status(400).json({ message: 'Credenziali non valide.' });    //se trova l'email, allora l'account esiste altrimenti ritorna un errore di credenziali non valide
        }

        // 3. Verifica hash password
        const isMatch = await bcrypt.compare(password, user.password);  //bcrypt.compare confronta la password in chiaro con l'hash salvato nel database
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenziali non valide.' }); //verifica se la password inserita corrisponde all'hash salvato nel database. Se non corrisponde, ritorna un errore di credenziali non valide
        }

        // 4. Generazione Token JWT firmato
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
            email: user.email,
            role: user.role
        }
        });

    } catch (error) {
        console.error('Errore login:', error);
        res.status(500).json({ message: 'Errore interno del server.', error: error.message });
    }
});

module.exports = router;    