const jwt = require('jsonwebtoken'); // Importa la libreria per leggere i token

// Funzione middleware per proteggere le rotte
const verifyToken = (req, res, next) => {
    // 1. Cerca il token nell'header della richiesta HTTP
    const authHeader = req.header('Authorization');

    // 2. Se non c'è l'header o non inizia con "Bearer ", blocca l'accesso
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
    }

    // 3. Estrapola solo il token (rimuovendo la parola "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // 4. Verifica che il token sia autentico e non manomesso
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 5. Salva i dati dell'utente (id, ruolo) dentro la richiesta per usarli nelle rotte
        req.user = verified;
        
        // 6. Tutto ok! Passa alla rotta successiva
        next();
    } catch (error) {
        // Se il token è scaduto o falso
        res.status(403).json({ message: 'Token non valido o scaduto.' });
    }
};

module.exports = verifyToken;