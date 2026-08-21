require('dotenv').config(); // Carica le variabili d'ambiente dal file .env
const express = require('express'); // Framework web per creare server e gestire rotte HTTP
const mongoose = require('mongoose'); // ODM (Object Data Modeling) per interagire con MongoDB
const cors = require('cors'); // Middleware per abilitare le richieste Cross-Origin

// Import librerie Swagger
const swaggerUi = require('swagger-ui-express');  // Libreria per servire l'interfaccia grafica di Swagger
const swaggerJsDoc = require('swagger-jsdoc');  // Libreria per generare la documentazione Swagger a partire dai commenti nel codice

// Importazione delle rotte
const orderRoutes = require('./routes/orders'); // Modulo contenente le rotte per la gestione degli ordini
const authRoutes = require('./routes/auth'); // Modulo contenente /register e /login
const mealRoutes = require('./routes/meals'); // Modulo contenente le rotte per la gestione dei piatti (CRUD)
const restaurantRoutes = require('./routes/restaurants'); // Modulo contenente le rotte per la gestione dei ristoranti

const app = express(); // Inizializzazione dell'applicazione Express
const PORT = process.env.PORT || 5000; // Porta su cui il server ascolterà le richieste, predefinita a 5000 se non specificata

// ==========================================
// MIDDLEWARE GLOBALI
// ==========================================
app.use(cors()); // Consente comunicazioni da domini esterni (es. frontend React/Vue o Swagger)
app.use(express.json()); // Converte i payload JSON in entrata rendendoli disponibili in req.body
app.use(express.urlencoded({ extended: true })); // Converte i payload URL-encoded in entrata rendendoli disponibili in req.body

app.use(express.static('public')); // Serve i file statici (HTML, CSS, JS) dalla cartella 'public'

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
        url: `http://localhost:${process.env.PORT || 5000}`,
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
  apis: ['./routes/auth.js', './routes/meals.js', './routes/restaurants.js', './routes/orders.js'], // Percorsi dei file contenenti le annotazioni Swagger
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Endpoint interfaccia grafica Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ==========================================
// REGISTRAZIONE ROTTE
// ==========================================
app.use('/api/orders', orderRoutes); // Monta tutte le rotte degli ordini sotto il prefisso /api/orders
app.use('/api/auth', authRoutes); // Monta tutte le rotte di autenticazione sotto il prefisso /api/auth
app.use('/api/meals', mealRoutes); // Monta tutte le rotte dei piatti sotto il prefisso /api/meals
app.use('/api/restaurants', restaurantRoutes); // Monta tutte le rotte dei ristoranti sotto il prefisso /api/restaurants

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
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));