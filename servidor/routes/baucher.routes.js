const  BaucherController= require ('../controllers/baucher.controller')
const express = require('express');
const router = express.Router();

router.post('/baucher', BaucherController.crearBaucher);
router.get('/baucher', BaucherController.obtenerBauchers);

module.exports = router;