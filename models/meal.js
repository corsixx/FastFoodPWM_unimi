const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
    idMeal: { type: String },
    strMeal: { type: String, required: true }, // Nome del piatto
    strMealAlternate: { type: String, default: null },
    strCategory: { type: String, required: true }, // Categoria (es. Dessert, Chicken, Beef)
    strArea: { type: String }, // Cucina di provenienza (es. British, Italian, Mexican)
    strInstructions: { type: String }, // Istruzioni di preparazione
    strMealThumb: { type: String }, // URL immagine
    strTags: { type: String, default: null },
    strYoutube: { type: String, default: "" },
    ingredients: [{ type: String }], // Array di ingredienti
    measures: [{ type: String }], // Dosi associate agli ingredienti
    
    // Campi personalizzabili per il progetto FastFood
    price: { type: Number, default: 8.50 }, // Prezzo base di vendita (se omesso vale 10)
    preparationTime: { type: Number, default: 15 }, // Tempo di preparazione in minuti (se omesso vale 15)
    restaurantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null // Se null, appartiene al catalogo globale
    }
}, { 
    timestamps: true // Aggiunge automaticamente i campi createdAt e updatedAt
});

// Collezione 'meals' dentro il database fastfoodDB
module.exports = mongoose.model('Meal', mealSchema, 'meals');