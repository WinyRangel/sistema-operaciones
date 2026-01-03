import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Coordinacion } from '../models/coordinacion';
import { Agenda, Domicilio } from '../models/agenda';
import { AgendaAsesor } from '../models/agenda-asesor';


export interface ActividadPayload {
  asesor: string;
  coordinacion: string;
  semana: string;
  fecha: string;
  objetivo: string;
  firma: string;
  hora: string;
  domicilio: string;
  actividad: string;
  codigo: string;
  acordeObjetivo: boolean;
  traslado: string;
  kmRecorrido: number;
  coordinadorNombre?: string;
}


@Injectable({
  providedIn: 'root'
})
export class CoordinacionService {

  url = 'https://servidor-operaciones.onrender.com/coordinacion'
  // url = 'http://localhost:4000/coordinacion'
  url3 = 'https://servidor-operaciones.onrender.com/agendas?page=1&limit=11000'
  // url3 = 'http://localhost:4000/agendas'
  url2 = 'https://servidor-operaciones.onrender.com/agenda'
  //url2 = 'http://localhost:4000/agenda/'
  url4 = 'https://servidor-operaciones.onrender.com/obtenerAgenda'
  //url4 = 'http://localhost:4000/obtenerAgenda'

  //urlAsesor = 'http://localhost:4000/agenda-asesor/'
  urlAsesor = 'https://servidor-operaciones.onrender.com/agenda-asesor/'

  constructor(private http: HttpClient) { }

  obtenerCoordinacion(): Observable<Coordinacion[]> {
    return this.http.get<Coordinacion[]>(this.url);
  }

  registrarAgenda(ragenda: Agenda): Observable<any> {
    return this.http.post(this.url2, ragenda);
  }

  obtenerAgendas1(page: number = 1, limit: number = 50): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get(this.url3, { params });
  }

  obtenerAgendas(): Observable<any> {
    return this.http.get(this.url2);
  }


  getDomicilios(): Observable<Domicilio[]> {
    // return this.http.get<Domicilio[]>('https://servidor-operaciones.onrender.com/domicilios');
    return this.http.get<Domicilio[]>('https://servidor-operaciones.onrender.com/domicilios');
  }

  obtenerAgenda(coordinador: string): Observable<any> {
    return this.http.get(this.url2 + coordinador);
  }

  actualizarAgenda(id: string, datos: any): Observable<any> {
    // return this.http.put(`https://servidor-operaciones.onrender.com/agenda/${id}`, datos);
    return this.http.put(`https://servidor-operaciones.onrender.com/agenda/${id}`, datos);
  }

  eliminarAgenda(id: string): Observable<any> {
    // return this.http.delete(`https://servidor-operaciones.onrender.com/agenda/${id}`);
    return this.http.delete(`https://servidor-operaciones.onrender.com/agenda/${id}`);
  }


  obtenerMiAgenda(page: number = 1, limit: number = 50): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get(this.url3, { params });
  }

  // Módulo Asesor
  guardarAgendaAsesor(actividad: ActividadPayload): Observable<any> {
    return this.http.post(this.urlAsesor, actividad);
  }

  // Obtener lista de asesores para coordinadores
  obtenerAsesoresPorCoordinacion() {
    const token = localStorage.getItem('token');

    return this.http.get<any>(`${this.urlAsesor}asesores`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Obtener agendas según el rol del usuario
  obtenerAgendasAsesor() {
    const token = localStorage.getItem('token');
    return this.http.get<any>(this.urlAsesor, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  actualizarAgendaAsesor(id: string, datos: any): Observable<any> {
    return this.http.put(this.urlAsesor + id, datos);
  }


  eliminarAgendaAsesor(id: string): Observable<any> {
    return this.http.delete(this.urlAsesor + id);
  }

  validarAgendaAsesor(id: string): Observable<any> {
    return this.http.put(this.urlAsesor + id + '/validar', {});
  }
}
