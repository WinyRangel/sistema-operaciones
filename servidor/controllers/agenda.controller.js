const Agenda = require ('../models/Agenda');


const registrarAgenda = async (req, res) => {
    try {
        const nuevaAgenda = new Agenda(req.body);
        const agendaGuardada = await nuevaAgenda.save();
        res.status(201).json({ mensaje: 'Agenda creada exitosamente', agenda: agendaGuardada });
    } catch (error) {
        console.error('Error al crear empresa:', error);
        res.status(500).json({ mensaje: 'Hubo un error al crear la empresa' });
    }
}


// Controlador para obtener todos los bauchers
const obtenerAgenda = async (req, res) => {
    try {
        const agendas = await Agenda.find({});
        res.json(agendas);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error');
    }
};




// Controlador para obtener agendas por coordinador
const obtenerAgendasPorCoordinador = async (req, res) => {
    const { coordinador } = req.params; // o req.query si usas ?coordinador=Ismael

    try {
        const agendas = await Agenda.find({ coordinador });

        if (agendas.length === 0) {
            return res.status(404).json({ mensaje: `No se encontraron agendas para el coordinador ${coordinador}` });
        }

        res.json(agendas);
    } catch (error) {
        console.error('Error al obtener agendas por coordinador:', error);
        res.status(500).json({ mensaje: 'Error al obtener las agendas' });
    }
};



module.exports = {
    registrarAgenda,
    obtenerAgenda,
    obtenerAgendasPorCoordinador
}