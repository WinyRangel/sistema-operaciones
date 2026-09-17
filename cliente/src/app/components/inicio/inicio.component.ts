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
  nombreUsuario = '';
  usuarioActual = '';
  fechaHoy = '';
  saludoHora = 'Bienvenido';
  private authSubscription!: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.establecerFechaYHora();

    // Suscribirse al estado de autenticación para actualizar en tiempo real
    this.authSubscription = this.authService.autenticado$.subscribe((estado) => {
      this.estaLogueado = estado;

      if (estado) {
        this.usuarioActual = this.authService.getUsuario() || '';
        this.nombreUsuario = this.authService.getNombre() || this.usuarioActual;
        this.rolUsuario = (this.authService.getRol() || '').toLowerCase();
      } else {
        this.rolUsuario = '';
        this.usuarioActual = '';
        this.nombreUsuario = '';
      }
    });
  }

  private establecerFechaYHora(): void {
    const ahora = new Date();
    const hora = ahora.getHours();

    if (hora >= 5 && hora < 12) {
      this.saludoHora = 'Buenos días';
    } else if (hora >= 12 && hora < 19) {
      this.saludoHora = 'Buenas tardes';
    } else {
      this.saludoHora = 'Buenas noches';
    }

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const fechaFmt = ahora.toLocaleDateString('es-MX', opciones);
    // Capitalizar primera letra del día
    this.fechaHoy = fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1);
  }

  get rolEtiqueta(): string {
    const r = (this.rolUsuario || '').toLowerCase();
    switch (r) {
      case 'rh': return 'Recursos Humanos';
      case 'auditoria': return 'Auditoría';
      case 'mercadotecnia': return 'Mercadotecnia';
      case 'admin': return 'Administración';
      case 'sup': return 'Supervisión General';
      case 'coordinador': return 'Coordinación';
      case 'asesor': return 'Asesor Operativo';
      default: return r ? r.toUpperCase() : 'Operaciones';
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe(); // evitar fugas de memoria
  }

}
