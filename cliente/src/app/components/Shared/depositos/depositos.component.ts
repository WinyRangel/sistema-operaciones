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

  //FILTRAR POR MES
  filterMonth: string = '';
  months: string[] = [];

  depositos: any[] = [];

  constructor(private depositosService: DepositosService) {}

  ngOnInit(): void {}
mesSeleccionado: string = ''; // por ejemplo '05' para mayo

  // Getter para filtrar por mes (en cualquier año)
  get filteredDepositos(): any[] {
    if (!this.mesSeleccionado) {
      return this.depositos;
    }

    return this.depositos.filter(d => {
      const mes = d.fechaReporte.substring(5, 7); // formato ISO: YYYY-MM-DD
      return mes === this.mesSeleccionado;
    });
  }

  // Llama a este método siempre que cambie mes ó cambie coordenación
  applyFilters() {
    // No hace falta volver a pedir al servidor,
    // sólo aplicamos el .filter() al array existente.
    // Para “refrescar” la vista, basta con reasignar:
    this.depositos = [...this.depositos];
  }

  seleccionarCoordinacion(nombre: string) {
    this.coordinacionSeleccionada = nombre;
    this.nombreSeleccionado = nombre;
    this.filterMonth = '';         // opcional: resetear mes al cambiar coord.
    this.depositos = [];           // vaciamos antes de obtener
    this.depositosService
      .obtenerDepositosPorCoordinacion(nombre)
      .subscribe(data => {
        this.depositos = data;
      });
  }

  // seleccionarCoordinacion(nombre: string) {
  //   this.coordinacionSeleccionada = nombre;
  //   this.nombreSeleccionado = nombre;
  //   this.obtenerDepositos();
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
