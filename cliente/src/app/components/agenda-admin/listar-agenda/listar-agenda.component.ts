import { Component, OnInit } from '@angular/core';
import { AgendaAdminService } from '../../../services/agenda-admin.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SEMANAS_ANIO = 53;

@Component({
  selector: 'app-listar-agenda',
  standalone: false,
  templateUrl: './listar-agenda.component.html',
  styleUrl: './listar-agenda.component.css'
})
export class ListarAgendaComponent implements OnInit {
  // Lista de datos
  agendas: any[] = [];
  agendasFiltradas: any[] = [];
  cargando: boolean = false;
  enviandoCorreo: boolean = false;

  // Filtros
  busqueda: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  semanaSeleccionada: string = '';
  rolSeleccionado: string = '';

  // Opciones de filtros
  semanas: string[] = [];
  rolesDisponibles: { valor: string; label: string; color: string }[] = [
    { valor: 'mercadotecnia', label: 'Mercadotecnia', color: '#ec4899' },
    { valor: 'auditoria', label: 'Auditoría', color: '#f59e0b' },
    { valor: 'rh', label: 'Recursos Humanos', color: '#06b6d4' },
    { valor: 'admin', label: 'Administración', color: '#6366f1' },
    { valor: 'sup', label: 'Supervisión', color: '#10b981' }
  ];

  // Usuario y rol en sesión
  usuarioActual: string = '';
  rolActual: string = '';

  // Paginación
  paginaActual: number = 1;
  elementosPorPagina: number = 15;
  tamanosPagina: number[] = [10, 15, 25, 50, 100];

  constructor(
    private agendaAdminService: AgendaAdminService,
    private auth: AuthService
  ) {
    this.generarSemanas();
  }

  get puedeFiltrarRol(): boolean {
    return !['mercadotecnia', 'auditoria', 'rh'].includes(this.rolActual);
  }

  ngOnInit(): void {
    this.usuarioActual = this.auth.getUsuario() || '';
    this.rolActual = (this.auth.getRol() || '').toLowerCase();

    // Si el usuario es de un departamento específico, fijar su rol
    if (!this.puedeFiltrarRol) {
      this.rolSeleccionado = this.rolActual;
    }

    this.cargarAgendas();
  }

  private generarSemanas(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO }, (_, i) => `SEMANA ${i + 1}`);
  }

  // =========================================================================
  // Carga de datos
  // =========================================================================
  cargarAgendas(): void {
    this.cargando = true;
    this.agendaAdminService.obtenerAgendasAdmin().subscribe({
      next: (res) => {
        this.cargando = false;
        if (res && res.success && Array.isArray(res.data)) {
          this.agendas = res.data;
        } else if (Array.isArray(res)) {
          this.agendas = res;
        } else {
          this.agendas = [];
        }
        this.aplicarFiltros();
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al cargar agendas administrativas:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar datos',
          text: 'No fue posible obtener las actividades agendadas. Intente nuevamente.'
        });
      }
    });
  }

  // =========================================================================
  // Filtrado reactivo en memoria
  // =========================================================================
  aplicarFiltros(): void {
    const termino = (this.busqueda || '').toLowerCase().trim();

    this.agendasFiltradas = this.agendas.filter(item => {
      // 1. Filtro de búsqueda textual
      if (termino) {
        const nombreStr = (item.nombre || '').toLowerCase();
        const usuarioStr = (item.usuario || '').toLowerCase();
        const rolStr = (item.rol || '').toLowerCase();
        const actividadStr = (item.actividad || '').toLowerCase();
        const domicilioStr = (item.domicilio || '').toLowerCase();
        const semanaStr = (item.semana || '').toLowerCase();
        const horaStr = (item.hora || '').toLowerCase();

        const coincide = nombreStr.includes(termino) ||
          usuarioStr.includes(termino) ||
          rolStr.includes(termino) ||
          actividadStr.includes(termino) ||
          domicilioStr.includes(termino) ||
          semanaStr.includes(termino) ||
          horaStr.includes(termino);

        if (!coincide) return false;
      }

      // 2. Filtro por Semana
      if (this.semanaSeleccionada && item.semana !== this.semanaSeleccionada) {
        return false;
      }

      // 3. Filtro por Rol
      if (this.rolSeleccionado && (item.rol || '').toLowerCase() !== this.rolSeleccionado.toLowerCase()) {
        return false;
      }

      // 4. Filtro por Rango de Fechas
      if (item.fecha) {
        const fechaItemStr = typeof item.fecha === 'string'
          ? item.fecha.substring(0, 10)
          : new Date(item.fecha).toISOString().substring(0, 10);

        if (this.fechaInicio && fechaItemStr < this.fechaInicio) {
          return false;
        }

        if (this.fechaFin && fechaItemStr > this.fechaFin) {
          return false;
        }
      }

      return true;
    });

    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.semanaSeleccionada = '';
    if (this.puedeFiltrarRol) {
      this.rolSeleccionado = '';
    } else {
      this.rolSeleccionado = this.rolActual;
    }
    this.aplicarFiltros();
  }

  establecerFiltroHoy(): void {
    const hoy = new Date().toISOString().substring(0, 10);
    this.fechaInicio = hoy;
    this.fechaFin = hoy;
    this.aplicarFiltros();
  }

  establecerFiltroMesActual(): void {
    const ahora = new Date();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().substring(0, 10);
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().substring(0, 10);
    this.fechaInicio = primerDia;
    this.fechaFin = ultimoDia;
    this.aplicarFiltros();
  }

  // =========================================================================
  // Paginación
  // =========================================================================
  get totalPaginas(): number {
    return Math.ceil(this.agendasFiltradas.length / this.elementosPorPagina) || 1;
  }

  get agendasPaginadas(): any[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.agendasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  // =========================================================================
  // Eliminación de actividad
  // =========================================================================
  eliminarActividad(agenda: any): void {
    const responsable = agenda.nombre || agenda.usuario || 'este usuario';
    Swal.fire({
      title: '¿Eliminar actividad?',
      html: `¿Estás seguro de eliminar la actividad de <strong>${responsable}</strong> a las <strong>${agenda.hora || '--:--'}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.agendaAdminService.eliminarAgendaAdmin(agenda._id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: '¡Eliminada!',
              text: 'La actividad fue eliminada exitosamente.',
              timer: 2000,
              showConfirmButton: false
            });
            this.agendas = this.agendas.filter(a => a._id !== agenda._id);
            this.aplicarFiltros();
          },
          error: (err) => {
            console.error('Error al eliminar agenda:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error al eliminar',
              text: 'No se pudo eliminar la actividad.'
            });
          }
        });
      }
    });
  }

  // =========================================================================
  // EXPORTACIÓN A EXCEL
  // =========================================================================
  exportarExcel(): void {
    if (this.agendasFiltradas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos para exportar',
        text: 'No hay actividades en la lista con los filtros seleccionados.'
      });
      return;
    }

    try {
      const dataParaExcel = this.agendasFiltradas.map((item, index) => {
        let fechaStr = '';
        if (item.fecha) {
          fechaStr = typeof item.fecha === 'string'
            ? item.fecha.substring(0, 10)
            : new Date(item.fecha).toISOString().substring(0, 10);
        }

        return {
          'No.': index + 1,
          'Responsable / Nombre': item.nombre || item.usuario || 'N/A',
          'Área / Rol': (item.rol || '').toUpperCase() || 'N/A',
          'Semana': item.semana || 'N/A',
          'Fecha': fechaStr,
          'Hora': item.hora || 'N/A',
          'Ubicación / Domicilio': item.domicilio || 'N/A',
          'Descripción de la Actividad': item.actividad || 'N/A'
        };
      });

      const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dataParaExcel);

      // Configurar ancho de columnas
      worksheet['!cols'] = [
        { wch: 6 },   // No.
        { wch: 22 },  // Usuario
        { wch: 18 },  // Área / Rol
        { wch: 14 },  // Semana
        { wch: 14 },  // Fecha
        { wch: 10 },  // Hora
        { wch: 28 },  // Ubicación
        { wch: 45 }   // Actividad
      ];

      const workbook: XLSX.WorkBook = {
        Sheets: { 'Actividades': worksheet },
        SheetNames: ['Actividades']
      };

      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const fechaHoy = new Date().toISOString().substring(0, 10);
      const nombreArchivo = `Agenda_Actividades_${fechaHoy}.xlsx`;

      FileSaver.saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), nombreArchivo);

      Swal.fire({
        icon: 'success',
        title: '¡Exportación exitosa!',
        text: `Se exportaron ${this.agendasFiltradas.length} actividad(es) a Excel.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'Ocurrió un error al generar el archivo Excel.'
      });
    }
  }

  // =========================================================================
  // EXPORTACIÓN A PDF
  // =========================================================================
  exportarPDF(): void {
    if (this.agendasFiltradas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos para exportar',
        text: 'No hay actividades en la lista con los filtros seleccionados.'
      });
      return;
    }

    try {
      // Orientación horizontal para mayor legibilidad
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });

      const fechaHoy = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // Encabezado del documento
      doc.setFillColor(43, 58, 103);
      doc.rect(0, 0, doc.internal.pageSize.width, 55, 'F');

      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Actividades Agendadas', 30, 32);

      doc.setFontSize(10);
      doc.setTextColor(220, 230, 250);
      doc.text(`Fecha de emisión: ${fechaHoy}`, doc.internal.pageSize.width - 30, 32, { align: 'right' });

      // Subtítulo con filtros aplicados
      let filtrosAplicados = `Total: ${this.agendasFiltradas.length} actividades`;
      if (this.fechaInicio || this.fechaFin) {
        filtrosAplicados += ` | Rango: ${this.fechaInicio || 'Inicio'} a ${this.fechaFin || 'Fin'}`;
      }
      if (this.rolSeleccionado) {
        filtrosAplicados += ` | Área: ${this.rolSeleccionado.toUpperCase()}`;
      }
      if (this.semanaSeleccionada) {
        filtrosAplicados += ` | ${this.semanaSeleccionada}`;
      }

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(filtrosAplicados, 30, 75);

      // Construcción del cuerpo de la tabla
      const tableBody = this.agendasFiltradas.map((item, index) => {
        let fechaStr = '';
        if (item.fecha) {
          fechaStr = typeof item.fecha === 'string'
            ? item.fecha.substring(0, 10)
            : new Date(item.fecha).toISOString().substring(0, 10);
        }

        return [
          (index + 1).toString(),
          item.nombre || item.usuario || '-',
          (item.rol || '-').toUpperCase(),
          item.semana || '-',
          fechaStr,
          item.hora || '-',
          item.domicilio || '-',
          item.actividad || '-'
        ];
      });

      autoTable(doc, {
        startY: 85,
        head: [['#', 'Usuario', 'Área / Rol', 'Semana', 'Fecha', 'Hora', 'Ubicación / Domicilio', 'Descripción de Actividad']],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [43, 58, 103],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 4.5,
          overflow: 'linebreak'
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 95 },
          2: { cellWidth: 70, halign: 'center' },
          3: { cellWidth: 65, halign: 'center' },
          4: { cellWidth: 60, halign: 'center' },
          5: { cellWidth: 45, halign: 'center' },
          6: { cellWidth: 140 },
          7: { cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 30, right: 30 },
        didDrawPage: (data) => {
          // Pie de página con numeración
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 15,
            { align: 'center' }
          );
        }
      });

      const nombrePDF = `Agenda_Actividades_${new Date().toISOString().substring(0, 10)}.pdf`;
      doc.save(nombrePDF);

      Swal.fire({
        icon: 'success',
        title: '¡PDF generado!',
        text: `El reporte PDF fue descargado exitosamente.`,
        timer: 2500,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error al generar PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al exportar',
        text: 'Ocurrió un error al generar el archivo PDF.'
      });
    }
  }

  // =========================================================================
  // Helpers para vista
  // =========================================================================
  getRoleBadgeColor(rol: string): string {
    const rolLower = (rol || '').toLowerCase();
    switch (rolLower) {
      case 'mercadotecnia':
        return 'badge-role-merca';
      case 'auditoria':
        return 'badge-role-audi';
      case 'rh':
        return 'badge-role-rh';
      case 'admin':
        return 'badge-role-admin';
      case 'sup':
        return 'badge-role-sup';
      default:
        return 'bg-secondary text-white';
    }
  }

  getFechaFormateada(fechaStr: string): string {
    if (!fechaStr) return '--';
    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return fechaStr.substring(0, 10);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // =========================================================================
  // ENVIAR RESUMEN POR CORREO
  // =========================================================================
  enviarResumenPorCorreo(): void {
    if (!this.fechaInicio && !this.fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango de fechas requerido',
        text: 'Por favor selecciona la fecha de inicio y/o fin en los filtros para enviar el reporte de actividades por correo.',
        confirmButtonColor: '#3d52a0',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const inicio = this.fechaInicio || this.fechaFin;
    const fin = this.fechaFin || this.fechaInicio;

    const fechaInicioFmt = new Date(inicio + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const fechaFinFmt = new Date(fin + 'T00:00:00').toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const periodoStr = (inicio === fin) ? fechaInicioFmt : `${fechaInicioFmt} al ${fechaFinFmt}`;
    const rolInfo = this.rolSeleccionado
      ? `<br>Área filtrada: <strong class="text-uppercase">${this.rolSeleccionado}</strong>`
      : '<br>Áreas incluidas: <strong>Auditoría, Mercadotecnia y RH</strong>';

    Swal.fire({
      title: '¿Enviar actividades por correo?',
      html: `Se recopilarán y enviarán las actividades del período:<br><strong class="text-primary fs-6">${periodoStr}</strong>${rolInfo}<br><br><small class="text-muted">El correo se enviará a la dirección configurada en el sistema para estos departamentos.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      cancelButtonColor: '#64748b',
      confirmButtonText: '<i class="bi bi-send-fill me-1"></i> Sí, enviar reporte',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.enviandoCorreo = true;

        Swal.fire({
          title: 'Enviando reporte...',
          text: 'Por favor espera mientras se procesa el envío por correo.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.agendaAdminService.enviarResumenAgenda(inicio, fin, this.rolSeleccionado).subscribe({
          next: (res) => {
            this.enviandoCorreo = false;
            if (res && res.success) {
              Swal.fire({
                icon: 'success',
                title: '¡Correo enviado!',
                text: res.message || 'El resumen de actividades fue despachado exitosamente.',
                confirmButtonColor: '#0284c7'
              });
            } else {
              Swal.fire({
                icon: 'info',
                title: 'Sin actividades',
                text: res.message || 'No se encontraron actividades agendadas en ese período para enviar.',
                confirmButtonColor: '#3d52a0'
              });
            }
          },
          error: (err) => {
            this.enviandoCorreo = false;
            console.error('Error al enviar resumen de agenda:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error al enviar correo',
              text: err?.error?.message || 'Ocurrió un error al despachar el correo. Verifica que el servidor y las credenciales de correo estén activas.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }
}

