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
  todasLasSemanas: string[] = [];
  rolesDisponibles: { valor: string; label: string; color: string }[] = [
    { valor: 'mercadotecnia', label: 'Mercadotecnia', color: '#ec4899' },
    { valor: 'auditoria', label: 'Auditoría', color: '#f59e0b' },
    { valor: 'rh', label: 'Recursos Humanos', color: '#06b6d4' },
    { valor: 'admin', label: 'Administración', color: '#6366f1' },
    { valor: 'sup', label: 'Supervisión', color: '#10b981' }
  ];

  // Usuario y rol en sesión
  usuarioActual: string = '';
  nombreActual: string = '';
  rolActual: string = '';
  usuarioSeleccionado: string = '';

  // Paginación
  paginaActual: number = 1;
  elementosPorPagina: number = 15;
  tamanosPagina: number[] = [10, 15, 25, 50, 100];

  constructor(
    private agendaAdminService: AgendaAdminService,
    private auth: AuthService
  ) {
    this.todasLasSemanas = Array.from({ length: SEMANAS_ANIO }, (_, i) => `SEMANA ${i + 1}`);
  }

  get esAdminOSupervisor(): boolean {
    return ['admin', 'sup'].includes(this.rolActual);
  }

  get puedeFiltrarRol(): boolean {
    return this.esAdminOSupervisor;
  }

  get puedeFiltrarUsuario(): boolean {
    return this.esAdminOSupervisor;
  }

  get listaUsuarios(): { valor: string; label: string }[] {
    const mapa = new Map<string, string>();
    for (const ag of this.agendas) {
      const u = (ag.usuario || '').trim();
      const n = (ag.nombre || ag.usuario || '').trim();
      if (u && !mapa.has(u.toLowerCase())) {
        mapa.set(u.toLowerCase(), n || u);
      }
    }
    return Array.from(mapa.entries())
      .map(([valor, label]) => ({ valor, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  getNombreUsuarioSeleccionado(): string {
    if (!this.usuarioSeleccionado) return '';
    const encontrado = this.listaUsuarios.find(u => u.valor === this.usuarioSeleccionado.toLowerCase());
    return encontrado ? encontrado.label : this.usuarioSeleccionado;
  }

  ngOnInit(): void {
    this.usuarioActual = this.auth.getUsuario() || '';
    this.nombreActual = this.auth.getNombre?.() || localStorage.getItem('nombre') || '';
    this.rolActual = (this.auth.getRol() || '').toLowerCase();

    // Si el usuario es de un departamento específico, fijar su rol
    if (!this.puedeFiltrarRol) {
      this.rolSeleccionado = this.rolActual;
    }

    this.cargarAgendas();
  }

  private extraerSemanasRegistradas(): void {
    const conjuntoSemanas = new Set<string>();
    for (const ag of this.agendas) {
      const sem = (ag.semana || '').trim();
      if (sem) {
        conjuntoSemanas.add(sem);
      }
    }

    // Ordenar numéricamente de menor a mayor: SEMANA 1, SEMANA 2, etc.
    this.semanas = Array.from(conjuntoSemanas).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    // Si la semana seleccionada ya no existe en las registradas, restablecer filtro
    if (this.semanaSeleccionada && !this.semanas.includes(this.semanaSeleccionada)) {
      this.semanaSeleccionada = '';
    }
  }

  // =========================================================================
  // Carga de datos
  // =========================================================================
  cargarAgendas(): void {
    this.cargando = true;
    const filtrosConsulta: any = {};
    if (!this.esAdminOSupervisor && this.usuarioActual) {
      filtrosConsulta.usuario = this.usuarioActual;
    }

    this.agendaAdminService.obtenerAgendasAdmin(filtrosConsulta).subscribe({
      next: (res) => {
        this.cargando = false;
        if (res && res.success && Array.isArray(res.data)) {
          this.agendas = res.data;
        } else if (Array.isArray(res)) {
          this.agendas = res;
        } else {
          this.agendas = [];
        }
        this.extraerSemanasRegistradas();
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
    const uActual = (this.usuarioActual || '').toLowerCase().trim();
    const nActual = (this.nombreActual || '').toLowerCase().trim();
    const uSel = (this.usuarioSeleccionado || '').toLowerCase().trim();

    this.agendasFiltradas = this.agendas.filter(item => {
      const itemUser = (item.usuario || '').toLowerCase().trim();
      const itemNombre = (item.nombre || '').toLowerCase().trim();

      // 0. Restricción por usuario
      if (!this.esAdminOSupervisor) {
        // Un usuario normal únicamente puede ver sus propias actividades
        const coincideUsuario = (uActual && (itemUser === uActual || itemNombre === uActual)) ||
          (nActual && (itemNombre === nActual || itemUser === nActual));
        if (!coincideUsuario) {
          return false;
        }
      } else if (uSel) {
        // Admin / Supervisor filtrando por un usuario en el desplegable
        const coincideFiltro = itemUser === uSel || itemNombre === uSel;
        if (!coincideFiltro) {
          return false;
        }
      }

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

    // Ordenar cronológicamente: lo que se realizará primero va primero
    this.agendasFiltradas.sort((a, b) => {
      // 1. Comparar por fecha (más próxima / temprana primero)
      const fechaA = a.fecha ? (typeof a.fecha === 'string' ? a.fecha.substring(0, 10) : new Date(a.fecha).toISOString().substring(0, 10)) : '';
      const fechaB = b.fecha ? (typeof b.fecha === 'string' ? b.fecha.substring(0, 10) : new Date(b.fecha).toISOString().substring(0, 10)) : '';
      if (fechaA !== fechaB) {
        return fechaA.localeCompare(fechaB);
      }

      // 2. Comparar por hora (ej. 08:00 antes de 09:00, 14:00, etc.)
      const horaA = (a.hora || '').trim();
      const horaB = (b.hora || '').trim();
      if (horaA !== horaB) {
        return horaA.localeCompare(horaB);
      }

      // 3. Fallback por orden de registro
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.fechaInicio = '';
    this.fechaFin = '';
    this.semanaSeleccionada = '';
    this.usuarioSeleccionado = '';
    if (this.puedeFiltrarRol) {
      this.rolSeleccionado = '';
    } else {
      this.rolSeleccionado = this.rolActual;
    }
    this.aplicarFiltros();
  }

  establecerFiltroHoy(): void {
    const d = new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.fechaInicio = hoy;
    this.fechaFin = hoy;
    this.aplicarFiltros();
  }

  establecerFiltroMesActual(): void {
    const ahora = new Date();
    const y = ahora.getFullYear();
    const m = ahora.getMonth();
    const primerDia = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const ultimoDiaNum = new Date(y, m + 1, 0).getDate();
    const ultimoDia = `${y}-${String(m + 1).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
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
            this.extraerSemanasRegistradas();
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
  // Edición de actividad
  // =========================================================================
  editarActividad(item: any): void {
    let fechaStr = '';
    if (item.fecha) {
      fechaStr = typeof item.fecha === 'string'
        ? item.fecha.substring(0, 10)
        : new Date(item.fecha).toISOString().substring(0, 10);
    }

    const horaStr = item.hora || '';
    const domicilioStr = (item.domicilio || '').replace(/"/g, '&quot;');
    const actividadStr = (item.actividad || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const semanaActual = item.semana || '';
    const rolActual = (item.rol || '').toLowerCase();

    // Generar opciones de semanas
    const semanasOptions = this.todasLasSemanas.map(sem =>
      `<option value="${sem}" ${sem === semanaActual ? 'selected' : ''}>${sem}</option>`
    ).join('');

    // Generar opciones de roles si es admin o supervisor
    const rolesOptions = this.rolesDisponibles.map(r =>
      `<option value="${r.valor}" ${r.valor === rolActual ? 'selected' : ''}>${r.label}</option>`
    ).join('');

    const htmlContent = `
      <div class="text-start" style="font-size: 0.9rem;">
        <div class="mb-3 p-2 bg-light rounded border d-flex align-items-center justify-content-between">
          <div>
            <span class="text-muted small d-block" style="font-size: 0.75rem;">Responsable:</span>
            <strong class="text-dark">${item.nombre || item.usuario || 'Sin asignar'}</strong>
          </div>
          <span class="badge text-uppercase ${this.getRoleBadgeColor(item.rol)} px-2 py-1">
            ${item.rol || 'GENERAL'}
          </span>
        </div>

        <div class="row g-2 mb-2">
          <div class="col-6">
            <label class="form-label fw-bold small text-secondary mb-1">
              <i class="bi bi-calendar-event text-primary me-1"></i>Fecha <span class="text-danger">*</span>
            </label>
            <input type="date" id="swal-fecha" class="form-control form-control-sm" value="${fechaStr}">
          </div>
          <div class="col-6">
            <label class="form-label fw-bold small text-secondary mb-1">
              <i class="bi bi-calendar3 text-primary me-1"></i>Semana <span class="text-danger">*</span>
            </label>
            <select id="swal-semana" class="form-select form-select-sm">
              <option value="" disabled>Seleccionar...</option>
              ${semanasOptions}
            </select>
          </div>
        </div>

        <div class="row g-2 mb-2">
          <div class="${this.esAdminOSupervisor ? 'col-6' : 'col-12'}">
            <label class="form-label fw-bold small text-secondary mb-1">
              <i class="bi bi-clock text-primary me-1"></i>Hora <span class="text-danger">*</span>
            </label>
            <input type="time" id="swal-hora" class="form-control form-control-sm" value="${horaStr}">
          </div>
          ${this.esAdminOSupervisor ? `
          <div class="col-6">
            <label class="form-label fw-bold small text-secondary mb-1">
              <i class="bi bi-shield-check text-primary me-1"></i>Área / Rol
            </label>
            <select id="swal-rol" class="form-select form-select-sm">
              ${rolesOptions}
            </select>
          </div>
          ` : ''}
        </div>

        <div class="mb-2">
          <label class="form-label fw-bold small text-secondary mb-1">
            <i class="bi bi-geo-alt text-danger me-1"></i>Ubicación / Domicilio
          </label>
          <input type="text" id="swal-domicilio" class="form-control form-control-sm" value="${domicilioStr}" placeholder="Ej. Sucursal Centro, Oficinas Generales...">
        </div>

        <div class="mb-1">
          <label class="form-label fw-bold small text-secondary mb-1">
            <i class="bi bi-card-text text-primary me-1"></i>Descripción de la Actividad <span class="text-danger">*</span>
          </label>
          <textarea id="swal-actividad" class="form-control form-control-sm" rows="3" placeholder="Detalle la actividad programada...">${actividadStr}</textarea>
        </div>
      </div>
    `;

    Swal.fire({
      title: '<span style="font-size: 1.25rem; font-weight: 700; color: #1e3a8a;"><i class="bi bi-pencil-square me-2"></i>Editar Actividad</span>',
      html: htmlContent,
      width: '540px',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-check2-circle me-1"></i> Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      didOpen: () => {
        const inputFecha = document.getElementById('swal-fecha') as HTMLInputElement;
        const selectSemana = document.getElementById('swal-semana') as HTMLSelectElement;
        if (inputFecha && selectSemana) {
          inputFecha.addEventListener('change', () => {
            const sem = this.calcularSemanaDesdeFecha(inputFecha.value);
            if (sem) {
              selectSemana.value = sem;
            }
          });
        }
      },
      preConfirm: () => {
        const fecha = (document.getElementById('swal-fecha') as HTMLInputElement)?.value;
        const semana = (document.getElementById('swal-semana') as HTMLSelectElement)?.value;
        const hora = (document.getElementById('swal-hora') as HTMLInputElement)?.value || '';
        const domicilio = (document.getElementById('swal-domicilio') as HTMLInputElement)?.value?.trim() || '';
        const actividad = (document.getElementById('swal-actividad') as HTMLTextAreaElement)?.value?.trim() || '';
        const rolElement = document.getElementById('swal-rol') as HTMLSelectElement;
        const rol = rolElement ? rolElement.value : (item.rol || '');

        if (!fecha) {
          Swal.showValidationMessage('La fecha es obligatoria');
          return false;
        }
        if (!semana) {
          Swal.showValidationMessage('La semana es obligatoria');
          return false;
        }
        if (!actividad) {
          Swal.showValidationMessage('Por favor ingresa la descripción de la actividad');
          return false;
        }

        return { fecha, semana, hora, domicilio, actividad, rol };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const datosActualizados = result.value;

        Swal.fire({
          title: 'Guardando cambios...',
          text: 'Por favor espere un momento',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.agendaAdminService.actualizarAgendaAdmin(item._id, datosActualizados).subscribe({
          next: () => {
            // Actualizar datos en memoria
            const index = this.agendas.findIndex(a => a._id === item._id);
            if (index !== -1) {
              this.agendas[index] = {
                ...this.agendas[index],
                ...datosActualizados
              };
              this.extraerSemanasRegistradas();
              this.aplicarFiltros();
            }

            Swal.fire({
              icon: 'success',
              title: '¡Actividad Actualizada!',
              text: 'Los cambios fueron guardados exitosamente.',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (err) => {
            console.error('Error al actualizar agenda admin:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error al actualizar',
              text: err?.error?.message || 'No fue posible guardar los cambios de la actividad.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
      }
    });
  }

  private calcularSemanaDesdeFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
      const [y, m, d] = fechaStr.split('-').map(Number);
      if (!y || !m || !d) return '';
      const fecha = new Date(y, m - 1, d);
      const numSemana = this.getWeekNumber(fecha);
      return `SEMANA ${numSemana}`;
    } catch {
      return '';
    }
  }

  private getWeekNumber(d: Date): number {
    const year = d.getFullYear();
    const firstJan = new Date(year, 0, 1);
    const dayOfWeek = firstJan.getDay();
    const daysToFirstFriday = (5 - dayOfWeek + 7) % 7;
    const firstFriday = new Date(year, 0, 1 + daysToFirstFriday);
    firstFriday.setHours(0, 0, 0, 0);

    const targetDate = new Date(d.getTime());
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < firstFriday) {
      const prevYear = year - 1;
      const firstJanPrev = new Date(prevYear, 0, 1);
      const dayOfWeekPrev = firstJanPrev.getDay();
      const daysToFirstFridayPrev = (5 - dayOfWeekPrev + 7) % 7;
      const firstFridayPrev = new Date(prevYear, 0, 1 + daysToFirstFridayPrev);
      firstFridayPrev.setHours(0, 0, 0, 0);

      const diffTime = targetDate.getTime() - firstFridayPrev.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.floor(diffDays / 7) + 1;
    }

    const diffTime = targetDate.getTime() - firstFriday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
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
      const d = new Date();
      const fechaHoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  getFechaFormateada(fechaStr: string | Date): string {
    if (!fechaStr) return '--';

    // Extraer año, mes y día de forma directa para evitar cualquier desfase de zona horaria (UTC vs Local México)
    const raw = typeof fechaStr === 'string'
      ? fechaStr.substring(0, 10)
      : (fechaStr instanceof Date ? fechaStr.toISOString().substring(0, 10) : '');

    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number);
      // Crear objeto Date usando hora local
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    const date = new Date(fechaStr);
    if (isNaN(date.getTime())) return String(fechaStr).substring(0, 10);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  // =========================================================================
  // ENVIAR RESUMEN POR CORREO
  // =========================================================================
  enviarResumenPorCorreo(): void {
    // 1. Rango de fechas obligatorio
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango de fechas requerido',
        text: 'Es obligatorio seleccionar la fecha de inicio y la fecha de fin en los filtros para poder enviar el reporte de actividades.',
        confirmButtonColor: '#3d52a0',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.fechaInicio > this.fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango de fechas inválido',
        text: 'La fecha de inicio no puede ser posterior a la fecha de fin.',
        confirmButtonColor: '#3d52a0',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Siempre enviar las agendas del usuario logueado en sesión
    const usuarioParaEnvio = (this.usuarioActual || '').trim();
    const nombreParaMostrar = this.nombreActual || this.usuarioActual || 'Usuario logueado';

    const inicio = this.fechaInicio;
    const fin = this.fechaFin;

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

    const userInfo = `<br>Responsable (usuario logueado): <strong class="text-primary">${nombreParaMostrar}</strong>`;
    const rolInfo = this.rolActual ? `<br>Área: <strong class="text-uppercase">${this.rolActual}</strong>` : '';

    Swal.fire({
      title: '¿Enviar actividades por correo?',
      html: `Se recopilarán y enviarán las actividades del usuario logueado:<br>${userInfo}${rolInfo}<br><br>Período: <strong class="text-primary">${periodoStr}</strong><br><br><small class="text-muted">El correo se enviará a <strong>o.alfaro@vamosamejorar.com</strong>.</small>`,
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

        this.agendaAdminService.enviarResumenAgenda(inicio, fin, this.rolSeleccionado, usuarioParaEnvio).subscribe({
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
                text: res.message || `No se encontraron actividades agendadas para ${nombreParaMostrar} en ese período para enviar.`,
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

