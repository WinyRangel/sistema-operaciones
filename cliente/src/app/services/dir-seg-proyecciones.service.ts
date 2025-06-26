// dir-seg-proyecciones.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreditosProyeccionPayload {
  coordinador: string;
  mesArchivo: string;
  fechaEntrega: string;
  concepto: string;
  proyectada: number;
  colocacion: number;
  diferencia: number;
}

export interface CreditosProyeccion extends CreditosProyeccionPayload {
  _id: string;
}

@Injectable({ providedIn: 'root' })
export class DirSegProyeccionesService {
  private baseUrl = 'http://localhost:4000/dir-seg-proyecciones';

  constructor(private http: HttpClient) {}

  guardarProyecciones(payload: CreditosProyeccionPayload[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/batch`, payload);
  }

  getProyecciones(): Observable<CreditosProyeccion[]> {
    return this.http.get<CreditosProyeccion[]>(this.baseUrl);
  }

  saveProyeccion(payload: CreditosProyeccionPayload): Observable<CreditosProyeccion> {
    return this.http.post<CreditosProyeccion>(this.baseUrl, payload);
  }

  deleteProyeccion(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
