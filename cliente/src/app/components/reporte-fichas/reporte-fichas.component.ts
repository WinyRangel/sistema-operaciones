import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FichasService } from '../../services/fichas.service';
import { CoordinacionService } from '../../services/coordinacion.service';
import { Coordinacion } from '../../models/coordinacion';
import { Fichas } from '../../models/fichas';
import Swal from 'sweetalert2';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-reporte-fichas',
  standalone: false,
  templateUrl: './reporte-fichas.component.html',
  styleUrls: ['./reporte-fichas.component.css']
})
export class ReporteFichasComponent implements OnInit {

  coordinaciones: Coordinacion[] = [];
  fichas: Fichas[] = [];
  coordinacionesOptions: Array<{ value: string; label: string }> = [];
  coordinacionSeleccionada: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  semanaSeleccionada: string = '';
  semanas: number[] = Array.from({ length: 53 }, (_, i) => i + 1);
  fileName: string = '';
  sheetNames: string[] = [];
  selectedSheet: string = '';
  previewData: Array<{ asesor: string; cliente: string; diaAtencion: string }> = [];
  registrosCount: number = 0;
  fileLoaded: boolean = false;

  // FILTROS
  fechaFiltro: string = '';
  diaAtencionSeleccionado: string = '';
  clientesOptions: string[] = [];
  clientesFiltrados: string[] = [];

  private workbook: XLSX.WorkBook | null = null;

  saving = false;
  clienteSeleccionado: any;

  // edición de fechahora
  editingId: string | null = null;
  editingFicha: { fechahora?: string } | null = null;
  Math: any;
  grafica: Chart | null = null;
  semanasSeleccionadas: number[] = [];
  estadisticas = {
    cerradas: 0,
    noCerradas: 0,
    total: 0
  };


  constructor(
    private fichasService: FichasService,
    private coordinacionService: CoordinacionService
  ) { }

  ngOnInit(): void {
    this.obtenerCoordinaciones();
    this.loadFichas();
  }

  obtenerCoordinaciones(): void {
    this.coordinacionService.obtenerCoordinacion().subscribe({
      next: (data: Coordinacion[]) => {
        this.coordinaciones = data;
        this.coordinacionesOptions = this.coordinaciones.map(c => {
          const anyC = c as any;
          const value = anyC._id || anyC.id || anyC.nombre || '';
          const label = anyC.nombre || anyC._id || anyC.id || value;
          return { value, label };
        });
      },
      error: (error) => {
        console.error('Error al obtener coordinaciones:', error);
      }
    });
  }

  onCoordinacionChange(value: string): void {
    this.coordinacionSeleccionada = value;
    const fichasCoord = this.fichas.filter(f => f.coordinacion === value);
    this.clientesOptions = [
      ...new Set(fichasCoord.map(f => f.cliente).filter((c): c is string => !!c))
    ];
    this.clientesOptions = [
      ...new Set(
        fichasCoord
          .map(f => f.cliente)
          .filter((c): c is string => !!c)
      )
    ];

    // Inicializa filtrados con todos los clientes
    this.clientesFiltrados = [...this.clientesOptions];
  }

  getNombreCoordinacion(id: string): string {
    const c = this.coordinaciones.find(co => (co as any)._id === id || (co as any).id === id);
    return c ? c.nombre : id;
  }

  onSemanasChange(value: string): void {
    this.semanaSeleccionada = value;
  }

  onFechaInicioChange(value: string): void {
    this.fechaInicio = value;
  }

  onFechaFinChange(value: string): void {
    this.fechaFin = value;
  }

  onFileChange(evt: any): void {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (!target.files || target.files.length === 0) return;

    const file: File = target.files[0];
    this.fileName = file.name;

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const arrayBuffer = e.target.result;
      try {
        // lectura robusta: cellDates y defval para evitar undefined
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        this.workbook = wb;
        this.sheetNames = wb.SheetNames.slice();
        this.fileLoaded = true;

        if (this.sheetNames.length > 0) {
          this.selectedSheet = this.sheetNames[0];
          this.previewData = this.getCleanedDataForSheet(this.selectedSheet);
          this.registrosCount = this.previewData.length;
        }
      } catch (error) {
        console.error('Error leyendo Excel:', error);
        this.clearFile();
      }
    };
    reader.readAsArrayBuffer(file);
  }

  onSheetSelect(sheetName: string): void {
    if (!this.fileLoaded || !this.workbook) return;
    this.selectedSheet = sheetName;
    this.previewData = this.getCleanedDataForSheet(sheetName);
    this.registrosCount = this.previewData.length;
  }

  private getCleanedDataForSheet(sheetName: string): Array<{ asesor: string; cliente: string; diaAtencion: string }> {
    if (!this.workbook) return [];

    const worksheet: XLSX.WorkSheet | undefined = this.workbook.Sheets[sheetName];
    if (!worksheet) return [];

    // defval: '' para evitar undefined; header:1 para AoA
    const raw: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    // quitar encabezados/filas iniciales (ajusta si tu Excel tiene diferente estructura)
    const rows = raw.slice(3);

    // eliminar filas con 'TOTAL' en cualquiera de sus celdas
    const rowsSinTotal = rows.filter(r =>
      !(
        Array.isArray(r) &&
        r.some((cell: any) => String(cell ?? '').toUpperCase().includes('TOTAL'))
      )
    );

    // tomar solo A,B,C (índices 0,1,2), trim y asegurar string
    const cleaned = rowsSinTotal.map(r => {
      const a = r && r[0] !== undefined && r[0] !== null ? String(r[0]).trim() : '';
      const b = r && r[1] !== undefined && r[1] !== null ? String(r[1]).trim() : '';
      const c = r && r[2] !== undefined && r[2] !== null ? String(r[2]).trim() : '';
      return [a, b, c];
    });

    const filtered = cleaned.filter(r => !(r[0] === '' && r[1] === '' && r[2] === ''));

    return filtered.map(r => ({
      asesor: r[0],
      cliente: r[1],
      diaAtencion: r[2]
    }));
  }

  clearFile(): void {
    // Limpiar select y fechas
    this.semanaSeleccionada = '';
    this.coordinacionSeleccionada = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.fileName = '';
    this.sheetNames = [];
    this.selectedSheet = '';
    this.previewData = [];
    this.registrosCount = 0;
    this.fileLoaded = false;
    this.workbook = null;

    const inputEl = (document.getElementById('excel-upload')) as HTMLInputElement | null;
    if (inputEl) inputEl.value = '';
  }

  private toDateString(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // corrige a local
    return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
  }

  private validarCamposObligatorios(): { ok: boolean; mensaje?: string } {
  if (!this.fechaInicio) return { ok: false, mensaje: 'Fecha inicio es obligatoria.' };
  if (!this.fechaFin) return { ok: false, mensaje: 'Fecha fin es obligatoria.' };
  if (!this.semanasSeleccionadas || this.semanasSeleccionadas.length === 0) {
    return { ok: false, mensaje: 'Selecciona al menos una semana.' };
  }
  if (!this.coordinacionSeleccionada) return { ok: false, mensaje: 'Selecciona la coordinación.' };

  const d1 = new Date(this.fechaInicio);
  const d2 = new Date(this.fechaFin);
  if (d1 > d2) return { ok: false, mensaje: 'Fecha inicio no puede ser mayor a fecha fin.' };

  return { ok: true };
}


  /**
   * Crea el payload base. Devuelve FichasPayload[].
   */
  private buildPayloadFromRows(rows: Array<{ asesor: string; cliente: string; diaAtencion: string }>) {
  const payload: any[] = [];

  for (const semana of this.semanasSeleccionadas) {
    for (const r of rows) {
      payload.push({
        semana: String(semana),
        coordinacion: this.coordinacionSeleccionada,
        asesor: r.asesor || '',
        cliente: r.cliente || '',
        diaAtencion: r.diaAtencion || '',
        fechaInicio: this.fechaInicio,
        fechaFin: this.fechaFin,
        estado: false,
        fechahora: '',
        tipopago: '',
        reportada: false
      });
    }
  }

  return payload;
}


  seleccionarSemanas(event: any) {
    const opciones = event.target.options;
    this.semanasSeleccionadas = [];

    for (let i = 0; i < opciones.length; i++) {
      if (opciones[i].selected) {
        this.semanasSeleccionadas.push(Number(opciones[i].value));
      }
    }

    this.actualizarGrafica();
  }



  saveCurrentSheet(): void {
    const valid = this.validarCamposObligatorios();
    if (!valid.ok) {
      Swal.fire('Atención', valid.mensaje || 'Faltan campos obligatorios.', 'warning');
      return;
    }

    if (!this.selectedSheet) {
      Swal.fire('Atención', 'Selecciona una pestaña para guardar.', 'warning');
      return;
    }

    const dataToSave = this.getCleanedDataForSheet(this.selectedSheet);
    if (dataToSave.length === 0) {
      Swal.fire('Atención', 'No hay registros válidos en la pestaña seleccionada.', 'warning');
      return;
    }

    const payload = this.buildPayloadFromRows(dataToSave);
    const payloadWithSheet = payload.map(p => ({ ...p, sheetName: this.selectedSheet }));

    this.saving = true;
    Swal.fire({
      title: 'Guardando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.fichasService.saveBulk(payloadWithSheet as any).pipe(
      catchError(err => {
        console.error('Error guardando pestaña:', err);
        return of({ __error: true, err });
      })
    ).subscribe(res => {
      this.saving = false;
      Swal.close(); // cerrar loading
      if ((res as any).__error) {
        Swal.fire('Error', 'Error al guardar la pestaña. Revisa la consola.', 'error');
      } else {
        Swal.fire('Éxito', `Guardado exitoso de la pestaña "${this.selectedSheet}".`, 'success');
      }
    });
  }

  loadFichas(): void {
    this.fichasService.getAll().subscribe({
      next: (data: any[]) => {
        this.fichas = data;
        console.log('Fichas cargadas:', this.fichas);
      },
      error: (error) => {
        console.error('Error al cargar fichas:', error);
      }
    });
  }

  /** Convierte Date|string|null -> valor para input datetime-local "YYYY-MM-DDTHH:mm" */
  private toDatetimeLocalString(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    const tzoffset = d.getTimezoneOffset() * 60000;
    const localISO = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
    return localISO;
  }

  /** Convierte valor de input datetime-local -> ISO string (UTC) para backend */
  private fromDatetimeLocalStringToISOString(value: string | null | undefined): string | null {
    if (!value) return null;
    const d = new Date(value);
    return d.toISOString();
  }

  // ---------- edición: sólo fechahora ----------
  startEdit(ficha: Fichas) {
    this.editingId = ficha._id || null;
    this.editingFicha = {
      fechahora: this.toDatetimeLocalString(ficha.fechahora)
    };
  }

  cancelEdit() {
    this.editingId = null;
    this.editingFicha = null;
  }

  saveEdit() {
    if (!this.editingFicha || !this.editingId) return;

    const datetimeLocal = this.editingFicha.fechahora as string;
    if (!datetimeLocal) {
      Swal.fire('Atención', 'Debes seleccionar fecha y hora.', 'warning');
      return;
    }

    const fechahoraISO = this.fromDatetimeLocalStringToISOString(datetimeLocal);
    if (!fechahoraISO) {
      Swal.fire('Error', 'Formato de fecha/hora inválido.', 'error');
      return;
    }

    const payload: any = {
      fechahora: fechahoraISO
    };

    this.saving = true;
    Swal.fire({
      title: 'Guardando fecha/hora...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.fichasService.update(this.editingId, payload).pipe(
      catchError(err => {
        console.error('Error guardando fecha/hora:', err);
        return of({ __error: true, err });
      })
    ).subscribe((res: any) => {
      this.saving = false;
      Swal.close();
      if (res && (res).__error) {
        Swal.fire('Error', 'No se pudo guardar la fecha/hora. Revisa la consola.', 'error');
        return;
      }

      // actualizar localmente la ficha
      const idx = this.fichas.findIndex(f => f._id === this.editingId);
      if (idx !== -1) {
        this.fichas[idx] = {
          ...this.fichas[idx],
          fechahora: fechahoraISO  // string | null; aquí ya sabemos que no es null
        } as Fichas;
      }

      Swal.fire('Éxito', 'Fecha y hora actualizada correctamente.', 'success');
      this.cancelEdit();
    });
  }
  // ---------------------------------------------

  toggleEstado(ficha: any) {
    ficha.estado = !ficha.estado;
    ficha.fechahora = ficha.estado ? new Date() : null;

    this.fichasService.update(ficha._id, {
      estado: ficha.estado,
      fechahora: ficha.fechahora
    }).subscribe({
      next: () => console.log('Estado actualizado'),
      error: err => {
        console.error('Error actualizando estado:', err);
        ficha.estado = !ficha.estado;
        ficha.fechahora = ficha.estado ? new Date() : null;
      }
    });
  }

  toggleReportada(ficha: any) {
    ficha.reportada = !ficha.reportada;

    this.fichasService.update(ficha._id, { reportada: ficha.reportada }).subscribe({
      next: () => console.log('Reportada actualizada'),
      error: err => {
        console.error('Error actualizando reportada:', err);
        ficha.reportada = !ficha.reportada;
      }
    });
  }

  togglePago(ficha: any, metodo: string, event: any) {
    if (!Array.isArray(ficha.tipopago)) ficha.tipopago = [];

    if (event.target.checked) {
      if (!ficha.tipopago.includes(metodo)) ficha.tipopago.push(metodo);
    } else {
      ficha.tipopago = ficha.tipopago.filter((m: string) => m !== metodo);
    }

    this.fichasService.update(ficha._id, { tipopago: ficha.tipopago }).subscribe({
      next: () => console.log('Tipo de pago actualizado'),
      error: err => console.error('Error actualizando tipo de pago:', err)
    });
  }

  guardarCambios(): void {
    if (!this.fichas || this.fichas.length === 0) {
      Swal.fire('Atención', 'No hay registros para actualizar.', 'warning');
      return;
    }

    const observables = this.fichas
      .filter(ficha => ficha._id)
      .map(ficha => {
        const fechahora = ficha.estado
          ? ficha.fechahora
            ? new Date(ficha.fechahora)
            : new Date()
          : null;

        const tipopago = Array.isArray(ficha.tipopago)
          ? ficha.tipopago
          : ficha.tipopago
            ? [ficha.tipopago]
            : [];

        const payload: any = {
          estado: !!ficha.estado,
          reportada: !!ficha.reportada,
          tipopago,
          fechahora,
          fechaInicio: this.toDateString(ficha.fechaInicio),
          fechaFin: this.toDateString(ficha.fechaFin)
        };

        return this.fichasService.update(ficha._id!, payload).pipe(
          catchError(err => {
            console.error('Error actualizando ficha:', ficha._id, err);
            return of({ __error: true, fichaId: ficha._id });
          })
        );
      });

    if (observables.length === 0) {
      Swal.fire('Atención', 'No hay fichas válidas para actualizar.', 'warning');
      return;
    }

    this.saving = true;
    Swal.fire({
      title: 'Actualizando...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    forkJoin(observables).subscribe({
      next: results => {
        this.saving = false;
        Swal.close();
        let success = 0;
        let errors = 0;
        results.forEach(r => {
          if (r && (r as any).__error) errors++;
          else success++;
        });
        Swal.fire('Actualización Completa', `Éxito: ${success}, Errores: ${errors}`, errors > 0 ? 'warning' : 'success');
      },
      error: err => {
        this.saving = false;
        Swal.close();
        console.error('Error en actualización múltiple:', err);
        Swal.fire('Error', 'Ocurrió un error al actualizar las fichas.', 'error');
      }
    });
  }

  fichasFiltradas(): Fichas[] {
    return this.fichas.filter(f => {
      let coincide = true;

      // Filtro por coordinación
      if (this.coordinacionSeleccionada) {
        coincide = coincide && f.coordinacion === this.coordinacionSeleccionada;
      }

      // Filtro por semanas seleccionadas (pueden ser varias)
      if (this.semanasSeleccionadas.length > 0) {
        coincide = coincide && this.semanasSeleccionadas.includes(Number(f.semana));
      }

      // Filtro por fecha exacta
      if (this.fechaFiltro) {
        const fechaFicha = f.fechahora ? new Date(f.fechahora).toISOString().split('T')[0] : null;
        coincide = coincide && fechaFicha === this.fechaFiltro;
      }

      // Filtro por día de atención
      if (this.diaAtencionSeleccionado && this.diaAtencionSeleccionado !== 'todos') {
        coincide = coincide && f.diaAtencion?.toLowerCase() === this.diaAtencionSeleccionado.toLowerCase();
      }

      //  Filtrar por cliente
      if (this.clienteSeleccionado) {
        coincide = coincide && (f.cliente?.toLowerCase().includes(this.clienteSeleccionado.toLowerCase()) || false);
      }
      return coincide;
    });
  }


  filtrarClientes(): void {
    const filtro = this.clienteSeleccionado?.toLowerCase() || '';
    this.clientesFiltrados = this.clientesOptions.filter(c =>
      c.toLowerCase().includes(filtro)
    );
  }

  // Método corregido para limpiar filtros
  limpiarFiltros(): void {
    // Limpiar fechas y selecciones
    this.fechaFiltro = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.semanaSeleccionada = '';
    this.coordinacionSeleccionada = '';
    this.diaAtencionSeleccionado = '';
    this.clienteSeleccionado = '';

    // Limpiar archivo
    this.fileName = '';
    this.fileLoaded = false;
    this.workbook = null;
    this.selectedSheet = '';
    this.previewData = [];
    this.registrosCount = 0;

    // Limpiar input file en el DOM
    const fileInput = document.getElementById('excel-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    // Restaurar lista completa de clientes filtrados
    this.clientesFiltrados = [...this.clientesOptions];
  }

  generarReporteExcel(): void {
    if (!this.fichas || this.fichas.length === 0) {
      Swal.fire('Atención', 'No hay fichas cargadas para generar el reporte.', 'warning');
      return;
    }

    if (!this.semanasSeleccionadas || this.semanasSeleccionadas.length === 0) {
      Swal.fire('Atención', 'Debes seleccionar al menos una semana.', 'warning');
      return;
    }

    // Filtrar solo las fichas de las semanas seleccionadas
    const fichasFiltradas = this.fichas.filter(f =>
      this.semanasSeleccionadas.includes(Number(f.semana))
    );

    if (fichasFiltradas.length === 0) {
      Swal.fire('Atención', 'No hay fichas en las semanas seleccionadas.', 'warning');
      return;
    }

    // Crear un nuevo libro Excel
    const workbook = XLSX.utils.book_new();

    // Agrupar por coordinación
    const fichasPorCoordinacion: { [key: string]: any[] } = {};
    fichasFiltradas.forEach(f => {
      const coord = this.getNombreCoordinacion(f.coordinacion ?? '');
      if (!fichasPorCoordinacion[coord]) {
        fichasPorCoordinacion[coord] = [];
      }
      fichasPorCoordinacion[coord].push(f);
    });

    // Crear una hoja por cada coordinación
    Object.keys(fichasPorCoordinacion).forEach(coord => {
      const fichasCoord = fichasPorCoordinacion[coord];

      // Agrupar por asesor dentro de la coordinación
      const resumenPorAsesor: { [key: string]: { cerradas: number; noCerradas: number } } = {};
      fichasCoord.forEach(f => {
        const asesor = f.asesor || 'Sin Asesor';
        if (!resumenPorAsesor[asesor]) {
          resumenPorAsesor[asesor] = { cerradas: 0, noCerradas: 0 };
        }
        if (f.estado) {
          resumenPorAsesor[asesor].cerradas++;
        } else {
          resumenPorAsesor[asesor].noCerradas++;
        }
      });

      // Convertir a arreglo para Excel
      const data = [
        ['Asesor', 'Fichas Cerradas', 'Fichas No Cerradas', 'Total']
      ];
      Object.keys(resumenPorAsesor).forEach(asesor => {
        const { cerradas, noCerradas } = resumenPorAsesor[asesor];
        data.push([
          asesor,
          cerradas.toString(),
          noCerradas.toString(),
          (cerradas + noCerradas).toString()
        ]);
      });

      // Crear hoja
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Añadir hoja al libro
      XLSX.utils.book_append_sheet(workbook, worksheet, coord.substring(0, 31));
    });

    // Guardar archivo
    XLSX.writeFile(workbook, 'Reporte_Fichas.xlsx');
  }


  toggleSemana(semana: number, event: any) {
    if (event.target.checked) {
      this.semanasSeleccionadas.push(semana);
    } else {
      this.semanasSeleccionadas = this.semanasSeleccionadas.filter(s => s !== semana);
    }
    this.actualizarGrafica();
  }

  calcularTotalesPorSemana(semanas: number[]) {
    const fichasFiltradas = this.fichas.filter(f => semanas.includes(Number(f.semana)));

    const totales: { [asesor: string]: number } = {};
    fichasFiltradas.forEach(f => {
      const key = f.asesor ?? 'Desconocido'; // si viene undefined, lo manda a "Desconocido"
      totales[key] = (totales[key] || 0) + 1;
    });

    return {
      asesores: Object.keys(totales),
      totales: Object.values(totales)
    };
  }

  // actualizarGrafica() {
  //   if (this.grafica) this.grafica.destroy();

  //   const datos = this.calcularCerradasNoCerradas(this.semanasSeleccionadas);

  //   this.grafica = new Chart('graficaGeneral', {
  //     type: 'pie',
  //     data: {
  //       labels: ['Cerradas', 'No Cerradas'],
  //       datasets: [{
  //         data: [datos.cerradas, datos.noCerradas],
  //         backgroundColor: ['rgba(38, 171, 61, 0.7', 'rgba(219, 15, 57, 0.7)'],
  //         borderColor: ['rgba(38, 171, 61, 0.7)', 'rgba(219, 15, 57, 0.7)'],
  //         borderWidth: 1
  //       }]
  //     },
  //     options: {
  //       responsive: false,
  //       maintainAspectRatio: false,
  //       plugins: {
  //         legend: {
  //           display: true,
  //           position: 'bottom',
  //           labels: {
  //             // simple, sin indexar backgroundColor
  //             color: 'black',
  //             font: { size: 14 },
  //             generateLabels: (chart) => {
  //               const dataset = chart.data.datasets[0];
  //               return chart.data.labels!.map((label, i) => {
  //                 return {
  //                   text: `${label}: ${dataset.data[i]}`,
  //                   fillStyle: Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] : 'gray',
  //                   strokeStyle: Array.isArray(dataset.borderColor) ? dataset.borderColor[i] : 'black',
  //                   index: i
  //                 };
  //               });
  //             }
  //           }
  //         }
  //       }
  //     }
  //   });
  // }
  actualizarGrafica() {
    if (this.grafica) this.grafica.destroy();

    const datos = this.calcularCerradasNoCerradas(this.semanasSeleccionadas);

    this.grafica = new Chart('graficaGeneral', {
      type: 'pie',
      data: {
        labels: ['Cerradas', 'No Cerradas'],
        datasets: [{
          data: [datos.cerradas, datos.noCerradas],
          backgroundColor: ['rgba(38, 171, 61, 0.7)', 'rgba(219, 15, 57, 0.7)'],
          borderColor: ['rgba(38, 171, 61, 0.7)', 'rgba(219, 15, 57, 0.7)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'black',
              font: { size: 14 },
              generateLabels: (chart) => {
                const dataset = chart.data.datasets[0];
                return chart.data.labels!.map((label, i) => {
                  return {
                    text: `${label}: ${dataset.data[i]}`,
                    fillStyle: Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] : 'gray',
                    strokeStyle: Array.isArray(dataset.borderColor) ? dataset.borderColor[i] : 'black',
                    index: i
                  };
                });
              }
            }
          }
        }
      }
    });

    // Actualizamos la tabla de estadísticas
    this.actualizarEstadisticas();
  }


  actualizarEstadisticas() {
    const datos = this.calcularCerradasNoCerradas(this.semanasSeleccionadas);

    this.estadisticas = {
      cerradas: datos.cerradas,
      noCerradas: datos.noCerradas,
      total: datos.cerradas + datos.noCerradas
    };
  }

  calcularCerradasNoCerradas(semanas: number[]) {
    const fichasFiltradas = this.fichas.filter(f => semanas.includes(Number(f.semana)));

    let cerradas = 0;
    let noCerradas = 0;

    fichasFiltradas.forEach(f => {
      if (f.estado === true) {
        cerradas++;
      } else {
        noCerradas++;
      }
    });

    return { cerradas, noCerradas };
  }

}
