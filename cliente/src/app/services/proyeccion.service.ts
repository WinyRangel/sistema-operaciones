// src/app/services/proyeccion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Proyeccion {
  _id?: string;
  coordinacion?: string;
  asesor?: string;
  cliente?: string;
  fechaEntregaAgendadaOpe?: string;   // ISO string o 'YYYY-MM-DD'
  fechaEntregaAgendada?: string;
  mes?: string;
  fechaEnvioOperativo?: string;
  hora?: string;                     
  diasRetrasoExpOp?: number;
  incidenciasOperativo?: string;
  fechaLimiteEntrega?: string;
  fechaRealReciboExpLegal?: string;
  renovado?: boolean;
  refil?: string;
   editable?: boolean;
}

export interface ProyeccionPayload {
  coordinacion?: string;
  asesor?: string;
  cliente?: string;
  fechaEntregaAgendadaOpe?: string;
  fechaEntregaAgendada?: string;
  mes?: string;
  fechaEnvioOperativo?: string;
  hora?: string;
  diasRetrasoExpOp?: number;
  incidenciasOperativo?: string;
  fechaLimiteEntrega?: string;
  fechaRealReciboExpLegal?: string;
  renovado?: boolean;
  refil?: string;
}

@Injectable({
  providedIn: 'root'
})

export class ProyeccionesService {
  private baseUrl = 'https://servidor-operaciones.onrender.com/api/proyecciones';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Proyeccion[]> {
    return this.http.get<Proyeccion[]>(this.baseUrl);
  }

  saveBulk(data: ProyeccionPayload[]): Observable<{ inserted: number; docs?: any[] }> {
    return this.http.post<{ inserted: number; docs?: any[] }>(`${this.baseUrl}`, data);
  }

  updateOne(id: string, payload: ProyeccionPayload): Observable<Proyeccion> {
    return this.http.put<Proyeccion>(`${this.baseUrl}/${id}`, payload);
  }

  deleteOne(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  
}
