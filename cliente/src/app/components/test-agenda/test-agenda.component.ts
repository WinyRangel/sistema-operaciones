import { Component } from '@angular/core';

interface Agenda {
  fecha: Date;
  hora: string;
  domicilio: string;
  actividad: string;
  codigo: string;
  resultado?: string;
  asesor: string;
}

@Component({
  selector: 'app-test-agenda',
  standalone: false,
  templateUrl: './test-agenda.component.html',
  styleUrl: './test-agenda.component.css'
})
export class TestAgendaComponent {

  // ===== asesorES =====
  coordinacionesVisibles = [
    { asesor: 'asesor A' },
    { asesor: 'asesor B' },
    { asesor: 'asesor C' }
  ];

  asesorVisible: string = 'asesor A';

  // ===== FILTROS =====
  meses: string[] = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  semanas: string[] = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
  diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  opcionesCodigo = [
    { value: 'A1', texto: 'A1' },
    { value: 'B2', texto: 'B2' },
    { value: 'C3', texto: 'C3' }
  ];

  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';
  codigoSeleccionado: string = '';

  // ===== AGENDAS =====
  agendas: Agenda[] = [
    {
      fecha: new Date(),
      hora: '09:00',
      domicilio: 'Col. Centro',
      actividad: 'Visita domiciliaria',
      codigo: 'A1',
      resultado: '',
      asesor: 'asesor A'
    },
    {
      fecha: new Date(),
      hora: '11:00',
      domicilio: 'Col. Norte',
      actividad: 'Seguimiento',
      codigo: 'B2',
      resultado: '',
      asesor: 'asesor B'
    }
  ];

  agendasFiltradasPorasesor: Agenda[] = [];

  actividadSeleccionada: Agenda | null = null;

  constructor() {
    this.aplicarFiltros();
  }

  // ===== UI =====
  mostrarDiv(asesor: string) {
    this.asesorVisible = asesor;
    this.aplicarFiltros();
  }

  getClaseasesor(index: number): string {
    return index === 0 ? 'active' : '';
  }

  refrescarAgendas() {
    console.log('Refrescando agendas...');
    this.aplicarFiltros();
  }

  // ===== FILTROS =====
  aplicarFiltros() {
    this.agendasFiltradasPorasesor = this.agendas.filter(a =>
      a.asesor === this.asesorVisible &&
      (!this.codigoSeleccionado || a.codigo === this.codigoSeleccionado)
    );
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
  }

  // ===== ACCIONES =====
  guardarCambios(agenda: Agenda) {
    console.log('Agenda guardada:', agenda);
    alert('Cambios guardados correctamente');
  }

  descargarAgendaPDF() {
    console.log('Descargando PDF...');
    alert('Función de descarga PDF pendiente');
  }
}
