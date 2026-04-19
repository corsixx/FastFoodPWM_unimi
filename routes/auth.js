const express = require('express');
const router = express.Router();
const User = require('c:/Users/User/Desktop/PROGETTO WEB E MOBILE/FASTFOOD WEBSITE/models/user');

router.post('/register', async (req, res) => {
    try {
        const nuovoUtente = new User(req.body);
        await nuovoUtente.save();
        res.status(201).json({ messaggio: "Utente creato correttamente!" });    // Risposta di successo se l'utente è stato creato
    } catch (errore) {
        res.status(400).json({ errore: "Errore durante la registrazione" });
    }
});

module.exports = router;