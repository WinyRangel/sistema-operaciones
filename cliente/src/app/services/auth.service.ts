import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  setUsuarioActual(usuario: any) {
    throw new Error('Method not implemented.');
  }
  private apiUrl = 'https://servidor-operaciones.onrender.com/login';
  // private apiUrl = 'http://localhost:4000/login';
  private autenticadoSubject = new BehaviorSubject<boolean>(this.tieneToken());
  autenticado$ = this.autenticadoSubject.asObservable();

  constructor(private http: HttpClient) { }

  private tieneToken(): boolean {
    return !!localStorage.getItem('token');
  }

  registrar(usuario: string, contrasenia: string, rol: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, { usuario, contrasenia, rol });
  }

  login(usuario: string, contrasenia: string): Observable<any> {
    return this.http.post(`${this.apiUrl}`, { usuario, contrasenia }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('usuario', res.usuario);
          if (res.nombre) {
            localStorage.setItem('nombre', res.nombre);
          }
          localStorage.setItem('rol', res.rol);
          localStorage.setItem('coordinacion', res.coordinacion);
          this.autenticadoSubject.next(true); // 🔄 notifica login
        }
      })
    );
  }


  getUsuario(): string | null {
    return localStorage.getItem('usuario');
  }

  getNombre(): string | null {
    const localNombre = localStorage.getItem('nombre');
    if (localNombre) return localNombre;

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.nombre) return payload.nombre;
      } catch (e) { }
    }

    try {
      const u = localStorage.getItem('usuario');
      if (u && u.startsWith('{')) {
        const parsed = JSON.parse(u);
        if (parsed.nombre) return parsed.nombre;
      }
    } catch (e) { }

    return null;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    localStorage.removeItem('coordinacion');
    this.autenticadoSubject.next(false); // 🔄 notifica logout
  }

  estaAutenticado(): boolean {
    return this.tieneToken();
  }

  getRol(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.rol;
    } catch (e) {
      return null;
    }
  }

  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  obtenerRol(): string | null {
    return localStorage.getItem('rol');
  }

  obtenerCoordinacion(): string | null {
    return localStorage.getItem('coordinacion');
  }

}
