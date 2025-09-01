import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable: (options: UserOptions) => jsPDF;
  }
}

Chart.register(...registerables);

@Component({
  selector: 'app-reporte-fichas',
  standalone: false,
  templateUrl: './reporte-fichas.component.html',
  styleUrls: ['./reporte-fichas.component.css']
})

export class ReporteFichasComponent {
  excelDataBySheet: { [sheetName: string]: any[][] } = {};
  resumenData: any[] = [];

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []) as File[];
    if (files.length === 0) return;

    this.excelDataBySheet = {};
    this.resumenData = [];

    const readFile = (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          try {
            const bstr = e.target?.result as string;
            const wb = XLSX.read(bstr, { type: 'binary' });

            wb.SheetNames.forEach(sheetName => {
              const ws = wb.Sheets[sheetName];
              let data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

              // 1) Filtrar filas con “total”, “no.”  
              data = data.filter(row =>
                !row.some(cell =>
                  typeof cell === 'string' &&
                  (cell.toLowerCase().includes('total') || cell.toLowerCase().includes('no.'))
                )
              );

              // 2) Eliminar columnas 0, 3 y 4  
              const colsToRemove = [0, 3, 4];
              data = data.map(row => row.filter((_, idx) => !colsToRemove.includes(idx)));

              // 3) Filtrar filas que empiecen con “-”  
              data = data.filter(row => !(row[0]?.toString().trim() === '-'));

              // 4) Filtrar filas totalmente vacías  
              data = data.filter(row =>
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
              );

              // 5) Validar hojas en blanco 
              if (data.length === 0) {
                return;
              }

              const cleanName = sheetName.trim();
              this.excelDataBySheet[cleanName] = this.excelDataBySheet[cleanName] || [];
              this.excelDataBySheet[cleanName].push(...data);
            });


            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = err => reject(err);
        reader.readAsBinaryString(file);
      });
    };

    Promise.all(files.map(file => readFile(file)))
      .then(() => this.procesarDatosParaResumen())
      .catch(err => {
        console.error('Error:', err);
        Swal.fire('Error', 'Error al leer los archivos', 'error');
      });
  }


  procesarDatosParaResumen() {
    this.resumenData = [];
    let totalAgendadas = 0;
    let totalReportadas = 0;

    Object.keys(this.excelDataBySheet).forEach(sheet => {
      const data = this.excelDataBySheet[sheet];
      let agendadas = 0;
      let reportadas = 0;

      data.forEach(row => {
        if (row[0]?.toString().trim()) agendadas++;
        if ((row[1] || '').toString().trim().toUpperCase() === 'SI') reportadas++;
      });

      const noReportadas = agendadas - reportadas;
      this.resumenData.push({ sheet, agendadas, reportadas, noReportadas, chart: null });

      totalAgendadas += agendadas;
      totalReportadas += reportadas;
    });

    this.resumenData.push({
      sheet: 'TOTAL GENERAL',
      agendadas: totalAgendadas,
      reportadas: totalReportadas,
      noReportadas: totalAgendadas - totalReportadas,
      chart: null
    });

    this.inicializarGraficas();
  }

  inicializarGraficas() {
    setTimeout(() => {
      this.resumenData.forEach(item => {
        const canvas = document.getElementById(`chart-${item.sheet}`) as HTMLCanvasElement;
        if (!canvas) return;

        if (item.chart) item.chart.destroy();

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        item.chart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: [
              `Reportadas (R) ${item.reportadas}`,
              `No Reportadas (NR) ${item.noReportadas}`
            ],
            datasets: [{
              data: [item.reportadas, item.noReportadas],
              backgroundColor: ['#329f20', '#ab1a3a'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: { size: 12 },
                  usePointStyle: true
                }
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return `${context.label}: ${context.parsed}`;
                  }
                }
              },
              title: {
                display: true,
                text: `Resumen ${item.sheet}`,
                font: { size: 14 }
              }
            }
          }
        });
      });
    }, 100);
  }

  async generarReporte() {
    const { value: confirmar } = await Swal.fire({
      title: 'Confirmar Descarga PDF',
      text: 'Confirma la descarga del PDF y espera un momento.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#c8303f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Descargar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmar) return;
    try {
      await this.crearPDF(this.resumenData);
      Swal.close();
    } catch (error) {
      Swal.fire('Error', 'No se pudo generar el PDF', 'error');
    }
  }

  async crearPDF(resumen: any[]) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (const [index, item] of resumen.entries()) {
      if (index > 0) doc.addPage();

      // Título centrado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Resumen ${item.sheet}`, 105, 20, { align: 'center' });

      // Configuración de la tabla
      const columnWidths = [60, 40, 50];
      const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
      const pageWidth = doc.internal.pageSize.width;
      const leftMargin = (pageWidth - tableWidth) / 2;

      autoTable(doc, {
        startY: 30,
        head: [['Agendadas', 'Cerradas reportadas', 'No Reportadas']],
        body: [[item.agendadas, item.reportadas, item.noReportadas]],
        theme: 'grid',
        styles: {
          fontSize: 12,
          cellPadding: 4,
          textColor: [0, 0, 0],
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [36, 84, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: columnWidths[0] },
          1: { cellWidth: columnWidths[1] },
          2: { cellWidth: columnWidths[2] }
        },
        margin: { left: leftMargin }
      });

      // Gráfica
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const canvas = await this.generarGraficaPDF(item);
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 150;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgX = (pageWidth - imgWidth) / 2;

      doc.addImage(imgData, 'PNG', imgX, finalY, imgWidth, imgHeight);

      // Solo para TOTAL GENERAL: Mostrar KPI de Cumplimiento
      if (item.sheet === 'TOTAL GENERAL') {
        const cumplimiento = item.agendadas > 0
          ? (item.reportadas / item.agendadas) * 100
          : 0;

        const kpiY = finalY + imgHeight + 20;

        doc.setFontSize(14);
        doc.text('KPI de Cumplimiento:', 20, kpiY);
        doc.setFontSize(12);
        doc.text(`Porcentaje: ${cumplimiento.toFixed(2)}%`, 20, kpiY + 8);

        // Barra segmentada con colores de rojo (izquierda) a verde (derecha)
        const barX = 20;
        const barY = kpiY + 15;
        const barWidth = 170;
        const barHeight = 10;
        const segmentCount = 6;
        const segmentWidth = barWidth / segmentCount;

        // Colores invertidos: de rojo a verde
        const segmentColors: [number, number, number][] = [
          [200, 48, 63],    // Rojo
          [255, 87, 34],    // Naranja-rojo
          [255, 193, 7],    // Amarillo-naranja
          [255, 235, 59],   // Amarillo
          [128, 191, 40],   // Verde claro
          [50, 159, 32],    // Verde oscuro
        ];

        // Dibujar cada segmento
        for (let i = 0; i < segmentCount; i++) {
          doc.setFillColor(...segmentColors[i]);
          doc.rect(barX + i * segmentWidth, barY, segmentWidth, barHeight, 'F');
        }

        // Dibujar borde de la barra
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(barX, barY, barWidth, barHeight);

        // Indicador en forma de triángulo invertido
        const indicadorX = barX + (Math.min(cumplimiento, 100) / 100) * barWidth;
        doc.setFillColor(0, 0, 0); // Negro
        doc.triangle(
          indicadorX - 2.5, barY + barHeight + 2,  // Izquierda
          indicadorX + 2.5, barY + barHeight + 2,  // Derecha
          indicadorX, barY + barHeight + 6         // Punta inferior
          , 'F');
      }
    }

    doc.save(`reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
  }


  private generarGraficaPDF(item: any): Promise<HTMLCanvasElement> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      new Chart(ctx!, {
        type: 'pie',
        data: {
          labels: [
            `Reportadas (R) ${item.reportadas}`,
            `No Reportadas (NR) ${item.noReportadas}`
          ],
          datasets: [{
            data: [item.reportadas, item.noReportadas],
            backgroundColor: ['#329f20', '#ab1a3a'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: { size: 20 },
                usePointStyle: true,
              }
            },
            title: {
              display: true,
              text: `Distribución ${item.sheet}`,
              font: { size: 18 }
            }
          }
        }
      });

      setTimeout(() => resolve(canvas), 1000);
    });
  }
  limpiarTodo() {
    this.excelDataBySheet = {};
    this.resumenData = [];
  }
}