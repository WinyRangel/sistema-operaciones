import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { EjecutivasService } from '../../../services/ejecutivas.service';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Ejecutivas } from '../../../models/ejecutivas';
import { lastValueFrom } from 'rxjs';

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
    puntualidad: number;
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
  filtroCodigo = '';

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

  onMesChange() {
    this.diaSeleccionado = '';
    this.generarDias();
    this.filtrarRegistros();
    this.actualizarVistaPreviaYEsperar();
  }

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
    this.filtroCodigo = '';

    this.ejecutivasService.obtenerRegistros().subscribe(data => {
      this.registros = data;
      this.filtrarRegistros();
    });
  }


  // filtrarRegistros() {
  //   this.registrosFiltrados = this.registros.filter(r => {
  //     const [y, m, d] = r.fecha.split('-').map(Number);
  //     const mes = (new Date(y, m - 1, d).getMonth() + 1).toString().padStart(2,'0');
  //     const dia = new Date(y, m - 1, d).getDate().toString().padStart(2,'0');

  //     if (r.nombre !== this.nombreSeleccionado) return false;
  //     if (this.mesSeleccionado && mes !== this.mesSeleccionado) return false;
  //     if (this.diaSeleccionado && dia !== this.diaSeleccionado) return false;
  //     if (this.filtroCodigo && r.actRealizada !== this.filtroCodigo) return false;

  //     return true;
  //   });
  // }
  

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
      Swal.fire({ icon: 'success', title: 'Se registró correctamente', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      this.mostrarFormulario(this.nombreSeleccionado, this.ejecutivaSeleccionada);
    });
  }


  actualizarVistaPreviaYEsperar(): Promise<void> {
    return new Promise((resolve) => {
      this.ejecutivasService.obtenerRegistros().subscribe(all => {
        const regs = all.filter(r => (new Date(r.fecha).getMonth() + 1).toString().padStart(2, '0') === this.mesSeleccionado);
        this.totales = this.calcularTotales(regs);

        // Destruir gráfico anterior si existe
        if (this.chartInstance) {
          this.chartInstance.destroy();
        }

        // Crear gráfico y esperar al próximo ciclo de renderizado
        const ctx = this.previewChart.nativeElement.getContext('2d');
        this.chartInstance = new Chart(ctx, this.getChartConfig());

        // Esperamos un ciclo de render para asegurar que el canvas esté listo
        setTimeout(() => resolve(), 2000); 
      });
    });
  }


  calcularTotales(registros: Ejecutivas[]): any {
    let totalR = 0, totalNR = 0, puntuales = 0;
    const year = new Date().getFullYear();
    const month = Number(this.mesSeleccionado);


    registros.forEach(r => {
      if (r.actRealizada === 'R') {
        totalR++;
        const hrRep = new Date(`1970-01-01T${r.horaReporte}`);
        const hrLimite = new Date(`1970-01-01T${r.hora}`);
        if (hrRep <= hrLimite) puntuales++;
      } else {
        totalNR++;
      }
    });

    const actividadesPorEjecutiva = this.actividades.reduce((sum, actividad) => {
      const dias = this.frecuenciaSemanal[actividad.nombre] || [];
      console.log(dias);
      console.log("suma de actividades", sum);
      return sum + this.contarOcurrenciasEnMes(year, month, dias);
    }, 0);

    const esperadas = actividadesPorEjecutiva * this.cards.length;
    console.log('Esperadas:', esperadas);


    const puntualidad = totalR > 0 ? (puntuales / totalR) * 100 : 0;

    return { totalR, totalNR, esperadas, puntualidad };

  }

  contarOcurrenciasEnMes(year: number, month: number, diasSemana: number[]): number {
    const totalDias = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= totalDias; d++) {
      const dia = new Date(year, month - 1, d).getDay();
      if (diasSemana.includes(dia)) count++;
    }
    return count;
  }

  getChartConfig(): any {
    if (!this.totales) return;
    const { totalR, totalNR, esperadas } = this.totales;
    const porcentajeR = (totalR / esperadas) * 100 || 0;
    const porcentajeNR = (totalNR / esperadas) * 100 || 0;
    const porcentajeE = 100 - (porcentajeR + porcentajeNR);

    return {
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
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 14 } }
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

  
  // Generar reporte de las 
  async generarPDF(): Promise<void> {
    if (!this.mesSeleccionado) {
      Swal.fire('Selecciona un mes', '', 'warning');
      return;
    }

    // 1) Asegura datos y gráfico listos
    await this.actualizarVistaPreviaYEsperar();
    await new Promise(res => setTimeout(res, 500));
    

    // 2) Obtiene registros filtrados del mes
    const allRegs: Ejecutivas[] = await lastValueFrom(this.ejecutivasService.obtenerRegistros());
    const regsMes = allRegs.filter(r => {
      const m = (new Date(r.fecha).getMonth() + 1).toString().padStart(2, '0');
      return m === this.mesSeleccionado;
    });

    // 3) Calcula totales y detalles
    const tot = this.calcularTotales(regsMes);
    const detalles = this.cards.map(card => {
      const regsCard = regsMes.filter(r => r.nombre === card.nombre && r.ejecutiva === card.ejecutiva);
      let totalR = 0, totalNR = 0, puntuales = 0;
      regsCard.forEach(r => {
        if (r.actRealizada === 'R') {
          totalR++;
          const hrRep = new Date(`1970-01-01T${r.horaReporte}`);
          const hrLim = new Date(`1970-01-01T${r.hora}`);
          if (hrRep <= hrLim) puntuales++;
        } else {
          totalNR++;
        }
      });
      const esperadas = this.actividades
        .reduce((sum, act) => sum + this.contarOcurrenciasEnMes(new Date().getFullYear(),
          Number(this.mesSeleccionado),
          this.frecuenciaSemanal[act.nombre] || []),
          0);
      const punt = totalR > 0 ? `${((puntuales / totalR) * 100).toFixed(1)}%` : '0%';
      return [card.nombre, card.ejecutiva, totalR, totalNR, esperadas, punt];
    });

    // 4) Prepara PDF
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let y = 10;
    doc.setFontSize(16);
    doc.text(`Reporte Mensual - Mes ${this.mesSeleccionado}`, 10, y);
    y += 10;

    // 5) Tabla de totales
    autoTable(doc, {
      head: [['Tipo', 'Cantidad']],
      body: [
        ['Reportadas (R)', tot.totalR],
        ['No Reportadas (NR)', tot.totalNR, ],
        ['Total Esperadas', tot.esperadas, ]
      ],
      startY: y,
      margin: { left: 10, right: 10 },
      headStyles: { fillColor: [36, 84, 139] },
      theme: 'grid'
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // 6) Tabla de detalle
    autoTable(doc, {
      head: [['Coordinación','Ejecutiva','R','Puntualidad','NR','Esperadas']],
      body: detalles,
      startY: y,
      margin: { left: 10, right: 10 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [36, 84, 139] },
      theme: 'grid'
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // 7) Imagen de la gráfica centrada
    const canvas: HTMLCanvasElement = this.previewChart.nativeElement;
    const chartImg = canvas.toDataURL('image/png');
    const pageWidth = doc.internal.pageSize.getWidth();
    const fullWidth = pageWidth - 20;
    const imgW = fullWidth * 0.6;
    const imgProps = doc.getImageProperties(chartImg);
    const imgH = (imgProps.height * imgW) / imgProps.width;
    const xCenter = (pageWidth - imgW) / 2;
    doc.addImage(chartImg, 'PNG', xCenter, y, imgW, imgH);

    // 8) Guardar PDF
    doc.save(`reporte_ejecutivas_mes_${this.mesSeleccionado}.pdf`);
  }


  // Generar PDF con grafica y tablas
  async generarPDFConPie(totales: { totalR: number; puntualidad: number; totalNR: number; esperadas: number;}) {
    if (totales.esperadas === 0) {
      Swal.fire('Error', 'No hay actividades registradas este mes', 'error');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 10;
    doc.setFontSize(16);
    doc.text(`Reporte Mensual - Mes ${this.mesSeleccionado}`, 10, y);
    y += 10;

    autoTable(doc, {
      head: [['Tipo', 'Cantidad', 'Promedio de entregas']],
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

    const detalles = this.calcularDetallesPorCoordinacion();
    autoTable(doc, {
      head: [['Coordinación', 'Ejecutiva', 'R', 'NR', 'Esperadas', 'Puntualidad']],
      body: detalles,
      startY: y,
      margin: { horizontal: 10 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [36, 84, 139] }
    });

    doc.save(`reporte_ejecutivas_mes_${this.mesSeleccionado}.pdf`);
  }

  calcularDetallesPorCoordinacion(): any[][] {
    const year = new Date().getFullYear();
    const month = Number(this.mesSeleccionado);

    return this.cards.map(card => {
      const regs = this.registros.filter((r: Ejecutivas) => {
        const d = new Date(r.fecha);
        return (
          r.nombre === card.nombre &&
          r.ejecutiva === card.ejecutiva &&
          d.getFullYear() === year &&
          (d.getMonth() + 1) === month
        );
      });

      let totalR = 0, totalNR = 0, puntuales = 0;

      regs.forEach(r => {
        if (r.actRealizada === 'R') {
          totalR++;
          if (r.horaReporte && r.horaReporte !== '-') {
            const hrRep = new Date(`1970-01-01T${r.horaReporte}`);
            const hrLimite = new Date(`1970-01-01T${r.hora}`);
            if (hrRep <= hrLimite) puntuales++;
          }
        }
        else {
          totalNR++;
        }
      });

      const esperadas = this.actividades.reduce((sum, actividad) => {
        const dias = this.frecuenciaSemanal[actividad.nombre] || [];
        return sum + this.contarOcurrenciasEnMes(year, month, dias);
      }, 0);

      const puntualidad = totalR > 0 ? `${((puntuales / totalR) * 100).toFixed(1)}%` : '0%';

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

  page: number = 1;
pageSize: number = 20;
totalPages: number = 1;
registrosPagina: any[] = [];

nextPage() {
  if (this.page < this.totalPages) {
    this.page++;
    this.actualizarRegistrosPaginados();
  }
}

prevPage() {
  if (this.page > 1) {
    this.page--;
    this.actualizarRegistrosPaginados();
  }
}

actualizarRegistrosPaginados() {
  const startIndex = (this.page - 1) * this.pageSize;
  const endIndex = startIndex + this.pageSize;
  this.registrosPagina = this.registrosFiltrados.slice(startIndex, endIndex);
}

filtrarRegistros() {
  const filtrados = this.registros.filter(r => {
    const [y, m, d] = r.fecha.split('-').map(Number);
    const mes = (new Date(y, m - 1, d).getMonth() + 1).toString().padStart(2, '0');
    const dia = new Date(y, m - 1, d).getDate().toString().padStart(2, '0');

    if (r.nombre !== this.nombreSeleccionado) return false;
    if (this.mesSeleccionado && mes !== this.mesSeleccionado) return false;
    if (this.diaSeleccionado && dia !== this.diaSeleccionado) return false;
    if (this.filtroCodigo && r.actRealizada !== this.filtroCodigo) return false;

    return true;
  });

  this.registrosFiltrados = filtrados;
  this.totalPages = Math.ceil(this.registrosFiltrados.length / this.pageSize);
  this.page = 1;
  this.actualizarRegistrosPaginados();
}



}
