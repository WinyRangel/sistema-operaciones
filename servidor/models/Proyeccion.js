const mongoose = require('mongoose');

const ProyeccionSchema = new mongoose.Schema({
  coordinacion: { type: String,  },
  asesor: { type: String,  },
  cliente: { type: String,  },
  fechaEntregaAgendadaOpe: { type: Date,  },
  fechaEntregaAgendada: { type: Date,  },
  fechaEnvioOperativo: { type: Date },
  hora: { type: String },
  diasRetrasoExpOp: { type: Number },
  incidenciasOperativo: { type: String },
  fechaLimiteEntrega: { type: Date },
  fechaRealReciboExpLegal: { type: Date },
  renovado: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Proyeccion', ProyeccionSchema);
