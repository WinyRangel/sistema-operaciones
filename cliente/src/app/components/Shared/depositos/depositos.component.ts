import { Component, OnInit } from '@angular/core';
import { DepositosService } from '../../../services/depositos.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

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
    'SAN FELIPE',
    'SAN MIGUEL'
  ];

  // Estado actual
  coordinacionSeleccionada: string | null = null;

  nombreSeleccionado: string = '';

  //FILTRAR POR MES
  filterMonth: string = '';
  months: string[] = [];

  depositos: any[] = [];

  constructor(private depositosService: DepositosService) {}

  ngOnInit(): void {}
mesSeleccionado: string = ''; 

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
    this.depositos = [...this.depositos];
  }

  seleccionarCoordinacion(nombre: string) {
    this.coordinacionSeleccionada = nombre;
    this.nombreSeleccionado = nombre;
    this.filterMonth = '';         
    this.depositos = [];           
    this.depositosService
      .obtenerDepositosPorCoordinacion(nombre)
      .subscribe(data => {
        this.depositos = data;
      });
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

//   exportarExcelPorCoordinaciones(): void {
//   if (!this.mesSeleccionado) {
//     Swal.fire('Selecciona un mes para exportar.', '', 'warning');
//     return;
//   }

//   const workbook = XLSX.utils.book_new();

//   this.coordinaciones.forEach(coordinacion => {
//     const depositosFiltrados = this.depositos.filter(d => {
//       const mes = d.fechaReporte?.substring(5, 7);
//       return d.coordinacion === coordinacion && mes === this.mesSeleccionado;
//     });

//     if (depositosFiltrados.length > 0) {
//       const data = depositosFiltrados.map(d => ({
//         '¿Quién reporta?': d.nombre,
//         'Hora Reporte': d.horaReporte,
//         'Fecha Reporte': d.fechaReporte,
//       }));

//       const worksheet = XLSX.utils.json_to_sheet(data);
//       XLSX.utils.book_append_sheet(workbook, worksheet, coordinacion);
//     }
//   });

//   const nombreArchivo = `Depositos_${this.mesSeleccionado}.xlsx`;
//   const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
//   const blobData = new Blob([excelBuffer], { type: 'application/octet-stream' });
//   FileSaver.saveAs(blobData, nombreArchivo);
// }
exportarExcelPorCoordinaciones(): void {
  if (!this.mesSeleccionado) {
    Swal.fire('Selecciona un mes para exportar.', '', 'warning');
    return;
  }

  const headerRow = ['¿Quién reporta?', 'Hora Reporte', 'Fecha Reporte'];
  const workbook = XLSX.utils.book_new();

  // Creamos un array de observables: por cada coordinación pedimos sus depósitos
  const requests = this.coordinaciones.map(coord =>
    this.depositosService.obtenerDepositosPorCoordinacion(coord).pipe(
      map(depositos =>
        // aquí filtramos por mes directamente
        depositos.filter(d => d.fechaReporte?.substring(5, 7) === this.mesSeleccionado)
      )
    )
  );

  // forkJoin espera a que todas las peticiones respondan
  forkJoin(requests).subscribe(
    resultadoPorCoordinacion => {
      // resultadoPorCoordinacion es un array paralelo a `this.coordinaciones`
      resultadoPorCoordinacion.forEach((depositosFiltrados, i) => {
        const nombreHoja = this.coordinaciones[i].slice(0, 31); 
        let ws;

        if (depositosFiltrados.length) {
          const data = depositosFiltrados.map(d => ({
            '¿Quién reporta?': d.nombre,
            'Hora Reporte': d.horaReporte,
            'Fecha Reporte': d.fechaReporte
          }));
          ws = XLSX.utils.json_to_sheet(data, { header: headerRow });
        } else {
          // hoja vacía con encabezados
          ws = XLSX.utils.aoa_to_sheet([headerRow]);
        }

        XLSX.utils.book_append_sheet(workbook, ws, nombreHoja);
      });

      // generamos el archivo
      const fileName = `Depositos_${this.mesSeleccionado}_${new Date().getFullYear()}.xlsx`;
      const wbout: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      FileSaver.saveAs(new Blob([wbout]), fileName);
    },
    err => {
      console.error(err);
      Swal.fire('Error al exportar', '', 'error');
    }
  );
}

}
