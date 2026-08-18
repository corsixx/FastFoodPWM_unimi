require('dotenv').config(); // Carica le variabili d'ambiente dal file .env
const express = require('express'); // Framework web per creare server e gestire rotte HTTP
const mongoose = require('mongoose'); // ODM (Object Data Modeling) per interagire con MongoDB
const cors = require('cors'); // Middleware per abilitare le richieste Cross-Origin

// Importazione delle rotte
const authRoutes = require('./routes/auth'); // Modulo contenente /register e /login

const app = express(); // Inizializzazione dell'applicazione Express

// ==========================================
// MIDDLEWARE GLOBALI
// ==========================================
app.use(cors()); // Consente comunicazioni da domini esterni (es. frontend React/Vue o Swagger)
app.use(express.json()); // Converte i payload JSON in entrata rendendoli disponibili in req.body

// ==========================================
// REGISTRAZIONE ROTTE
// ==========================================
app.use('/api/auth', authRoutes); // Monta tutte le rotte di autenticazione sotto il prefisso /api/auth

// Rotta root per test di connettività base
app.get('/', (req, res) => {
  res.send("Il server del FastFood è online!");
});

// ==========================================
// CONNESSIONE DATABASE (MongoDB Atlas)
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connessione a MongoDB Atlas riuscita!"))
  .catch(err => console.error("Errore di connessione a MongoDB:", err));

// ==========================================
// AVVIO DEL SERVER HTTP
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));