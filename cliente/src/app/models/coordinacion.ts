export interface Persona {
    _id: string;  // Agrega el campo _id aquí
    nombre: string;
    ejecutivas: string;
    coordinadores: string;
  }
  
  export class Coordinacion {
    _id?: string; // MongoDB usa ObjectId como string
    municipio: string;
    ejecutivas: Persona[];
    coordinador: Persona[];
    nombre: any;

    constructor(municipio: string, ejecutivas: Persona[], coordinador: Persona[]){
        this.municipio = municipio;
        this.ejecutivas = ejecutivas;
        this.coordinador = coordinador;
    }
}
  