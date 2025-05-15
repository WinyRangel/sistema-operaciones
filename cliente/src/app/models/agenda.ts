export interface Agenda {
    _id?: string;
    semana: string;
    coordinador: string;
    fecha?: Date;
    hora: string;
    domicilio?: string;
    actividad?: string;
    codigo?: string;
    actividadReportada?: string;
    reportado?: boolean;
    horaReporte?: string;
    horaCierre?: string;
    traslado?: string;
    kmRecorrido?: number;
    cumplimientoAgenda?: boolean;
  }
  

  export interface Domicilio {
  _id: string;
  nombre: string;
}
