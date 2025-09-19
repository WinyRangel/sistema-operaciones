import { Component, OnInit } from '@angular/core';
import { DepositosService } from '../../../services/depositos.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
    'LEALTAD'
  ];

  // Estado actual
  coordinacionSeleccionada: string | null = null;

  nombreSeleccionado: string = '';

  //FILTRAR POR MES
  filterMonth: string = '';
  months: string[] = [];

  depositos: any[] = [];

  constructor(private depositosService: DepositosService) { }

  ngOnInit(): void { }
  mesSeleccionado: string = '';

  get filteredDepositos(): any[] {
    if (!this.mesSeleccionado) {
      return this.depositos;
    }

    return this.depositos.filter(d => {
      const mes = d.fechaReporte.substring(5, 7); 
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

generarReportePDF(): void {
  if (!this.mesSeleccionado) {
    Swal.fire('Selecciona un mes para generar el reporte.', '', 'warning');
    return;
  }

  const requests = this.coordinaciones.map(coord =>
    this.depositosService.obtenerDepositosPorCoordinacion(coord).pipe(
      map(depositos =>
        depositos.filter(d => d.fechaReporte?.substring(5, 7) === this.mesSeleccionado)
      )
    )
  );

  forkJoin(requests).subscribe(resultadoPorCoordinacion => {
    const doc = new jsPDF();
    let y = 20;

    this.coordinaciones.forEach((coordinacion, index) => {
      const depositosFiltrados = resultadoPorCoordinacion[index];

      if (depositosFiltrados.length > 0) {
        // Contar reportes por asesor
        const conteo: Record<string, number> = {};
        depositosFiltrados.forEach(d => {
          conteo[d.nombre] = (conteo[d.nombre] || 0) + 1;
        });

        // Pasar a arreglo y ordenar descendente
        const datosOrdenados = Object.entries(conteo)
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        // Encabezado
        doc.setFontSize(14);
        doc.text(`Coordinación: ${coordinacion}`, 14, y);
        y += 6;

        // Tabla con asesores
        autoTable(doc, {
          startY: y,
          head: [['Asesor', 'Cantidad de reportes']],
          body: datosOrdenados.map(d => [d.nombre, d.cantidad.toString()]),
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { halign: 'center' }
        });

        y = (doc as any).lastAutoTable.finalY + 10;

        // Nueva página si no cabe otra tabla
        if (index < this.coordinaciones.length - 1 && y > 250) {
          doc.addPage();
          y = 20;
        }
      }
    });

    // Guardar PDF
    const fileName = `ReporteDepositos_${this.mesSeleccionado}_${new Date().getFullYear()}.pdf`;
    doc.save(fileName);
  });
}



}
