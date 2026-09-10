/**
 * Middleware: verifyToken
 *
 * Verifica la presenza e la validità di un JSON Web Token (JWT) nell'header
 * Authorization della richiesta HTTP. Il token deve essere passato nel formato
 * "Bearer <token>".
 *
 * Comportamento:
 * - Se manca l'header Authorization o non è nel formato corretto risponde 401 (Unauthorized).
 * - Se il token esiste ma non è valido o è scaduto risponde 403 (Forbidden).
 * - Se il token è valido, decodifica il payload e lo mette in `req.user` per
 *   permettere alle route successive di accedere ai dati dell'utente (es. id, role).
 *
 * Requisiti:
 * - La chiave segreta per verificare i token deve essere disponibile in
 *   `process.env.JWT_SECRET`.
 */
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Recupera l'header Authorization dalla richiesta. Express espone gli header
    // tramite req.header('<Name>') (case-insensitive per i nomi degli header).
    const authHeader = req.header('Authorization');

    // Controlla che l'header esista e sia nel formato "Bearer <token>".
    // Se manca o non corrisponde ritorna 401 Unauthorized.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
    }

    // Estrae il token rimuovendo il prefisso "Bearer ".
    const token = authHeader.split(' ')[1];

    try {
        // Verifica il token usando la chiave segreta. jwt.verify lancerà un'eccezione
        // se il token non è valido o è scaduto.
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        // Memorizza il payload decodificato nella richiesta in modo che le rotte
        // possano accedere facilmente ai dati dell'utente (es. req.user.id, req.user.role).
        req.user = verified;

        // Prosegui con il prossimo middleware o route handler.
        next();
    } catch (error) {
        // Non esporre dettagli dell'errore al client per motivi di sicurezza.
        // Rispondi con 403 Forbidden quando il token è invalido o scaduto.
        res.status(403).json({ message: 'Token non valido o scaduto.' });
    }
};

module.exports = verifyToken;
