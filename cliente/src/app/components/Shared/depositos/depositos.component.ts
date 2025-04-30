import { Component, OnInit } from '@angular/core';
import { DepositosService } from '../../../services/depositos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-depositos',
  standalone: false,
  templateUrl: './depositos.component.html',
  styleUrls: ['./depositos.component.css']
})

export class DepositosComponent implements OnInit {
getSeverity(arg0: any) {
  throw new Error('Method not implemented.');
  }

  constructor(private depositosService: DepositosService) {}

  nombre: string = '';
  horaReporte: string = '';
  fechaReporte: string = '';

  coordinaciones: string[] = [
    'TRIUNFADORAS',
    'EXPERIENCIAS',
    'FUERZA DE VENTA',
    'MEJORANDO FAMILIAS',
    'CUMPLIENDO SUEÑOS',
    'DE CORAZÓN',
    'SAN FELIPE'
  ];

  coordinacionSeleccionada: string | null = null;

  depositos: any[] = [];

  ngOnInit(): void {
  }

  seleccionarCoordinacion(nombre: string) {
    this.coordinacionSeleccionada = nombre;
    this.obtenerDepositos();
  }


  guardarDeposito() {
    if (!this.nombre || !this.horaReporte || !this.fechaReporte || !this.coordinacionSeleccionada) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, llena todos los campos antes de guardar.',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      });
      return;
    }
  
    const nuevoDeposito = {
      nombre: this.nombre,
      horaReporte: this.horaReporte,
      fechaReporte: this.fechaReporte,
      coordinacion: this.coordinacionSeleccionada
    };
  
    this.depositosService.agregarDeposito(nuevoDeposito).subscribe(() => {
      this.obtenerDepositos();
      this.nombre = '';
      this.horaReporte = '';
      this.fechaReporte = '';
      this.coordinacionSeleccionada = null;
  
      // Mostrar notificación Toast
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
        title: 'Depósito guardado correctamente'
      });
    });
  }
  

  obtenerDepositos() {
    if (!this.coordinacionSeleccionada) return;

    this.depositosService.obtenerDepositosPorCoordinacion(this.coordinacionSeleccionada)
      .subscribe(data => {
        this.depositos = data;
      });
  }
}
