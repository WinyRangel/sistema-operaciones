export interface Fichas {
  
  _id?: string;                
  semana?: string;
  coordinacion?: string;
  asesor?: string; 
  cliente?: string;
  diaAtencion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: boolean;
  fechahora?: string;   
  tipopago?: 'transferencia' | 'deposito' | 'efectivo' | '';
  reportada?: boolean;
  createdAt?: string;   // de Mongoose
  updatedAt?: string;   // de Mongoose
}

