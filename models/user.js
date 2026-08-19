const mongoose = require('mongoose'); // Importa Mongoose per interagire con MongoDB

// Definisce la struttura e le regole per i documenti degli utenti
const userSchema = new mongoose.Schema({
    
    name: { type: String, required: true }, // Nome obbligatorio (rinominato da "nome" a "name")
    
    email: { type: String, required: true, unique: true }, // Email obbligatoria e senza doppioni
    
    password: { type: String, required: true }, // Password obbligatoria (verrà salvata già cifrata)
    
    // Ruolo utente: accetta solo 'customer' o 'restaurant', di base è 'customer'
    role: { 
        type: String, 
        enum: ['customer', 'restaurant'], 
        default: 'customer' 
    },

    //dati specifici per il ristoratore (quindi opzionali anche per i clienti)
    restaurantName: { type: String }, // Nome del ristorante 

    restaurantAddress: { type: String }, // Indirizzo del ristorante 

    restaurantPhone: { type: String }, // Numero di telefono del ristorante 

    IVAnumber: { type: String }, // Partita IVA del ristorante

    //menù del risorante (array di riferimenti ai piatti)
    restaurantMenu: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Meal' 
    }],

    //dati specifici per il cliente
    paymentMethods: { type: String , default: 'carta' }, // Metodi di pagamento preferiti del cliente

    customerPreferences: [{ type: String }], // Preferenze del cliente
}, {
    timestamps: true // Aggiunge automaticamente i campi createdAt e updatedAt
});

// Esporta il modello User salvando i dati nella collezione chiamata 'utente'
module.exports = mongoose.model('User', userSchema, 'utente');