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
import * as XLSX from 'xlsx';

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

  private norm(s: any): string {
    return String(s ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ');
  }

  private mesDe(fecha: string): string {
    const parts = (fecha || '').split('-');
    return (parts[1] || '').padStart(2, '0');
  }

  private anioDe(fecha: string): number {
    const parts = (fecha || '').split('-');
    return Number(parts[0] || '0');
}


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
        // FILTRADO consistente: usar mesDe() (evita problemas TZ con new Date)
        const regs = all.filter(r => this.mesDe(r.fecha) === this.mesSeleccionado);

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
    let totalR = 0, totalNR = 0;
    const year = new Date().getFullYear();
    const month = Number(this.mesSeleccionado);

    registros.forEach(r => {
      const code = this.norm(r.actRealizada);
      if (code === 'R') totalR++;
      else if (code === 'NR') totalNR++;
      // si viene otro code, lo ignoramos intencionalmente (o podemos logearlo)
    });

    const actividadesPorEjecutiva = this.actividades.reduce((sum, actividad) => {
      const dias = this.frecuenciaSemanal[actividad.nombre] || [];
      return sum + this.contarOcurrenciasEnMes(year, month, dias);
    }, 0);

    const esperadas = actividadesPorEjecutiva * this.cards.length;
    console.log('Totales en R', totalR, 'Totales en NR', totalNR, 'esperadas', esperadas);

    return { totalR, totalNR, esperadas };
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

    return {
      type: 'pie',
      data: {
        labels: [
          `Reportadas (R) ${porcentajeR.toFixed(1)}%`,
          `No Reportadas (NR) ${porcentajeNR.toFixed(1)}%`,

        ],
        datasets: [{
          data: [porcentajeR, porcentajeNR],
          backgroundColor: ['#24548b', '#ab1a3a'],
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

  // Generar reporte en PDF
  async generarPDF(): Promise<void> {
    if (!this.mesSeleccionado) {
      Swal.fire('Selecciona un mes', '', 'warning');
      return;
    }

    // 1) Asegura datos y gráfico listos
    await this.actualizarVistaPreviaYEsperar();
    await new Promise(res => setTimeout(res, 500));
    
    // 2) Obtiene registros filtrados del mes (sin usar new Date() para mes)
    const allRegs: Ejecutivas[] = await lastValueFrom(this.ejecutivasService.obtenerRegistros());
    const regsMes = allRegs.filter(r => this.mesDe(r.fecha) === this.mesSeleccionado);

    // TEST DIAGNOSTICO PARA IDENTIFICAR LAS R PERDIDAS
    // Ejecuta esto justo después de crear regsMes
    const codes = regsMes.map(r => ({id: (r as any)._id ?? '(sin id)', fecha: r.fecha, nombre: r.nombre, ejecutiva: r.ejecutiva, raw: r.actRealizada, norm: this.norm(r.actRealizada) }));
    console.log('Códigos normalizados:', codes);
    // Registros con códigSo inesperado
    const inesperados = codes.filter(c => c.norm !== 'R' && c.norm !== 'NR');
    console.log('Registros con código inesperado (no R/NR):', inesperados);
    // Suma rápida para validar
    const sumaR = codes.filter(c => c.norm === 'R').length;
    const sumaNR = codes.filter(c => c.norm === 'NR').length;
    const totalR = regsMes.filter(r => this.norm(r.actRealizada) === 'R').length;
    const totalNR = regsMes.filter(r => this.norm(r.actRealizada) === 'NR').length;
    console.log('SumaR:', sumaR, 'SumaNR:', sumaNR, 'Total regsMes:', regsMes.length);
    console.log('Totales en R', totalR, 'Totales en NR', totalNR);
    // CIERRE TEST DIAGNOSTICO PARA IDENTIFICAR LAS R PERDIDAS

    // 3) Calcula totales y detalles
    const tot = this.calcularTotales(regsMes);
    const detalles = this.calcularDetallesPorCoordinacion(regsMes);



    // 4) Prepara PDF
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let y = 10;
    doc.setFontSize(16);
    doc.text(`Reporte Mensual - Mes ${this.mesSeleccionado}`, 10, y);
    y += 10;

    // 5) Tabla de totales
    // autoTable(doc, {
    //   head: [['Tipo', 'Cantidad']],
    //   body: [
    //     ['Reportadas (R)', tot.totalR],
    //     ['No Reportadas (NR)', tot.totalNR, ],
    //     ['Total Esperadas', tot.esperadas, ]
    //   ],
    //   startY: y,
    //   margin: { left: 10, right: 10 },
    //   headStyles: { fillColor: [36, 84, 139] },
    //   theme: 'grid'
    // });
    // y = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      head: [['Tipo', 'Cantidad']],
      body: [
        ['Reportadas (R)', tot.totalR],
        ['No Reportadas (NR)', tot.totalNR],
        ['No Registradas', tot.esperadas - (tot.totalR + tot.totalNR)],
        ['Total Esperadas', tot.esperadas]
      ],
      startY: y,
      margin: { left: 10, right: 10 },
      headStyles: { fillColor: [36, 84, 139] },
      theme: 'grid'
    });
    y = (doc as any).lastAutoTable.finalY + 6;


    // 6) Tablas por coordinación y actividad
    const detallesPorCoord = this.calcularActividadesPorCoordinacion(regsMes);

    for (const coord in detallesPorCoord) {
      // Título de coordinación
      doc.setFontSize(12);
      doc.text(`Coordinación: ${coord}`, 10, y);
      y += 6;

      autoTable(doc, {
        head: [['Ejecutiva', 'Actividad', 'R', 'NR', 'Esperadas']],
        body: detallesPorCoord[coord],
        startY: y,
        margin: { left: 10, right: 10 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 69, 19] }, 
        theme: 'grid'
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Si ya no cabe, nueva página
      if (y > 260) {
        doc.addPage();
        y = 10;
      }
    }

    // 7) Imagen de la gráfica centrada
    const canvas: HTMLCanvasElement = this.previewChart.nativeElement;
    const chartImg = canvas.toDataURL('image/png');
    const pageWidth = doc.internal.pageSize.getWidth();
    const fullWidth = pageWidth - 20;
    const imgW = fullWidth * 0.6;
    // const imgProps = doc.getImageProperties(chartImg);
    const img = new Image();
    img.src = chartImg;
    img.onload = () => {
      const imgH = (img.height * imgW) / img.width;
      const xCenter = (doc.internal.pageSize.getWidth() - imgW) / 2;
      doc.addImage(chartImg, 'PNG', xCenter, y, imgW, imgH);
      doc.save(`reporte_ejecutivas_mes_${this.mesSeleccionado}.pdf`);
    };

    // const imgH = (imgProps.height * imgW) / imgProps.width;
    const xCenter = (pageWidth - imgW) / 2;
    // doc.addImage(chartImg, 'PNG', xCenter, y, imgW, img);

    // 8) Guardar PDF
    doc.save(`reporte_ejecutivas_mes_${this.mesSeleccionado}.pdf`);
  }

  // Generar reporte en excel 
  async generarExcel(): Promise<void> {
    if (!this.mesSeleccionado) {
      Swal.fire('Selecciona un mes', '', 'warning');
      return;
    }

    // 1) Obtener registros del mes
    const allRegs: Ejecutivas[] = await lastValueFrom(this.ejecutivasService.obtenerRegistros());
    const regsMes = allRegs.filter(r => this.mesDe(r.fecha) === this.mesSeleccionado);

    // 2) Calcular detalle por coordinación y actividad
    const detallesPorCoord = this.calcularActividadesPorCoordinacion(regsMes);

    // 3) Crear un nuevo libro Excel
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    // 4) Por cada coordinación, creamos una hoja
    for (const coord in detallesPorCoord) {
      const data = [
        ['Ejecutiva', 'Actividad', 'R', 'NR', 'Esperadas'],
        ...detallesPorCoord[coord]
      ];

      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);

      // Ajustamos ancho de columnas
      ws['!cols'] = [
        { wch: 20 }, // Ejecutiva
        { wch: 40 }, // Actividad
        { wch: 10 }, // R
        { wch: 10 }, // NR
        { wch: 12 }  // Esperadas
      ];

      // Agregamos la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, coord.substring(0, 30)); 
      // Excel solo permite máx 31 caracteres en el nombre de la hoja
    }

    // 5) Descargar archivo
    XLSX.writeFile(wb, `reporte_ejecutivas_mes_${this.mesSeleccionado}.xlsx`);
  }



  calcularDetallesPorCoordinacion(regsMes: Ejecutivas[]): any[][] {
    const year = new Date().getFullYear();
    const month = Number(this.mesSeleccionado);

    return this.cards.map(card => {
      // Filtramos usando normalización de nombre y ejecutiva
      const regs = regsMes.filter((r: Ejecutivas) => {
        return (
          this.norm(r.nombre) === this.norm(card.nombre) &&
          this.norm(r.ejecutiva) === this.norm(card.ejecutiva)
        );
      });

      let totalR = 0, totalNR = 0;
      regs.forEach(r => {
        const code = this.norm(r.actRealizada);
        if (code === 'R') totalR++;
        else if (code === 'NR') totalNR++;
      });

      // Esperadas por coordinación = suma de ocurrencias en el mes (por ejecutiva)
      const esperadas = this.actividades.reduce((sum, actividad) => {
        const dias = this.frecuenciaSemanal[actividad.nombre] || [];
        return sum + this.contarOcurrenciasEnMes(year, month, dias);
      }, 0);

      return [
        card.nombre,
        card.ejecutiva,
        totalR,
        totalNR,
        esperadas
      ];
    });
  }

  calcularActividadesPorCoordinacion(regsMes: Ejecutivas[]): Record<string, any[][]> {
  const year = new Date().getFullYear();
  const month = Number(this.mesSeleccionado);

  const resultado: Record<string, any[][]> = {};

  this.cards.forEach(card => {
    // Filtramos registros de la coordinación
    const regs = regsMes.filter((r: Ejecutivas) => {
      return (
        this.norm(r.nombre) === this.norm(card.nombre) &&
        this.norm(r.ejecutiva) === this.norm(card.ejecutiva)
      );
    });

    // Para cada actividad, contamos R y NR
    const detalle = this.actividades.map(act => {
      let totalR = 0, totalNR = 0;

      regs.forEach(r => {
        if (this.norm(r.actividad) === this.norm(act.nombre)) {
          const code = this.norm(r.actRealizada);
          if (code === 'R') totalR++;
          else if (code === 'NR') totalNR++;
        }
      });

      // Cuántas veces se esperaba en el mes
      const dias = this.frecuenciaSemanal[act.nombre] || [];
      const esperadas = this.contarOcurrenciasEnMes(year, month, dias);

      return [
        card.ejecutiva,
        act.nombre,
        totalR,
        totalNR,
        esperadas
      ];
    });

    resultado[card.nombre] = detalle;
  });

  return resultado;
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
    const mes = this.mesDe(r.fecha);
    const dia = (r.fecha || '').split('-')[2]?.padStart(2, '0') ?? '';

    // Normalizar comparaciones de texto para evitar diferencias por mayúsculas/espacios/acentos
    if (this.nombreSeleccionado && this.norm(r.nombre) !== this.norm(this.nombreSeleccionado)) return false;
    if (this.mesSeleccionado && mes !== this.mesSeleccionado) return false;
    if (this.diaSeleccionado && dia !== this.diaSeleccionado) return false;
    if (this.filtroCodigo && this.norm(r.actRealizada) !== this.norm(this.filtroCodigo)) return false;

    return true;
  });
  filtrados.sort((a, b) => b.fecha.localeCompare(a.fecha));

  this.registrosFiltrados = filtrados;
  this.totalPages = Math.ceil(this.registrosFiltrados.length / this.pageSize);
  this.page = 1;
  this.actualizarRegistrosPaginados();
}


}
