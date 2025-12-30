import { Component, OnInit } from '@angular/core';
import { Coordinacion } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormBuilder } from '@angular/forms';
import { Agenda } from '../../../models/agenda';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



const SEMANAS_ANIO = 53;
@Component({
  selector: 'app-mi-agenda',
  standalone: false,
  templateUrl: './mi-agenda.component.html',
  styleUrl: './mi-agenda.component.css'
})
export class MiAgendaComponent {
  agendasFiltradasPorCoordinador: any[] = [];
  //Variables para agenda
  coordinaciones: Coordinacion[] = [];
  agendas: any[] = []; // Lista completa de agendas
  //
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = ''; // por defecto
  coordinadorSeleccionado: string = '';
  semanas: string[] = [];

  usuarioLogueado: string = '';
  rolUsuario: string = '';

  meses: string[] = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];


  actividadSeleccionada: any = null;

  //variables para filtrar por mes, dia y año
  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';

  codigoSeleccionado: string = '';
  codigoReportadoSeleccionado: string = '';
  estadoSeleccionado: string = '';



  constructor(
    private fb: FormBuilder,
    private _coordinacionService: CoordinacionService) {
    this.generateWeeks();
  }

  fixUTCDateToLocal(dateStr: string): Date {
    const date = new Date(dateStr);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  ngOnInit(): void {
    this.usuarioLogueado = localStorage.getItem('usuario') || '';
    this.rolUsuario = localStorage.getItem('rol') || '';

    this.loadCoordinaciones();
    this.loadAgendas();
  }

  get coordinacionesVisibles(): Coordinacion[] {
  if (this.rolUsuario === 'coordinador') {
    return this.coordinaciones.filter(c => c.coordinador === this.usuarioLogueado);
  }
  return this.coordinaciones;
}

getClaseCoordinador(i: number): any {
  return { ['coordinador-' + i]: true };
}


  editarActividad(agenda: any) {
    this.actividadSeleccionada = {
      domicilio: { nombre: '' },
      ...agenda,
    };
  }


  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO },
      (_, i) => `SEMANA ${i + 1}`);
  }

  // Cargar datos iniciales
  private loadCoordinaciones(): void {
    this._coordinacionService.obtenerCoordinacion().subscribe(data => {
      this.coordinaciones = data;
    });
  }

  private loadAgendas(): void {
    this._coordinacionService.obtenerMiAgenda(1, 315).subscribe({
      next: response => {
        this.agendas = response.agendas.map((agenda: { fecha: string }) => ({
          ...agenda,
          fecha: this.fixUTCDateToLocal(agenda.fecha)
        }));
        this.filtrarAgendas();
      },
      error: err => {
        console.error('Error al cargar agendas:', err);
      }
    });
  }


    mostrarDiv(nombre: string): void {
      this.coordinadorVisible = nombre;
      this.filtrarAgendas(); // Filtro inmediato al cambiar de coordinador
    }



  // Operaciones CRUD
  eliminarRegistro(id: string): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción no puede ser revertida",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar"
    }).then((result) => {
      if (result.isConfirmed) {
        this._coordinacionService.eliminarAgenda(id).subscribe({
          next: () => {
            this.showToast('success', 'Agenda eliminada correctamente');
            this.loadAgendas();
          },
          error: (error) => {
            console.error('Error al eliminar agenda:', error);
            this.showToast('error', 'Error al eliminar la agenda');
          }
        });
      }
    });
  }


    refrescarAgendas(): void {
      this._coordinacionService.obtenerMiAgenda().subscribe(data => {
        this.agendas = data.map((agenda: { fecha: string }) => ({
          ...agenda,
          fecha: this.fixUTCDateToLocal(agenda.fecha)
        }));
        this.filtrarAgendas(); // Aplicar filtros después de cargar
      });
    }

    filtrarAgendas(): void {
      this.agendasFiltradasPorCoordinador = this.agendas.filter(agenda => {
        if (!agenda.coordinador) return false;

        const fechaObj = new Date(agenda.fecha);
        if (isNaN(fechaObj.getTime())) return false;

        const mesNombre = fechaObj.toLocaleString('es-MX', { month: 'long' });
        const diaNombre = fechaObj.toLocaleString('es-MX', { weekday: 'long' });
        const semanaTrimmed = agenda.semana?.trim() || '';

        const cumpleCoordinador = this.rolUsuario === 'coordinador'
          ? agenda.coordinador.toLowerCase() === this.usuarioLogueado.toLowerCase()
          : this.coordinadorVisible
            ? agenda.coordinador.toLowerCase() === this.coordinadorVisible.toLowerCase()
            : true;


        const cumpleMes = this.mesSeleccionado
          ? mesNombre.toLowerCase() === this.mesSeleccionado.toLowerCase()
          : true;

        const cumpleSemana = this.semanaSeleccionada
          ? semanaTrimmed === this.semanaSeleccionada
          : true;

        const cumpleDia = this.diaSeleccionado
          ? diaNombre.toLowerCase() === this.diaSeleccionado.toLowerCase()
          : true;

        const cumpleCodigo = this.codigoSeleccionado
          ? agenda.codigo === this.codigoSeleccionado
          : true;

        const cumpleCodigoReportado = this.codigoReportadoSeleccionado
          ? agenda.codigoReportado === this.codigoReportadoSeleccionado
          : true;

        const cumpleEstado = this.estadoSeleccionado
          ? (this.estadoSeleccionado === 'reportado' ? agenda.reportado === true : agenda.reportado === false)
          : true;

        return cumpleCoordinador &&
          cumpleMes &&
          cumpleSemana &&
          cumpleDia &&
          cumpleCodigo &&
          cumpleCodigoReportado &&
          cumpleEstado;
      });
    }

  aplicarFiltros(): void {
  }

  // Método para limpiar filtros
  limpiarFiltros(): void {
    this.mesSeleccionado = '';
    this.semanaSeleccionada = '';
    this.diaSeleccionado = '';
    this.codigoSeleccionado = '';
    this.codigoReportadoSeleccionado = '';
    this.estadoSeleccionado = '';
    this.aplicarFiltros();
  }


  guardarCambios(agenda: Agenda): void {
    if (!agenda._id) return;

    this._coordinacionService.actualizarAgenda(agenda._id, {
      domicilio: agenda.domicilio,
      actividad: agenda.actividad,
      hora: agenda.hora,
      codigo: agenda.codigo,
      codigoReportado: agenda.codigoReportado,
      actividadReportada: agenda.actividadReportada,
      reportado: agenda.reportado,
      horaReporte: agenda.horaReporte,
      horaCierre: agenda.horaCierre,
      acordeObjetivo: agenda.acordeObjetivo,
      kmRecorrido: agenda.kmRecorrido,
      resultado: agenda.resultado

    }).subscribe({
      next: () => this.showToast('success', 'Cambios guardados correctamente'),
      error: (error) => {
        console.error('Error al actualizar agenda:', error);
        this.showToast('error', 'Error al guardar cambios');
      }
    });
  }

  opcionesCodigo = [
    { value: 'AG', texto: 'AG | Aseo General' },
    { value: 'GA', texto: 'GA | Gestión Administrativa' },
    { value: 'C', texto: 'C | Cobranza' },
    { value: 'D', texto: 'D | Domiciliar' },
    { value: 'Dep', texto: 'Dep | Depósitar' },
    { value: 'E', texto: 'E | Entregas' },
    { value: 'GN', texto: 'GN | Grupo Nuevo' },
    { value: 'INT', texto: 'INT | Integración' },
    { value: 'R', texto: 'R | Pago' },
    { value: 'R/A', texto: 'R/A | Realizando Agendas' },
    { value: 'RM', texto: 'R/M | Reunión Mensual' },
    { value: 'RS', texto: 'RS | Reunión Semanal' },
    { value: 'VTA', texto: 'VTA | Promoción' },
    { value: 'Sup', texto: 'Sup | Supervisión' },
    { value: 'S/Renov', texto: 'S/Renov | Seg.Renovación' },
    { value: 'Sin Codigo', texto: 'Sin Codigo' },
    { value: '', texto: '' }
  ];

descargarAgendaPDF(): void {
  const doc = new jsPDF();

  // === Encabezado dinámico ===
  const titulo = "Agenda de Actividades";
  const coordinador = this.coordinadorVisible || this.usuarioLogueado || "Todos";
  const semana = this.semanaSeleccionada || "Todas";
  const fechaGeneracion = new Date().toLocaleDateString('es-MX');

  doc.setFontSize(18);
  doc.text(titulo, 14, 20);

  doc.setFontSize(11);
  doc.text(`Coordinador: ${coordinador}`, 14, 30);
  doc.text(`Semana: ${semana}`, 14, 36);
  doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, 42);

  // === Definir columnas (cabeceras de la tabla) ===
  const columnas = [
    { header: 'Fecha', dataKey: 'fecha' },
    { header: 'Domicilio', dataKey: 'domicilio' },
    { header: 'Actividad', dataKey: 'actividad' },
    { header: 'Código', dataKey: 'codigo' },
  ];

  // === Mapear datos filtrados ===
const filas: Record<string, any>[] = this.agendasFiltradasPorCoordinador.map(agenda => ({
  fecha: new Date(agenda.fecha).toLocaleDateString('es-MX'),
  domicilio: agenda.domicilio,
  actividad: agenda.actividad,
  codigo: agenda.codigo
}));

  // === Generar tabla con estilo ===
  autoTable(doc, {
    startY: 50,
    head: [columnas.map(col => col.header)], // Encabezados visibles
    body: filas.map(fila => columnas.map(col => fila[col.dataKey])),
    theme: 'grid', // 'striped', 'grid', 'plain'
    headStyles: {
      fillColor: [200, 0, 0], // rojo PDF
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240] // gris claro
    },
    styles: {
      halign: 'left',
      valign: 'middle'
    },
    margin: { top: 50 }
  });

  // === Pie de página ===
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() - 40,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // === Descargar con nombre dinámico ===
  doc.save(`agenda_${coordinador}_semana_${semana}.pdf`);
}


  
  // Helper para notificaciones
  private showToast(icon: 'success' | 'error', title: string): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    Toast.fire({ icon, title });
  }
}
