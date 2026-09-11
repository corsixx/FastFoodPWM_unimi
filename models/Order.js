const mongoose = require('mongoose');

// ******************************************************************************
// 1. SOTTO-SCHEMA: SINGOLO PIATTO NEL CARRELLO
// ******************************************************************************
// Questo sottoschema rappresenta un prodotto incluso nell'ordine.
// Salviamo anche il nome e il prezzo al momento dell'acquisto per evitare
// modifiche future del menu da parte del ristorante che potrebbero alterare
// la fattura già registrata.
const orderItemSchema = new mongoose.Schema({
    // Riferimento al piatto originale nel database dei menu
    meal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal',
        required: true
    },
    // Nome del piatto come era al momento dell'ordine
    name: { 
        type: String, 
        required: true 
    },
    // Quantità ordinata per questo prodotto
    quantity: { 
        type: Number, 
        required: true, 
        min: 1 
    },
    // Prezzo unitario al momento dell'ordine
    price: { 
        type: Number, 
        required: true 
    }
});


// ******************************************************************************
// 2. SCHEMA PRINCIPALE: ORDINE (SOLO RITIRO PRESSO IL RISTORANTE)
// ******************************************************************************
// L'ordine rappresenta una richiesta di pickup in negozio: il cliente sceglie
// il locale, aggiunge i prodotti, paga e poi ritira il cibo quando è pronto.
const orderSchema = new mongoose.Schema({
    // Cliente che effettua l'ordine
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Ristorante presso cui ritirare il cibo
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Lista dei piatti ordinati, con quantità e prezzo per singolo item
    items: [orderItemSchema],

    // Totale dell'ordine calcolato lato server per evitare manipolazioni client-side
    totalAmount: {
        type: Number,
        required: true
    },

    // Meccanismo di pagamento scelto dal cliente
    paymentMethod: {
        type: String,
        enum: ['carta_credito', 'carta_prepagata', 'contanti'],
        default: 'carta_credito'
    },

    // Tempo di attesa stimato in minuti in base agli ordini in coda
    estimatedWaitTimeMinutes: {
        type: Number,
        default: 15
    },

    // Ciclo di stato per ritiro al locale: ordinato -> in preparazione -> in consegna -> consegnato
    status: {
        type: String,
        enum: ['ordinato', 'in preparazione', 'in consegna', 'consegnato'],
        default: 'ordinato'
    },

    // Data e ora di invio dell'ordine
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Esportiamo il modello Order, evitando duplicazioni se il modello è già stato registrato
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema, 'ordini');