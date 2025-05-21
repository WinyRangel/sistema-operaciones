import { Injectable } from '@angular/core';
import { Legales } from '../models/legales';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LegalesService {
  private url = 'https://servidor-operaciones.onrender.com/legales'; 

  constructor(private http: HttpClient) {}

  agregarLegales(baucher: Legales): Observable<Legales> {
    return this.http.post<Legales>(this.url, baucher); 
  }

  obtenerLegales(): Observable<Legales[]> {
    return this.http.get<Legales[]>(this.url); 
  }
  actualizarLegal(id: string, legales: Legales) {
    return this.http.put(`${this.url}/${id}`, legales); 
  }
  guardarLegal(id: string, legales: Legales): Observable<Legales> {
    return this.http.put<Legales>(`${this.url}/${id}`, legales);  
  }

  eliminarLegal(id: string): Observable<any> {
    return this.http.delete(this.url + '/' + id);  
  }
}

