const mongoose = require('mongoose'); // Importa Mongoose per interagire con MongoDB

// Definisce la struttura e le regole per i documenti degli utenti
const userSchema = new mongoose.Schema({
    
    name: { type: String, required: true }, // Nome obbligatorio (rinominato da "nome" a "name")
    
    email: { type: String, required: true, unique: true }, // Email obbligatoria e senza doppioni
    
    password: { type: String, required: true }, // Password obbligatoria (verrà salvata già cifrata)
    
    // Ruolo utente: accetta solo 'customer' o 'restaurant', di base è 'customer'
    role: { type: String, enum: ['customer', 'restaurant'], default: 'customer' }

}, { 
    timestamps: true // Aggiunge automaticamente i campi createdAt e updatedAt
});

// Esporta il modello User salvando i dati nella collezione chiamata 'utente'
module.exports = mongoose.model('User', userSchema, 'utente');