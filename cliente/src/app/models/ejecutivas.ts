export interface Ejecutivas {
  nombre: string;          // coordinación
  ejecutiva: string;       // nombre de la ejecutiva
  fecha: string;           // fecha de la actividad, e.g. "2025-05-17"
  actividad: string;       // nombre de la actividad
  hora: string;            // hora límite, e.g. "14:00:00"
  actRealizada: 'R'|'NR';  // reportada o no
  horaReporte: string;     // hora en que se registró realmente, e.g. "13:55:00"
}
