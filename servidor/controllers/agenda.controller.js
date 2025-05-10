const Agenda = require ('../models/Agenda');


const registrarAgenda = async (req, res) => {
    try {
        const nuevaAgenda = new Agenda(req.body);
        console.log(req.body);
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

const actualizarAgenda = async (req, res) => {
    console.info('Seguimiento Agenda');

    try {
        const { id } = req.params;
        const { codigo, actividadReportada, reportado, horaReporte, horaCierre, cumplimientoAgenda } = req.body;

        const agendaActualizada = await Agenda.findByIdAndUpdate(
            id,
            { codigo, actividadReportada, reportado, horaReporte, horaCierre, cumplimientoAgenda },
            { new: true }
        );

        if (!agendaActualizada) {
            return res.status(404).json({ msg: 'No se ha registrado esta agenda.' });
        }

        res.json(agendaActualizada);
    } catch (error) {
        console.error('Error al actualizar la agenda:', error);
        res.status(500).send('Hubo un error');
    }
};




module.exports = {
    registrarAgenda,
    obtenerAgenda,
    obtenerAgendasPorCoordinador,
    actualizarAgenda,
}


/**
 * const actualizarKmRecorridoSemana = async (req, res) => {
    try {
      const resumen = await Agenda.aggregate([
        {
          $group: {
            _id: { coordinador: "$coordinador", semana: "$semana" },
            totalKm: { $sum: "$kmRecorrido" }
          }
        }
      ]);
  
      for (const grupo of resumen) {
        await Agenda.updateMany(
          {
            coordinador: grupo._id.coordinador,
            semana: grupo._id.semana
          },
          {
            $set: { kmRecorridoSemana: grupo.totalKm }
          }
        );
      }
  
      res.json({ mensaje: 'Kilómetros por semana actualizados correctamente' });
    } catch (error) {
      console.error("Error al actualizar los km recorridos por semana:", error);
      res.status(500).json({ mensaje: 'Error al actualizar los kilómetros' });
    }
  };
  
 * 
 */