const mongoose = require('mongoose');

const AgendaSchema = new mongoose.Schema({
  coordinador: { 
    type: String, // O un objeto si prefieres
    required: false 
  },
  semana: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  hora: {
    type: String,
    required: true
  },
  domicilio: {
    type: String,
    required: false
  },
  actividad: {
    type: String,
    required: false
  },
  codigo: {
    type: String,
    required: false
  },
  actividadReportada: {
    type: String,
    default: ''
  },
  reportado: {
    type: Boolean,
    default: false
  },
  horaReporte: {
    type: String,
    default: ''
  },
  horaCierre: {
    type: String,
    default: ''
  },
  traslado: {
    type: String,
    enum: ['SI', 'NO'],
    required: true
  },
  kmRecorrido: { 
    type: Number,
    default: 0
  },
  kmRecorridoDia: { //SUMA DE KM RECORRIDOS EN UN DIA 
    type: Number,
    default: 0
  },
  kmRecorridoSemana: { // SUMA TOTAL DE KM RECORRIDOS EN LA SEMANA (KMRECORRIDODIA *6)
    type: Number,
    default: 0
  },
  precioGasolina: {
    type: Number
  },
  rendimientoGasolina: {  // Rendimiento de la gasolina (km por litro)
    type: Number,
    required: false
  },
  costoGasolina: {  // Cálculo del costo de la gasolina
    type: Number,
    default: 0
  }
});


module.exports = mongoose.model('Agenda', AgendaSchema);
