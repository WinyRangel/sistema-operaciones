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
          // Nuevo Toast de éxito
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

          // Recarga y limpieza de campos...
          this.ejecutivasService.obtenerRegistros().subscribe((data: any[]) => {
            this.registros = data;
            this.filtrarRegistros();
            this.actividadSeleccionada = '';
            this.codigoSeleccionado   = '';
            this.horaReporte          = '';
          });
        },
        error: (error) => {
        }
      });

    }
    }

    cerrarFormulario() {
      this.mostrarForm = false;
    }

    generarReporteMensual() {
      if (!this.mesSeleccionado) {
        Swal.fire('Selecciona un mes para generar el reporte', '', 'warning');
        return;
      }

      this.generarPDFPorCoordinacion();

      const registrosMes = this.registros.filter(registro => {
        const mesRegistro = new Date(registro.fecha).getMonth() + 1; // de 0-11 a 1-12
        const mesFormateado = mesRegistro.toString().padStart(2, '0');
        return mesFormateado === this.mesSeleccionado;
      });

      const reportadas = registrosMes.filter(r => r.actRealizada === 'R');
      const noReportadas = registrosMes.filter(r => r.actRealizada === 'NR');

      console.log(`📆 Reporte del mes ${this.mesSeleccionado}`);
      console.log('✅ Reportadas:', reportadas);
      console.log('❌ No Reportadas:', noReportadas);

      Swal.fire({
        title: 'Reporte Generado',
        html: `
          <p><b>Mes:</b> ${this.mesSeleccionado}</p>
          <p><b>Total Reportadas:</b> ${reportadas.length}</p>
          <p><b>Total No Reportadas:</b> ${noReportadas.length}</p>
        `,
        icon: 'info'
      });
    }


  generarPDFPorCoordinacion() {
    const registrosPorCoordinacion: { [coordinacion: string]: any[] } = {};

      // Agrupar registros por nombre de coordinación
      this.registros.forEach(registro => {
        const mesRegistro = new Date(registro.fecha).getMonth() + 1;
        if (mesRegistro.toString().padStart(2, '0') === this.mesSeleccionado) {
          if (!registrosPorCoordinacion[registro.nombre]) {
            registrosPorCoordinacion[registro.nombre] = [];
          }
          registrosPorCoordinacion[registro.nombre].push(registro);
        }
      });

      const doc = new jsPDF();
      let currentY = 10;
      let totalReportadas = 0;
      let totalNoReportadas = 0;

      doc.setFontSize(16);
      doc.text(`Reporte mensual por coordinación - Mes ${this.mesSeleccionado}`, 10, currentY);
      currentY += 10;

      Object.keys(registrosPorCoordinacion).forEach((coordinacion, index) => {
        const registros = registrosPorCoordinacion[coordinacion];
        const reportadas = registros.filter(r => r.actRealizada === 'R');
        const noReportadas = registros.filter(r => r.actRealizada === 'NR');

        totalReportadas += reportadas.length;
        totalNoReportadas += noReportadas.length;

        doc.setFontSize(14);
        doc.text(`Coordinación: ${coordinacion}`, 10, currentY);
        currentY += 6;

        autoTable(doc, {
          head: [['Tipo', 'Cantidad']],
          body: [
            ['Reportadas', reportadas.length.toString()],
            ['No Reportadas', noReportadas.length.toString()]
          ],
          startY: currentY,
          margin: { horizontal: 10 },
        });

        currentY = doc.lastAutoTable.finalY + 10;
      });

      // Tabla de totales
      doc.setFontSize(14);
      doc.text(`Totales generales`, 10, currentY);
      currentY += 6;

      autoTable(doc, {
        head: [['Tipo', 'Cantidad']],
        body: [
          ['Total Reportadas', totalReportadas.toString()],
          ['Total No Reportadas', totalNoReportadas.toString()]
        ],
        startY: currentY,
        margin: { horizontal: 10 }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Graficar con canvas y agregar a PDF
      this.generarGraficaCanvas(totalReportadas, totalNoReportadas).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - 20;
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        doc.addImage(imgData, 'PNG', 10, currentY, pdfWidth, imgHeight);
        doc.save(`reporte_mensual_${this.mesSeleccionado}.pdf`);
      })
      .catch(error => {
        console.error('Error generando gráfica:', error);
        Swal.fire('Error al generar el reporte gráfico', '', 'error');
      });
        }

  generarGraficaCanvas(reportadas: number, noReportadas: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const chart = new Chart(ctx, {
        type: 'bar', 
        data: {
          labels: ['Reportadas', 'No Reportadas'],
          datasets: [
            {
              type: 'bar', 
              label: 'Actividades',
              data: [reportadas, noReportadas],
              backgroundColor: ['#4caf50', '#f44336']
            },
            {
              type: 'line', // Especifica que este dataset es de tipo línea
              label: 'Tendencia',
              data: [reportadas, noReportadas],
              borderColor: '#2196f3',
              borderWidth: 2,
              fill: false,
              tension: 0.1 // Suaviza la línea
            }
          ]
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });

      setTimeout(() => resolve(canvas), 500);
    });
  }


  }
  