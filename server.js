require('dotenv').config(); // Carica le variabili d'ambiente dal file .env
const express = require('express'); // Framework web per creare server e gestire rotte HTTP
const mongoose = require('mongoose'); // ODM (Object Data Modeling) per interagire con MongoDB
const cors = require('cors'); // Middleware per abilitare le richieste Cross-Origin

// Import librerie Swagger
const swaggerUi = require('swagger-ui-express');  // Libreria per servire l'interfaccia grafica di Swagger
const swaggerJsDoc = require('swagger-jsdoc');  // Libreria per generare la documentazione Swagger a partire dai commenti nel codice

// Importazione delle rotte
const authRoutes = require('./routes/auth'); // Modulo contenente /register e /login
const mealRoutes = require('./routes/meals'); // Modulo contenente le rotte per la gestione dei piatti (CRUD)

const app = express(); // Inizializzazione dell'applicazione Express

// ==========================================
// MIDDLEWARE GLOBALI
// ==========================================
app.use(cors()); // Consente comunicazioni da domini esterni (es. frontend React/Vue o Swagger)
app.use(express.json()); // Converte i payload JSON in entrata rendendoli disponibili in req.body

// ==========================================
// CONFIGURAZIONE SWAGGER (OpenAPI 3.0)
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FastFood API Documentation',
      version: '1.0.0',
      description: 'Documentazione interattiva delle API per il sistema FastFood',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Server locale di sviluppo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer', // Tipo di autenticazione: Bearer Token
          bearerFormat: 'JWT',  // Formato del token crittografico atteso
          description: 'Inserisci il token JWT rilasciato dal login per autenticare le richieste'
        }
      }
    }
  },
  // Indichiamo direttamente il file per evitare bug di percorsi su Windows
  apis: ['./routes/auth.js', './routes/meals.js'], // Percorsi dei file contenenti le annotazioni Swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Endpoint interfaccia grafica Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ==========================================
// REGISTRAZIONE ROTTE
// ==========================================
app.use('/api/auth', authRoutes); // Monta tutte le rotte di autenticazione sotto il prefisso /api/auth
app.use('/api/meals', mealRoutes); // Monta tutte le rotte dei piatti sotto il prefisso /api/meals

// Rotta root per test di connettività base
app.get('/', (req, res) => {
  res.send("API Server del FastFood online.");
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