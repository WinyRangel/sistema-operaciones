import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProyeccionPayload {
  asesor?: string;
  cliente?: string;
  fechaEntregaAgendadaOpe?: string; // ISO date
  fechaEntregaAgendada?: string;     // ISO date
  fechaEnvioOperativo?: string;
  hora?: string;
  diasRetrasoExpOp?: number;
  incidenciasOperativo?: string;
  fechaLimiteEntrega?: string;
  fechaRealReciboExpLegal?: string;
  renovado?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProyeccionesService {
  private baseUrl = 'http://localhost:4000/api/proyecciones';

  constructor(private http: HttpClient) {}

  saveBulk(data: ProyeccionPayload[]): Observable<any> {
  return this.http.post(`${this.baseUrl}`, data);
  }   

}
