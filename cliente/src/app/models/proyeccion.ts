export interface Proyeccion {
  _id?: string;   
  coordinacion?: string;                   
  asesor?: string;
  cliente?: string;
  fechaEntregaAgendadaOpe?: string;   
  fechaEntregaAgendada?: string;   
  mes?: string;
  refil?: string;     
  fechaEnvioOperativo?: string;      
  hora?: string;
  diasRetrasoExpOp?: number;
  incidenciasOperativo?: string;
  fechaLimiteEntrega?: string;       
  fechaRealReciboExpLegal?: string; 
  renovado?: boolean;   
  editable?: boolean;
}
