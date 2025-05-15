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
  // Form
  nombre: string = '';
  horaReporte: string = '';
  fechaReporte: string = '';

  // Coordinaciones
  coordinaciones: string[] = [
    'TRIUNFADORAS',
    'EXPERIENCIAS',
    'FUERZA DE VENTA',
    'MEJORANDO FAMILIAS',
    'CUMPLIENDO SUEÑOS',
    'DE CORAZÓN',
    'SAN FELIPE'
  ];

  // Estado actual
  coordinacionSeleccionada: string | null = null;

  // **Nueva** propiedad del header
  nombreSeleccionado: string = '';

  depositos: any[] = [];

  constructor(private depositosService: DepositosService) {}

  ngOnInit(): void {}

  seleccionarCoordinacion(nombre: string) {
    this.coordinacionSeleccionada = nombre;
    // Asigna solo el nombre para el header
    this.nombreSeleccionado = nombre;
    this.obtenerDepositos();
  }

  // guardarDeposito() {
  //   if (!this.nombre || !this.horaReporte || !this.fechaReporte || !this.coordinacionSeleccionada) {
  //     Swal.fire({
  //       icon: 'warning',
  //       title: 'Campos incompletos',
  //       text: 'Por favor, llena todos los campos antes de guardar.',
  //       confirmButtonColor: '#3085d6',
  //       confirmButtonText: 'Entendido'
  //     });
  //     return;
  //   }

  //   const nuevoDeposito = {
  //     nombre: this.nombre,
  //     horaReporte: this.horaReporte,
  //     fechaReporte: this.fechaReporte,
  //     coordinacion: this.coordinacionSeleccionada
  //   };

  //   this.depositosService.agregarDeposito(nuevoDeposito).subscribe(() => {
  //     this.obtenerDepositos();
  //     // Reset
  //     this.nombre = '';
  //     this.horaReporte = '';
  //     this.fechaReporte = '';
  //     this.coordinacionSeleccionada = null;
  //     this.nombreSeleccionado = '';

  //     Swal.mixin({
  //       toast: true,
  //       position: 'top-end',
  //       showConfirmButton: false,
  //       timer: 3000,
  //       timerProgressBar: true
  //     }).fire({
  //       icon: 'success',
  //       title: 'Depósito guardado correctamente'
  //     });
  //   });
  // }
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

      // Sólo resetea los campos del form, pero no cierres el formulario ni el nav
      this.nombre = '';
      this.horaReporte = '';
      this.fechaReporte = '';

      Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      }).fire({
        icon: 'success',
        title: 'Depósito guardado correctamente'
      });
    });
  }

  obtenerDepositos() {
    if (!this.coordinacionSeleccionada) return;
    this.depositosService
      .obtenerDepositosPorCoordinacion(this.coordinacionSeleccionada)
      .subscribe((data) => (this.depositos = data));
  }
}
