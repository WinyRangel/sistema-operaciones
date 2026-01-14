import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-iniciar-sesion',
  standalone: false,
  templateUrl: './iniciar-sesion.component.html',
  styleUrl: './iniciar-sesion.component.css'
})
export class IniciarSesionComponent {
  usuario = '';
  contrasenia = '';
  error = '';
  mostrarContrasenia: boolean = false;

  loading: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

  login(): void {
    this.loading = true;
    this.error = '';
    this.authService.login(this.usuario, this.contrasenia).subscribe({
      next: res => {
        this.loading = false;
        this.router.navigate(['/inicio']); // redirige a donde tú decidas
      },
      error: err => {
        this.loading = false;
        this.error = err.error.mensaje || 'Error de autenticación';
      }
    });
  }
}
