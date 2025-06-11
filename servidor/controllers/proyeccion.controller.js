const Proyeccion = require('../models/Proyeccion');

// Bulk insert (la que ya tienes)
exports.saveProyecciones = async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No se enviaron datos' });
    }
    const docs = await Proyeccion.insertMany(items);
    res.status(201).json({ inserted: docs.length, docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar proyecciones', error: err.message });
  }
};

// GET all
exports.getAllProyecciones = async (req, res) => {
  try {
    const list = await Proyeccion.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener proyecciones', error: err.message });
  }
};

// GET by ID
exports.getProyeccionById = async (req, res) => {
  try {
    const doc = await Proyeccion.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener la proyección', error: err.message });
  }
};

// UPDATE by ID
exports.updateProyeccion = async (req, res) => {
  try {
    const updated = await Proyeccion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'No encontrado para actualizar' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la proyección', error: err.message });
  }
};

// DELETE by ID
exports.deleteProyeccion = async (req, res) => {
  try {
    const deleted = await Proyeccion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'No encontrado para eliminar' });
    res.json({ message: 'Eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar la proyección', error: err.message });
  }
};
