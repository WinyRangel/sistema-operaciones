const mongoose = require('mongoose');

const baucherSchema = new mongoose.Schema({
  coordinacion: { 
    type: String, 
    required: true 
  },
  ejecutiva: { 
    type: String, 
    required: false 
  },
  coordinador: { 
    type: String, 
    required: false 
  },
  fechaBaucher: {
    type: Date,
    required: false
  },
  fechaReporte: {
    type: Date,
    required: true
  },
  // En el modelo:
  diasDiferencia: {
    type: Number,
    required: false
  },  
  grupo:{
    type: String,
    required: false
  },
  concepto:{
    type: String,
    required: false
  },
  titular:{
    type: String,
    required: false
  }
});

module.exports = mongoose.model('Baucher', baucherSchema);
