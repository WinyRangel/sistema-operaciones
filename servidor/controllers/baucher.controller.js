const Baucher = require('../models/Baucher');

// Controlador para obtener todos los bauchers, incluyendo el nombre de la coordinación
const obtenerBauchers = async (req, res) => {
  try {
    const bauchers = await Baucher.find()
      .populate('coordinacion', 'coordinacion') // Solo traer el campo 'coordinacion' de la colección Coordinacion
      .sort({ fechaReporte: -1 });

    res.status(200).json(bauchers);
  } catch (error) {
    console.error('Error al obtener los bauchers:', error);
    res.status(500).json({ mensaje: 'Error al obtener los bauchers' });
  }
};


// Crear un nuevo baucher
const crearBaucher = async (req, res) => {
  try {
    const {
      coordinacion,
      ejecutiva,
      coordinador,
      fechaBaucher,
      fechaReporte,
      grupo,
      concepto,
      titular
    } = req.body;

    // Validación mínima requerida
    if (!fechaReporte) {
      return res.status(400).json({ mensaje: 'El campo fechaReporte es obligatorio' });
    }

    // Función para calcular la diferencia en días
    const calcularDiasDiferencia = (fecha1, fecha2) => {
      if (!fecha1 || !fecha2) return null;
      const diffTime = new Date(fecha1).getTime() - new Date(fecha2).getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Crear instancia del nuevo baucher
    const nuevoBaucher = new Baucher({
      coordinacion: coordinacion || '',
      ejecutiva: ejecutiva || '',
      coordinador: coordinador || '',
      fechaBaucher: fechaBaucher ? new Date(fechaBaucher) : null,
      fechaReporte: new Date(fechaReporte),
      grupo: grupo || '',
      concepto: concepto || '',
      titular: titular || '',
      diasDiferencia: calcularDiasDiferencia(fechaReporte, fechaBaucher)
    });

    // Guardar en base de datos
    await nuevoBaucher.save();

    res.status(201).json({
      mensaje: 'Baucher guardado correctamente',
      baucher: nuevoBaucher
    });

  } catch (error) {
    console.error('Error al guardar el Baucher:', error);
    console.log('REQ BODY:', req.body);
    res.status(500).json({ mensaje: 'Error al guardar el Baucher' });
  }
};

module.exports = {
  crearBaucher,
  obtenerBauchers
};
