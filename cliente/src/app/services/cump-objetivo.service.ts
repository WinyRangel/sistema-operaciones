// src/app/services/cump-objetivo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CumplimientoObjetivo } from '../models/cump-objetivo';


@Injectable({ providedIn: 'root' })
export class CumpObjetivoService {
  private apiUrl = 'http://localhost:4000/api/seguimiento_agenda';

  constructor(private http: HttpClient) { }

  guardarSeguimiento(data: CumplimientoObjetivo): Observable<CumplimientoObjetivo> {
    return this.http.post<CumplimientoObjetivo>(this.apiUrl, data);
  }

  obtenerSeguimiento(coordinador: string, semana: string): Observable<CumplimientoObjetivo[]> {
    const params = `?coordinador=${encodeURIComponent(coordinador)}&semana=${encodeURIComponent(semana)}`;
    return this.http.get<CumplimientoObjetivo[]>(`${this.apiUrl}${params}`);
  }

  // en CumpObjetivoService
  actualizarSeguimiento(data: CumplimientoObjetivo): Observable<CumplimientoObjetivo> {
    return this.http.put<CumplimientoObjetivo>(
      `${this.apiUrl}/${encodeURIComponent(data._id!)}`,  // apiUrl = http://localhost:4000/api/seguimiento_agenda
      data
    );
  }

  


}
