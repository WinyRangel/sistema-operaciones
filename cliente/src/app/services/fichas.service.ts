// src/app/services/fichas.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FichasService {
  // usar la ruta recomendada
  // private baseUrl = 'http://localhost:4000/fichas';
  private baseUrl = 'https://servidor-operaciones.onrender.com/fichas'

  constructor(private http: HttpClient) {}

  // guarda un array de registros (payload)
  saveBulk(payload: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk`, payload);
  }

  // compatibilidad (si algo llama a POST /fichas)
  saveBulkLegacy(payload: any[]): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  // otros métodos
  getAll(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  update(id: string, data: any) {
    return this.http.put(`${this.baseUrl}/${id}`, data);
  }

}
