export interface Proyeccion {
  _id?: string;   
  coordinacion?: string;                   
  asesor?: string;
  cliente?: string;
  fechaEntregaAgendadaOpe?: string;   
  fechaEntregaAgendada?: string;      
  fechaEnvioOperativo?: string;      
  hora?: string;
  diasRetrasoExpOp?: number;
  incidenciasOperativo?: string;
  fechaLimiteEntrega?: string;       
  fechaRealReciboExpLegal?: string;  
  renovado?: boolean;
  createdAt?: string;                
  updatedAt?: string;                
}
