// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }

    // Decodificar token para obtener rol
    const payload = JSON.parse(atob(token.split('.')[1]));
    const rol = payload.rol;

    // Aquí defines qué roles pueden acceder
    const rolesPermitidos = route.data['roles'] as Array<string>;

    if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
      this.router.navigate(['/no-autorizado']); // o a otra ruta
      return false;
    }

    return true;
  }
}
