import { Component, OnInit } from '@angular/core';
import { EjecutivasService } from '../../../services/ejecutivas.service'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ejecutivas',
  standalone: false,
  templateUrl: './ejecutivas.component.html',
  styleUrl: './ejecutivas.component.css'
})
export class EjecutivasComponent  implements OnInit {
getSeverity(arg0: any) {
throw new Error('Method not implemented.');
}
  
    constructor(private ejecutivasService: EjecutivasService) { }
    
    mostrarForm = false;
    nombreSeleccionado = '';
    ejecutivaSeleccionada = '';
    codigoSeleccionado: string = '';
    fecha: string = '';
    actividadSeleccionada: string = '';
    horaReporte: string = '';
    hora: string = ''; 
  
    cards = [
      { nombre: 'DH - Experiencias', ejecutiva: 'Guadalupe' },
      { nombre: 'DH - Triunfadoras', ejecutiva: 'Veronica' },
      { nombre: 'DH - Fuerza de Venta', ejecutiva: 'Veronica' },
      { nombre: 'SMA - Lealtad', ejecutiva: 'SMA Lealtad' },
      { nombre: 'SF - San Felipe', ejecutiva: 'Dulce' },
      { nombre: 'SLPZ - Mejorando Familias', ejecutiva: 'Vero' },
      { nombre: 'SDU - De Corazón', ejecutiva: 'Evelyn' }
    ];
  
    actividades = [
      { nombre: 'Envio de registros, depositos', frecuencia: 'Diariamente', hora: '11:00:00' },
      { nombre: 'Envio de Zona Roja', frecuencia: 'Diariamente', hora: '12:00:00' },
      { nombre: 'Envio de agendas y concentrado', frecuencia: 'Viernes', hora: '13:00:00' },
      { nombre: 'Reportar pagos diarios', frecuencia: 'Diariamente', hora: '18:00:00' },
      { nombre: 'Solicitud de Garantias', frecuencia: 'Miércoles', hora: '16:00:00' }
    ];

    codigos = [
      {codigo: 'NR' },
      {codigo: 'R' },
    ]

    //Regstro y filtrado de actividades de ejecutivas
    registros: any[] = []; 
    registrosFiltrados: any[] = [];
  
    ngOnInit() {
      this.setFechaHoy();
    }
  
    setFechaHoy() {
      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
      const dia = hoy.getDate().toString().padStart(2, '0');
      this.fecha = `${anio}-${mes}-${dia}`;

    }

  
    mostrarFormulario(nombre: string, ejecutiva: string) {
      this.nombreSeleccionado = nombre;
      this.ejecutivaSeleccionada = ejecutiva;
      this.mostrarForm = true;
      this.actividadSeleccionada = '';
      this.codigoSeleccionado = '';
      this.horaReporte = ''; 
      this.hora = '';

      this.ejecutivasService.obtenerRegistros().subscribe((data: any[]) => {
        this.registros = data;
        this.filtrarRegistros(); 
      });
    }

    filtrarRegistros() {
      this.registrosFiltrados = this.registros.filter(registro =>
        registro.nombre === this.nombreSeleccionado &&
        registro.ejecutiva === this.ejecutivaSeleccionada && 
        registro.fecha === this.fecha
      );
    }

    actualizarHora() {
      const actividad = this.actividades.find(a => a.nombre === this.actividadSeleccionada);
      this.horaReporte = actividad ? actividad.hora : '';
    
    }

    guardarActividad() {
      const actividad = this.actividades.find(a => a.nombre === this.actividadSeleccionada);
    
      if (actividad) {
        const registro = {
          nombre: this.nombreSeleccionado,
          ejecutiva: this.ejecutivaSeleccionada,
          fecha: this.fecha,
          actividad: this.actividadSeleccionada,
          frecuencia: actividad.frecuencia,
          hora: actividad.hora,
          actRealizada: this.codigoSeleccionado,
          horaReporte: this.horaReporte || '-'
        };
    
        this.ejecutivasService.guardarRegistro(registro).subscribe({
          next: (response) => {
            console.log('Registro guardado correctamente:', response);
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
              }
            });

            Toast.fire({
              icon: 'success',
              title: 'Actividad guardada correctamente'
            });
            
            // RECARGAR LOS REGISTROS
            this.ejecutivasService.obtenerRegistros().subscribe((data: any[]) => {
              this.registros = data;
              this.filtrarRegistros(); // Para volver a aplicar el filtro
              // this.cerrarFormulario();
            });
    
          },
          error: (error) => {
            console.error('Error al guardar actividad:', error);
            alert('Error al guardar actividad.');
          }
        });
      }
    }
    
    cerrarFormulario() {
      this.mostrarForm = false;
    }

  }
  