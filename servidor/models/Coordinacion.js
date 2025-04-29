const mongoose = require('mongoose');

const coordinacionSchema = new mongoose.Schema({
  nombre: String,
  municipio: String,
  ejecutivas: [
    {
      nombre: String
    }
  ],
  coordinador: [{
    nombre: String
  }] 
});

module.exports = mongoose.model('coordinacion', coordinacionSchema);
