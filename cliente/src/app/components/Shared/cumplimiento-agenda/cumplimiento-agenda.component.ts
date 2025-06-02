import { Component, OnInit } from '@angular/core';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Agenda } from '../../../models/agenda';

// Interfaz para filas de la tabla
interface FilaCumplimiento {
  semana: string;
  codigos: string[];
  agendados: number;
  reportados: number;
  porcentaje: number;
}

interface DetalleActividad {
  actividadAgendada: string;
  codigo: string;
  actividadReportada: string;
  cumplida: boolean;
  motivo?: string;
}

@Component({
  selector: 'app-cumplimiento-agenda',
  standalone: false,
  templateUrl: './cumplimiento-agenda.component.html',
  styleUrls: ['./cumplimiento-agenda.component.css']
})
export class CumplimientoAgendaComponent implements OnInit {
  agendas: Agenda[] = [];
  coordinadores: string[] = [];
  semanas: string[] = [];
  detalleActividades: DetalleActividad[] = [];

  coordinadorSeleccionado = '';
  semanaSeleccionada = '';
  objetivo = '';

  dataTabla: FilaCumplimiento[] = [];

  // Mapeo de palabra clave a códigos
  codigoClave: Record<string, string[]> = {
    'Mora': ['C', 'Seg'],
    'Supervisión': ['Sup'],
    'Fichas': ['CF', 'R'],
    'Ficha': ['CF', 'R'],
    'Cierre': ['CF', 'R'],
    'Grupo': ['GN', 'VTA'],
    'Nuevo': ['GN', 'VTA'],
  };



  // Mapeo de códigos a palabras clave esperadas
  validacionCodigos: Record<string, string[]> = {
    'C': ['cobranza', 'cobranzas', 'precobranza'],
    'Seg': ['seguimiento mora'],
    'Sup': ['supervisión', 'supervisando', 'supervisar'],
    'R': ['ficha cerrada', 'cierre fichas'],
    'CF': ['ficha cerrada', 'cierre fichas'],
    'GN': ['grupo nuevo', 'cliente nuevo'],
    'VTA': ['grupo nuevo', 'cliente nuevo'],
  };


  constructor(private servicio: CoordinacionService) { }

  ngOnInit(): void {
    this.generarSemanas();
    this.servicio.obtenerAgendas().subscribe((datos) => {
      this.agendas = datos;
      this.coordinadores = Array.from(new Set(this.agendas.map(a => a.coordinador)));
      this.actualizarTotales();
    });
  }

  generarSemanas(): void {
    for (let i = 1; i <= 52; i++) {
      this.semanas.push(`SEMANA ${i}`);
    }
  }

  seleccionarCoordinador(nombre: string): void {
    this.coordinadorSeleccionado = nombre;
    this.buscarObjetivo();
    this.actualizarTotales();
    this.actualizarDetalleActividades();
  }

  seleccionarSemana(semana: string): void {
    this.semanaSeleccionada = semana;
    this.buscarObjetivo();
    this.actualizarDetalleActividades();
  }

  // Normaliza un texto: minúsculas, sin acentos ni caracteres especiales
  normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Valida si la actividad reportada contiene alguna palabra clave del código.
   */
  validarActividadPorCodigo(codigo: string | undefined, actividadReportada: string | undefined): boolean {
    if (!codigo || !actividadReportada) {
      return false;
    }
    const claves = this.validacionCodigos[codigo.toUpperCase()] || [];
    if (claves.length === 0) {
      return false;
    }
    const actNorm = this.normalizarTexto(actividadReportada);
    return claves.some(clave => actNorm.includes(this.normalizarTexto(clave)));
  }

  obtenerMotivoNoCumplimiento(codigo: string | undefined, actividadReportada: string | undefined): string {
    if (!actividadReportada) {
      return 'Actividad no reportada';
    }
    return 'Actividad no relacionada con el código';
  }

  actualizarDetalleActividades(): void {
    this.detalleActividades = [];
    if (!this.coordinadorSeleccionado || !this.semanaSeleccionada) {
      return;
    }

    const agendaSem = this.agendas.find(a =>
      a.coordinador === this.coordinadorSeleccionado && a.semana === this.semanaSeleccionada
    );
    if (!agendaSem) return;

    const clavesDetectadas = this.detectarPalabrasClave(agendaSem.objetivo);
    const codigos = Array.from(new Set(clavesDetectadas.flatMap(c => c.codigos)));

    this.agendas
      .filter(a =>
        a.coordinador === this.coordinadorSeleccionado &&
        a.semana === this.semanaSeleccionada &&
        codigos.includes(a.codigo || '')
      )
      .forEach(a => {
        const cumplida = this.validarActividadPorCodigo(a.codigo, a.actividadReportada);
        this.detalleActividades.push({
          actividadAgendada: a.actividad || 'Sin actividad',
          codigo: a.codigo || '',
          actividadReportada: a.actividadReportada || 'No reportada',
          cumplida,
          motivo: cumplida ? '' : this.obtenerMotivoNoCumplimiento(a.codigo, a.actividadReportada)
        });
      });
  }

  // buscarObjetivo(): void {
  //   const ag = this.agendas.find(a =>
  //     a.coordinador === this.coordinadorSeleccionado && a.semana === this.semanaSeleccionada
  //   );
  //   this.objetivo = ag?.objetivo || '';
  // }

  objetivoCantidad = 0;
cantidadReportada = 0;
cantidadRestante = 0;

buscarObjetivo(): void {
  const ag = this.agendas.find(a =>
    a.coordinador === this.coordinadorSeleccionado && a.semana === this.semanaSeleccionada
  );

  this.objetivo = ag?.objetivo || '';

  const clavesDetectadas = this.detectarPalabrasClave(this.objetivo);
  const codigos = Array.from(new Set(clavesDetectadas.flatMap(c => c.codigos)));

  this.objetivoCantidad = this.extraerNumeroDeTexto(this.objetivo);
  this.cantidadReportada = this.sumarReportadoRelacionado(codigos, this.semanaSeleccionada);
  this.cantidadRestante = this.objetivoCantidad - this.cantidadReportada;
}

  detectarPalabrasClave(objetivo?: string): { clave: string; codigos: string[] }[] {
    if (!objetivo) return [];

    const objNorm = this.normalizarTexto(objetivo);
    const coincidencias: { clave: string; codigos: string[] }[] = [];

    for (const palabra in this.codigoClave) {
      if (objNorm.includes(this.normalizarTexto(palabra))) {
        coincidencias.push({ clave: palabra, codigos: this.codigoClave[palabra] });
      }
    }

    return coincidencias;
  }


  actualizarTotales(): void {
    this.dataTabla = [];
    if (!this.coordinadorSeleccionado) return;

    this.semanas.forEach(semana => {
      const agSem = this.agendas.find(a => a.coordinador === this.coordinadorSeleccionado && a.semana === semana);
      const clavesDetectadas = agSem ? this.detectarPalabrasClave(agSem.objetivo) : [];
      const listaCod = Array.from(new Set(clavesDetectadas.flatMap(c => c.codigos)));

      const items = this.agendas.filter(a =>
        a.coordinador === this.coordinadorSeleccionado && a.semana === semana && listaCod.includes(a.codigo || '')
      );

      const totalAg = items.length;
      const totalRp = items.filter(a => this.validarActividadPorCodigo(a.codigo, a.actividadReportada)).length;
      const porcentaje = totalAg === 0 ? 0 : Math.round((totalRp / totalAg) * 100);

      this.dataTabla.push({ semana, codigos: listaCod, agendados: totalAg, reportados: totalRp, porcentaje });
    });
  }

  calcularPorcentaje(semana: string): number {
    const fila = this.dataTabla.find(f => f.semana === semana);
    return fila ? fila.porcentaje : 0;
  }

  //Identificar si hay mora en cantidad para ver cuando reducio
  extraerNumeroDeTexto(texto: string): number {
    const match = texto.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  sumarReportadoRelacionado(codigos: string[], semana: string): number {
  let total = 0;

  this.agendas.forEach(a => {
    if (
      a.coordinador === this.coordinadorSeleccionado &&
      a.semana === semana &&
      codigos.includes(a.codigo || '')
    ) {
      const match = a.actividadReportada?.match(/\d+/);
      if (match) {
        total += parseInt(match[0], 10);
      }
    }
  });

  return total;
}



}
