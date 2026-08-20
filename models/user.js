const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // **************************************************************************
    // 1. DATI ACCOUNT GENERALI (PER TUTTI I RUOLI)
    // **************************************************************************
    name: { 
        type: String, 
        required: true 
    },
    surname: { 
        type: String, 
        default: '' 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['customer', 'restaurant', 'admin'], 
        default: 'customer' 
    },

    // **************************************************************************
    // 2. DATI SPECIFICI PER IL CLIENTE (Preferenze e Pagamento)
    // **************************************************************************
    // Preferenza culinaria per offerte personalizzate in bacheca (es. 'Pasta', 'Beef', 'Vegetarian')
    favoriteCategory: { 
        type: String, 
        default: null 
    },
    // Metodo di pagamento associato di default all'account
    paymentMethod: { 
        type: String, 
        enum: ['carta_credito', 'carta_prepagata', 'contanti'], 
        default: 'carta_credito' 
    },

    // **************************************************************************
    // 3. DATI SPECIFICI PER IL RISTORATORE
    // **************************************************************************
    restaurantName: { 
        type: String 
    },
    restaurantAddress: { 
        type: String 
    },
    restaurantPhone: { 
        type: String 
    },
    IVAnumber: { 
        type: String 
    },
    // Array di ID piatti presenti nel listino del ristorante
    restaurantMenu: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Meal' 
    }],

    // **************************************************************************
    // 4. METADATI
    // **************************************************************************
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'utente');