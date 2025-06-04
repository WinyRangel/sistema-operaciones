// src/app/components/cumplimiento-agenda/cumplimiento-agenda.component.ts

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

  // Nueva bandera para indicar si existe alguna actividad reportada que coincida
  existeCoincidenciaEnReportadas: boolean = false;

  // Mapeo de palabra clave a códigos
  codigoClave: Record<string, string[]> = {
    'Mora': ['C', 'Seg'],
    'Supervisión': ['Sup'],
    'Fichas': ['CF', 'R'],
    'Ficha': ['CF', 'R'],
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

  // 1) Definimos un set de stop words en español (artículos, preposiciones, conjunciones, pronombres básicos)
  private stopWords: Set<string> = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'de', 'del', 'al', 'a', 'en', 'y', 'o', 'u', 'e', 'que',
    'con', 'sin', 'por', 'para', 'se', 'su', 'sus', 'lo',
    'le', 'les', 'mi', 'mis', 'tu', 'tus', 'su', 'sus'
  ]);

  objetivoCantidad = 0;
  cantidadReportada = 0;
  cantidadRestante = 0;

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

  // --------------------------------------------------
  // 2) Función de normalización: minúsculas, sin acentos, sin caracteres especiales
  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 3) Tokenizar y filtrar stop words
  private obtenerTokensSignificativos(texto: string): string[] {
    const normalizado = this.normalizarTexto(texto);
    const palabras = normalizado.split(' ');
    return palabras.filter(palabra =>
      palabra.length > 1 && !this.stopWords.has(palabra)
    );
  }

  // 4) Validación genérica por similitud entre actividad agendada y reportada
  private cumplePorSimilitud(
    actividadAgendada: string | undefined,
    actividadReportada: string | undefined
  ): boolean {
    if (!actividadAgendada || !actividadReportada) {
      return false;
    }

    const tokensAgendada = this.obtenerTokensSignificativos(actividadAgendada);
    const actRepNorm = this.normalizarTexto(actividadReportada);

    return tokensAgendada.some(token => actRepNorm.includes(token));
  }

  // 5) Validación por relación entre actividad reportada y objetivo
  private cumpleActividadConObjetivo(
    actividadReportada: string | undefined,
    objetivo: string | undefined
  ): boolean {
    if (!actividadReportada || !objetivo) {
      return false;
    }

    const tokensObjetivo = this.obtenerTokensSignificativos(objetivo);
    const actRepNorm = this.normalizarTexto(actividadReportada);

    return tokensObjetivo.some(token => actRepNorm.includes(token));
  }

  /**
   * Valida si la actividad reportada corresponde al código,
   * si no coincide por código, valida similitud con la actividad agendada,
   * y finalmente si no cumple ninguno de esos dos, verifica relación con el objetivo.
   */
  validarActividad(
    codigo: string | undefined,
    actividadReportada: string | undefined,
    actividadAgendada: string | undefined,
    objetivo: string | undefined
  ): boolean {
    // Si no hay actividad agendada ni reportada, no cumple
    if (!actividadAgendada || !actividadReportada) {
      return false;
    }

    // 1) Intentar lógica por código, si existe en validacionCodigos
    if (codigo && this.validacionCodigos[codigo]) {
      const claves = this.validacionCodigos[codigo]!.map(c => this.normalizarTexto(c));
      const actRepNorm = this.normalizarTexto(actividadReportada);
      const coincideCodigo = claves.some(palabraClave =>
        actRepNorm.includes(palabraClave)
      );
      if (coincideCodigo) {
        return true;
      }
    }

    // 2) Si no coincide por código, usar similitud entre actividad agendada y reportada
    if (this.cumplePorSimilitud(actividadAgendada, actividadReportada)) {
      return true;
    }

    // 3) Si aún no cumple, verificar si actividad reportada contiene palabra del objetivo
    if (this.cumpleActividadConObjetivo(actividadReportada, objetivo)) {
      return true;
    }

    return false;
  }

  obtenerMotivoNoCumplimiento(
    codigo: string | undefined,
    actividadReportada: string | undefined
  ): string {
    if (!actividadReportada) {
      return 'Actividad no reportada';
    }
    return 'Actividad no relacionada con el objetivo ni con el código';
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

    // 1) Detectar códigos en el texto de objetivo
    const clavesDetectadas = this.detectarPalabrasClave(agendaSem.objetivo);
    const codigos = Array.from(new Set(clavesDetectadas.flatMap(c => c.codigos)));

    // 2) Verificar si existe alguna actividad reportada que coincida con alguno de esos códigos
    this.existeCoincidenciaEnReportadas = this.verificarCoincidenciaEnReportadas(codigos);

    // 3) Filtrar las actividades agendadas que pertenezcan a esos códigos y construir el array de detalleActividades
    this.agendas
      .filter(a =>
        a.coordinador === this.coordinadorSeleccionado &&
        a.semana === this.semanaSeleccionada &&
        codigos.includes(a.codigo || '')
      )
      .forEach(a => {
        const actividadAgendada = a.actividad || '';
        const actividadReportada = a.actividadReportada || '';
        const objetivoTexto = agendaSem.objetivo || '';

        const cumplida = this.validarActividad(
          a.codigo,
          actividadReportada,
          actividadAgendada,
          objetivoTexto
        );

        this.detalleActividades.push({
          actividadAgendada: actividadAgendada || 'Sin actividad',
          codigo: a.codigo || '',
          actividadReportada: actividadReportada || 'No reportada',
          cumplida,
          motivo: cumplida ? '' : this.obtenerMotivoNoCumplimiento(a.codigo, actividadReportada)
        });
      });
  }

  // Recorre todas las agendas de ese coordinador y semana para ver si hay
  // al menos una fila reportada cuyo código esté en 'codigosObjetivo'
  // y tenga actividadReportada no vacía.
  verificarCoincidenciaEnReportadas(codigosObjetivo: string[]): boolean {
    if (!this.coordinadorSeleccionado || !this.semanaSeleccionada) {
      return false;
    }

    return this.agendas.some(a =>
      a.coordinador === this.coordinadorSeleccionado &&
      a.semana === this.semanaSeleccionada &&
      codigosObjetivo.includes(a.codigo || '') &&
      a.actividadReportada && a.actividadReportada.trim().length > 0
    );
  }

  buscarObjetivo(): void {
    const ag = this.agendas.find(a =>
      a.coordinador === this.coordinadorSeleccionado && a.semana === this.semanaSeleccionada
    );

    this.objetivo = ag?.objetivo || '';

    // 1) Detectamos los códigos que vienen del texto de objetivo
    const clavesDetectadas = this.detectarPalabrasClave(this.objetivo);
    const codigos = Array.from(new Set(clavesDetectadas.flatMap(c => c.codigos)));

    // 2) Convertimos el texto para extraer la cantidad numérica del objetivo
    this.objetivoCantidad = this.extraerNumeroDeTexto(this.objetivo);

    // 3) Calculamos cuántas unidades se han reportado
    this.cantidadReportada = this.sumarReportadoRelacionado(codigos, this.semanaSeleccionada);
    this.cantidadRestante = this.objetivoCantidad - this.cantidadReportada;

    // 4) Verificar si existe alguna actividad reportada que coincida con los códigos del objetivo
    this.existeCoincidenciaEnReportadas = this.verificarCoincidenciaEnReportadas(codigos);
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
      const agSem = this.agendas.find(a =>
        a.coordinador === this.coordinadorSeleccionado && a.semana === semana
      );
      const clavesDetectadas = agSem ? this.detectarPalabrasClave(agSem.objetivo) : [];
      const listaCod = Array.from(new Set(clavesDetectadas.flatMap(c => c.codigos)));

      const items = this.agendas.filter(a =>
        a.coordinador === this.coordinadorSeleccionado &&
        a.semana === semana &&
        listaCod.includes(a.codigo || '')
      );

      const totalAg = items.length;
      // Para contar reportados, usamos validarActividad con el objetivo de esa semana:
      const totalRp = items.filter(a =>
        this.validarActividad(
          a.codigo,
          a.actividadReportada || '',
          a.actividad || '',
          agSem ? agSem.objetivo : ''
        )
      ).length;

      const porcentaje = totalAg === 0 ? 0 : Math.round((totalRp / totalAg) * 100);

      this.dataTabla.push({ semana, codigos: listaCod, agendados: totalAg, reportados: totalRp, porcentaje });
    });
  }

  calcularPorcentaje(semana: string): number {
    const fila = this.dataTabla.find(f => f.semana === semana);
    return fila ? fila.porcentaje : 0;
  }

  // Identificar si hay mora en cantidad para ver cuándo redujo
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

  // Método auxiliar original (no modificado) para comprobar si en cualquier
  // parte de actividadReportada aparece alguna palabra de validacionCodigos.
  actividadReportadaContieneCualquierClave(actividadReportada: string): boolean {
    const actNorm = this.normalizarTexto(actividadReportada);
    for (const claves of Object.values(this.validacionCodigos)) {
      for (const palabraClave of claves) {
        if (actNorm.includes(this.normalizarTexto(palabraClave))) {
          return true;
        }
      }
    }
    return false;
  }
}
