import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inicio',
  standalone: false,
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent {
  estaLogueado = false;
  rolUsuario = '';
  private authSubscription!: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Suscribirse al estado de autenticación para actualizar en tiempo real
    this.authSubscription = this.authService.autenticado$.subscribe((estado) => {
      this.estaLogueado = estado;

      if (estado) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.rolUsuario = payload.rol;
          } catch {
            this.rolUsuario = '';
          }
        }
      } else {
        this.rolUsuario = '';
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe(); // evitar fugas de memoria
  }

}
