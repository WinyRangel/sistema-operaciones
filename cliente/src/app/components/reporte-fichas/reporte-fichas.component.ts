import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-reporte-fichas',
  standalone: false,
  templateUrl: './reporte-fichas.component.html',
  styleUrl: './reporte-fichas.component.css'
})
export class ReporteFichasComponent {
  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  excelDataBySheet: { [sheetName: string]: any[][] } = {};
  resumenData: any[] = [];

  onFileChange(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.excelDataBySheet = {};
    this.resumenData = [];

    const readFile = (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          try {
            const bstr: string = e.target.result;
            const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

            wb.SheetNames.forEach((sheetName: string) => {
              const ws = wb.Sheets[sheetName];
              let data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

              data = data.filter(row =>
                !row.some(cell =>
                  typeof cell === 'string' && (
                    cell.toLowerCase().includes('total') ||
                    cell.toLowerCase().includes('no.')
                  )
                )
              );

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
              if (!this.excelDataBySheet[cleanName]) {
                this.excelDataBySheet[cleanName] = [];
              }
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

    const promises: Promise<void>[] = [];
    for (let i = 0; i < files.length; i++) {
      promises.push(readFile(files[i]));
    }

    Promise.all(promises)
      .then(() => {
        this.procesarDatosParaResumen();
      })
      .catch(err => {
        console.error('Error leyendo archivos', err);
        Swal.fire('Error', 'No se pudieron leer todos los archivos.', 'error');
      });
  }

  procesarDatosParaResumen() {
    this.resumenData = [];
    let totalAgendadas = 0;
    let totalReportadas = 0;

    for (const sheet of this.objectKeys(this.excelDataBySheet)) {
      const data = this.excelDataBySheet[sheet];

      let agendadas = 0;
      let reportadas = 0;

      data.forEach(row => {
        if (row[0] !== null && row[0] !== undefined && row[0] !== '') {
          agendadas++;
        }

        if ((row[1] || '').toString().trim().toUpperCase() === 'SI') {
          reportadas++;
        }
      });

      const noReportadas = agendadas - reportadas;

      this.resumenData.push({
        sheet,
        agendadas,
        reportadas,
        noReportadas,
        chart: null
      });

      totalAgendadas += agendadas;
      totalReportadas += reportadas;
    }

    const totalNoReportadas = totalAgendadas - totalReportadas;

    this.resumenData.push({
      sheet: 'TOTAL GENERAL',
      agendadas: totalAgendadas,
      reportadas: totalReportadas,
      noReportadas: totalNoReportadas,
      chart: null
    });

    this.inicializarGraficas();
  }

  inicializarGraficas() {
    setTimeout(() => {
      this.resumenData.forEach(item => {
        const canvasId = `chart-${item.sheet}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        
        if (canvas) {
          if (item.chart) item.chart.destroy();
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            item.chart = new Chart(ctx, {
              type: 'pie',
              data: {
                labels: ['Reportadas', 'No Reportadas'],
                datasets: [{
                  data: [item.reportadas, item.noReportadas],
                  backgroundColor: ['#4CAF50', '#FF6384'],
                  hoverOffset: 4
                }]
              },
              options: {
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                  title: { 
                    display: true, 
                    text: `Resumen ${item.sheet}`,
                    font: { size: 16 }
                  }
                }
              }
            });
          }
        }
      });
    }, 0);
  }

  async generarReporte() {
    let timerInterval: ReturnType<typeof setInterval>;
    Swal.fire({
      title: 'Generando PDF...',
      html: 'Por favor espera <b></b> ms',
      timer: 3000,
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        const confirmButton = Swal.getConfirmButton();
        Swal.showLoading(confirmButton);
        const b = Swal.getHtmlContainer()?.querySelector('b');
        timerInterval = setInterval(() => {
          if (b) b.textContent = `${Swal.getTimerLeft()}`;
        }, 100);
      },
      willClose: () => {
        clearInterval(timerInterval);
      }
    });
    
    await this.crearPDF(this.resumenData);
    Swal.close();
  }

  async crearPDF(resumen: any[]) {
    const doc = new jsPDF();
    for (let i = 0; i < resumen.length; i++) {
      const { sheet, agendadas, reportadas, noReportadas } = resumen[i];

      doc.setFontSize(14);
      doc.text(`Reporte de Coordinación: ${sheet}`, 10, 20);

      doc.autoTable({
        startY: 30,
        head: [['ACC', 'AGENDADAS', 'REPORTADAS', 'NO REPORTADAS']],
        body: [[sheet, agendadas, reportadas, noReportadas]],
      });

      const canvas = await this.generarGraficaCanvas(sheet, reportadas, noReportadas);
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 30, 60, 150, 80);

      if (i < resumen.length - 1) doc.addPage();
    }
    doc.save('reporte_mensual_fichas.pdf');
  }

  generarGraficaCanvas(sheet: string, reportadas: number, noReportadas: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');

      new Chart(ctx!, {
        type: 'pie',
        data: {
          labels: ['Reportadas', 'No Reportadas'],
          datasets: [{
            data: [reportadas, noReportadas],
            backgroundColor: ['#4CAF50', '#FF6384'],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { position: 'bottom' },
            title: { 
              display: true, 
              text: `Resumen ${sheet}`,
              font: { size: 16 }
            }
          }
        }
      });

      setTimeout(() => resolve(canvas), 1000);
    });
  }

  limpiarTodo(): void {
    this.excelDataBySheet = {};
    this.resumenData = [];
  }
}