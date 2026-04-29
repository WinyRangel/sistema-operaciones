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

  private baseUrl = 'https://servidor-operaciones.onrender.com';
  //private baseUrl = 'http://localhost:4000';

  constructor(private http: HttpClient) { }

  obtenerCoordinacion(): Observable<Coordinacion[]> {
    return this.http.get<Coordinacion[]>(`${this.baseUrl}/coordinacion`);
  }

  registrarAgenda(ragenda: Agenda): Observable<any> {
    return this.http.post(`${this.baseUrl}/agenda`, ragenda);
  }

  obtenerAgendas1(filtros: any = {}): Observable<any> {
    let params = new HttpParams();

    // Default high limit if not doing true pagination
    params = params.set('page', (filtros.page || 1).toString());
    params = params.set('limit', (filtros.limit || 5000).toString());

    if (filtros.coordinador) params = params.set('coordinador', filtros.coordinador);
    if (filtros.mes) params = params.set('mes', filtros.mes);
    if (filtros.semana) params = params.set('semana', filtros.semana);
    if (filtros.dia) params = params.set('dia', filtros.dia);
    if (filtros.codigo) params = params.set('codigo', filtros.codigo);
    if (filtros.codigoReportado) params = params.set('codigoReportado', filtros.codigoReportado);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);

    return this.http.get(`${this.baseUrl}/agendas`, { params });
  }

  obtenerAgendas(): Observable<any> {
    return this.http.get(`${this.baseUrl}/agenda`);
  }

  getDomicilios(): Observable<Domicilio[]> {
    return this.http.get<Domicilio[]>(`${this.baseUrl}/domicilios`);
  }

  obtenerAgenda(coordinador: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/agenda/${coordinador}`);
  }

  actualizarAgenda(id: string, datos: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/agenda/${id}`, datos);
  }

  eliminarAgenda(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/agenda/${id}`);
  }

  obtenerMiAgenda(page: number = 1, limit: number = 50): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get(`${this.baseUrl}/agendas`, { params });
  }

  // Módulo Asesor
  guardarAgendaAsesor(actividad: ActividadPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/agenda-asesor/`, actividad);
  }

  // Obtener lista de asesores para coordinadores
  obtenerAsesoresPorCoordinacion() {
    const token = localStorage.getItem('token');

    return this.http.get<any>(`${this.baseUrl}/agenda-asesor/asesores`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Obtener agendas según el rol del usuario
  obtenerAgendasAsesor() {
    const token = localStorage.getItem('token');
    return this.http.get<any>(`${this.baseUrl}/agenda-asesor/`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  actualizarAgendaAsesor(id: string, datos: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/agenda-asesor/${id}`, datos);
  }

  eliminarAgendaAsesor(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/agenda-asesor/${id}`);
  }

  validarAgendaAsesor(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/agenda-asesor/${id}/validar`, {});
  }

  rechazarAgendaAsesor(id: string, motivoRechazo: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/agenda-asesor/${id}/rechazar`, { motivoRechazo });
  }
}
