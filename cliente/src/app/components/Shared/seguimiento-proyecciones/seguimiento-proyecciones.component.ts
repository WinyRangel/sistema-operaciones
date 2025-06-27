import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProyeccionesService, Proyeccion, ProyeccionPayload } from '../../../services/proyeccion.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import Swal from 'sweetalert2';

declare const bootstrap: any;

@Component({
  selector: 'app-seguimiento-proyecciones',
  standalone: false,
  templateUrl: './seguimiento-proyecciones.component.html',
  styleUrls: ['./seguimiento-proyecciones.component.css']
})
export class SeguimientoProyeccionesComponent implements OnInit {
  proyecciones: Proyeccion[] = [];
  filterTerm: string = '';
  loading: boolean = false;

  // Para PDF:
  pdfSrc: string | null = null;
  pdfSrcSafe: SafeResourceUrl | null = null;
  pdfDoc: jsPDF | null = null;

  // Toast configurado con SweetAlert2
  private toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toastElem) => {
      toastElem.addEventListener('mouseenter', Swal.stopTimer);
      toastElem.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  meses: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  mesSeleccionado: string | number = '';
  coordinacionSeleccionada: string | null = null;

  constructor(
    private proyeccionesSvc: ProyeccionesService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  // loadData(): void {
  //   this.loading = true;
  //   this.proyeccionesSvc.getAll().subscribe({
  //     next: data => {
  //       this.proyecciones = data.map(item => ({
  //         _id: item._id,
  //         coordinacion: item.coordinacion ?? '',
  //         asesor: item.asesor ?? '',
  //         cliente: item.cliente ?? '',
  //         fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe ? item.fechaEntregaAgendadaOpe.substring(0, 10) : '',
  //         fechaEntregaAgendada: item.fechaEntregaAgendada ? item.fechaEntregaAgendada.substring(0, 10) : '',
  //         mes: item.mes ?? '',
  //         fechaEnvioOperativo: item.fechaEnvioOperativo ? item.fechaEnvioOperativo.substring(0, 10) : '',
  //         hora: item.hora ?? '',
  //         diasRetrasoExpOp: item.diasRetrasoExpOp ?? 0,
  //         incidenciasOperativo: item.incidenciasOperativo ?? '',
  //         fechaLimiteEntrega: item.fechaLimiteEntrega ? item.fechaLimiteEntrega.substring(0, 10) : '',
  //         fechaRealReciboExpLegal: item.fechaRealReciboExpLegal ? item.fechaRealReciboExpLegal.substring(0, 10) : '',
  //         renovado: !!item.renovado,
  //         refil: item.refil ? item.refil.substring(0, 10) : '',
  //         editable: false
  //       }));
  //       this.loading = false; // ✅ esto es lo correcto
  //     },

  //     error: err => {
  //       console.error('Error al cargar proyecciones:', err);
  //       this.loading = false;
  //       this.toast.fire({ icon: 'error', title: 'Error al cargar datos de proyecciones' });
  //     }
  //   });
  // }

  activarEdicion(item: Proyeccion): void {
    item.editable = true;
  }

  cancelarEdicion(item: Proyeccion): void {
    item.editable = false;
    this.loadData();
  }

  isFechaValida(fecha: string | undefined | null): boolean {
    if (!fecha) return false;
    const d = new Date(fecha);
    return !isNaN(d.getTime());
  }

  get filteredProyecciones(): Proyeccion[] {
    if (!this.filterTerm) return this.proyecciones;
    const term = this.filterTerm.toLowerCase();
    return this.proyecciones.filter(item =>
      (item.asesor?.toLowerCase().includes(term) ?? false) ||
      (item.cliente?.toLowerCase().includes(term) ?? false) ||
      (item.incidenciasOperativo?.toLowerCase().includes(term) ?? false) ||
      (item.coordinacion?.toLowerCase().includes(term) ?? false)
    );
  }

  // addRow(): void {
  //   const nueva: Proyeccion = {
  //     coordinacion: '', asesor: '', cliente: '',
  //     fechaEntregaAgendadaOpe: '', fechaEntregaAgendada: '', mes: '',
  //     fechaEnvioOperativo: '', hora: '', diasRetrasoExpOp: 0,
  //     incidenciasOperativo: '', fechaLimiteEntrega: '', fechaRealReciboExpLegal: '',
  //     renovado: false,
  //     refil: ''
  //   };
  //   this.proyecciones.unshift(nueva);
  // }

  // saveChanges(): void {
  //   const existentes = this.proyecciones.filter(p => p._id);
  //   const nuevos = this.proyecciones.filter(p => !p._id);
  //   const operaciones: any[] = [];

  //   existentes.forEach(item => {
  //     const payload: ProyeccionPayload = {
  //       coordinacion: item.coordinacion?.trim() || '',
  //       asesor: item.asesor?.trim() || '',
  //       cliente: item.cliente?.trim() || '',
  //       fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe ? new Date(item.fechaEntregaAgendadaOpe).toISOString() : undefined,
  //       fechaEntregaAgendada: item.fechaEntregaAgendada ? new Date(item.fechaEntregaAgendada).toISOString() : undefined,
  //       fechaEnvioOperativo: item.fechaEnvioOperativo ? new Date(item.fechaEnvioOperativo).toISOString() : undefined,
  //       hora: item.hora?.trim() || '',
  //       diasRetrasoExpOp: item.diasRetrasoExpOp ?? 0,
  //       incidenciasOperativo: item.incidenciasOperativo?.trim() || '',
  //       fechaLimiteEntrega: item.fechaLimiteEntrega ? new Date(item.fechaLimiteEntrega).toISOString() : undefined,
  //       fechaRealReciboExpLegal: item.fechaRealReciboExpLegal ? new Date(item.fechaRealReciboExpLegal).toISOString() : undefined,
  //       renovado: item.renovado ?? false,
  //       refil: item.refil ? new Date(item.refil).toISOString() : undefined
  //     };
  //     operaciones.push(this.proyeccionesSvc.updateOne(item._id!, payload));
  //   });

  //   if (nuevos.length) {
  //     const payloadNuevos: ProyeccionPayload[] = nuevos.map(item => ({
  //       coordinacion: item.coordinacion?.trim() || '',
  //       asesor: item.asesor?.trim() || '',
  //       cliente: item.cliente?.trim() || '',
  //       fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe ? new Date(item.fechaEntregaAgendadaOpe).toISOString() : undefined,
  //       fechaEntregaAgendada: item.fechaEntregaAgendada ? new Date(item.fechaEntregaAgendada).toISOString() : undefined,
  //       fechaEnvioOperativo: item.fechaEnvioOperativo ? new Date(item.fechaEnvioOperativo).toISOString() : undefined,
  //       hora: item.hora?.trim() || '',
  //       diasRetrasoExpOp: item.diasRetrasoExpOp ?? 0,
  //       incidenciasOperativo: item.incidenciasOperativo?.trim() || '',
  //       fechaLimiteEntrega: item.fechaLimiteEntrega ? new Date(item.fechaLimiteEntrega).toISOString() : undefined,
  //       fechaRealReciboExpLegal: item.fechaRealReciboExpLegal ? new Date(item.fechaRealReciboExpLegal).toISOString() : undefined,
  //       renovado: item.renovado ?? false,
  //       refil: item.refil ? new Date(item.refil).toISOString() : undefined
  //     }));
  //     operaciones.push(this.proyeccionesSvc.saveBulk(payloadNuevos));
  //   }

  //   if (!operaciones.length) {
  //     this.toast.fire({ icon: 'info', title: 'No hay cambios para guardar' });
  //     return;
  //   }

  //   forkJoin(operaciones).subscribe({
  //     next: () => {
  //       this.toast.fire({ icon: 'success', title: 'Cambios guardados correctamente' });
  //       this.loadData();
  //     },
  //     error: err => {
  //       console.error(err);
  //       this.toast.fire({ icon: 'error', title: 'Error al guardar cambios' });
  //     }
  //   });
  // }

  loadData(): void {
    this.loading = true;
    this.proyeccionesSvc.getAll().subscribe({
      next: data => {
        this.proyecciones = data.map(item => ({
          ...item,
          asesor: item.asesor?.substring(0,10) || '',
          cliente: item.cliente?.substring(0,10) || '',
          fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe?.substring(0,10) || '',
          fechaEnvioOperativo: item.fechaEnvioOperativo?.substring(0,10) || '',
          hora: item.hora?.substring(0,10) || '',
          incidenciasOperativo: item.incidenciasOperativo?.substring(0,10) || '',
          fechaEntregaAgendada: item.fechaEntregaAgendada?.substring(0,10) || '',
          fechaLimiteEntrega: item.fechaLimiteEntrega?.substring(0,10) || '',
          fechaRealReciboExpLegal: item.fechaRealReciboExpLegal?.substring(0,10) || '',
          editable: true
        }));
        this.loading = false;
      },
      error: () => {
        this.toast.fire({ icon: 'error', title: 'Error al cargar datos' });
        this.loading = false;
      }
    });
  }

  addRow(): void {
    const nueva: Proyeccion = {
      coordinacion: '', asesor: '', cliente: '',
      fechaEntregaAgendadaOpe: '', fechaEntregaAgendada: '', mes: '',
      fechaEnvioOperativo: '', hora: '', diasRetrasoExpOp: 0,
      incidenciasOperativo: '', fechaLimiteEntrega: '', fechaRealReciboExpLegal: '',
      renovado: false, refil: '',
      editable: true
    };
    this.proyecciones.unshift(nueva);
  }

  editRow(item: Proyeccion): void {
    item.editable = true;
  }

  saveChanges(): void {
    const existentes = this.proyecciones.filter(p => p._id);
    const nuevos = this.proyecciones.filter(p => !p._id);
    const ops = [];

    existentes.forEach(item => {
      const payload: ProyeccionPayload = this.buildPayload(item);
      ops.push(this.proyeccionesSvc.updateOne(item._id!, payload));
    });
    if (nuevos.length) {
      const payloadNuevos = nuevos.map(item => this.buildPayload(item));
      ops.push(this.proyeccionesSvc.saveBulk(payloadNuevos));
    }
    if (!ops.length) {
      this.toast.fire({ icon: 'info', title: 'Nada que guardar' });
      return;
    }
    forkJoin(ops).subscribe({
      next: () => {
        this.proyecciones.forEach(p => p.editable = false);
        this.toast.fire({ icon: 'success', title: 'Guardado correctamente' });
        this.loadData();
      },
      error: () => this.toast.fire({ icon: 'error', title: 'Error al guardar' })
    });
  }

  private buildPayload(item: Proyeccion): ProyeccionPayload {
    return {
      coordinacion: item.coordinacion?.trim(),
      asesor: item.asesor?.trim(),
      cliente: item.cliente?.trim(),
      fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe ? new Date(item.fechaEntregaAgendadaOpe).toISOString() : undefined,
      fechaEntregaAgendada: item.fechaEntregaAgendada ? new Date(item.fechaEntregaAgendada).toISOString() : undefined,
      mes: item.mes,
      fechaEnvioOperativo: item.fechaEnvioOperativo ? new Date(item.fechaEnvioOperativo).toISOString() : undefined,
      hora: item.hora,
      diasRetrasoExpOp: item.diasRetrasoExpOp,
      incidenciasOperativo: item.incidenciasOperativo,
      fechaLimiteEntrega: item.fechaLimiteEntrega ? new Date(item.fechaLimiteEntrega).toISOString() : undefined,
      fechaRealReciboExpLegal: item.fechaRealReciboExpLegal ? new Date(item.fechaRealReciboExpLegal).toISOString() : undefined,
      renovado: item.renovado,
      refil: item.refil ? new Date(item.refil).toISOString() : undefined
    };
  }

  // private buildPayload(item: Proyeccion): ProyeccionPayload {
  //   const parseDate = (fecha: any): string | undefined => {
  //     const date = new Date(fecha);
  //     return fecha && !isNaN(date.getTime()) ? date.toISOString() : undefined;
  //   };

  //   return {
  //     coordinacion: item.coordinacion?.trim(),
  //     asesor: item.asesor?.trim(),
  //     cliente: item.cliente?.trim(),
  //     fechaEntregaAgendadaOpe: parseDate(item.fechaEntregaAgendadaOpe),
  //     fechaEntregaAgendada: parseDate(item.fechaEntregaAgendada),
  //     mes: item.mes,
  //     fechaEnvioOperativo: parseDate(item.fechaEnvioOperativo),
  //     hora: item.hora,
  //     diasRetrasoExpOp: item.diasRetrasoExpOp,
  //     incidenciasOperativo: item.incidenciasOperativo,
  //     fechaLimiteEntrega: parseDate(item.fechaLimiteEntrega),
  //     fechaRealReciboExpLegal: parseDate(item.fechaRealReciboExpLegal),
  //     renovado: item.renovado,
  //     refil: parseDate(item.refil)
  //   };
  // }

  get coordinaciones(): string[] {
    return [...new Set(this.proyecciones.map(p => p.coordinacion || 'Sin asignar'))].sort();
  }

  get proyeccionesFiltradasPorCoordinacion(): Proyeccion[] {
    const filtradas = this.filteredProyecciones.filter(p => {
      const okCoord = !this.coordinacionSeleccionada || p.coordinacion === this.coordinacionSeleccionada;
      const okMes = !this.mesSeleccionado || p.mes === this.mesSeleccionado;
      return okCoord && okMes;
    });
    return filtradas.sort((a, b) => {
      const fa = a.fechaEntregaAgendadaOpe ? new Date(a.fechaEntregaAgendadaOpe) : new Date(0);
      const fb = b.fechaEntregaAgendadaOpe ? new Date(b.fechaEntregaAgendadaOpe) : new Date(0);
      return fa.getTime() - fb.getTime();
    });
  }

  getFechaLimiteEntrega(fechaAgendada: string | null | undefined): string {
    if (!fechaAgendada) return '';
    const fecha = new Date(fechaAgendada);
    if (isNaN(fecha.getTime())) return '';
    fecha.setDate(fecha.getDate() + 2);
    return fecha.toISOString().substring(0, 10);
  }

  getDiasRetrasoLegal(fechaLimite: string | undefined, fechaRecibido: string | undefined): number {
    if (!fechaLimite || !fechaRecibido) return 0;
    const limite = new Date(fechaLimite);
    const recibido = new Date(fechaRecibido);
    if (isNaN(limite.getTime()) || isNaN(recibido.getTime())) return 0;
    const diffMs = recibido.getTime() - limite.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  getDiasRetrasoOpe(fechaLimite: string | undefined, fechaEnvio: string | undefined): number {
    if (!fechaLimite || !fechaEnvio) return 0;
    const limite = new Date(fechaLimite);
    const envio = new Date(fechaEnvio);
    if (isNaN(limite.getTime()) || isNaN(envio.getTime())) return 0;
    const diffMs = envio.getTime() - limite.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  get clientesNoRenovados(): Proyeccion[] {
    return this.proyeccionesFiltradasPorCoordinacion.filter(p => p.renovado === false);
  }
  get clientesRenovados(): Proyeccion[] {
    return this.proyeccionesFiltradasPorCoordinacion.filter(p => p.renovado === true);
  }
  get clientesNoRenovadosConDatos(): Proyeccion[] {
    return this.clientesNoRenovados.filter(p => !!p.diasRetrasoExpOp && !!p.fechaRealReciboExpLegal && !!p.incidenciasOperativo && !!p.fechaEntregaAgendada);
  }

  //Excel con las fechas proyectadas de Refil.
  exportarExcelConFechasExtra(): void {
    const listaParaExportar = this.proyecciones.filter(p =>
      (!this.mesSeleccionado || p.mes === this.mesSeleccionado) &&
      (!this.coordinacionSeleccionada || p.coordinacion === this.coordinacionSeleccionada)
    );

    const workbook = XLSX.utils.book_new();

    const datosSheet = listaParaExportar.map(p => {
      let renovacionCredito = '';
      let renovacionRefil = '';

      // Verificamos que fechaEntregaAgendada exista y sea válida
      if (p.fechaEntregaAgendada) {
        const fechaBase = new Date(p.fechaEntregaAgendada);
        if (!isNaN(fechaBase.getTime())) {
          // Dependiendo del valor de refil, calculamos fechas
          if (p.refil?.toUpperCase() === 'NO') {
            // Renovacion de Credito = fecha base + 4 meses
            const fechaRenov = new Date(fechaBase);
            fechaRenov.setMonth(fechaRenov.getMonth() + 4);
            renovacionCredito = fechaRenov.toISOString().substring(0, 10);
          } else if (p.refil?.toUpperCase() === 'SI') {
            // Renovacion Refil = fecha base + 2 meses
            const fechaRef = new Date(fechaBase);
            fechaRef.setMonth(fechaRef.getMonth() + 2);
            renovacionRefil = fechaRef.toISOString().substring(0, 10);
          }
        }
      }

      return {
        ASESOR: p.asesor,
        Cliente: p.cliente,
        'Fecha proyectada envío ope.': p.fechaEntregaAgendadaOpe,
        'Fecha de envío operativo APK': p.fechaEnvioOperativo,
        Hora: p.hora,
        'Incidencias operativo': p.incidenciasOperativo,
        'Fecha agendada entrega crédito': p.fechaEntregaAgendada,
        Renovado: p.renovado ? 'Sí' : 'No',
        'Fecha límite entrega legal': p.fechaLimiteEntrega,
        'Fecha de legal recibido': p.fechaRealReciboExpLegal,
        'Días de retraso Op.': p.diasRetrasoExpOp,
        'Renovacion de Credito': renovacionCredito,
        'Renovacion Refil': renovacionRefil
      };
    });

    const sheet = XLSX.utils.json_to_sheet(datosSheet);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Proyecciones');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `Proyecciones_${this.mesSeleccionado || 'Todos'}_con_fechas_extra.xlsx`);
  }

  generarReportePDF(): void {
    // Mantener la implementación existente de generación de PDF
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    this.pdfDoc = doc;
    const marginLeft = 10, marginRight = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - marginLeft - marginRight;
    let y = 20;
    const colorTitulo: [number, number, number] = [0, 51, 102];
    const colorSeccion: [number, number, number] = [51, 102, 153];
    const colorTexto: [number, number, number] = [60, 60, 60];
    const colorBorde: [number, number, number] = [200, 200, 200];

    // encabezado
    doc.setFontSize(18);
    doc.setTextColor(...colorTitulo);
    doc.setFont('helvetica', 'bold');
    const titulo = `Reporte de Renovaciones - ${this.mesSeleccionado || 'Todos los meses'}`;
    doc.text(titulo, (pageWidth - doc.getTextWidth(titulo)) / 2, y);
    y += 12;
    doc.setDrawColor(...colorTitulo);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      marginLeft,
      y
    );
    y += 15;

    const calcularAnchurasColumnas = (docRef: jsPDF, headers: string[], rows: string[][]): number[] => {
      const widths = headers.map(h => docRef.getTextWidth(h) + 6);
      rows.forEach(row => row.forEach((cell, idx) => {
        const w = docRef.getTextWidth(cell) + 6;
        if (w > widths[idx]) widths[idx] = w;
      }));
      const total = widths.reduce((a, b) => a + b, 0);
      if (total > maxWidth && widths.length) {
        const exceso = total - maxWidth;
        widths[widths.length - 1] = Math.max(widths[widths.length - 1] - exceso - 2, 30);
      }
      return widths;
    };

    // sección renovados
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(...colorSeccion);
    doc.setFont('helvetica', 'bold');
    doc.text('Creditos Renovados', marginLeft, y);
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(...colorTexto);
    doc.setFont('helvetica', 'normal');
    const renovados = this.clientesRenovados;
    if (!renovados.length) {
      doc.setFont('helvetica', 'italic');
      doc.text('No se encontraron clientes renovados.', marginLeft, y, { maxWidth });
      y += 10;
    } else {
      const headersRen = ['Asesor', 'Credito', 'Incidencias', 'Fecha Entrega', 'Días Retraso'];
      const rowsRen = renovados.map(item => {
        const fechaEnt = item.fechaEntregaAgendada
          ? new Date(item.fechaEntregaAgendada).toLocaleDateString('es-MX')
          : 'No programada';
        const fechaLim = this.getFechaLimiteEntrega(item.fechaEntregaAgendada);
        const dias = this.getDiasRetrasoLegal(fechaLim, item.fechaRealReciboExpLegal || '');
        const incid = item.incidenciasOperativo || 'Sin incidencias';
        return [item.asesor || 'N/A', item.cliente || 'N/A', incid, fechaEnt, dias.toString()];
      });
      const widthsRen = calcularAnchurasColumnas(doc, headersRen, rowsRen);
      let x = marginLeft;
      doc.setFillColor(241, 241, 241);
      const totalWidth = Math.min(widthsRen.reduce((a, b) => a + b, 0), maxWidth);
      doc.rect(marginLeft, y, totalWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      headersRen.forEach((h, idx) => {
        doc.text(h, x + 2, y + 6, { maxWidth: widthsRen[idx] - 4 });
        x += widthsRen[idx];
      });
      y += 10;
      doc.setFont('helvetica', 'normal');
      rowsRen.forEach((row, rowIndex) => {
        if (y > 275) { doc.addPage(); y = 20; }
        x = marginLeft;
        const fillColor = y % 16 > 8 ? [255, 255, 255] : [250, 250, 250];
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        doc.rect(marginLeft, y, totalWidth, 8, 'F');
        row.forEach((cell, idx) => {
          doc.text(cell, x + 2, y + 6, { maxWidth: widthsRen[idx] - 4 });
          x += widthsRen[idx];
        });
        doc.setDrawColor(...colorBorde);
        doc.line(marginLeft, y + 8, marginLeft + totalWidth, y + 8);
        y += 8;
      });
      y += 10;
    }

    // pie
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Resultado de proyecciones - ${new Date().getFullYear()}`,
      pageWidth / 2,
      287,
      { align: 'center' }
    );
    const pdfBlob = doc.output('blob');
    if (this.pdfSrc) URL.revokeObjectURL(this.pdfSrc);
    this.pdfSrc = URL.createObjectURL(pdfBlob);
    this.pdfSrcSafe = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfSrc);
    setTimeout(() => { const modalEl = document.getElementById('pdfPreviewModal'); if (modalEl) new bootstrap.Modal(modalEl).show(); }, 300);
  }

  downloadPDF(): void {
    if (this.pdfDoc) {
      const nombre = `Reporte_${this.mesSeleccionado || 'Todos'}.pdf`;
      this.pdfDoc.save(nombre);
    } else {
      this.toast.fire({ icon: 'info', title: 'Primero genera la vista previa del PDF.' });
    }
  }

}