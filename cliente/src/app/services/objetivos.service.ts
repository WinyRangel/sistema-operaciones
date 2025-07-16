import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Agenda } from '../models/agenda';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ObjetivosService {
  private url = 'https://servidor-operaciones.onrender.com/agenda';

  constructor(private http: HttpClient) {}

  obtenerAgendas(): Observable<Agenda[]> {
    return this.http.get<Agenda[]>(this.url);
  }
  
}
