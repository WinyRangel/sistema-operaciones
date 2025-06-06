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
   * Después de aplicar “limpieza” (borrar fila 0 y descartar las que contengan:
   *  - la palabra 'semana' (insensible a mayúsculas)
   *  - la palabra 'totales'
   *  - el patrón completo de encabezados "No.", "ASESOR", "Grupo/Individual", "Fecha Entrega Ope.", "Fecha Entrega"
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

  // ─── 1. LEER Y “LIMPIAR” EL EXCEL AL SELECCIONAR EL ARCHIVO ───────────────────────
  onFileChange(evt: any): void {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (!target.files || target.files.length === 0) {
      alert('Por favor selecciona un archivo .xlsx');
      return;
    }

    const file: File = target.files[0];
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* Leemos el contenido completo como binary string.
         e.target.result es una cadena binaria con todo el .xlsx */
      const bstr: string = e.target.result;
      const workbook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      // Reseteamos cualquier dato anterior
      this.sheetsData = {};
      this.workbookSheetNames = [];

      // Patrones de encabezados repetidos que queremos eliminar si aparecen en una fila
      const headerPattern = [
        'no.', 
        'asesor', 
        'grupo/individual', 
        'fecha entrega ope.', 
        'fecha entrega'
      ].map(h => h.toLowerCase());

      // Para cada hoja, convertimos a array de arrays y luego limpiamos filas no deseadas
      workbook.SheetNames.forEach((sheetName: string) => {
        const ws: XLSX.WorkSheet = workbook.Sheets[sheetName];
        // ► Primero, extraemos toda la hoja como array de arrays (incluye fila 0 original).
        const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // ► Ahora “limpiamos” rawData:
        //  1) Eliminamos la primera fila (índice 0).
        //  2) Filtramos todas las filas que contengan "semana" o "totales" en cualquier celda.
        //  3) Filtramos también las filas que contengan **TODOS** los elementos de headerPattern en alguna posición.
        const cleanedData: any[][] = rawData
          .slice(1) // quitar fila 0 original
          .filter((row: any[]) => {
            //  → 1) Descartar si alguna celda contiene “semana” o “totales”
            for (const cell of row) {
              if (cell !== null && cell !== undefined) {
                const text = String(cell).toLowerCase();
                if (text.includes('semana') || text.includes('totales'))  {
                  return false;
                }
              }
            }

            //  → 2) Descartar si la fila coincide con el patrón completo de encabezados
            //     (es decir, si en la fila aparecen todas las cadenas de headerPattern, sin importar el orden)
            const lowercasedRow = row.map(cell => (cell !== null && cell !== undefined) ? String(cell).toLowerCase() : '');
            const contieneTodosLosEncabezados = headerPattern.every(hdr =>
              lowercasedRow.some(cellText => cellText.trim() === hdr.trim())
            );
            if (contieneTodosLosEncabezados) {
              return false;
            }

            //  → Si no coincide con ninguno de los criterios anteriores, la conservamos
            return true;
          });

        // ► Finalmente, asignamos la “hoja limpia” a sheetsData[sheetName]
        this.sheetsData[sheetName] = cleanedData;
      });

      // Guardamos la lista de nombres de hojas (pestañas)
      this.workbookSheetNames = workbook.SheetNames.slice();

      // Seleccionamos automáticamente la primera hoja (si existe)
      if (this.workbookSheetNames.length > 0) {
        this.currentSheet = this.workbookSheetNames[0];
      }
    };

    reader.readAsBinaryString(file);
  }

  // ─── 2. MÉTODOS PARA RENDERIZAR LA HOJA ACTIVA EN HTML ─────────────────

  /**
   * Devuelve los encabezados (fila 0) de la hoja indicada.
   * - Como ya quitamos la antigua fila 0, aquí el “nuevo” índice 0 será la primera fila post-limpieza.
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
    // slice(1) quita la fila de encabezados (que ahora es la “nueva” fila 0)
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
   * @param rowIndex   Índice real de fila en sheetsData (incluye encabezados).
   *                   Ej: si editas la primera fila de datos, rowIndex será 1, 
   *                   porque 0 = encabezados (nueva estructura tras limpiar).
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
    // Esto “vuelve a llamar” a Angular para refrescar la tabla en pantalla
    const temp = this.currentSheet;
    this.currentSheet = null;
    setTimeout(() => {
      this.currentSheet = temp;
    }, 0);
  }
}
