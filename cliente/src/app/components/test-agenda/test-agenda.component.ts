import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CoordinacionService } from '../../services/coordinacion.service';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';


const SEMANAS_ANIO = 53;

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
@Component({
  selector: 'app-test-agenda',
  standalone: false,
  templateUrl: './test-agenda.component.html',
  styleUrl: './test-agenda.component.css'
})
export class TestAgendaComponent {
  agendas: any[] = [];
  agendasFiltradas: any[] = [];
  estaLogueado: boolean = true;
  private authSubscription!: Subscription;
  rolUsuario = '';
  esCoordinador = false;
  estadisticas: EstadisticasReporte | null = null;


  // ===== OPCIONES DE REPORTE =====
  tiposReporte = [
    { id: 'completo', nombre: 'Reporte Completo' },
    { id: 'estadisticas', nombre: 'Estadísticas Generales' },
    { id: 'evidencias', nombre: 'Actividades con Evidencias' },
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
    { value: 'R', texto: 'R', descripcion: 'Pago' },
    { value: 'RP', texto: 'R/P', descripcion: 'Pago / Levantamiento de papeleria' },
    { value: 'C', texto: 'C', descripcion: 'Cobranza' },
    { value: 'VTA', texto: 'VTA', descripcion: 'Promoción' },
    { value: 'REC', texto: 'R/EC', descripcion: 'Pago / Entrega / Cambio ciclo' },
    { value: 'RER', texto: 'R/ER', descripcion: 'Pago / Entrega / Refill' },
    { value: 'GN', texto: 'GN', descripcion: 'Grupo nuevo' },

  ];

  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';
  codigoSeleccionado: string = '';
  usuarioActual: any;
  asesores: any;
  asesorSeleccionado: any;
  actividadSeleccionada: Agenda | null = null;


  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO },
      (_, i) => `SEMANA ${i + 1}`);
  }
  constructor(private authService: AuthService, private coordinacionService: CoordinacionService) {
    this.aplicarFiltros();
    this.generateWeeks();
  }

  getSemanaDelAnio(fecha: Date): number {
    const date = new Date(fecha);
    date.setHours(0, 0, 0, 0);

    // Jueves en la semana actual decide el año
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));

    const week1 = new Date(date.getFullYear(), 0, 4);

    return (
      1 +
      Math.round(
        ((date.getTime() - week1.getTime()) / 86400000
          - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    );
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
        this.agendas = resp.agendas;
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
      const semanaIndex =
        parseInt(this.semanaSeleccionada.replace('SEMANA ', ''), 10);

      filtradas = filtradas.filter(a => {
        const semana = this.getSemanaDelAnio(new Date(a.fecha));
        return semana === semanaIndex;
      });
    }


    // Filtro por mes
    if (this.mesSeleccionado) {
      const mesIndex = this.meses.indexOf(this.mesSeleccionado) + 1;
      filtradas = filtradas.filter(a => {
        const fecha = new Date(a.fecha);
        return fecha.getMonth() + 1 === mesIndex;
      });
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

  guardarCambios(agenda: Agenda) {
    if (!agenda || !agenda._id) {
      this.mostrarAlerta('Datos inválidos', 'La agenda seleccionada no es válida.', 'warning');
      return;
    }

    // Validar que haya al menos un cambio
    if (!agenda.resultado && !(agenda as any).archivoEvidencia) {
      this.mostrarAlerta(
        'Sin cambios',
        'No se detectaron cambios para guardar.',
        'info'
      );
      return;
    }

    const formData = new FormData();

    // Campos permitidos para el asesor
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

    Swal.fire({
      title: 'Generando Reporte',
      html: `
        <div style="text-align: left;">
          <p><strong>Tipo de Reporte:</strong> ${this.tiposReporte.find(t => t.id === this.tipoReporteSeleccionado)?.nombre}</p>
          <p><strong>Actividades a incluir:</strong> ${this.agendasFiltradas.length}</p>
          <p><strong>Filtros aplicados:</strong> ${this.obtenerFiltrosAplicados()}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Generar PDF',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      didOpen: () => {
        Swal.showLoading();
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.generarPDF();
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
      new Date(a.fecha).toLocaleDateString(),
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
        fecha.toLocaleDateString(),
        a.asesor || 'Sin asignar',
        a.actividad?.substring(0, 40) + (a.actividad?.length > 40 ? '...' : '') || '-',
        this.obtenerDescripcionCodigo(a.codigo),
        a.resultado?.substring(0, 35) + (a.resultado?.length > 35 ? '...' : '') || 'Sin resultado',
        fechaRegistro.toLocaleDateString(),
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
      !a.evidencia || a.evidencia.trim() === ''
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
    doc.text('ACTIVIDADES PENDIENTES DE EVIDENCIA', 140, 15, { align: 'center' });

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
      'Resultado Esperado',
      'Días Pendiente',
      'Prioridad'
    ];

    const hoy = new Date();
    const filas = actividadesPendientes.map(a => {
      const fechaActividad = new Date(a.fecha);
      const diasPendiente = Math.floor((hoy.getTime() - fechaActividad.getTime()) / (1000 * 3600 * 24));

      return [
        fechaActividad.toLocaleDateString(),
        a.asesor || 'Sin asignar',
        a.actividad?.substring(0, 40) + (a.actividad?.length > 40 ? '...' : '') || '-',
        this.obtenerDescripcionCodigo(a.codigo),
        a.resultado || 'Por definir',
        diasPendiente > 0 ? `${diasPendiente} días` : 'Hoy',
        this.obtenerPrioridad(diasPendiente)
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
  private dibujarBarraProgreso(doc: jsPDF, porcentaje: number, x: number, y: number): void {
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
    return encontrado ? `${encontrado.texto} - ${encontrado.descripcion}` : codigo;
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
  private guardarPDF(doc: jsPDF, nombreBase: string): void {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nombreArchivo = `${nombreBase}_${fecha}.pdf`;

    doc.save(nombreArchivo);

    Swal.fire({
      icon: 'success',
      title: '¡Reporte generado!',
      text: `El archivo "${nombreArchivo}" se ha descargado correctamente`,
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  descargarAgendaPDF() {
    if (!this.agendasFiltradas || this.agendasFiltradas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'No hay actividades para exportar'
      });
      return;
    }

    Swal.fire({
      title: 'Generando PDF',
      text: 'Preparando el archivo...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    setTimeout(() => {
      const doc = new jsPDF('landscape');

      // ===== TÍTULO =====
      doc.setFontSize(16);
      doc.text('Reporte de Agenda de Asesor', 14, 15);

      // ===== SUBTÍTULO =====
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 22);

      if (this.asesorSeleccionado) {
        doc.text(`Asesor: ${this.asesorSeleccionado}`, 14, 28);
      }

      // ===== TABLA =====
      const columnas = [
        'Fecha',
        'Hora',
        'Asesor',
        'Actividad',
        'Código',
        'Resultado',
        'Validada'
      ];

      const filas = this.agendasFiltradas.map(a => ([
        new Date(a.fecha).toLocaleDateString(),
        a.hora || '',
        a.asesor || '',
        a.actividad || '',
        a.codigo || '',
        a.resultado || '',
        a.validada ? 'Sí' : 'No'
      ]));

      autoTable(doc, {
        head: [columnas],
        body: filas,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // ===== GUARDAR =====
      doc.save(`agenda_${new Date().toISOString().slice(0, 10)}.pdf`);

      Swal.fire({
        icon: 'success',
        title: '¡PDF descargado!',
        text: 'El archivo se descargó correctamente',
        timer: 2000,
        showConfirmButton: false
      });

    }, 800);
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
}