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
  


  // onFileChange(event: any): void {
  //   const files: FileList = event.target.files;
  //   if (!files || files.length === 0) {
  //     return;
  //   }

  //   // limpiamos antes de procesar
  //   this.excelDataBySheet = {};

  //   const readFile = (file: File): Promise<void> => {
  //     return new Promise((resolve, reject) => {
  //       const reader = new FileReader();
  //       reader.onload = (e: any) => {
  //         try {
  //           const bstr: string = e.target.result;
  //           const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

  //           wb.SheetNames.forEach(sheetName => {
  //             const ws = wb.Sheets[sheetName];
  //             let data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

  //             // limpieza idéntica a la tuya
  //             data = data.filter(row =>
  //               !row.some(cell =>
  //                 typeof cell === 'string' && (
  //                   cell.toLowerCase().includes('total') ||
  //                   cell.toLowerCase().includes('grupo')
  //                 )
  //               )
  //             );
  //             data = data.filter(row =>
  //               row.some(cell => cell !== null && cell !== undefined && cell !== '')
  //             );
  //             const colsToRemove = [0, 3, 4];
  //             data = data.map(row => row.filter((_, idx) => !colsToRemove.includes(idx)));

  //             // **Si ya existe esta hoja en excelDataBySheet, concateno filas**
  //             if (!this.excelDataBySheet[sheetName]) {
  //               this.excelDataBySheet[sheetName] = [];
  //             }
  //             this.excelDataBySheet[sheetName].push(...data);
  //           });

  //           resolve();
  //         } catch (err) {
  //           reject(err);
  //         }
  //       };
  //       reader.onerror = err => reject(err);
  //       reader.readAsBinaryString(file);
  //     });
  //   };

  //   // leo todos los ficheros en paralelo y luego actualizo la vista
  //   const promises: Promise<void>[] = [];
  //   for (let i = 0; i < files.length; i++) {
  //     promises.push(readFile(files[i]));
  //   }

  //   Promise.all(promises)
  //     .then(() => {
  //       // ya tienes excelDataBySheet con todas las hojas fusionadas
  //       console.log('Todos los archivos procesados', this.excelDataBySheet);
  //     })
  //     .catch(err => {
  //       console.error('Error leyendo archivos', err);
  //       Swal.fire('Error', 'No se pudieron leer todos los archivos.', 'error');
  //     });
  // }
  onFileChange(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    this.excelDataBySheet = {}; // limpiar antes

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

              // FILTRO 1: eliminar filas con "TOTAL" o "No."
              data = data.filter(row =>
                !row.some(cell =>
                  typeof cell === 'string' && (
                    cell.toLowerCase().includes('total') ||
                    cell.toLowerCase().includes('no.')
                  )
                )
              );

              // FILTRO 3: eliminar columnas A, D y E (índices 0, 3 y 4)
              const colsToRemove = [0, 3, 4];
              data = data.map(row =>
                row.filter((_, idx) => !colsToRemove.includes(idx))
              );
              
              // FILTRO 2: eliminar filas donde columna B sea "-"
              data = data.filter(row =>
                !(row[0] && row[0].toString().trim() === '-')
              );

              // Limpieza adicional: remover filas completamente vacías
              data = data.filter(row =>
                row.some(cell => cell !== null && cell !== undefined && cell !== '')
              );

              // Fusionar hojas con el mismo nombre
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
        console.log('Archivos limpios y fusionados por hoja:', this.excelDataBySheet);
      })
      .catch(err => {
        console.error('Error leyendo archivos', err);
        Swal.fire('Error', 'No se pudieron leer todos los archivos.', 'error');
      });
  }

  async generarReporte() {
    const resumen = [];

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

      resumen.push({ sheet, agendadas, reportadas, noReportadas });

      totalAgendadas += agendadas;
      totalReportadas += reportadas;
    }

    const totalNoReportadas = totalAgendadas - totalReportadas;

    resumen.push({
      sheet: 'TOTAL GENERAL',
      agendadas: totalAgendadas,
      reportadas: totalReportadas,
      noReportadas: totalNoReportadas
    });

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
      Swal.showLoading(confirmButton); // ✅ solución al error TS2554

      const b = Swal.getHtmlContainer()?.querySelector('b');
      timerInterval = setInterval(() => {
        if (b) {
          b.textContent = `${Swal.getTimerLeft()}`;
        }
      }, 100);
    },

      willClose: () => {
        clearInterval(timerInterval);
      }
    });
    await this.crearPDF(resumen);
    Swal.close();
  }


  async crearPDF(resumen: { sheet: string, agendadas: number, reportadas: number, noReportadas: number }[]) {

    const doc = new jsPDF();
    for (let i = 0; i < resumen.length; i++) {
      const { sheet, agendadas, reportadas, noReportadas } = resumen[i];

      doc.setFontSize(14);
      doc.text(`Reporte de Coordinación: ${sheet}`, 10, 20);

      doc.autoTable({
        startY: 30,
        head: [['ACC', 'ATENCIONES AGENDADAS', 'ATENCIONES REPORTADAS', 'ATENCIONES NO REPORTADAS']],
        body: [[sheet, agendadas.toString(), reportadas.toString(), noReportadas.toString()]],
      });

      const canvas = await this.generarGraficaCanvas(sheet, agendadas, reportadas);
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 10, 60, 180, 80);


      if (i < resumen.length - 1) doc.addPage();
    }


    doc.save('reporte_mensual_fichas.pdf');
  }

  generarGraficaCanvas(sheet: string, total: number, si: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');

      new Chart(ctx!, {
        type: 'bar',
        data: {
          labels: ['Total Fichas', 'Reportados'],
          datasets: [{
            label: sheet,
            data: [total, si],
            backgroundColor: ['#e2e8ac', '#559592']
          }]
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: `Resumen ${sheet}` }
          }
        }
      });

      setTimeout(() => resolve(canvas), 1000); 
    });
  }

  limpiarTodo(): void {
    this.excelDataBySheet = {};
  }




}


