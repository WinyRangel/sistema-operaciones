export interface CreditosProyeccionPayload {
  coordinador: string;
  fechaEntrega: string;
  concepto: string;
  proyectada: number;
  colocacion: number;
  diferencia: number;
  mesArchivo: string;
}

export interface CreditosProyeccion {
  _id: string;
  coordinador: string;
  mesArchivo: string;
  fechaEntrega: string;
  concepto: string;
  proyectada: number;
  colocacion: number;
  diferencia: number;
}
