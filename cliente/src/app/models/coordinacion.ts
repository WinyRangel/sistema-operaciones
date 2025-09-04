export interface Persona {
  _id: any;
  nombre: string;
}

export interface Coordinacion {
  _id?: string;
  nombre: string;
  municipio: string;
  ejecutivas: Persona[];
  coordinador: string;
  coche: string;
  rendimiento?: number;
}
