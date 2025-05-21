import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Baucher } from '../models/baucher';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PagosService {

  private url = 'https://servidor-operaciones.onrender.com/baucher/'; 

  constructor(private http: HttpClient) {}

  agregarBaucher(baucher: Baucher): Observable<Baucher> {
    return this.http.post<Baucher>(this.url, baucher); 
  }

  obtenerBauchers(): Observable<Baucher[]> {
    return this.http.get<Baucher[]>(this.url); 
  }

  actualizarBaucher(id: string, rbaucher: Baucher): Observable<any> {
    return this.http.put(this.url + id, rbaucher);
  }

  eliminarBaucher(id: string): Observable<any>{
    return this.http.delete(this.url + id);
  }
}
