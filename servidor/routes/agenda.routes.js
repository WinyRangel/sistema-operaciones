const  AgendaController= require ('../controllers/agenda.controller')
const express = require('express');
const router = express.Router();

router.post('/agenda', AgendaController.registrarAgenda);
router.get('/agenda', AgendaController.obtenerAgenda);
router.get('/agenda/:coordinador', AgendaController.obtenerAgendasPorCoordinador);
router.get('/domicilios', AgendaController.obtenerDomicilios);
router.put('/agenda/:id', AgendaController.actualizarAgenda);
router.delete('/agenda/:id', AgendaController.eliminarAgenda);
module.exports = router;

