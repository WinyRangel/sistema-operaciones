export interface Persona {
    _id: string; 
    nombre: string;
    ejecutivas: string;
    coordinadores: string;
    rendimiento?: number;     // ¡Este es el campo que te faltaba!

  }
  
  export class Coordinacion {
    _id?: string; 
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
  