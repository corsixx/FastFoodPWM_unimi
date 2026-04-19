const mongoose = require('mongoose');   // Importa Mongoose per la gestione del database MongoDB

const userSchema = new mongoose.Schema({    // Definisce lo schema per gli utenti
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ruolo: { type: String, enum: ['cliente', 'ristoratore'], default: 'cliente' }
}, { timestamps: true });   // Aggiunge campi createdAt e updatedAt automaticamente

module.exports = mongoose.model('User', userSchema, 'utente');    // Esporta il modello User basato sullo schema definito, permettendo di interagire con la collezione 'users' nel database MongoDB