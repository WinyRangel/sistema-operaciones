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
  filterTerm = '';
  loading = false;

  // Para el modal de nueva proyección
  newItem: Proyeccion = this.resetNewItem();

  // PDF
  pdfSrc: string | null = null;
  pdfSrcSafe: SafeResourceUrl | null = null;
  pdfDoc: jsPDF | null = null;

  private toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: el => {
      el.addEventListener('mouseenter', Swal.stopTimer);
      el.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  mesSeleccionado: string | number = '';
  coordinacionSeleccionada: string | null = null;

  constructor(
    private proyeccionesSvc: ProyeccionesService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  /** Carga todas las proyecciones */
  loadData(): void {
    this.loading = true;
    this.proyeccionesSvc.getAll().subscribe({
      next: data => {
        this.proyecciones = data.map(item => ({
          ...item,
          asesor: item.asesor || '',
          cliente: item.cliente || '',
          fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe ? new Date(item.fechaEntregaAgendadaOpe).toISOString().substring(0, 10) : '',
          fechaEnvioOperativo: item.fechaEnvioOperativo ? new Date(item.fechaEnvioOperativo).toISOString().substring(0, 10) : '',
          hora: item.hora || '',
          incidenciasOperativo: item.incidenciasOperativo || '',
          fechaEntregaAgendada: item.fechaEntregaAgendada ? new Date(item.fechaEntregaAgendada).toISOString().substring(0, 10) : '',
          fechaLimiteEntrega: item.fechaLimiteEntrega ? new Date(item.fechaLimiteEntrega).toISOString().substring(0, 10) : '',
          fechaRealReciboExpLegal: item.fechaRealReciboExpLegal ? new Date(item.fechaRealReciboExpLegal).toISOString().substring(0, 10) : '',
          mes: item.mes || '',
        }));
        this.loading = false;
      },
      error: () => {
        this.toast.fire({ icon: 'error', title: 'Error al cargar datos' });
        this.loading = false;
      }
    });
  }

  /** Reinicia newItem a valores por defecto */
  private resetNewItem(): Proyeccion {
    return {
      coordinacion: '',
      asesor: '',
      cliente: '',
      fechaEntregaAgendadaOpe: '',
      fechaEnvioOperativo: '',
      hora: '',
      incidenciasOperativo: '',
      fechaEntregaAgendada: '',
      renovado: false,
      fechaRealReciboExpLegal: '',
      mes: '',
    };
  }

  

  /** Crea un nuevo registro */
  createNew(): void {
    this.loading = true;
    const payload: ProyeccionPayload = this.buildPayload(this.newItem);

    // Usamos el endpoint bulk aunque sea un solo elemento
    this.proyeccionesSvc.saveBulk([payload]).subscribe({
      next: () => {
        this.toast.fire({ icon: 'success', title: 'Proyección creada' });
        this.loadData();
        this.closeModal();
        this.newItem = this.resetNewItem();
      },
      error: () => {
        this.toast.fire({ icon: 'error', title: 'Error al crear proyección' });
        this.loading = false;
      }
    });
  }

  /** Cierra el modal de “Agregar Proyección” */
  private closeModal(): void {
    const modalEl = document.getElementById('addProjectionModal');
    if (modalEl) {
      bootstrap.Modal.getInstance(modalEl)?.hide();
    }
  }

  /** Construye el payload ISO para el back */
  // private buildPayload(item: Proyeccion): ProyeccionPayload {
  //   return {
  //     coordinacion: item.coordinacion?.trim(),
  //     asesor: item.asesor?.trim(),
  //     cliente: item.cliente?.trim(),
  //     fechaEntregaAgendadaOpe: item.fechaEntregaAgendadaOpe
  //       ? new Date(item.fechaEntregaAgendadaOpe).toISOString()
  //       : undefined,
  //     fechaEntregaAgendada: item.fechaEntregaAgendada
  //       ? new Date(item.fechaEntregaAgendada).toISOString()
  //       : undefined,
  //     mes: item.mes,
  //     fechaEnvioOperativo: item.fechaEnvioOperativo
  //       ? new Date(item.fechaEnvioOperativo).toISOString()
  //       : undefined,
  //     hora: item.hora,
  //     incidenciasOperativo: item.incidenciasOperativo,
  //     fechaRealReciboExpLegal: item.fechaRealReciboExpLegal
  //       ? new Date(item.fechaRealReciboExpLegal).toISOString()
  //       : undefined,
  //     renovado: item.renovado,
  //     refil: item.refil
  //       ? new Date(item.refil).toISOString()
  //       : undefined
  //   };
  // }
  private buildPayload(item: Proyeccion): ProyeccionPayload {
  const parseDate = (d: any) => {
    if (!d) return undefined;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  };

  return {
    coordinacion: item.coordinacion?.trim() || '',
    asesor: item.asesor?.trim() || '',
    cliente: item.cliente?.trim() || '',
    fechaEntregaAgendadaOpe: parseDate(item.fechaEntregaAgendadaOpe),
    fechaEntregaAgendada: parseDate(item.fechaEntregaAgendada),
    fechaEnvioOperativo: parseDate(item.fechaEnvioOperativo),
    fechaRealReciboExpLegal: parseDate(item.fechaRealReciboExpLegal),
    hora: item.hora || '',
    incidenciasOperativo: item.incidenciasOperativo || '',
    renovado: item.renovado === true,
    mes: item.mes || '',
    refil: item.refil || '',
  };
}


  guardarCambios(): void {
  const actualizables = this.proyecciones.filter(p => p._id); // Solo con _id definido

  actualizables.forEach(item => {
    const payload = this.buildPayload(item);
    if (!payload) return; // Saltar si el payload falló

    this.proyeccionesSvc.updateOne(item._id!, payload).subscribe({
      next: () => console.log(`Actualizado: ${item._id}`),
      error: (err) => console.error(`Error al actualizar ${item._id}:`, err)
    });
  });

  Swal.fire({
    icon: 'success',
    title: 'Cambios guardados',
    showConfirmButton: false,
    timer: 1500
  });
}


  /** Resto de getters y métodos auxiliares (filtros, PDF, Excel, etc.) */
  get coordinaciones(): string[] {
    return [...new Set(this.proyecciones.map(p => p.coordinacion || 'Sin asignar'))].sort();
  }

  get filteredProyecciones(): Proyeccion[] {
    if (!this.filterTerm) return this.proyecciones;
    const term = this.filterTerm.toLowerCase();
    return this.proyecciones.filter(p =>
      (p.asesor?.toLowerCase().includes(term) ?? false) ||
      (p.cliente?.toLowerCase().includes(term) ?? false) ||
      (p.incidenciasOperativo?.toLowerCase().includes(term) ?? false) ||
      (p.coordinacion?.toLowerCase().includes(term) ?? false)
    );
  }

  get proyeccionesFiltradasPorCoordinacion(): Proyeccion[] {
    const arr = this.filteredProyecciones.filter(p => {
      const okC = !this.coordinacionSeleccionada || p.coordinacion === this.coordinacionSeleccionada;
      const okM = !this.mesSeleccionado || p.mes === this.mesSeleccionado;
      return okC && okM;
    });
    return arr.sort((a, b) => {
      const fa = a.fechaEntregaAgendadaOpe ? new Date(a.fechaEntregaAgendadaOpe).getTime() : 0;
      const fb = b.fechaEntregaAgendadaOpe ? new Date(b.fechaEntregaAgendadaOpe).getTime() : 0;
      return fb - fa; // más reciente primero
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
    const workbook = XLSX.utils.book_new();

    const coordinacionesUnicas = [...new Set(this.proyecciones
      .filter(p => p.mes === this.mesSeleccionado) // Solo del mes seleccionado
      .map(p => p.coordinacion || 'Sin asignar'))];

    coordinacionesUnicas.forEach(coordinacion => {
      const datos = this.proyecciones.filter(p =>
        p.mes === this.mesSeleccionado &&
        (p.coordinacion || 'Sin asignar') === coordinacion
      );

      const datosSheet = datos.map(p => {
        let renovacionCredito = '';
        let renovacionRefil = '';

        if (p.fechaEntregaAgendada) {
          const fechaBase = new Date(p.fechaEntregaAgendada);
          if (!isNaN(fechaBase.getTime())) {
            if (p.refil?.toUpperCase() === 'NO') {
              const fechaRenov = new Date(fechaBase);
              fechaRenov.setMonth(fechaRenov.getMonth() + 4);
              renovacionCredito = fechaRenov.toISOString().substring(0, 10);
            } else if (p.refil?.toUpperCase() === 'SI') {
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
      XLSX.utils.book_append_sheet(workbook, sheet, coordinacion.substring(0, 31)); // nombres de hoja max 31 caracteres
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `Proyecciones_${this.mesSeleccionado || 'Todos'}_por_coordinacion.xlsx`);
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