import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinacion } from '../models/coordinacion';
import { Agenda, Domicilio } from '../models/agenda';

@Injectable({
  providedIn: 'root'
})
export class CoordinacionService {

  url = 'http://localhost:4000/coordinacion'
  url2 = 'http://localhost:4000/agenda'
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
  return this.http.get<Domicilio[]>('http://localhost:4000/domicilios');
  }

  obtenerAgenda(coordinador: string): Observable<any> {
    return this.http.get(this.url2 + coordinador);
  }

  actualizarAgenda(id: string, datos: any): Observable<any> {
    return this.http.put(`http://localhost:4000/agenda/${id}`, datos);
  }
  
}
