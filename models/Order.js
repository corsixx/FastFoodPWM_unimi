const mongoose = require('mongoose');

// ******************************************************************************
// 1. SOTTO-SCHEMA: SINGOLO PIATTO NEL CARRELLO
// ******************************************************************************
const orderItemSchema = new mongoose.Schema({
  meal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meal',
    required: true
  },
  name: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  price: { 
    type: Number, 
    required: true 
  }
});


// ******************************************************************************
// 2. SCHEMA PRINCIPALE: ORDINE (SOLO RITIRO PRESSO IL RISTORANTE)
// ******************************************************************************
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

  // Lista dei piatti ordinati
  items: [orderItemSchema],

  // Totale dell'ordine calcolato lato server
  totalAmount: {
    type: Number,
    required: true
  },

  // Meccanismo di pagamento
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

  // Ciclo di stato per ritiro al locale: ordinato -> in preparazione ->in consegna -> consegnato
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

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema, 'ordini');