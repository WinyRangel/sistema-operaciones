import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CoordinacionService } from '../../services/coordinacion.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';


const SEMANAS_ANIO = 53;
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']



interface Agenda {
  _id: string;
  fecha: Date;
  hora: string;
  domicilio: string;
  actividad: string;
  codigo: string;
  resultado?: string;
  asesor: string;
  coordinador?: string;
  evidencia: string;
  duracion?: number;
  validada?: string;
  motivoRechazo?: string;
  validadaPor?: string;
  semana?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EstadisticasReporte {
  totalActividades: number;
  actividadesConEvidencia: number;
  actividadesValidadas: number;
  actividadesPorCodigo: { [key: string]: number };
  actividadesPorAsesor: { [key: string]: number };
  porcentajeCompletitud: number;
  actividadesPorMes: { [key: string]: number };
  actividadesPorSemana: { [key: string]: number };
}

interface Asesor {
  usuario: string;
  coordinacion: string;
}

interface CalendarDay {
  numero: number | string;
  fecha?: Date;
  mesActual: boolean;
  hoy?: boolean;
  actividades?: Agenda[];
}
@Component({
  selector: 'app-test-agenda',
  standalone: false,
  templateUrl: './test-agenda.component.html',
  styleUrl: './test-agenda.component.css'
})
export class TestAgendaComponent {
  agendas: any[] = [];
  agendasFiltradas: any[] = [];

  get agendasRechazadas() {
    return this.agendasFiltradas.filter(a => a.validada === 'RECHAZADA');
  }

  estaLogueado: boolean = true;
  private authSubscription!: Subscription;
  rolUsuario = '';
  esCoordinador = false;
  pestanaActiva: string = 'calendario';
  estadisticas: EstadisticasReporte | null = null;


  // ===== OPCIONES DE REPORTE =====
  tiposReporte = [
    { id: 'completo', nombre: 'Reporte Completo' },
    { id: 'estadisticas', nombre: 'Estadísticas Generales' },
    //{ id: 'evidencias', nombre: 'Actividades con Evidencias' },
    { id: 'codigos', nombre: 'Análisis por Códigos' },
    { id: 'asesores', nombre: 'Reporte por Asesores' },
    { id: 'pendientes', nombre: 'Actividades Pendientes' }
  ];
  tipoReporteSeleccionado: string = 'completo';


  // ===== FILTROS =====
  meses: string[] = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  semanas: string[] = [];
  diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  opcionesCodigo = [
    { value: 'R', texto: 'R | Recuperación', descripcion: 'Recuperación' },
    { value: 'RP', texto: 'R/P | Recuperación / levantamiento de papelería', descripcion: 'Recuperación / levantamiento de papelería' },
    { value: 'LPI', texto: 'Levantamiento papelería individuales', descripcion: 'Levantamiento papelería individuales' },
    { value: 'RPI', texto: 'Recuperación de levantaiento de papelería', descripcion: 'Recuperación de levantaiento de papelería' },
    { value: 'C', texto: 'C | Cobranza', descripcion: 'Cobranza' },
    { value: 'VTA', texto: 'VTA | Promoción', descripcion: 'Promoción' },
    { value: 'REC', texto: 'R/EC | Recuperación / Entrega / Cambio ciclo', descripcion: 'Recuperación / Entrega / Cambio ciclo' },
    { value: 'RER', texto: 'R/ER | Recuperación / Entrega / Refil', descripcion: 'Recuperación / Entrega / Refil' },
    { value: 'GN', texto: 'GN | Grupos nuevos', descripcion: 'Grupos nuevos' },
    { value: 'COMIDA', texto: 'COMIDA', descripcion: 'COMIDA' },
    { value: 'ASEO', texto: 'ASEO', descripcion: 'ASEO' },
    { value: 'RS', texto: 'RS | Reunión Semanal', descripcion: 'Reunión Semanal' },
    { value: 'INT', texto: 'INT | Integración', descripcion: 'Integración' },
    { value: 'CM', texto: 'CM | Capacitación Manual', descripcion: 'Capacitación Manual' },
    { value: 'ED', texto: 'ED | Entrega Depósitos', descripcion: 'Entrega Depósitos' },
    { value: 'EOP', texto: 'EOP | Entrega Operativos', descripcion: 'Entrega Operativos' },
    { value: 'R/A', texto: 'RA | Realizar Agenda y Concentrado', descripcion: 'Realizar Agenda y Concentrado' },
    //{ value: 'CC', texto: 'RA | Realizar Agenda y Concentrado' },
    { value: 'OTRO', texto: 'OTRO | Otro', descripcion: 'Otro' }
  ];

  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: any = null;
  codigoSeleccionado: string = '';
  estadoSeleccionado: string = '';
  usuarioActual: any;
  asesores: Asesor[] = [];
  asesorSeleccionado: string = '';
  actividadSeleccionada: Agenda | null = null;
  busqueda: string = '';
  fechaSeleccionada: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';


  // ===== PROPIEDADES DEL CALENDARIO =====
  agendaCalendario: Agenda[] = [];
  vistaActual: 'mes' | 'semana' | 'dia' = 'mes';
  fechaActual: Date = new Date();
  mesActual: string = '';
  anioActual: number = new Date().getFullYear();
  semanasDelMes: CalendarDay[][] = [];
  diasDeLaSemana: any[] = [];
  horasDelDia: string[] = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8:00 a 20:00
  actividadesCompletadas: number = 0;

  private actualizarSemanasDisponibles(): void {
    if (!this.agendas || this.agendas.length === 0) {
      this.semanas = [];
      return;
    }

    const semanasSet = new Set<string>();
    this.agendas.forEach(agenda => {
      if (agenda.semana) {
        semanasSet.add(agenda.semana);
      } else if (agenda.fecha) {
        // Fallback si no tiene el campo semana
        const num = this.getSemanaDelAnio(agenda.fecha);
        semanasSet.add(`SEMANA ${num}`);
      }
    });

    this.semanas = Array.from(semanasSet).sort((a, b) => {
      const numA = parseInt(a.replace('SEMANA ', '')) || 0;
      const numB = parseInt(b.replace('SEMANA ', '')) || 0;
      return numA - numB;
    });
  }
  constructor(private authService: AuthService, private coordinacionService: CoordinacionService) {
    this.aplicarFiltros();
  }

  getSemanaDelAnio(fecha: Date | string): number {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const firstJan = new Date(year, 0, 1);
    const dayOfWeek = firstJan.getDay(); // 0 (Sun) to 6 (Sat)

    // El primer viernes del año
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

  ngOnInit(): void {
    this.cargarAgendas();

    this.authSubscription = this.authService.autenticado$.subscribe((estado) => {
      this.estaLogueado = estado;

      if (estado) {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.rolUsuario = payload.rol;
            this.usuarioActual = payload.usuario;
            this.esCoordinador = payload.rol === 'coordinador';

            // Si es coordinador, cargar lista de asesores
            if (this.esCoordinador) {
              this.cargarAsesores();
            }
          } catch {
            this.rolUsuario = '';
            this.esCoordinador = false;
          }
        }
      }
    });
  }

  // ===== FUNCIONES DE MENSAJES DE ALERTA =====

  /**
   * Muestra un mensaje de error elegante
   * @param titulo Título del error
   * @param mensaje Mensaje detallado del error
   * @param tipo Tipo de alerta (error, warning, info, success, question)
   */
  private mostrarAlerta(titulo: string, mensaje: string, tipo: 'error' | 'warning' | 'info' | 'success' | 'question' = 'error') {
    Swal.fire({
      icon: tipo,
      title: titulo,
      text: mensaje,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: tipo === 'error' ? '#d33' :
        tipo === 'warning' ? '#f0ad4e' :
          tipo === 'success' ? '#5cb85c' : '#3085d6',
      backdrop: true,
      allowOutsideClick: false,
      customClass: {
        popup: 'swal2-popup-custom'
      }
    });
  }

  /**
   * Muestra una alerta de confirmación personalizada
   * @param titulo Título de la confirmación
   * @param mensaje Mensaje de la confirmación
   * @returns Promise con el resultado
   */
  private mostrarConfirmacion(titulo: string, mensaje: string): Promise<any> {
    return Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false
    });
  }

  // ===== FUNCIONES PRINCIPALES ACTUALIZADAS =====

  cargarAsesores(): void {
    this.coordinacionService.obtenerAsesoresPorCoordinacion().subscribe({
      next: (resp) => {
        this.asesores = resp.asesores;
      },
      error: (err) => {
        console.error('Error al cargar asesores', err);
        this.mostrarAlerta(
          'Error al cargar asesores',
          'No se pudieron cargar la lista de asesores. Por favor, intente nuevamente.',
          'error'
        );
      }
    });
  }

  cargarAgendas(): void {
    this.coordinacionService.obtenerAgendasAsesor().subscribe({
      next: (resp) => {
        this.agendas = resp.agendas.sort((a: any, b: any) => {
          const fechaA = new Date(a.fecha).getTime();
          const fechaB = new Date(b.fecha).getTime();
          if (fechaA !== fechaB) return fechaA - fechaB;
          return (a.hora || '').localeCompare(b.hora || '');
        });
        this.actualizarSemanasDisponibles();
        this.aplicarFiltros();

        // Mostrar mensaje si no hay agendas
        if (this.agendas.length === 0) {
          this.mostrarAlerta(
            'Sin agendas',
            'No se encontraron agendas registradas.',
            'info'
          );
        }
      },
      error: (err) => {
        console.error('Error al obtener agendas', err);

        let mensajeError = 'No se pudieron cargar las agendas. ';

        // Personalizar mensaje según el tipo de error
        if (err.status === 0) {
          mensajeError += 'Verifique su conexión a internet.';
        } else if (err.status === 401) {
          mensajeError += 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
        } else if (err.status === 403) {
          mensajeError += 'No tiene permisos para acceder a esta información.';
        } else if (err.status >= 500) {
          mensajeError += 'Error del servidor. Por favor, intente más tarde.';
        } else {
          mensajeError += 'Por favor, intente nuevamente.';
        }

        this.mostrarAlerta('Error de conexión', mensajeError, 'error');
      }
    });
  }

  aplicarFiltros() {
    let filtradas = [...this.agendas];

    // Filtro por asesor (solo para coordinadores)
    if (this.esCoordinador && this.asesorSeleccionado) {
      filtradas = filtradas.filter(a => a.asesor === this.asesorSeleccionado);
    }

    // Filtro por código
    if (this.codigoSeleccionado) {
      filtradas = filtradas.filter(a => a.codigo === this.codigoSeleccionado);
    }

    if (this.semanaSeleccionada) {
      filtradas = filtradas.filter(a => {
        // Usar campo semana si existe, sino recalcular
        if (a.semana) {
          return a.semana === this.semanaSeleccionada;
        }
        const num = this.getSemanaDelAnio(a.fecha);
        return `SEMANA ${num}` === this.semanaSeleccionada;
      });
    }


    // Filtro por mes
    if (this.mesSeleccionado) {
      const mesIndex = this.meses.indexOf(this.mesSeleccionado) + 1;
      filtradas = filtradas.filter(a => {
        const fecha = new Date(a.fecha);
        return fecha.getUTCMonth() + 1 === mesIndex;
      });
    }

    // filtros por fecha
    if (this.fechaSeleccionada) {
      const [y, m, d] = this.fechaSeleccionada.split('-').map(Number);
      const fechaMinima = new Date(Date.UTC(y, m - 1, 1));
      const fechaMaxima = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

      filtradas = filtradas.filter(a => {
        const fecha = new Date(a.fecha);
        return fecha >= fechaMinima && fecha <= fechaMaxima;
      });
    }

    // Filtro por rango de fechas (Inicio - Fin)
    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      fin.setHours(23, 59, 59, 999);

      filtradas = filtradas.filter(a => {
        const fecha = new Date(a.fecha);
        return fecha >= inicio && fecha <= fin;
      });
    }

    // Filtro por búsqueda de texto
    if (this.busqueda) {
      const busquedaLower = this.busqueda.toLowerCase();
      filtradas = filtradas.filter(a =>
        (a.actividad && a.actividad.toLowerCase().includes(busquedaLower)) ||
        (a.domicilio && a.domicilio.toLowerCase().includes(busquedaLower)) ||
        (a.resultado && a.resultado.toLowerCase().includes(busquedaLower)) ||
        (a.asesor && a.asesor.toLowerCase().includes(busquedaLower))
      );
    }

    // Filtro por estado
    if (this.estadoSeleccionado) {
      if (this.estadoSeleccionado === 'completada') {
        filtradas = filtradas.filter(a => a.evidencia && a.evidencia.trim() !== '');
      } else if (this.estadoSeleccionado === 'pendiente') {
        filtradas = filtradas.filter(a => !a.evidencia || a.evidencia.trim() === '');
      }
    }

    this.agendasFiltradas = filtradas;

    // Mostrar mensaje si no hay resultados después de filtrar
    if (filtradas.length === 0 && (this.mesSeleccionado || this.codigoSeleccionado || this.asesorSeleccionado)) {
      setTimeout(() => {
        this.mostrarAlerta(
          'Sin resultados',
          'No se encontraron agendas con los filtros aplicados.',
          'info'
        );
      }, 300);
    }

    // Actualizar datos del calendario
    this.agendaCalendario = [...this.agendasFiltradas];
    this.actualizarInformacionCalendario();
  }

  eliminarAgenda(id: string) {
    this.mostrarConfirmacion('¿Eliminar actividad?', 'Esta acción no se puede deshacer.')
      .then((result) => {
        if (result.isConfirmed) {
          // Mostrar loading mientras se procesa
          Swal.fire({
            title: 'Eliminando...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          this.coordinacionService.eliminarAgendaAsesor(id).subscribe({
            next: () => {
              this.agendas = this.agendas.filter(a => a._id !== id);
              this.aplicarFiltros();

              Swal.fire({
                icon: 'success',
                title: '¡Eliminado!',
                text: 'La actividad ha sido eliminada correctamente.',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true
              });
            },
            error: (err) => {
              console.error('Error al eliminar agenda', err);

              let mensajeError = 'No se pudo eliminar la actividad. ';

              if (err.status === 404) {
                mensajeError = 'La actividad no fue encontrada.';
              } else if (err.status === 403) {
                mensajeError = 'No tiene permisos para eliminar esta actividad.';
              } else if (err.status >= 500) {
                mensajeError += 'Error del servidor. Por favor, intente más tarde.';
              } else {
                mensajeError += 'Por favor, intente nuevamente.';
              }

              this.mostrarAlerta('Error al eliminar', mensajeError, 'error');
            }
          });
        }
      });
  }

  validarAgenda(id: string) {
    this.mostrarConfirmacion(
      '¿Validar actividad?',
      'Esta acción marcará la actividad como validada.'
    ).then((result) => {

      if (result.isConfirmed) {

        Swal.fire({
          title: 'Validando...',
          text: 'Por favor espere',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.coordinacionService.validarAgendaAsesor(id).subscribe({
          next: () => {

            // ✅ Actualizar estado local correctamente
            const agenda = this.agendas.find(a => a._id === id);
            if (agenda) {
              agenda.validada = 'VALIDADA';
            }

            this.aplicarFiltros();

            Swal.fire({
              icon: 'success',
              title: '¡Validado!',
              text: 'La actividad ha sido validada correctamente.',
              timer: 2000,
              showConfirmButton: false,
              timerProgressBar: true
            });
          },
          error: (err) => {
            console.error('Error al validar agenda', err);

            let mensajeError = 'No se pudo validar la actividad. ';

            if (err.status === 404) {
              mensajeError = 'La actividad no fue encontrada.';
            } else if (err.status === 403) {
              mensajeError = 'No tiene permisos para validar esta actividad.';
            } else if (err.status >= 500) {
              mensajeError += 'Error del servidor. Por favor, intente más tarde.';
            } else {
              mensajeError += 'Por favor, intente nuevamente.';
            }

            this.mostrarAlerta('Error al validar', mensajeError, 'error');
          }
        });
      }
    });
  }


  rechazarAgenda(id: string) {
    Swal.fire({
      title: '¿Rechazar actividad?',
      text: 'Por favor, indique el motivo del rechazo:',
      icon: 'warning',
      input: 'textarea',
      inputPlaceholder: 'Escriba aquí el motivo...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return '¡Es obligatorio indicar un motivo!';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const motivoRechazo = result.value;

        Swal.fire({
          title: 'Rechazando...',
          text: 'Por favor espere',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.coordinacionService.rechazarAgendaAsesor(id, motivoRechazo).subscribe({
          next: (resp) => {
            // ✅ Actualizar estado local
            const agenda = this.agendas.find(a => a._id === id);
            if (agenda) {
              agenda.motivoRechazo = motivoRechazo;
              agenda.validada = 'RECHAZADA';
            }

            this.aplicarFiltros();
            Swal.fire({
              icon: 'success',
              title: '¡Rechazada!',
              text: 'La actividad ha sido rechazada correctamente.',
              timer: 2000,
              showConfirmButton: false,
              timerProgressBar: true
            });
          },
          error: (err) => {
            console.error('Error al rechazar agenda', err);
            this.mostrarAlerta(
              'Error al rechazar',
              'No se pudo rechazar la actividad.',
              'error'
            );
          }
        });
      }
    });
  }


  editarAgenda(agenda: Agenda) {
    this.actividadSeleccionada = { ...agenda };

    // Formatear la fecha para el input type="date" (yyyy-MM-dd)
    if (this.actividadSeleccionada.fecha) {
      const d = new Date(this.actividadSeleccionada.fecha);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      this.actividadSeleccionada.fecha = `${year}-${month}-${day}` as any;
    }
  }



  guardarCambios(agenda: Agenda | null) {
    if (!agenda || !agenda._id) {
      this.mostrarAlerta('Datos inválidos', 'La agenda seleccionada no es válida.', 'warning');
      return;
    }
    // Validar que haya al menos un cambio
    if (!agenda.resultado && !agenda.fecha && !agenda.hora && !agenda.actividad && !(agenda as any).archivoEvidencia) {
      this.mostrarAlerta(
        'Sin cambios',
        'No se detectaron cambios para guardar.',
        'info'
      );
      return;
    }

    const formData = new FormData();

    // Campos permitidos para el asesor
    if (agenda.fecha) {
      formData.append('fecha', agenda.fecha as any);
    }
    if (agenda.hora) {
      formData.append('hora', agenda.hora);
    }
    if (agenda.actividad) {
      formData.append('actividad', agenda.actividad);
    }
    if (agenda.resultado) {
      formData.append('resultado', agenda.resultado);
    }

    // Evidencia (archivo)
    if ((agenda as any).archivoEvidencia) {
      const file: File = (agenda as any).archivoEvidencia;

      // Validar tamaño del archivo (ejemplo: máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.mostrarAlerta(
          'Archivo muy grande',
          'El archivo de evidencia no puede ser mayor a 5MB.',
          'warning'
        );
        return;
      }

      // Validar tipo de archivo
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!tiposPermitidos.includes(file.type)) {
        this.mostrarAlerta(
          'Tipo de archivo no permitido',
          'Solo se permiten archivos JPG, PNG, GIF o PDF.',
          'warning'
        );
        return;
      }

      formData.append('evidencia', file);
    }

    // Mostrar loading mientras se guarda
    Swal.fire({
      title: 'Guardando...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.coordinacionService
      .actualizarAgendaAsesor(agenda._id, formData)
      .subscribe({
        next: (resp) => {
          console.log('Agenda actualizada:', resp);

          // ✅ Actualizar estado local con la respuesta del servidor
          const index = this.agendas.findIndex(a => a._id === agenda._id);
          if (index !== -1 && resp.agenda) {
            this.agendas[index] = { ...resp.agenda };
            this.aplicarFiltros();
          }

          Swal.fire({
            icon: 'success',
            title: '¡Guardado!',
            text: 'Los cambios se han guardado correctamente.',
            timer: 2000,
            showConfirmButton: false,
            timerProgressBar: true
          });
        },
        error: (err) => {
          console.error('Error al guardar cambios', err);

          let mensajeError = 'No se pudieron guardar los cambios. ';

          if (err.status === 0) {
            mensajeError = 'No hay conexión a internet. Verifique su conexión.';
          } else if (err.status === 400) {
            mensajeError = 'Datos inválidos. Por favor, verifique la información ingresada.';
          } else if (err.status === 401) {
            mensajeError = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
          } else if (err.status === 403) {
            mensajeError = 'No tiene permisos para actualizar esta agenda.';
          } else if (err.status === 404) {
            mensajeError = 'La agenda no fue encontrada.';
          } else if (err.status === 413) {
            mensajeError = 'El archivo es demasiado grande. Por favor, reduzca su tamaño.';
          } else if (err.status >= 500) {
            mensajeError = 'Error del servidor. Por favor, intente más tarde.';
          }

          this.mostrarAlerta('Error al guardar', mensajeError, 'error');
        }
      });
  }

  // ===== FUNCIONES AUXILIARES =====

  cambiarPestana(pestana: string) {
    this.pestanaActiva = pestana;
  }

  getIndicatorStyle() {
    // Asumiendo que hay 2 pestañas (50% cada una)
    // Si se agregan más pestañas, esto debería actualizarse a 100/N %
    const width = '50%';
    const left = this.pestanaActiva === 'calendario' ? '0' : '50%';

    return {
      'left': left,
      'width': width
    };
  }

  filtrarPorAsesor() {
    this.aplicarFiltros();
  }

  mostrarDiv(asesor: string) {
    this.asesorSeleccionado = asesor;
    this.aplicarFiltros();
  }

  getClaseasesor(index: number): string {
    return index === 0 ? 'active' : '';
  }

  contarAgendasPorAsesor(asesor: string): number {
    return this.agendas.filter(a => a.asesor === asesor).length;
  }

  refrescarAgendas() {
    this.mostrarConfirmacion('Refrescar agendas', '¿Está seguro de recargar las agendas?')
      .then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: 'Actualizando...',
            text: 'Cargando las últimas agendas',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          this.cargarAgendas();

          setTimeout(() => {
            Swal.close();
          }, 1000);
        }
      });
  }

  filtrarAgendas() {
    this.aplicarFiltros();
  }

  limpiarFiltros() {
    this.mesSeleccionado = '';
    this.semanaSeleccionada = '';
    this.diaSeleccionado = '';
    this.codigoSeleccionado = '';
    this.estadoSeleccionado = '';
    this.busqueda = '';
    this.fechaSeleccionada = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();

    this.mostrarAlerta(
      'Filtros limpiados',
      'Todos los filtros han sido restablecidos.',
      'success'
    );
  }

  seleccionarActividad(agenda: Agenda) {
    this.actividadSeleccionada = agenda;
  }


  // ===== FUNCIONES DE REPORTES =====

  /**
   * Calcula estadísticas de las agendas
   */
  calcularEstadisticas(): void {
    const datos = this.agendasFiltradas;
    const estadisticas: EstadisticasReporte = {
      totalActividades: datos.length,
      actividadesConEvidencia: 0,
      actividadesValidadas: 0,
      actividadesPorCodigo: {},
      actividadesPorAsesor: {},
      porcentajeCompletitud: 0,
      actividadesPorMes: {},
      actividadesPorSemana: {}
    };

    datos.forEach(agenda => {
      // Contar evidencias
      if (agenda.evidencia && agenda.evidencia.trim() !== '') {
        estadisticas.actividadesConEvidencia++;
      }

      // Contar validadas
      if (agenda.validada) {
        estadisticas.actividadesValidadas++;
      }

      // Agrupar por código
      const codigo = agenda.codigo || 'Sin código';
      estadisticas.actividadesPorCodigo[codigo] =
        (estadisticas.actividadesPorCodigo[codigo] || 0) + 1;

      // Agrupar por asesor
      const asesor = agenda.asesor || 'Sin asesor';
      estadisticas.actividadesPorAsesor[asesor] =
        (estadisticas.actividadesPorAsesor[asesor] || 0) + 1;

      // Agrupar por mes
      const fecha = new Date(agenda.fecha);
      const mes = fecha.getMonth() + 1;
      const mesNombre = this.meses[mes - 1];
      estadisticas.actividadesPorMes[mesNombre] =
        (estadisticas.actividadesPorMes[mesNombre] || 0) + 1;

      // Agrupar por semana
      const semana = this.getSemanaDelAnio(fecha);
      const semanaKey = `SEMANA ${semana}`;
      estadisticas.actividadesPorSemana[semanaKey] =
        (estadisticas.actividadesPorSemana[semanaKey] || 0) + 1;
    });

    // Calcular porcentaje de completitud
    if (estadisticas.totalActividades > 0) {
      estadisticas.porcentajeCompletitud =
        Math.round((estadisticas.actividadesConEvidencia / estadisticas.totalActividades) * 100);
    }

    this.estadisticas = estadisticas;
  }

  /**
   * Genera diferentes tipos de reportes en PDF
   */
  generarReporte(): void {
    if (!this.agendasFiltradas || this.agendasFiltradas.length === 0) {
      this.mostrarAlerta(
        'Sin datos',
        'No hay actividades para generar el reporte',
        'warning'
      );
      return;
    }

    this.calcularEstadisticas();

    const tipoReporte = this.tiposReporte.find(t => t.id === this.tipoReporteSeleccionado);

    Swal.fire({
      title: 'Generando Reporte',
      html: `
      <div style="text-align: left;">
        <p><strong>Tipo de Reporte:</strong> ${tipoReporte?.nombre || 'No especificado'}</p>
        <p><strong>Actividades a incluir:</strong> ${this.agendasFiltradas.length}</p>
        <p><strong>Filtros aplicados:</strong> ${this.obtenerFiltrosAplicados() || 'Ninguno'}</p>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: 'Generar PDF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.generarPDF();
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Opcional: Aquí podrías agregar lógica post-generación
      }
    });
  }

  /**
   * Genera el PDF según el tipo de reporte seleccionado
   */
  private generarPDF(): void {
    switch (this.tipoReporteSeleccionado) {
      case 'estadisticas':
        this.generarReporteEstadisticas();
        break;
      case 'evidencias':
        this.generarReporteEvidencias();
        break;
      case 'codigos':
        this.generarReportePorCodigos();
        break;
      case 'asesores':
        this.generarReportePorAsesores();
        break;
      case 'pendientes':
        this.generarReportePendientes();
        break;
      default:
        this.generarReporteCompleto();
    }
  }

  /**
   * Reporte completo con todas las actividades
   */
  private generarReporteCompleto(): void {
    const doc = new jsPDF('landscape');
    const fechaGeneracion = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Título
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text('REPORTE COMPLETO DE AGENDA', 105, 15, { align: 'center' });

    // Información del reporte
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, 25);
    doc.text(`Total de actividades: ${this.estadisticas?.totalActividades}`, 14, 30);
    doc.text(`Filtros: ${this.obtenerFiltrosAplicados()}`, 14, 35);

    // Estadísticas rápidas
    if (this.estadisticas) {
      doc.text(`Actividades con evidencia: ${this.estadisticas.actividadesConEvidencia} (${this.estadisticas.porcentajeCompletitud}%)`, 14, 40);
      doc.text(`Actividades validadas: ${this.estadisticas.actividadesValidadas}`, 14, 45);
    }

    // Tabla de actividades
    const columnas = [
      'Fecha',
      'Hora',
      'Asesor',
      'Actividad',
      'Código',
      'Resultado',
      'Evidencia',
      'Validada'
    ];

    const filas = this.agendasFiltradas.map(a => ([
      this.formatDateUTC(a.fecha),
      a.hora || '-',
      a.asesor || 'Sin asignar',
      a.actividad?.substring(0, 30) + (a.actividad?.length > 30 ? '...' : '') || '-',
      this.obtenerDescripcionCodigo(a.codigo),
      a.resultado?.substring(0, 25) + (a.resultado?.length > 25 ? '...' : '') || 'Pendiente',
      a.evidencia ? '✅ Sí' : '❌ No',
      a.validada ? '✅' : '⏳'
    ]));

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: 55,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 50 },
        4: { cellWidth: 30 },
        5: { cellWidth: 40 },
        6: { cellWidth: 25 },
        7: { cellWidth: 20 }
      }
    });

    // Pie de página
    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Reporte generado automáticamente por el sistema de gestión de agendas', 105, finalY + 10, { align: 'center' });

    // Guardar
    this.guardarPDF(doc, 'reporte_completo_agenda');
  }

  /**
   * Reporte de estadísticas generales
   */
  private generarReporteEstadisticas(): void {
    if (!this.estadisticas) return;

    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.setTextColor(52, 152, 219);
    doc.text('ESTADÍSTICAS DE AGENDA', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Período: ${this.obtenerFiltrosAplicados()}`, 105, 30, { align: 'center' });
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 35, { align: 'center' });

    // Resumen general
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('RESUMEN GENERAL', 14, 50);

    doc.setFontSize(10);
    doc.text(`Total de actividades: ${this.estadisticas.totalActividades}`, 20, 60);
    doc.text(`Actividades con evidencia: ${this.estadisticas.actividadesConEvidencia}`, 20, 67);
    doc.text(`Actividades validadas: ${this.estadisticas.actividadesValidadas}`, 20, 74);
    doc.text(`Porcentaje de completitud: ${this.estadisticas.porcentajeCompletitud}%`, 20, 81);

    // Gráfico de progreso simple
    this.dibujarBarraProgreso(doc, this.estadisticas.porcentajeCompletitud, 120, 60);

    // Distribución por códigos
    let yPos = 90;
    doc.setFontSize(14);
    doc.text('DISTRIBUCIÓN POR CÓDIGOS', 14, yPos);
    yPos += 10;

    Object.entries(this.estadisticas.actividadesPorCodigo)
      .sort((a, b) => b[1] - a[1])
      .forEach(([codigo, cantidad], index) => {
        if (yPos < 250 && index < 8) {
          const porcentaje = Math.round((cantidad / this.estadisticas!.totalActividades) * 100);
          doc.setFontSize(10);
          doc.text(`${this.obtenerDescripcionCodigo(codigo)} (${codigo}):`, 20, yPos);
          doc.text(`${cantidad} actividades (${porcentaje}%)`, 100, yPos);
          yPos += 7;
        }
      });

    // Distribución por asesores
    yPos = yPos < 130 ? 130 : yPos + 10;
    doc.setFontSize(14);
    doc.text('DISTRIBUCIÓN POR ASESORES', 14, yPos);
    yPos += 10;

    Object.entries(this.estadisticas.actividadesPorAsesor)
      .sort((a, b) => b[1] - a[1])
      .forEach(([asesor, cantidad], index) => {
        if (yPos < 250 && index < 8) {
          const porcentaje = Math.round((cantidad / this.estadisticas!.totalActividades) * 100);
          doc.setFontSize(10);
          doc.text(`${asesor}:`, 20, yPos);
          doc.text(`${cantidad} actividades (${porcentaje}%)`, 100, yPos);
          yPos += 7;
        }
      });

    this.guardarPDF(doc, 'estadisticas_agenda');
  }

  /**
   * Reporte de actividades con evidencias
   */
  private generarReporteEvidencias(): void {
    const actividadesConEvidencia = this.agendasFiltradas.filter(a => a.evidencia && a.evidencia.trim() !== '');

    if (actividadesConEvidencia.length === 0) {
      this.mostrarAlerta(
        'Sin evidencias',
        'No hay actividades con evidencias registradas en el período seleccionado',
        'info'
      );
      return;
    }

    const doc = new jsPDF('landscape');

    // Título
    doc.setFontSize(18);
    doc.setTextColor(39, 174, 96);
    doc.text('ACTIVIDADES CON EVIDENCIAS REGISTRADAS', 140, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total: ${actividadesConEvidencia.length} actividades`, 140, 22, { align: 'center' });
    doc.text(`Período: ${this.obtenerFiltrosAplicados()}`, 140, 27, { align: 'center' });

    // Tabla detallada
    const columnas = [
      'Fecha',
      'Asesor',
      'Actividad',
      'Código',
      'Resultado',
      'Fecha Registro',
      'Evidencia'
    ];

    const filas = actividadesConEvidencia.map(a => {
      const fecha = new Date(a.fecha);
      const fechaRegistro = a.updatedAt ? new Date(a.updatedAt) : fecha;

      return [
        this.formatDateUTC(fecha),
        a.asesor || 'Sin asignar',
        a.actividad?.substring(0, 40) + (a.actividad?.length > 40 ? '...' : '') || '-',
        this.obtenerDescripcionCodigo(a.codigo),
        a.resultado?.substring(0, 35) + (a.resultado?.length > 35 ? '...' : '') || 'Sin resultado',
        this.formatDateUTC(fechaRegistro),
        '✅ Registrada'
      ];
    });

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [39, 174, 96],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [240, 255, 240] }
    });

    this.guardarPDF(doc, 'actividades_con_evidencias');
  }

  /**
   * Reporte de análisis por códigos
   */
  private generarReportePorCodigos(): void {
    if (!this.estadisticas) return;

    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.setTextColor(155, 89, 182);
    doc.text('ANÁLISIS POR CÓDIGOS DE ACTIVIDAD', 105, 20, { align: 'center' });

    let yPos = 35;
    doc.setFontSize(12);
    doc.text('Distribución de actividades por tipo de código:', 14, yPos);
    yPos += 10;

    // Tabla de códigos
    const codigosData = Object.entries(this.estadisticas.actividadesPorCodigo)
      .map(([codigo, cantidad]) => ({
        codigo,
        descripcion: this.obtenerDescripcionCodigo(codigo),
        cantidad,
        porcentaje: Math.round((cantidad / this.estadisticas!.totalActividades) * 100)
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const columnas = ['Código', 'Descripción', 'Cantidad', 'Porcentaje'];
    const filas = codigosData.map(c => [
      c.codigo,
      c.descripcion,
      c.cantidad.toString(),
      `${c.porcentaje}%`
    ]);

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: yPos,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [155, 89, 182],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 70 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 }
      }
    });

    // Análisis adicional
    const finalY = (doc as any).lastAutoTable.finalY || yPos;
    doc.setFontSize(12);
    doc.text('Análisis:', 14, finalY + 15);

    doc.setFontSize(10);
    const codigoMasFrecuente = codigosData[0];
    const codigoMenosFrecuente = codigosData[codigosData.length - 1];

    doc.text(`Código más frecuente: ${codigoMasFrecuente.descripcion} (${codigoMasFrecuente.codigo}) con ${codigoMasFrecuente.cantidad} actividades`, 20, finalY + 25);
    doc.text(`Código menos frecuente: ${codigoMenosFrecuente.descripcion} (${codigoMenosFrecuente.codigo}) con ${codigoMenosFrecuente.cantidad} actividades`, 20, finalY + 35);

    this.guardarPDF(doc, 'analisis_por_codigos');
  }

  /**
   * Reporte de actividades pendientes (sin evidencia)
   */
  private generarReportePendientes(): void {
    const actividadesPendientes = this.agendasFiltradas.filter(a =>
      !a.resultado || a.resultado.trim() === ''
    );

    if (actividadesPendientes.length === 0) {
      this.mostrarAlerta(
        'Sin pendientes',
        '¡Excelente! No hay actividades pendientes de evidencia en el período seleccionado',
        'success'
      );
      return;
    }

    const doc = new jsPDF('landscape');

    // Título
    doc.setFontSize(18);
    doc.setTextColor(231, 76, 60);
    doc.text('ACTIVIDADES PENDIENTES SIN RESULTADO REGISTRADO', 140, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total pendientes: ${actividadesPendientes.length} actividades`, 140, 22, { align: 'center' });
    doc.text(`Urgencia: ${this.calcularUrgencia(actividadesPendientes.length, this.agendasFiltradas.length)}`, 140, 27, { align: 'center' });

    // Tabla de pendientes
    const columnas = [
      'Fecha',
      'Asesor',
      'Actividad',
      'Código',
      //'Resultado Esperado',
      //'Días Pendiente',
      //'Prioridad'
    ];

    const hoy = new Date();
    const filas = actividadesPendientes.map(a => {
      const fechaActividad = new Date(a.fecha);
      //const diasPendiente = Math.floor((hoy.getTime() - fechaActividad.getTime()) / (1000 * 3600 * 24));

      return [
        this.formatDateUTC(fechaActividad),
        a.asesor || 'Sin asignar',
        a.actividad?.substring(0, 40) + (a.actividad?.length > 40 ? '...' : '') || '-',
        this.obtenerDescripcionCodigo(a.codigo),
        a.resultado || 'Por definir',
        //diasPendiente > 0 ? `${diasPendiente} días` : 'Hoy',
        //this.obtenerPrioridad(diasPendiente)
      ];
    });

    // Ordenar por prioridad (días pendiente)
    filas.sort((a, b) => {
      const diasA = parseInt(a[5]) || 0;
      const diasB = parseInt(b[5]) || 0;
      return diasB - diasA;
    });

    autoTable(doc, {
      head: [columnas],
      body: filas,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [231, 76, 60],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [255, 240, 240] },
      didDrawCell: (data) => {
        // Resaltar celdas de prioridad alta
        if (data.column.index === 6 && data.cell.raw === 'ALTA') {
          doc.setFillColor(255, 220, 220);
          doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
      }
    });

    this.guardarPDF(doc, 'actividades_pendientes');
  }

  /** 
   * Reporte por asesores
   */
  private generarReportePorAsesores(): void {
    if (!this.estadisticas) return;

    const doc = new jsPDF();

    // Título
    doc.setFontSize(20);
    doc.setTextColor(230, 126, 34);
    doc.text('REPORTE POR ASESORES', 105, 20, { align: 'center' });

    let yPos = 35;

    Object.entries(this.estadisticas.actividadesPorAsesor)
      .sort((a, b) => b[1] - a[1])
      .forEach(([asesor, totalActividades], index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Actividades del asesor
        const actividadesAsesor = this.agendasFiltradas.filter(a => a.asesor === asesor);
        const conEvidencia = actividadesAsesor.filter(a => a.evidencia && a.evidencia.trim() !== '').length;
        const validadas = actividadesAsesor.filter(a => a.validada).length;
        const porcentajeCompletitud = totalActividades > 0 ? Math.round((conEvidencia / totalActividades) * 100) : 0;

        // Encabezado del asesor
        doc.setFontSize(14);
        doc.setTextColor(52, 73, 94);
        doc.text(`ASESOR: ${asesor}`, 14, yPos);
        yPos += 8;

        // Estadísticas del asesor
        doc.setFontSize(10);
        doc.text(`Total actividades: ${totalActividades}`, 20, yPos);
        yPos += 7;
        doc.text(`Con evidencia: ${conEvidencia} (${porcentajeCompletitud}%)`, 20, yPos);
        yPos += 7;
        doc.text(`Validadas: ${validadas}`, 20, yPos);
        yPos += 7;

        // Distribución por códigos para este asesor
        const codigosAsesor: { [key: string]: number } = {};
        actividadesAsesor.forEach(a => {
          const codigo = a.codigo || 'Sin código';
          codigosAsesor[codigo] = (codigosAsesor[codigo] || 0) + 1;
        });

        if (Object.keys(codigosAsesor).length > 0) {
          doc.text('Distribución por códigos:', 20, yPos);
          yPos += 7;

          Object.entries(codigosAsesor)
            .sort((a, b) => b[1] - a[1])
            .forEach(([codigo, cantidad]) => {
              if (yPos < 280) {
                doc.text(`${this.obtenerDescripcionCodigo(codigo)}: ${cantidad}`, 30, yPos);
                yPos += 6;
              }
            });
        }

        yPos += 10; // Espacio entre asesores
      });

    this.guardarPDF(doc, 'reporte_por_asesores');
  }

  /**
   * Función auxiliar para dibujar barra de progreso
   */
  private dibujarBarraProgreso(doc: any, porcentaje: number, x: number, y: number): void {
    const anchoBarra = 50;
    const altoBarra = 8;

    // Barra de fondo
    doc.setFillColor(220, 220, 220);
    doc.roundedRect(x, y, anchoBarra, altoBarra, 2, 2, 'F');

    // Barra de progreso
    const anchoProgreso = (porcentaje / 100) * anchoBarra;
    const color = porcentaje >= 80 ? [46, 204, 113] :
      porcentaje >= 50 ? [241, 196, 15] :
        [231, 76, 60];

    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, anchoProgreso, altoBarra, 2, 2, 'F');

    // Texto del porcentaje
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`${porcentaje}%`, x + anchoBarra / 2, y + altoBarra / 2 + 2, { align: 'center' });
  }

  /**
   * Obtiene la descripción de un código
   */
  private obtenerDescripcionCodigo(codigo: string): string {
    const encontrado = this.opcionesCodigo.find(c => c.value === codigo);
    return encontrado ? `${encontrado.texto}` : codigo;
  }

  /**
   * Obtiene los filtros aplicados como texto
   */
  private obtenerFiltrosAplicados(): string {
    const filtros = [];
    if (this.mesSeleccionado) filtros.push(`Mes: ${this.mesSeleccionado}`);
    if (this.semanaSeleccionada) filtros.push(this.semanaSeleccionada);
    if (this.codigoSeleccionado) filtros.push(`Código: ${this.codigoSeleccionado}`);
    if (this.asesorSeleccionado) filtros.push(`Asesor: ${this.asesorSeleccionado}`);

    return filtros.length > 0 ? filtros.join(', ') : 'Sin filtros';
  }

  /**
   * Calcula el nivel de urgencia
   */
  private calcularUrgencia(pendientes: number, total: number): string {
    if (total === 0) return 'Sin datos';
    const porcentaje = (pendientes / total) * 100;

    if (porcentaje <= 10) return 'BAJA';
    if (porcentaje <= 30) return 'MEDIA';
    return 'ALTA';
  }

  /**
   * Determina la prioridad según días pendiente
   */
  private obtenerPrioridad(diasPendiente: number): string {
    if (diasPendiente <= 1) return 'BAJA';
    if (diasPendiente <= 3) return 'MEDIA';
    if (diasPendiente <= 7) return 'ALTA';
    return 'CRÍTICA';
  }

  /**
   * Guarda el PDF generado
   */
  private guardarPDF(doc: any, nombreBase: string): void {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nombreArchivo = `${nombreBase}_${fecha}.pdf`;

    console.log('Generando PDF:', nombreArchivo);

    try {
      doc.save(nombreArchivo);

      Swal.fire({
        icon: 'success',
        title: '¡Reporte generado!',
        text: `El archivo "${nombreArchivo}" se ha descargado correctamente`,
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error al guardar el PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al generar PDF',
        text: 'Hubo un problema técnico al intentar descargar el archivo.'
      });
    }
  }


  getNombreDia(fecha: Date | string): string {
    const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    // Asegurar que estamos usando la hora local correctamente
    return dias[fechaObj.getDay()];
  }



  // Método auxiliar para generar resumen
  generarResumenActividades() {
    const conteo: { [key: string]: number } = {};

    this.agendasFiltradas.forEach(item => {
      const actividad = item.actividad || 'Sin actividad';
      conteo[actividad] = (conteo[actividad] || 0) + 1;
    });

    const total = this.agendasFiltradas.length;

    return Object.entries(conteo)
      .map(([actividad, cantidad]) => ({
        actividad,
        cantidad,
        porcentaje: ((cantidad / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  onFileSelected(event: any, agenda: Agenda) {
    const file = event.target.files[0];
    if (file) {
      (agenda as any).archivoEvidencia = file;

      // Mostrar confirmación de archivo cargado
      this.mostrarAlerta(
        'Archivo cargado',
        `Archivo "${file.name}" listo para adjuntar.`,
        'success'
      );
    }
  }

  getUrlEvidencia(evidencia: string): string {
    return evidencia
      ? `http://localhost:4000/${evidencia}`
      : '';
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Métodos auxiliares para el diseño

  getIconForReport(tipoId: string): string {
    const icons: { [key: string]: string } = {
      'completo': 'bi-file-earmark-text',
      'estadisticas': 'bi-graph-up',
      'evidencias': 'bi-check-circle',
      'codigos': 'bi-tags',
      'asesores': 'bi-people',
      'pendientes': 'bi-clock'
    };
    return icons[tipoId] || 'bi-file-earmark-text';
  }

  getTopCodigos(data: { [key: string]: number }, limit: number): [string, number][] {
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  esImagen(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext =>
      filename.toLowerCase().endsWith(ext)
    );
  }

  /**
   * Formatea una fecha en UTC para evitar problemas de zona horaria
   * @param fecha La fecha a formatear
   * @returns String con la fecha formateada en formato local
   */
  private formatDateUTC(fecha: Date | string): string {
    const date = new Date(fecha);
    // Obtener la fecha en UTC sin conversión de zona horaria
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Retornar en formato local (dd/mm/yyyy)
    return `${day}/${month}/${year}`;
  }

  /**
   * Convierte una fecha a la zona horaria local, evitando desfaces
   * @param fecha La fecha (Date o string ISO)
   * @returns Date con la zona horaria local
   */
  private convertirFechaLocal(fecha: Date | string): Date {
    const date = typeof fecha === 'string' ? new Date(fecha) : new Date(fecha);

    // Si es una cadena ISO, extraer la fecha en la zona local
    if (typeof fecha === 'string') {
      // Extraer componentes de la cadena ISO (YYYY-MM-DDTHH:MM:SS.sssZ)
      const partes = fecha.split('T')[0].split('-');
      if (partes.length === 3) {
        const year = parseInt(partes[0], 10);
        const month = parseInt(partes[1], 10) - 1;
        const day = parseInt(partes[2], 10);
        // Crear una fecha en la zona horaria local
        return new Date(year, month, day);
      }
    }

    return date;
  }

  private formatearFechaExtendida(fecha: Date | string = new Date()): string {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    // Convertir la fecha a la zona horaria local
    const fechaLocal = this.convertirFechaLocal(fecha);

    const diaSemana = dias[fechaLocal.getDay()];
    const dia = fechaLocal.getDate();
    const mes = meses[fechaLocal.getMonth()];
    const anio = fechaLocal.getFullYear();

    return `${diaSemana} ${dia} de ${mes} ${anio}`;
  }

  // Remove unused variables: fechaFormateada and horaFormateada

  // ===== MÉTODOS DEL CALENDARIO =====

  mesAnterior() {
    const nuevaFecha = new Date(this.fechaActual);
    if (this.vistaActual === 'mes') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    } else if (this.vistaActual === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    } else {
      nuevaFecha.setDate(nuevaFecha.getDate() - 1);
    }
    this.fechaActual = nuevaFecha;
    this.actualizarInformacionCalendario();
  }

  mesSiguiente() {
    const nuevaFecha = new Date(this.fechaActual);
    if (this.vistaActual === 'mes') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    } else if (this.vistaActual === 'semana') {
      nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    } else {
      nuevaFecha.setDate(nuevaFecha.getDate() + 1);
    }
    this.fechaActual = nuevaFecha;
    this.actualizarInformacionCalendario();
  }

  hoy() {
    this.fechaActual = new Date();
    this.actualizarInformacionCalendario();
  }

  cambiarVista(vista: 'mes' | 'semana' | 'dia') {
    this.vistaActual = vista;
    this.actualizarInformacionCalendario();
  }

  actualizarInformacionCalendario() {
    this.mesActual = this.meses[this.fechaActual.getMonth()];
    this.anioActual = this.fechaActual.getFullYear();

    // Generar datos según la vista
    if (this.vistaActual === 'mes') {
      this.generarMatrizMes();
    } else if (this.vistaActual === 'semana') {
      this.generarDatosSemana();
    }

    // Calcular estadísticas para la vista actual
    this.calcularEstadisticasVista();
  }

  generarMatrizMes() {
    const año = this.fechaActual.getFullYear();
    const mes = this.fechaActual.getMonth();

    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    const diasEnMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay() || 7; // 1 (Lunes) a 7 (Domingo) - Ajustar según preferencia, aquí asumimos Dom=0 en JS

    // Nota: JS getDay() devuelve 0 para Domingo. Si queremos Lunes primero, ajustamos.
    // Asumiremos Domingo como primer día para simplificar visualización estándar, o ajustar lógica

    let semanas: CalendarDay[][] = [];
    let semana: CalendarDay[] = [];

    // Días del mes anterior para completar la primera semana
    const primerDiaSemana = primerDia.getDay() === 0 ? 6 : primerDia.getDay() - 1; // Lunes=0

    for (let i = 0; i < primerDiaSemana; i++) {
      semana.push({ numero: '', mesActual: false });
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaDia = new Date(año, mes, dia);
      const actividadesDia = this.agendaCalendario.filter(a => {
        const f = new Date(a.fecha);
        return f.getUTCDate() === dia && f.getUTCMonth() === mes && f.getUTCFullYear() === año;
      });

      semana.push({
        numero: dia,
        fecha: fechaDia,
        mesActual: true,
        hoy: this.esHoy(fechaDia),
        actividades: actividadesDia
      });

      if (semana.length === 7) {
        semanas.push(semana);
        semana = [];
      }
    }

    // Completar última semana
    if (semana.length > 0) {
      while (semana.length < 7) {
        semana.push({ numero: '', mesActual: false });
      }
      semanas.push(semana);
    }

    this.semanasDelMes = semanas;
  }

  generarDatosSemana() {
    // Implementar lógica para obtener los días de la semana actual
    // Esto es un placeholder básico
    this.diasDeLaSemana = [];
    const curr = new Date(this.fechaActual);
    const first = curr.getDate() - curr.getDay() + 1; // Lunes

    for (let i = 0; i < 7; i++) {
      const next = new Date(curr);
      next.setDate(first + i);
      this.diasDeLaSemana.push({
        nombre: this.diasSemana[i] || 'Domingo',
        fecha: next
      });
    }
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear();
  }

  seleccionarDia(dia: any) {
    if (dia.mesActual) {
      this.diaSeleccionado = dia;
    }
  }

  getColorForCodigo(codigo: string): string {
    // Mapeo básico de colores, se puede expandir
    const colores: { [key: string]: string } = {
      'R': '#3498db',   // Azul
      'RP': '#9b59b6',  // Púrpura
      'C': '#e74c3c',   // Rojo
      'VTA': '#2ecc71', // Verde
      'REC': '#f1c40f', // Amarillo
      'RER': '#e67e22', // Naranja
      'GN': '#1abc9c'   // Turquesa
    };
    return colores[codigo] || '#95a5a6'; // Gris por defecto
  }

  calcularEstadisticasVista() {
    // Recalcular completadas basado en la vista actual o total
    this.actividadesCompletadas = this.agendaCalendario.filter(a => a.evidencia).length;
  }

  getActividadesPorDia(fecha: Date): Agenda[] {
    return this.agendaCalendario.filter(a => {
      const f = new Date(a.fecha);
      const d = new Date(fecha);
      return f.getUTCDate() === d.getDate() &&
        f.getUTCMonth() === d.getMonth() &&
        f.getUTCFullYear() === d.getFullYear();
    });
  }

  getActividadesPorHora(fecha: any, hora: string): Agenda[] {
    // Simplificado: asume que la hora coincide string a string o empieza con
    // Debería parsear horas reales
    const acts = this.getActividadesPorDia(new Date(fecha));
    return acts.filter(a => a.hora && a.hora.startsWith(hora.split(':')[0]));
  }

  getPositionTop(hora: string): string {
    // Calcular posición top basada en la hora
    return '0px';
  }

  getHeight(duracion: number | undefined): string {
    // Calcular altura
    return '50px';
  }

  /**
   * Verifica si hay filtros aplicados
   */
  private hayFiltrosAplicados(): boolean {
    return !!(this.mesSeleccionado ||
      this.semanaSeleccionada ||
      this.codigoSeleccionado ||
      this.asesorSeleccionado ||
      this.busqueda ||
      this.fechaSeleccionada ||
      this.filtroFechaInicio ||
      this.filtroFechaFin ||
      this.estadoSeleccionado);
  }

  descargarAgendaPDF(): void {
    const tieneFiltros = this.hayFiltrosAplicados();

    // Si no hay filtros, mostrar confirmación
    if (!tieneFiltros) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin filtros aplicados',
        text: '¿Está seguro de descargar todas las actividades registradas? Esto puede generar un archivo muy grande.',
        showCancelButton: true,
        confirmButtonText: 'Sí, descargar todo',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      }).then((result) => {
        if (result.isConfirmed) {
          this.generarPDFAgenda(this.agendas);
        }
      });
      return;
    }

    // Si hay filtros, descargar directamente las agendas filtradas
    this.generarPDFAgenda(this.agendasFiltradas);
  }

  private generarPDFAgenda(agendas: any[]): void {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 2;
    let yPos = margin;

    // Configuración general
    doc.setFont('helvetica', 'normal');

    // Fecha de generación mejorada
    const fechaGeneracion = new Date();
    const fechaFormateada = this.formatearFechaExtendida(fechaGeneracion);
    const horaFormateada = fechaGeneracion.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // --- AGREGAR LOGO ---
    yPos = 5;
    const logoPath = 'https://static.wixstatic.com/media/0bf950_155f8cd81f6d4fe5ac3419b8e0397b40~mv2.png/v1/crop/x_0,y_260,w_6000,h_2480/fill/w_508,h_210,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/LOGO%20SIN%20FONDO%20OFICIAL.png';

    try {
      doc.addImage(logoPath, 'PNG', margin, yPos, 38, 15);
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }

    // --- DETERMINAR NOMBRE DEL ASESOR Y TÍTULO ---
    let nombreAsesor = this.usuarioActual || 'Sin datos';
    let tituloReporte = '';

    if (this.esCoordinador) {
      // Si es coordinador
      if (this.asesorSeleccionado) {
        tituloReporte = `AGENDA DE ${this.asesorSeleccionado.toUpperCase()}`;
      } else {
        tituloReporte = 'REPORTE DE AGENDAS';
      }
    } else {
      // Si es asesor
      tituloReporte = `AGENDA DE ${nombreAsesor.toUpperCase()}`;
    }

    // --- INFORMACIÓN DEL REPORTE EN TARJETA ---
    yPos = 12;

    // Título del reporte
    doc.setFontSize(14);
    doc.setTextColor(52, 58, 64);
    doc.setFont('helvetica', 'bold');
    doc.text(tituloReporte, pageWidth / 2, yPos, { align: 'center' });

    yPos += 8;

    // Información de fecha y hora
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    //doc.text(`Generado: ${fechaFormateada} a las ${horaFormateada}`, margin, yPos);

    // Mostrar filtros aplicados
    const filtrosTexto = this.obtenerFiltrosAplicados();
    doc.setFontSize(8);
    doc.text(`Filtros: ${filtrosTexto}`, margin, yPos + 5);

    yPos += 12;

    // --- TABLA DE ACTIVIDADES MEJORADA ---

    // Definir columnas dinámicamente según el rol
    let columnas: any[] = [];

    if (this.esCoordinador) {
      // Si es coordinador, incluir columna de ASESOR
      columnas = [
        { header: 'ASESOR', dataKey: 'asesor', width: 18 },
        { header: 'FECHA', dataKey: 'fecha', width: 18 },
        { header: 'HORA', dataKey: 'hora', width: 8 },
        { header: 'DOMICILIO', dataKey: 'domicilio', width: 18 },
        { header: 'CÓDIGO', dataKey: 'codigo', width: 6 },
        { header: 'ACTIVIDAD', dataKey: 'actividad', width: 82 }
      ];
    } else {
      // Si es asesor, no incluir columna de ASESOR
      columnas = [
        { header: 'FECHA', dataKey: 'fecha', width: 22 },
        { header: 'HORA', dataKey: 'hora', width: 10 },
        { header: 'DOMICILIO', dataKey: 'domicilio', width: 25 },
        { header: 'CÓDIGO', dataKey: 'codigo', width: 8 },
        { header: 'ACTIVIDAD', dataKey: 'actividad', width: 105 }
      ];
    }

    // Ordenar las agendas de menor a mayor (cronológicamente)
    // Se realiza antes del mapeo para usar los valores originales de fecha y hora
    const agendasOrdenadas = [...agendas].sort((a: any, b: any) => {
      // 1. Si es coordinador, agrupar por asesor primero
      if (this.esCoordinador) {
        const asesorA = (a.asesor || 'Sin asignar').toLowerCase();
        const asesorB = (b.asesor || 'Sin asignar').toLowerCase();
        if (asesorA !== asesorB) {
          return asesorA.localeCompare(asesorB);
        }
      }

      // 2. Ordenar por fecha cronológicamente (menor a mayor)
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      if (fechaA !== fechaB) {
        return fechaA - fechaB;
      }

      // 3. Ordenar por hora (menor a mayor)
      const horaA = a.hora || '00:00';
      const horaB = b.hora || '00:00';
      return horaA.localeCompare(horaB);
    });

    let filas = agendasOrdenadas.map((a: any) => ({
      asesor: a.asesor || 'Sin asignar',
      fecha: this.formatearFechaExtendida(a.fecha),
      hora: a.hora || '--:--',
      domicilio: this.truncarTexto(a.domicilio, 30),
      codigo: this.obtenerDescripcionCodigo(a.codigo),
      actividad: this.truncarTexto(a.actividad, 40),
    }));

    // --- ASIGNAR COLORES POR DÍA ---
    const coloresPorDia = [
      [227, 242, 253],   // Azul claro
      [255, 250, 190],   // Amarillo claro
      [220, 237, 200],   // Verde claro
      [248, 187, 208],   // Rosa claro
      [225, 190, 231]    // Púrpura claro
    ];

    let lastFecha = '';
    let colorIndex = 0;

    filas = filas.map((fila) => {
      if (fila.fecha !== lastFecha) {
        lastFecha = fila.fecha;
        colorIndex = (colorIndex + 1) % coloresPorDia.length;
      }
      return {
        ...fila,
        colorFondo: coloresPorDia[colorIndex]
      };
    });

    console.log('Total de filas a generar:', filas.length);
    console.log('Agendas recibidas:', agendas.length);

    autoTable(doc, {
      columns: columnas,
      body: filas,
      startY: yPos,
      margin: { left: margin, right: margin, top: margin, bottom: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        font: 'helvetica',
        textColor: [60, 60, 60],
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center',
        cellPadding: 4
      },
      bodyStyles: {
        fillColor: [255, 255, 255]
      },
      willDrawCell: (data) => {
        // Aplicar color de fondo según el día
        if (data.cell.section === 'body' && data.row.raw && (data.row.raw as any).colorFondo) {
          data.cell.styles.fillColor = (data.row.raw as any).colorFondo;
        }
      },
      columnStyles: {
        fecha: { halign: 'center' },
        hora: { halign: 'center' }
      },
      theme: 'grid',
      pageBreak: 'auto',
      didDrawPage: (data) => {
        // Log para debugging
        const pageCount = (doc as any).internal.getNumberOfPages();
        console.log('Página generada:', pageCount);
      }
    });

    // Verificar cuántas filas se incluyeron realmente
    const tableHeight = (doc as any).lastAutoTable?.finalY || 0;
    console.log('Última posición Y de la tabla:', tableHeight);
    console.log('Páginas totales en PDF:', (doc as any).internal.getNumberOfPages());



    // --- GUARDAR CON NOMBRE MÁS DESCRIPTIVO ---
    let nombreBase = '';

    if (this.esCoordinador) {
      // Si es coordinador y hay asesor seleccionado
      if (this.asesorSeleccionado) {
        nombreBase = `agenda_${this.asesorSeleccionado.replace(/\s+/g, '_')}`;
      } else {
        nombreBase = 'agendas_coordinador';
      }
    } else {
      // Si es asesor, usa su nombre
      nombreBase = `agenda_${nombreAsesor.replace(/\s+/g, '_')}`;
    }

    this.guardarPDF(doc, nombreBase);
  }

  // Métodos auxiliares para mejorar el código
  truncarTexto(texto: string, maxLength: number): string {
    if (!texto) return '-';
    return texto.length > maxLength ? texto.substring(0, maxLength - 3) + '...' : texto;
  }

  obtenerEstadoResultado(resultado: string): string {
    if (!resultado) return '⏳ Pendiente';
    if (resultado.length > 20) return resultado.substring(0, 20) + '...';

    // Colores según resultado
    const resultadoLower = resultado.toLowerCase();
    if (resultadoLower.includes('complet') || resultadoLower.includes('éxito')) {
      return `🟢 ${resultado}`;
    } else if (resultadoLower.includes('pendiente') || resultadoLower.includes('espera')) {
      return `🟡 ${resultado}`;
    } else if (resultadoLower.includes('cancel') || resultadoLower.includes('fallo')) {
      return `🔴 ${resultado}`;
    }
    return resultado;
  }

  obtenerIconoValidacion(validada: boolean): string {
    if (validada) return '✅';
    return '⏳';
  }



  exportarCalendario() {
    this.descargarAgendaPDF();
  }

  imprimirCalendario() {
    window.print();
  }

  agregarEvidencia(actividad: Agenda) {
    // Lógica para abrir modal de evidencia o input file
    // Podrías necesitar un ElementRef al input hidden si existe
    this.mostrarAlerta('Funcionalidad', 'Utilice el botón de cámara en la lista detallada', 'info');
  }

}