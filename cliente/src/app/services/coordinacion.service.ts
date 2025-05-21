import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinacion } from '../models/coordinacion';
import { Agenda, Domicilio } from '../models/agenda';

@Injectable({
  providedIn: 'root'
})
export class CoordinacionService {

  url = 'https://servidor-operaciones.onrender.com/coordinacion'
  url2 = 'https://servidor-operaciones.onrender.com/agenda'
  constructor(private http: HttpClient) { }

  obtenerCoordinacion(): Observable<Coordinacion[]> {
    return this.http.get<Coordinacion[]>(this.url);
  }

  registrarAgenda(ragenda: Agenda): Observable<any>{
    return this.http.post(this.url2, ragenda);
  }

  obtenerAgendas(): Observable<any> {
    return this.http.get(this.url2);
  }

  getDomicilios(): Observable<Domicilio[]> {
  return this.http.get<Domicilio[]>('https://servidor-operaciones.onrender.com/domicilios');
  }

  obtenerAgenda(coordinador: string): Observable<any> {
    return this.http.get(this.url2 + coordinador);
  }

  actualizarAgenda(id: string, datos: any): Observable<any> {
    return this.http.put(`https://servidor-operaciones.onrender.com/agenda/${id}`, datos);
  }
  
  eliminarAgenda(id: string): Observable<any>{
    return this.http.delete(`https://servidor-operaciones.onrender.com/agenda/${id}`);
  }

}
