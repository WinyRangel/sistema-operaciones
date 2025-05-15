import { Component, OnInit } from '@angular/core';
import { EjecutivasService } from '../../../services/ejecutivas.service';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Chart } from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

import {
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
} from 'chart.js';

// REGISTRO DE LOS COMPONENTES DE GRÁFICO NECESARIOS
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
);



@Component({
  selector: 'app-ejecutivas',
  standalone: false,
  templateUrl: './ejecutivas.component.html',
  styleUrl: './ejecutivas.component.css'
})
export class EjecutivasComponent implements OnInit {
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
  mesSeleccionado: string = '';

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
    { codigo: 'NR' },
    { codigo: 'R' },
  ]

  // 0 = Domingo, 1 = Lunes, …, 6 = Sábado
  private frecuenciaSemanal: Record<string, number[]> = {
    'Envio de registros, depositos': [1, 2, 3, 4, 5, 6],  // Lunes–Sábado
    'Envio de Zona Roja': [1, 2, 3, 4, 5, 6],  // Lunes–Sábado
    'Envio de agendas y concentrado': [5],            // Viernes
    'Reportar pagos diarios': [1, 2, 3, 4, 5, 6],  // Lunes–Sábado
    'Solicitud de Garantias': [3]             // Miércoles
  };

  //Regstro y filtrado de actividades de ejecutivas
  registros: any[] = [];
  registrosFiltrados: any[] = [];

  ngOnInit() {
    this.setFechaHoy();
  }

  /** 
   * Cuenta cuántas fechas del mes dado caen en cualquiera de los daysOfWeek.
   * @param year  Año (2025)
   * @param month Mes (1–12)
   * @param daysOfWeek Array de 0=Domingo … 6=Sábado
   */
  private contarOcurrenciasEnMes(
    year: number,
    month: number,
    daysOfWeek: number[]
  ): number {
    let count = 0;
    // JS: monthIndex es 0–11
    const mesIndex = month - 1;
    const fecha = new Date(year, mesIndex, 1);
    while (fecha.getMonth() === mesIndex) {
      if (daysOfWeek.includes(fecha.getDay())) {
        count++;
      }
      fecha.setDate(fecha.getDate() + 1);
    }
    return count;
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

  // filtrarRegistros() {
  //   this.registrosFiltrados = this.registros
  //     .filter(registro =>
  //       registro.nombre === this.nombreSeleccionado &&
  //       registro.ejecutiva === this.ejecutivaSeleccionada &&
  //       // mantén el filtro del día actual
  //       registro.fecha === this.fecha
  //     )
  //     .filter(registro =>
  //       // si no hay mes seleccionado, deja pasar todo; si hay, que coincida
  //       !this.mesSeleccionado ||
  //       this.obtenerMesDeFecha(registro.fecha) === this.mesSeleccionado
  //     );
  // }
  filtrarRegistros() {
  if (!this.mesSeleccionado) {
    // Si no hay mes seleccionado, mostrar todos los registros de la ejecutiva seleccionada
    this.registrosFiltrados = this.registros.filter(registro =>
      registro.nombre === this.nombreSeleccionado
    );
  } else {
    this.registrosFiltrados = this.registros.filter(registro => {
      const fecha = new Date(registro.fecha);
      const mesRegistro = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const anioRegistro = fecha.getFullYear();

      return (
        registro.nombre === this.nombreSeleccionado &&
        mesRegistro === this.mesSeleccionado &&
        anioRegistro === new Date().getFullYear() // Filtra también por año actual si es necesario
      );
    });
  }
}

  actualizarHora() {
    const actividad = this.actividades.find(a => a.nombre === this.actividadSeleccionada);
    this.horaReporte = actividad ? actividad.hora : '';

  }

  guardarActividad() {
    // Validación de campos vacíos
    if (
      !this.nombreSeleccionado ||
      !this.ejecutivaSeleccionada ||
      !this.actividadSeleccionada ||
      !this.codigoSeleccionado ||
      !this.fecha
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor llena todos los campos antes de guardar la actividad.'
      });
      return;
    }

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
            title: 'Actividad Registrada'
          });

          // Limpiar campos y recargar
          this.ejecutivasService.obtenerRegistros().subscribe((data: any[]) => {
            this.registros = data;
            this.filtrarRegistros();
            this.actividadSeleccionada = '';
            this.codigoSeleccionado = '';
            this.horaReporte = '';
          });
        },
        error: (error) => {
          console.error('Error al guardar registro', error);
        }
      });
    }
  }

  cerrarFormulario() {
    this.mostrarForm = false;
  }

  generarReporteMensual(): void {
    if (!this.mesSeleccionado) {
      Swal.fire('Selecciona un mes para generar el reporte', '', 'warning');
      return;
    }

    this.ejecutivasService.obtenerRegistros().subscribe(allRegs => {
      // Filtramos solo los registros del mes seleccionado:
      const registrosMes = allRegs.filter(reg => {
        // Extraemos mes de la fecha ("YYYY-MM-DD")
        const mesReg = (new Date(reg.fecha).getMonth() + 1)
          .toString()
          .padStart(2, '0');
        return mesReg === this.mesSeleccionado;
      });

      // Creamos la estructura: coordinación → actividad → { R, NR, P }
      const agrupado: Record<string, Record<string, { R: number; NR: number; P: number }>> = {};

      registrosMes.forEach(r => {
        const coord = r.nombre as string;
        const act = r.actividad as string;
        const cod = r.actRealizada as 'R' | 'NR';
        const horaLim = r.hora;          // p.ej. "11:00:00"
        const horaRep = r.horaReporte;   // p.ej. "10:45:00"

        if (!agrupado[coord]) agrupado[coord] = {};
        if (!agrupado[coord][act]) agrupado[coord][act] = { R: 0, NR: 0, P: 0 };

        agrupado[coord][act][cod]++;

        // Si fue R y puntual:
        if (cod === 'R' && horaRep && horaRep <= horaLim) {
          agrupado[coord][act].P++;
        }
      });

      this.generarPDFPorCoordinacionYActividad(agrupado);
    });
  }


  private generarPDFPorCoordinacionYActividad(
    data: Record<string, Record<string, { R: number; NR: number; P: number }>>
  ): void {
    // 1) Instanciamos jsPDF
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    let y = 10;
    doc.setFontSize(16);
    doc.text(`Reporte mensual — Mes ${this.mesSeleccionado}`, 10, y);
    y += 10;

    // ── A) “Esperadas”
    const anio = new Date().getFullYear();
    const mes = Number(this.mesSeleccionado);

    const esperadasBody = Object.keys(this.frecuenciaSemanal).map(act => {
      const totalEsperado = this.contarOcurrenciasEnMes(anio, mes, this.frecuenciaSemanal[act]);
      return [act, totalEsperado.toString()];
    });

    doc.setFontSize(14);
    doc.text('Total de registros esperados por actividad', 10, y);
    y += 6;
    autoTable(doc, {
      head: [['Actividad', 'Esperadas']],
      body: esperadasBody,
      startY: y,
      margin: { horizontal: 10 }
    });
    y = doc.lastAutoTable.finalY + 16.5;

    // ── B) Desglose por coordinación
    let totalR = 0, totalNR = 0, totalP = 0;
    for (const coord of Object.keys(data)) {
      doc.setFontSize(14);
      doc.text(`Coordinación: ${coord}`, 10, y);
      y += 6;

      const body = Object.keys(data[coord]).map(act => {
        const { R, NR, P } = data[coord][act];
        totalR += R;
        totalNR += NR;
        totalP += P;
        return [act, R.toString(), NR.toString(), P.toString()];
      });

      autoTable(doc, {
        head: [['Actividad', 'R', 'NR', 'Puntuales']],
        body,
        startY: y,
        margin: { horizontal: 10 }
      });
      y = doc.lastAutoTable.finalY + 20;
    }

    // ── C) Totales generales
    const totalEsperadas = esperadasBody
      .map(row => Number(row[1]))
      .reduce((sum, v) => sum + v, 0);

    doc.setFontSize(14);
    doc.text('Totales de todas las coordinaciones', 10, y);
    y += 6;
    autoTable(doc, {
      head: [['Tipo', 'Cantidad']],
      body: [
        ['Total R', totalR.toString()],
        ['Total NR', totalNR.toString()],
        ['Total Puntuales', totalP.toString()],
        ['Total Esperadas', totalEsperadas.toString()]
      ],
      startY: y,
      margin: { horizontal: 10 }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ── D) Gráfica de Totales Generales
    const labels = ['Total R', 'Total NR', 'Total Puntuales', 'Total Esperadas'];
    const values = [totalR, totalNR, totalP, totalEsperadas];
    const colors = ['blue', 'green', 'red', 'orange'];

    this.generarGraficaCanvas(labels, values, colors)
      .then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pageW = doc.internal.pageSize.getWidth();
        const imgW = pageW - 20;
        const imgH = (canvas.height * imgW) / canvas.width;
        doc.addImage(imgData, 'PNG', 10, y, imgW, imgH);
        doc.save(`reporte_mensual_${this.mesSeleccionado}.pdf`);
      })
      .catch(err => {
        console.error(err);
        doc.save(`reporte_mensual_${this.mesSeleccionado}.pdf`);
      });
  }


  obtenerMesDeFecha(fecha: string): string {
    return fecha.split('-')[1];
  }

  private generarPDFPorCoordinacion(
    data: { [coord: string]: { R: number; NR: number } }
  ) {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(16);
    doc.text(`Reporte mensual por coordinación — Mes ${this.mesSeleccionado}`, 10, y);
    y += 10;

    let totalR = 0;
    let totalNR = 0;

    Object.keys(data).forEach(coord => {
      const { R, NR } = data[coord];
      totalR += R;
      totalNR += NR;

      doc.setFontSize(14);
      doc.text(`Coordinación: ${coord}`, 10, y);
      y += 6;

      autoTable(doc, {
        head: [['Tipo', 'Cantidad']],
        body: [
          ['Reportadas (R)', R.toString()],
          ['No Reportadas (NR)', NR.toString()]
        ],
        startY: y,
        margin: { horizontal: 10 }
      });
      y = doc.lastAutoTable.finalY + 20;
    });

    // Totales generales
    // doc.setFontSize(14);
    // doc.text('Totales general de todas las sucursales', 10, y);
    // y += 6;
    // autoTable(doc, {
    //   head: [['Tipo', 'Cantidad']],
    //   body: [
    //     ['Total R', totalR.toString()],
    //     ['Total NR', totalNR.toString()]
    //   ],
    //   startY: y,
    //   margin: { horizontal: 10 }
    // });

    // DESCARGA
    doc.save(`reporte_mensual_${this.mesSeleccionado}.pdf`);
  }


  /**
 * Devuelve un canvas con una gráfica de barras.
 * @param labels  Etiquetas
 * @param values  Valores numéricos
 * @param colors  Colores CSS para cada barra
 */
  generarGraficaCanvas(
    labels: string[],
    values: number[],
    colors: string[]
  ): Promise<HTMLCanvasElement> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Conteos',
            data: values,
            backgroundColor: colors
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });

      setTimeout(() => resolve(canvas), 300);
    });
  }


}
