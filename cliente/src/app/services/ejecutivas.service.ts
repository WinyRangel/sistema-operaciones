import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ejecutivas } from '../models/ejecutivas';

@Injectable({
  providedIn: 'root'
})
export class EjecutivasService {
  getRegistros() {
    throw new Error('Method not implemented.');
  }
  private apiUrl = 'https://servidor-operaciones.onrender.com/ejecutivas';

  constructor(private http: HttpClient) { }

  guardarRegistro(registro: any): Observable<any> {
    return this.http.post(this.apiUrl, registro);
  }

  obtenerRegistros(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }


  getReporteMensual(mes: number) {
    return this.http.get<any[]>(`${this.apiUrl}`); 
  }

  eliminarRegistro(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }


}
