import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { ProyeccionesService, ProyeccionPayload } from '../../../services/proyeccion.service';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-proyecciones',
  standalone: false,
  templateUrl: './proyecciones.component.html',
  styleUrls: ['./proyecciones.component.css']
})
export class ProyeccionesComponent {
  sheetNames: string[] = [];
  sheetsData: { [name: string]: any[][] } = {};
  currentSheet = '';
  dateCols: { [name: string]: number[] } = {};
  private originalWorkbook: XLSX.WorkBook | null = null;

  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toastElement) => {
      toastElement.addEventListener('mouseenter', Swal.stopTimer);
      toastElement.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  constructor(private proyeccionesSvc: ProyeccionesService) { }

  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>evt.target;
    if (!target.files || target.files.length !== 1) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      this.originalWorkbook = wb;
      this.sheetNames = wb.SheetNames.slice();

      this.sheetsData = {};
      this.dateCols = {};

      this.sheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        this.sheetsData[name] = data;

        // Detectar columnas de fecha
        const headers = data[0] || [];
        this.dateCols[name] = headers
          .map((h: string, i: number) => /fecha/i.test(h) ? i : -1)
          .filter(i => i >= 0);
      });

      this.currentSheet = this.sheetNames[0] || '';
    };
    reader.readAsArrayBuffer(target.files[0]);
  }

  switchSheet(name: string) {
    this.currentSheet = name;
  }

  getHeaders(sheet: string): string[] {
    return this.sheetsData[sheet][0] as string[];
  }

  getRows(sheet: string): any[][] {
    return this.sheetsData[sheet].slice(1);
  }

  getColumnCount(sheet: string): number[] {
    return Array(this.getHeaders(sheet).length).fill(0).map((_, i) => i);
  }

  isDateColumn(sheet: string, col: number): boolean {
    return this.dateCols[sheet]?.includes(col);
  }

  isCheckboxColumn(sheet: string, col: number): boolean {
    const headers = this.getHeaders(sheet);
    return /renovado/i.test(headers[col]);
  }

  private toISODate(value: any): string | undefined {
    try {
      if (!value) return undefined;
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    } catch {
      return undefined;
    }
  }

  // saveChanges() {
  //   if (!this.currentSheet) {
  //     this.Toast.fire({
  //       icon: 'warning',
  //       title: 'Primero carga y selecciona una hoja.'
  //     });
  //     return;
  //   }

  //   const rows = this.getRows(this.currentSheet);
  //   const payload: ProyeccionPayload[] = rows
  //     .filter(r => Array.isArray(r) && r.length > 0 && r.some(cell => cell !== null && cell !== undefined && cell !== ''))
  //     .map(r => ({
  //       coordinacion: this.currentSheet + '-',
  //       asesor: r[0] || '',
  //       cliente: r[1] || '',
  //       fechaEntregaAgendadaOpe: this.toISODate(r[2]),
  //       fechaEntregaAgendada: this.toISODate(r[3]),
  //       fechaEnvioOperativo: this.toISODate(r[4]),
  //       refil: r[5] || '',   // ¿Está aquí o en otro índice? Verifica
  //       mes: r[6] || '',     // ¿Está aquí o en otro índice?
  //       hora: r[7] || '',
  //       diasRetrasoExpOp: r[8] !== undefined && r[8] !== '' ? Number(r[8]) : undefined,
  //       incidenciasOperativo: r[9] || '',
  //       fechaLimiteEntrega: this.toISODate(r[10]),
  //       fechaRealReciboExpLegal: this.toISODate(r[11]),
  //       renovado: typeof r[12] === 'string' ? r[12].toLowerCase() === 'sí' : !!r[12]
  //     }))
  //   console.log('Payload a enviar:', payload);

  //   this.proyeccionesSvc.saveBulk(payload).subscribe({
  //     next: res => {
  //       const insertedCount = res.inserted ?? payload.length;
  //       this.Toast.fire({
  //         icon: 'success',
  //         title: `Se guardaron ${insertedCount} registro${insertedCount !== 1 ? 's' : ''} correctamente.`
  //       });
  //     },
  //     error: (error: HttpErrorResponse) => {
  //       console.error('Error HTTP status:', error.status);
  //       console.error('Error backend (body):', error.error);
  //       const mensajeBackend = error.error?.message || error.message || 'Error desconocido';

  //       this.Toast.fire({
  //         icon: 'error',
  //         title: 'Error al guardar en el servidor'
  //       });
  //     }
  //   });
  // }

  saveChanges() {
    if (!this.currentSheet) {
      this.Toast.fire({
        icon: 'warning',
        title: 'Primero carga y selecciona una hoja.'
      });
      return;
    }

    // 1) Leemos las filas
    const rows = this.getRows(this.currentSheet);

    // 2) DEBUG: Ver qué trae realmente la columna refil y mes
    console.log('raw refil (r[4]):', rows[0]?.[4]);
    console.log('raw mes   (r[5]):', rows[0]?.[5]);

    // 3) Filtramos y mapeamos
    const payload: ProyeccionPayload[] = rows
      .filter(r =>
        Array.isArray(r) &&
        r.length > 0 &&
        r.some(cell => cell !== null && cell !== undefined && cell !== '')
      )
      .map(r => {
        // Forzar a string + trim
        const textRefil = r[4] != null ? String(r[4]).trim().toUpperCase() : '';
        const textMes = r[5] != null ? String(r[5]).trim() : '';

        return {
          coordinacion: this.currentSheet + '-',
          asesor: String(r[0] ?? '').trim(),
          cliente: String(r[1] ?? '').trim(),

          // Fechas: convertir si vienen en formato ISO o similar
          fechaEntregaAgendadaOpe: this.toISODate(r[2]),
          fechaEntregaAgendada: this.toISODate(r[3]),

          // ¡Aquí la corrección!
          refil: textRefil,
          mes: textMes,

          // Si en tu Excel no hay más columnas, déjalas vacías o undefined
          fechaEnvioOperativo: undefined,
          hora: '',
          diasRetrasoExpOp: undefined,
          incidenciasOperativo: '',
          fechaLimiteEntrega: undefined,
          fechaRealReciboExpLegal: undefined,
          renovado: false
        };
      });

    console.log('Payload a enviar:', payload);

    // 4) Envío al servidor
    this.proyeccionesSvc.saveBulk(payload).subscribe({
      next: res => {
        const insertedCount = res.inserted ?? payload.length;
        this.Toast.fire({
          icon: 'success',
          title: `Se guardaron ${insertedCount} registro${insertedCount !== 1 ? 's' : ''} correctamente.`
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error HTTP status:', error.status);
        console.error('Error backend (body):', error.error);
        this.Toast.fire({
          icon: 'error',
          title: 'Error al guardar en el servidor'
        });
      }
    });
  }



  exportExcel() {
    if (!this.originalWorkbook) return;
    this.sheetNames.forEach(name => {
      this.originalWorkbook!.Sheets[name] =
        XLSX.utils.aoa_to_sheet(this.sheetsData[name]);
    });
    XLSX.writeFile(this.originalWorkbook, 'proyecciones_editado.xlsx');
  }

  refreshSheet() {
    if (!this.originalWorkbook) return;
    const wb = this.originalWorkbook;
    this.sheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      });
      this.sheetsData[name] = data;
      this.dateCols[name] = (data[0] || [])
        .map((h: string, i: number) => /fecha/i.test(h) ? i : -1)
        .filter(i => i >= 0);
    });
    this.currentSheet = this.sheetNames[0] || '';
  }
}
