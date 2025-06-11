import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { ProyeccionesService, ProyeccionPayload } from '../../../services/proyeccion.service';
import { HttpErrorResponse } from '@angular/common/http';

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

        // Opcional: detectar índices de las columnas de fecha para inputs tipo date
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

  saveChanges() {
    if (!this.currentSheet) {
      alert('Primero carga y selecciona una hoja.');
      return;
    }
    const rows = this.getRows(this.currentSheet);
    // const payload: ProyeccionPayload[] = rows.map(r => ({
    //   coordinacion:             `${this.currentSheet}-`,  // <— aquí
    //   asesor:                    r[0],
    //   cliente:                   r[1],
    //   fechaEntregaAgendadaOpe:   r[2],
    //   fechaEntregaAgendada:      r[3],
    //   fechaEnvioOperativo:       r[4] ? new Date(r[4]).toISOString(): undefined,
    //   hora:                      r[5] || undefined,
    //   diasRetrasoExpOp:          r[6] !== undefined ? Number(r[6]) : undefined,
    //   incidenciasOperativo:      r[7] || undefined,
    //   fechaLimiteEntrega:        r[8] ? new Date(r[8]).toISOString() : undefined,
    //   fechaRealReciboExpLegal:   r[9] ? new Date(r[9]).toISOString() : undefined,
    //   renovado:                  typeof r[10] === 'string' ? r[10].toLowerCase() === 'sí' : undefined
    // }));
    const payload: ProyeccionPayload[] = rows.map(r => ({
      coordinacion: `${this.currentSheet}-`,
      asesor: r[0] || '',
      cliente: r[1] || '',
      fechaEntregaAgendadaOpe: r[2] ? new Date(r[2]).toISOString() : undefined,
      fechaEntregaAgendada: r[3] ? new Date(r[3]).toISOString() : undefined,
      /** |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| */
      fechaEnvioOperativo: r[4] ? new Date(r[4]).toISOString() : undefined,
      hora: r[5] || '', //se agrega
      diasRetrasoExpOp: r[6],
      incidenciasOperativo: r[7] || '', //se agrega
      fechaLimiteEntrega: r[8] ? new Date(r[8]).toISOString() : undefined,
      fechaRealReciboExpLegal: r[9] ? new Date(r[9]).toISOString() : undefined,
      renovado: typeof r[10] === 'string' ? r[10].toLowerCase() === 'sí' : undefined
    }));

    console.log('Payload a enviar:', payload);

    this.proyeccionesSvc.saveBulk(payload).subscribe({
      next: res => {
        alert(`Se guardaron ${res.inserted ?? payload.length} registros correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error HTTP status:', error.status);
        console.error('Error backend (body):', error.error);
        alert(`Error al guardar en el servidor:\n${error.error?.message || error.message}`);
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
