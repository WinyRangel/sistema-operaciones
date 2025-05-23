import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { EjecutivasService } from '../../../services/ejecutivas.service';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Ejecutivas } from '../../../models/ejecutivas';

@Component({
  selector: 'app-ejecutivas',
  standalone: false,
  templateUrl: './ejecutivas.component.html',
  styleUrls: ['./ejecutivas.component.css']
})
export class EjecutivasComponent implements OnInit {
  @ViewChild('previewChart', { static: false }) previewChart!: ElementRef;
  chartInstance: any;
  totales: {
    totalR: number;
    totalNR: number;
    esperadas: number;
    puntualidad: number
  } | null = null;

  mostrarForm = false;
  nombreSeleccionado = '';
  ejecutivaSeleccionada = '';
  codigoSeleccionado = '';
  fecha = '';
  actividadSeleccionada = '';
  horaReporte = '';
  mesSeleccionado = '';
  diaSeleccionado = ''; 


  cards = [
    { nombre: 'DH - Experiencias', ejecutiva: 'Guadalupe' },
    { nombre: 'DH - Triunfadoras', ejecutiva: 'Veronica' },
    { nombre: 'DH - Fuerza de Venta', ejecutiva: 'Veronica' },
    { nombre: 'SMA - Lealtad', ejecutiva: 'Elisa' },
    { nombre: 'SF - San Felipe', ejecutiva: 'Dulce' },
    { nombre: 'SLPZ - Mejorando Familias', ejecutiva: 'Cristina' },
    { nombre: 'SDU - De Corazón', ejecutiva: 'Araceli' },
    { nombre: 'VIC - Cumpliendo Sueños', ejecutiva: 'Claudia' }
  ];

  actividades = [
    { nombre: 'Envio de registros, depositos', frecuencia: 'Diariamente', hora: '11:00:00' },
    { nombre: 'Envio de Zona Roja', frecuencia: 'Diariamente', hora: '12:00:00' },
    { nombre: 'Envio de agendas y concentrado', frecuencia: 'Viernes', hora: '13:00:00' },
    { nombre: 'Reportar pagos diarios', frecuencia: 'Diariamente', hora: '18:00:00' },
    { nombre: 'Solicitud de Garantias', frecuencia: 'Miércoles', hora: '16:00:00' }
  ];

  codigos = [
    { codigo: 'NR' },
    { codigo: 'R' }
  ];

  private frecuenciaSemanal: Record<string, number[]> = {
    'Envio de registros, depositos': [1, 2, 3, 4, 5, 6],
    'Envio de Zona Roja': [1, 2, 3, 4, 5, 6],
    'Envio de agendas y concentrado': [5],
    'Reportar pagos diarios': [1, 2, 3, 4, 5, 6],
    'Solicitud de Garantias': [3]
  };

  registros: any[] = [];
  registrosFiltrados: any[] = [];
  diasDelMes: string[] = []; 

  constructor(private ejecutivasService: EjecutivasService) { }

  ngOnInit() {
    this.setFechaHoy();
    Chart.register(ChartDataLabels);
  }

  // Al cambiar mes, recalcular días y filtrar
  onMesChange() {
    this.diaSeleccionado = '';
    this.generarDias();
    this.filtrarRegistros();
    this.actualizarVistaPrevia();
  }

  // Genera arreglo de días según mesSeleccionado
  private generarDias() {
    this.diasDelMes = [];
    if (!this.mesSeleccionado) return;
    const year = new Date().getFullYear();
    const monthIndex = Number(this.mesSeleccionado) - 1;
    const totalDias = new Date(year, monthIndex + 1, 0).getDate();
    for (let d = 1; d <= totalDias; d++) {
      this.diasDelMes.push(d.toString().padStart(2, '0'));
    }
  }


  private setFechaHoy() {
    const hoy = new Date();
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const dia = hoy.getDate().toString().padStart(2, '0');
    this.fecha = `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  mostrarFormulario(nombre: string, ejecutiva: string) {
    this.nombreSeleccionado = nombre;
    this.ejecutivaSeleccionada = ejecutiva;
    this.mostrarForm = true;
    this.actividadSeleccionada = '';
    this.codigoSeleccionado = '';
    this.horaReporte = '';

    this.ejecutivasService.obtenerRegistros().subscribe(data => {
      this.registros = data;
      this.filtrarRegistros();
    });
  }

  filtrarRegistros() {
    this.registrosFiltrados = this.registros.filter(r => {
      // parseo manual para evitar desfase de zona
      const [y, m, d] = r.fecha.split('-').map(Number);
      const fechaObj = new Date(y, m - 1, d);
      const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
      const dia = fechaObj.getDate().toString().padStart(2, '0');

      if (r.nombre !== this.nombreSeleccionado) return false;
      if (this.mesSeleccionado && mes !== this.mesSeleccionado) return false;
      if (this.diaSeleccionado && dia !== this.diaSeleccionado) return false;
      return true;
    });
  }


  actualizarHora() {
    const act = this.actividades.find(a => a.nombre === this.actividadSeleccionada);
    this.horaReporte = act ? act.hora : '';
  }

  guardarActividad() {
    if (!this.actividadSeleccionada || !this.codigoSeleccionado) {
      Swal.fire('Campos incompletos', 'Completa actividad y código', 'warning');
      return;
    }
    const act = this.actividades.find(a => a.nombre === this.actividadSeleccionada)!;
    const registro = {
      nombre: this.nombreSeleccionado,
      ejecutiva: this.ejecutivaSeleccionada,
      fecha: this.fecha,
      actividad: this.actividadSeleccionada,
      frecuencia: act.frecuencia,
      hora: act.hora,
      actRealizada: this.codigoSeleccionado,
      horaReporte: this.horaReporte || '-'
    };

    this.ejecutivasService.guardarRegistro(registro).subscribe(() => {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      });
      Toast.fire({
        icon: "success",
        title: "Se registro correctamente"
      });
      this.mostrarFormulario(this.nombreSeleccionado, this.ejecutivaSeleccionada);
    });
  }

  actualizarVistaPrevia() {
    if (!this.mesSeleccionado) {
      this.totales = null;
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }
      return;
    }

    this.ejecutivasService.obtenerRegistros().subscribe(all => {
      const regs = all.filter(r => (new Date(r.fecha).getMonth() + 1).toString().padStart(2, '0') === this.mesSeleccionado);
      this.totales = this.calcularTotales(regs);

      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const ctx = this.previewChart.nativeElement.getContext('2d');
      this.chartInstance = new Chart(ctx, this.getChartConfig());
    });
  }

  private calcularDetallesPorCoordinacion(): any[][] {
    const year = new Date().getFullYear();
    const month = Number(this.mesSeleccionado);

    return this.cards.map(card => {
      // 1) Filtrar solo los registros de esta coordinación+ejecutiva en el mes

      const regs = this.registros.filter((r: Ejecutivas) => {
        const d = new Date(r.fecha);
        return (
          r.nombre === card.nombre &&
          r.ejecutiva === card.ejecutiva &&
          d.getFullYear() === year &&
          (d.getMonth() + 1) === month
        );
      });


      // 2) Contar R, NR y cuántos fueron puntuales
      let totalR = 0;
      let totalNR = 0;
      let puntuales = 0;
      regs.forEach(r => {
        if (r.actRealizada === 'R') {
          totalR++;
          const hrRep = new Date(`1970-01-01T${r.horaReporte}`);
          const hrLimite = new Date(`1970-01-01T${r.hora}`);
          if (hrRep <= hrLimite) puntuales++;
        } else {
          totalNR++;
        }
      });

      // 3) Calcular cuántas entregas se esperaban en el mes (para **todas** las actividades)
      const esperadas = this.actividades.reduce((sum, actividad) => {
        const dias = this.frecuenciaSemanal[actividad.nombre] || [];
        return sum + this.contarOcurrenciasEnMes(year, month, dias);
      }, 0);

      // 4) Formatear puntualidad como porcentaje
      const puntualidad = totalR > 0
        ? `${((puntuales / totalR) * 100).toFixed(1)}%` : '0%';



      // 5) Devolver la fila
      return [
        card.nombre,
        card.ejecutiva,
        totalR,
        totalNR,
        esperadas,
        puntualidad
      ];
    });
  }

  private getChartConfig(): any {
    if (!this.totales) return {};

    const porcentajeR = (this.totales.totalR / this.totales.esperadas) * 100 || 0;
    const porcentajeNR = (this.totales.totalNR / this.totales.esperadas) * 100 || 0;
    const porcentajeE = 100 - (porcentajeR + porcentajeNR);


    return {
      type: 'pie',
      data: {
        labels: [
          `Reportadas (R) ${porcentajeR.toFixed(1)}%`,
          `No Reportadas (NR) ${porcentajeNR.toFixed(1)}%`,
          `Faltantes0 ${porcentajeE.toFixed(1)}%`
        ],
        datasets: [{
          data: [porcentajeR, porcentajeNR, porcentajeE],
          backgroundColor: ['#24548b', '#ab1a3a', '#329f20'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 14 }
            }
          },
          tooltip: { enabled: false },
          datalabels: {
            color: '#ffffff',
            font: { size: 14, weight: 'bold' },
            formatter: (value: number) => `${value.toFixed(1)}%`
          }
        }
      }
    };
  }

  generarPDF() {
    if (this.totales) {
      this.generarPDFConPie(this.totales);
    }
  }

  private async generarPDFConPie(totales: {
    totalR: number;
    totalNR: number;
    esperadas: number;
    puntualidad: number
  }) {
    if (totales.esperadas === 0) {
      Swal.fire('Error', 'No hay actividades registradas este mes', 'error');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 10;

    // Título principal
    doc.setFontSize(16);
    doc.text(`Reporte Mensual - Mes ${this.mesSeleccionado}`, 10, y);
    y += 10;

    // Tabla resumen general de reportes
    autoTable(doc, {
      head: [['Tipo', 'Cantidad', 'Promedio de entegras']],
      body: [
        ['Reportadas (R)', totales.totalR, `${totales.puntualidad.toFixed(1)}%`],
        ['No Reportadas (NR)', totales.totalNR, '-'],
        ['Total Esperadas', totales.esperadas, '-']
      ],
      startY: y,
      margin: { horizontal: 10 },
      headStyles: { fillColor: [36, 84, 139] },
      columnStyles: { 2: { cellWidth: 30 } }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Tabla detallada por coordinación
    const detalles = this.calcularDetallesPorCoordinacion();
    autoTable(doc, {
      head: [['Coordinación', 'Ejecutiva', 'R', 'NR', 'Esperadas', 'Puntualidad']],
      body: detalles,
      startY: y,
      margin: { horizontal: 10 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [58, 159, 31] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // Gráfico
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpi = 3;

    canvas.width = 794 * dpi;
    canvas.height = 400 * dpi;
    canvas.style.width = '794px';
    canvas.style.height = '400px';

    if (ctx) {
      try {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const porcentajeR = (totales.totalR / totales.esperadas) * 100 || 0;
        const porcentajeNR = (totales.totalNR / totales.esperadas) * 100 || 0;
        const porcentajeE = 100 - (porcentajeR + porcentajeNR);

        const tempChart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: [
              `Reportadas (R) ${porcentajeR.toFixed(1)}%`,
              `No Reportadas (NR) ${porcentajeNR.toFixed(1)}%`,
              `Faltantes ${porcentajeE.toFixed(1)}%`

            ],
            datasets: [{
              data: [porcentajeR, porcentajeNR, porcentajeE],
              backgroundColor: ['#24548b', '#ab1a3a', '#329f20'],
              borderColor: '#ffffff',
              borderWidth: 4 * dpi
            }]
          },
          options: {
            responsive: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { font: { size: 16 * dpi } }
              },
              datalabels: {
                color: '#ffffff',
                font: {
                  size: 16 * dpi,
                  weight: 'bold',
                  family: 'Arial'
                },
                formatter: (value: number) => `${value.toFixed(1)}%`
              }
            }
          }
        });

        await new Promise<void>(resolve => {
          tempChart.render();
          setTimeout(resolve, 500);
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pageWidth = doc.internal.pageSize.getWidth() - 20;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        doc.addImage(imgData, 'PNG', 10, y, pageWidth, imgHeight);
        doc.save(`reporte_mensual_${this.mesSeleccionado}.pdf`);

        tempChart.destroy();

      } catch (error) {
        console.error('Error generando PDF:', error);
        Swal.fire('Error', 'Error al generar el PDF', 'error');
      }
    }
  }


  private calcularTotales(regs: any[]): { totalR: number; totalNR: number; esperadas: number; puntualidad: number } {
  let totalR = 0;
  let totalNR = 0;
  let puntuales = 0;

  for (let r of regs) {
    if (r.actRealizada === 'R') {
      totalR++;
      const hrRep = new Date(`1970-01-01T${r.horaReporte}`);
      const hrLimite = new Date(`1970-01-01T${r.hora}`);
      if (hrRep <= hrLimite) puntuales++;
    } else {
      totalNR++;
    }
  }

  const esperadas = this.actividades.reduce((sum, actividad) => {
    const dias = this.frecuenciaSemanal[actividad.nombre] || [];
    return sum + this.contarOcurrenciasEnMes(new Date().getFullYear(), Number(this.mesSeleccionado), dias);
  }, 0);

  const puntualidad = totalR > 0 ? (puntuales / totalR) * 100 : 0;

  return { totalR, totalNR, esperadas, puntualidad };
}


  eliminarRegistro(id: string) {
    Swal.fire({
      title: '¿Seguro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.ejecutivasService.eliminarRegistro(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Registro eliminado.', 'success');
            this.mostrarFormulario(this.nombreSeleccionado, this.ejecutivaSeleccionada);
          },
          error: err => {
            console.error(err);
            Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
          }
        });
      }
    });
  }

  private contarOcurrenciasEnMes(year: number, month: number, daysOfWeek: number[]): number {
    let count = 0;
    const mesIndex = month - 1;
    const date = new Date(year, mesIndex, 1);
    while (date.getMonth() === mesIndex) {
      if (daysOfWeek.includes(date.getDay())) count++;
      date.setDate(date.getDate() + 1);
    }
    return count;
  }

}