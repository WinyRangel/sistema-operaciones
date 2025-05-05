const express = require('express');

const conectarDB = require('./config/db');
const cors = require("cors");

// Creamos el servidor
const app = express();

// Conectamos a la BD
conectarDB();
app.use(cors())

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use('/', require('./routes/baucher.routes'));
app.use('/', require('./routes/coordinacion.routes'));
app.use('/', require('./routes/agenda.routes'));



app.listen(4000, () => {
    console.log('El servidor esta corriendo perfectamente!')
})