const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Libreria per la cifratura a una via (hashing) delle password
const jwt = require('jsonwebtoken'); // Libreria per la creazione e verifica dei JSON Web Token
const User = require('../models/User'); //c:/Users/User/Desktop/PROGETTO WEB E MOBILE/FASTFOOD WEBSITE/models/user

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
        res.status(400).json({ errore: "Errore durante la registrazione" });
    }
});

module.exports = router;    