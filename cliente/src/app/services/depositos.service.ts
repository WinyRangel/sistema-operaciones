import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepositosService {

  private apiUrl = 'http://localhost:4000/depositos';

  constructor(private http: HttpClient) {}

  agregarDeposito(deposito: any): Observable<any> {
    return this.http.post(this.apiUrl, deposito);
  }

  obtenerDepositosPorCoordinacion(coordinacion: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?coordinacion=${coordinacion}`);
  }
}
