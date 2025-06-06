// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-proyecciones',
//   standalone: false,
//   templateUrl: './proyecciones.component.html',
//   styleUrl: './proyecciones.component.css'
// })
// export class ProyeccionesComponent {

// }
// src/app/proyecciones/proyecciones.component.ts

import { Component, OnInit } from '@angular/core';
import * as XLSX           from 'xlsx';

@Component({
  selector: 'app-proyecciones',
  standalone: false,
  templateUrl: './proyecciones.component.html',
  styleUrls: ['./proyecciones.component.css']
})
export class ProyeccionesComponent implements OnInit {
  // ─── PROPIEDADES PRINCIPALES ───────────────────────────────────

  /** Arreglo con los nombres de todas las hojas (pestañas) del Excel */
  workbookSheetNames: string[] = [];

  /** Nombre de la hoja activa (seleccionada) */
  currentSheet: string | null = null;

  /**
   * Contiene para cada sheetName su matriz de datos (array de arrays).
   * Ejemplo:
   *   this.sheetsData = {
   *     "Semana 1": [
   *        ["No.","ASESOR","Grupo/Individual", ...],    // fila de encabezados
   *        [1, "ROCIO", "SINDICALIZADO", ...],           // fila 1
   *        [2, "ALFREDO", "GP O NUEVO",  ...],           // fila 2
   *        ...
   *     ],
   *     "Semana 2": [ ... ],
   *     ...
   *   }
   */
  sheetsData: { [sheetName: string]: any[][] } = {};

  constructor() { }

  ngOnInit(): void {
    // Al cargar el componente, intentamos leer de localStorage si hay datos guardados
    const guardado = localStorage.getItem('proyecciones_sheets');
    if (guardado) {
      try {
        this.sheetsData = JSON.parse(guardado);
        this.workbookSheetNames = Object.keys(this.sheetsData);
        if (this.workbookSheetNames.length > 0) {
          this.currentSheet = this.workbookSheetNames[0];
        }
      } catch (e) {
        console.error('Error parseando datos guardados del localStorage:', e);
      }
    }
  }

  // ─── 1. LEER EL EXCEL AL SELECCIONAR EL ARCHIVO ───────────────────────
  onFileChange(evt: any): void {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (!target.files || target.files.length === 0) {
      alert('Por favor selecciona un archivo .xlsx');
      return;
    }

    const file: File = target.files[0];
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /*  — Leemos el contenido completo como binary string —
          e.target.result es una cadena binaria con todo el .xlsx */
      const bstr: string = e.target.result;
      const workbook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      // Reseteamos cualquier dato anterior
      this.sheetsData = {};
      this.workbookSheetNames = [];

      // Para cada hoja, convertimos a array de arrays
      workbook.SheetNames.forEach((sheetName: string) => {
        const ws: XLSX.WorkSheet = workbook.Sheets[sheetName];
        // 【header: 1】 hace que devuelva un array de arrays (incluye encabezados en fila 0)
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        this.sheetsData[sheetName] = data;
      });

      // Guardamos lista de nombres de hojas
      this.workbookSheetNames = workbook.SheetNames.slice();

      // Seleccionamos automáticamente la primera hoja
      if (this.workbookSheetNames.length > 0) {
        this.currentSheet = this.workbookSheetNames[0];
      }
    };

    reader.readAsBinaryString(file);
  }

  // ─── 2. MÉTODOS PARA RENDERIZAR LA HOJA ACTIVA EN HTML ─────────────────

  /**
   * Devuelve los encabezados (fila 0) de la hoja indicada.
   */
  getHeaders(sheetName: string): any[] {
    if (!this.sheetsData[sheetName] || this.sheetsData[sheetName].length === 0) {
      return [];
    }
    return this.sheetsData[sheetName][0] as any[];
  }

  /**
   * Devuelve las filas A PARTIR de la fila 1 (sin incluir encabezados)
   */
  getRows(sheetName: string): any[][] {
    if (!this.sheetsData[sheetName] || this.sheetsData[sheetName].length <= 1) {
      return [];
    }
    // slice(1) quita la fila de encabezados
    return this.sheetsData[sheetName].slice(1);
  }

  /**
   * Devuelve un array con tantos índices como columnas tenga la hoja.
   * Se usa en *ngFor para iterar columnas desde 0 hasta N-1.
   */
  getColumnCount(sheetName: string): number[] {
    const headers = this.getHeaders(sheetName);
    return headers.map((_, i) => i);
  }

  /**
   * Al hacer clic en una pestaña, cambiamos la hoja activa
   */
  switchSheet(sheetName: string): void {
    if (this.currentSheet !== sheetName) {
      this.currentSheet = sheetName;
    }
  }

  // ─── 3. ACTUALIZAR UNA CELDA CUANDO CAMBIA EL INPUT ────────────────────

  /**
   * Cuando el usuario edita el <input> de la celda, actualizamos en sheetsData.
   * @param sheetName  Nombre de la hoja donde ocurre el cambio
   * @param rowIndex   Índice real de fila en sheetsData (incluye encabezados): 
   *                   si editas la primera fila de datos, rowIndex será 1, 
   *                   porque 0 = encabezados.
   * @param colIndex   Índice de columna (0 = primera columna)
   * @param newValue   Nuevo valor del input
   */
  updateCell(sheetName: string, rowIndex: number, colIndex: number, newValue: any): void {
    if (!this.sheetsData[sheetName]) {
      return;
    }
    // Garantizamos que la fila exista
    if (!this.sheetsData[sheetName][rowIndex]) {
      this.sheetsData[sheetName][rowIndex] = [];
    }
    this.sheetsData[sheetName][rowIndex][colIndex] = newValue;
  }

  // ─── 4. EXPORTAR A EXCEL ─────────────────────────────────────────────

  exportExcel(): void {
    if (!this.currentSheet) {
      alert('No hay ningún archivo cargado para exportar.');
      return;
    }

    // 1) Creamos un nuevo Workbook vacío
    const newWb: XLSX.WorkBook = XLSX.utils.book_new();

    // 2) Por cada hoja en sheetsData, convertimos a worksheet y la agregamos
    for (const sheetName of this.workbookSheetNames) {
      const data: any[][] = this.sheetsData[sheetName] || [];
      // Crea una hoja a partir de array de arrays
      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(newWb, ws, sheetName);
    }

    // 3) Forzamos la descarga como “trabajo_modificado.xlsx”
    XLSX.writeFile(newWb, 'trabajo_modificado.xlsx');
  }

  // ─── 5. GUARDAR CAMBIOS (localStorage) ────────────────────────────────

  /**
   * Guarda todo el objeto sheetsData en localStorage para que, al recargar
   * en el futuro, se pueda retomar la edición desde donde quedó.
   */
  saveChanges(): void {
    if (!this.currentSheet) {
      alert('No hay datos para guardar.');
      return;
    }
    try {
      localStorage.setItem('proyecciones_sheets', JSON.stringify(this.sheetsData));
      alert('Cambios guardados en el navegador (localStorage).');
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
      alert('No se pudieron guardar los cambios en localStorage.');
    }
  }

  // ─── 6. REFRESCAR LA VISTA DE LA HOJA ACTIVA ────────────────────────────

  /**
   * Fuerza a volver a pintar la hoja activa a partir de sheetsData.
   * Útil si quieres descartar ediciones a medias y recargar desde el último valor en memoria.
   */
  refreshSheet(): void {
    if (!this.currentSheet) {
      alert('No hay ninguna hoja activa.');
      return;
    }
    // Esto “vuelve a llamar” a Angular para refrescar la tabla en pantalla.
    // Por simplicidad, basta con reasignar currentSheet (mismo valor) para forzar change detection.
    const temp = this.currentSheet;
    this.currentSheet = null;
    setTimeout(() => {
      this.currentSheet = temp;
    }, 0);
  }
}
