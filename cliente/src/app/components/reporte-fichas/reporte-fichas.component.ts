import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

// Extender tipo de jsPDF para autotable
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

              data = data.filter(row =>
                !row.some(cell =>
                  typeof cell === 'string' &&
                  (cell.toLowerCase().includes('total') || cell.toLowerCase().includes('no.'))
                ));

              const colsToRemove = [0, 3, 4];
              data = data.map(row =>
                row.filter((_, idx) => !colsToRemove.includes(idx))
              );

              data = data.filter(row =>
                !(row[0] && row[0].toString().trim() === '-')
              );

              data = data.filter(row =>
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
              );

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
      const leftMargin = (pageWidth - tableWidth) / 2; // Margen izquierdo calculado

      autoTable(doc, {
        startY: 30,
        head: [['Agendadas', 'Reportadas', 'No Reportadas']],
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
        margin: { left: leftMargin } // Posicionamiento horizontal
      });

      // Gráfica
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const canvas = await this.generarGraficaPDF(item);
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 150;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgX = (pageWidth - imgWidth) / 2;

      doc.addImage(imgData, 'PNG', imgX, finalY, imgWidth, imgHeight);
    }

    doc.save(`reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private generarGraficaPDF(item: any): Promise<HTMLCanvasElement> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = 800; // Tamaño aumentado para mejor calidad
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
                font: { size: 20 }, // Texto más grande
                usePointStyle: true,
              }
            },
            title: {
              display: true,
              text: `Distribución ${item.sheet}`,
              font: { size: 18 } // Título más grande
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