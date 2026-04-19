require('dotenv').config(); // Carica le variabili d'ambiente da .env
const express = require('express'); // Framework per il server
const mongoose = require('mongoose');   // ODM per MongoDB
const cors = require('cors');   // Middleware per abilitare CORS

const app = express();  // Crea un'app Express

// Middleware
app.use(cors());    // Abilita CORS per tutte le rotte
app.use(express.json());    // Middleware per parsare il corpo delle richieste in JSON

// Rotta di prova (per vedere se funziona)
app.get('/', (req, res) => {
    res.send("Il server del FastFood è online!");   // Risposta alla richiesta GET sulla root
});

// Connessione al DB
mongoose.connect(process.env.MONGO_URI) // Connessione a MongoDB Atlas usando la stringa di connessione dal file .env
  .then(() => console.log("Connessione a MongoDB Atlas riuscita!")) // Messaggio di conferma se la connessione è riuscita
  .catch(err => console.error("Errore di connessione:", err));  // Gestione degli errori di connessione

// Avvio
const PORT = process.env.PORT || 5000;  // Porta su cui il server ascolterà, predefinita 5000 se non specificata nelle variabili d'ambiente
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));   // Avvia il server e stampa un messaggio di conferma
// Importa le rotte di autenticazione e le usa con il prefisso /api/auth
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);