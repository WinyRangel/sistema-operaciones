import { Component, OnInit, OnDestroy } from '@angular/core';
import { lastValueFrom, Subscription, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ObjetivosService } from '../../../services/objetivos.service';
import { CumpObjetivoService } from '../../../services/cump-objetivo.service';
import { Agenda } from '../../../models/agenda';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';



import { CumplimientoObjetivo } from '../../../models/cump-objetivo';
import Swal from 'sweetalert2';

type FormularioTipo = 'mora' | 'creditos' | 'fichas' | 'renovacion';

interface FilasFormulario {
  mora: { grupo: string; meta: string; recup: string }[];
  creditos: { meta: string; completado: string }[];
  fichas: { meta: string; completado: string }[];
  renovacion: { meta: string; completado: string }[];

}

interface DataRow {
  coordinador: string;
  semana: string;
  total: number;
  logrado: number;
  porcentaje: number;
}

@Component({
  selector: 'app-cumplimiento-agenda',
  standalone: false,
  templateUrl: './cumplimiento-agenda.component.html',
  styleUrls: ['./cumplimiento-agenda.component.css']
})
export class CumplimientoAgendaComponent implements OnInit, OnDestroy {
  isExpanded = true;

  coordinadores: string[] = [];
  semanas: string[] = [];
  agendas: Agenda[] = [];
  cumplimientos: any[] = [];
  semanasSeleccionadasParaReporte: string[] = [];

  coordinadorSeleccionado = '';
  semanaSeleccionada = '';
  objetivoSeleccionado = '';
  metaSeleccionada = '';
  formularioVisible!: FormularioTipo;

  actividadesObjetivo: Agenda[] = [];
  actividadesMeta: Agenda[] = [];

  moraInicial: number = 0;
  moraFinal: number = 0;
  gpoindm: string = '';
  metaM: number = 0;
  recupM: number = 0;

  fichasCerrar: number = 0;
  fichasFaltantes: number = 0;
  fichasCerradas: number = 0;

  gpoindInicial: number = 0;
  gpoindFinal: number = 0;
  metaGpo: number = 0;
  completadoGpo: number = 0;
  metaInd: number = 0;
  completadoInd: number = 0;

  gpoindProyectado: number = 0;
  gpoindRenovado: number = 0;
  metaProyec: number = 0;
  completadosProyec: number = 0;

  // Totales
  totalMoraFinal: number = 0;
  totalFichasFaltantes: number = 0;
  totalCreditosFinales: number = 0;
  totalRenovados: number = 0;
  totalRecuperado: number = 0;

  // Propiedades para el Modal
  modalVisible = false;
  modalData: CumplimientoObjetivo | null = null;
  totalFichasCerradas: any;
  totalFichasIniciales: any;
  totalCreditosIniciales: any;
  totalCreditosCreados: any;
  totalProyecIniciales: any;
  totalProyecFaltantes: any;

  moraMetaReal: number = 0;
  moraRecuperadoReal: number = 0;
  totalMetaMora: any;

  reportePreview: DataRow[] = [];
  totalCreditosMeta: any;
  totalCreditosCompletado: any;
  totalMetaGpo: any;
  totalMetaInd: any;
  totalCompletadoGpo: any;
  totalCompletadoInd: any;


  /** ¿Mostrar tabla Mora? */
  get showMora(): boolean {
    return !!this.cumplimientos?.some(r =>
      r.moraInicial! > 0 ||
      r.moraFinal! > 0 ||
      (r.gpoindm?.trim() ?? '') !== '' ||
      r.metaM! > 0 ||
      r.recupM! > 0
    );
  }

  /** ¿Mostrar tabla Fichas? */
  get showFichas(): boolean {
    return !!this.cumplimientos?.some(r =>
      r.fichasCerrar! > 0 ||
      r.fichasFaltantes! > 0 ||
      r.fichasCerradas! > 0
    );
  }
  esFilaVaciaFichas(reg: any): boolean {
    return (
      (reg.fichasCerrar ?? 0) === 0 &&
      (reg.fichasFaltantes ?? 0) === 0 &&
      (reg.fichasCerradas ?? 0) === 0
    );
  }
  /** No mostrar filas vacias de Mora */
  esFilaVaciaMora(reg: any): boolean {
    return (
      (reg.moraInicial ?? 0) === 0 &&
      (reg.moraFinal ?? 0) === 0 &&
      (reg.metaM ?? 0) === 0 &&
      (reg.recupM ?? 0) === 0
    );
  }


  /** ¿Mostrar tabla Créditos? */
  get showCreditos(): boolean {
    return !!this.cumplimientos?.some(r =>
      r.gpoindInicial! > 0 ||
      r.gpoindFinal! > 0 ||
      r.metaGpo! > 0 ||
      r.completadoGpo! > 0 ||
      r.metaInd! > 0 ||
      r.completadoInd! > 0
    );
  }

  esFilaVaciaCredito(reg: any): boolean {
    return (
      (reg.gpoindInicial ?? 0) === 0 &&
      (reg.metaGpo ?? 0) === 0 &&
      (reg.completadoGpo ?? 0) === 0 &&
      (reg.metaInd ?? 0) === 0 &&
      (reg.completadoInd ?? 0) === 0
    );
  }


  /** ¿Mostrar tabla Renovaciones? */
  get showRenovaciones(): boolean {
    return !!this.cumplimientos?.some(r =>
      r.gpoindProyectado! > 0 ||
      r.gpoindRenovado! > 0 ||
      r.metaProyec! > 0 ||
      r.completadosProyec! > 0
    );
  }
  esFilaVaciaRenovaciones(reg: any): boolean {
    return (
      (reg.gpoindProyectado ?? 0) === 0 &&
      (reg.gpoindRenovado ?? 0) === 0 &&
      (reg.metaProyec ?? 0) === 0 &&
      (reg.completadosProyec ?? 0) === 0
    );
  }

  private subs = new Subscription();

  private readonly codigoObjetivoMap: Record<string, string[]> = {
    mora: ['C'],
    supervisión: ['SUP'],
    ficha: ['CF', 'R'],
    fichas: ['CF', 'R'],
    nuevos: ['GN', 'VTA'],
    nuevo: ['GN', 'VTA'],
    cambaceo: ['VTA'],
    renovación: ['S/Renov'],
    renovacion: ['S/Renov'],
    cerrada: ['R'],
    cierre: ['R']
  };

  constructor(
    private objetivosSvc: ObjetivosService,
    private seguimientoSvc: CumpObjetivoService
  ) { }

  ngOnInit(): void {
    this.subs.add(
      this.objetivosSvc.obtenerAgendas()
        .pipe(
          catchError(err => {
            console.error('Error al obtener agendas:', err);
            return throwError(err);
          })
        )
        .subscribe(data => {
          console.log('API Agendas respondió:', data);
          this.agendas = data;
          this.coordinadores = Array.from(new Set(
            data.map(a => a.coordinador?.trim() || '').filter(Boolean)
          ));
          this.semanas = Array.from(new Set(
            data.map(a => a.semana?.trim() || '').filter(Boolean)
          )).sort(this.sortSemanas);

          console.log('coordinadores cargados:', this.coordinadores);
          console.log('semanas cargadas:', this.semanas);
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  seleccionarCoordinador(coord: string): void {
    this.coordinadorSeleccionado = coord;
    this.resetSelecciones();
    this.semanas = Array.from(new Set(
      this.agendas
        .filter(a => a.coordinador === coord)
        .map(a => a.semana || '')
        .filter(Boolean)
    )).sort(this.sortSemanas);

    console.log('Elegido coordinador:', coord, 'Semanas filtradas:', this.semanas);
  }

  seleccionarSemana(sem: string): void {
    this.semanaSeleccionada = sem;
    const registros = this.agendas.filter(a =>
      a.coordinador === this.coordinadorSeleccionado && a.semana === sem
    );
    if (registros.length) {
      const { objetivo = '', meta = '' } = registros[0];
      this.objetivoSeleccionado = objetivo;
      this.metaSeleccionada = meta;

      const cods = this.obtenerCodigosDeObjetivo(objetivo);
      this.actividadesObjetivo = registros
        .filter(a => a.codigo && cods.includes(a.codigo))
        .map(a => ({
          ...a,
          cumplimientoAgenda: a.codigo?.trim() === a.codigoReportado?.trim()
        }));

      this.actividadesMeta = registros.filter(a => a.acordeObjetivo === true);
    }


    this.seguimientoSvc.obtenerSeguimiento(this.coordinadorSeleccionado, this.semanaSeleccionada)
      .subscribe({
        next: (data) => {
          this.cumplimientos = data.map(reg => ({
            ...reg,
            tipo: this.inferirTipo(reg)
          }));
          this.calcularTotales();
          console.log('Cumplimientos cargados con tipo:', this.cumplimientos);
        },
        error: (err) => {
          console.error('Error al cargar cumplimientos:', err);
          alert('Error al cargar datos del formulario.');
        }
      });
  }


  private inferirTipo(reg: CumplimientoObjetivo): FormularioTipo {
    // Mora
    if (
      (reg.moraInicial ?? 0) > 0 ||
      (reg.moraFinal ?? 0) > 0 ||
      (reg.gpoindm?.trim() ?? '') !== '' ||
      (reg.metaM ?? 0) > 0 ||
      (reg.recupM ?? 0) > 0
    ) {
      return 'mora';
    }
    // Fichas
    if (
      (reg.fichasCerrar ?? 0) > 0 ||
      (reg.fichasFaltantes ?? 0) > 0 ||
      (reg.fichasCerradas ?? 0) > 0
    ) {
      return 'fichas';
    }
    // Créditos
    if (
      (reg.gpoindInicial ?? 0) > 0 ||
      (reg.gpoindFinal ?? 0) > 0 ||
      (reg.metaGpo ?? 0) > 0 ||
      (reg.completadoGpo ?? 0) > 0 ||
      (reg.metaInd ?? 0) > 0 ||
      (reg.completadoInd ?? 0) > 0
    ) {
      return 'creditos';
    }
    // Renovaciones
    if (
      (reg.gpoindProyectado ?? 0) > 0 ||
      (reg.gpoindRenovado ?? 0) > 0 ||
      (reg.metaProyec ?? 0) > 0 ||
      (reg.completadosProyec ?? 0) > 0
    ) {
      return 'renovacion';
    }
    // Por defecto
    return 'mora';
  }

  private resetSelecciones(): void {
    this.semanaSeleccionada = '';
    this.objetivoSeleccionado = '';
    this.metaSeleccionada = '';
    this.actividadesObjetivo = [];
    this.actividadesMeta = [];
  }

  private sortSemanas = (a: string, b: string): number => {
    const na = parseInt(a.replace(/\D+/g, ''), 10);
    const nb = parseInt(b.replace(/\D+/g, ''), 10);
    return na - nb;
  }

  private obtenerCodigosDeObjetivo(obj: string): string[] {
    const texto = obj.toLowerCase();
    // Claves ordenadas de mayor a menor longitud
    const claves = Object.keys(this.codigoObjetivoMap)
      .sort((a, b) => b.length - a.length);

    const codigosSet = new Set<string>();

    for (const clave of claves) {
      // Expresión regular con límite de palabra y case‑insensitive
      const regex = new RegExp(`\\b${clave}\\b`, 'i');
      if (regex.test(texto)) {
        this.codigoObjetivoMap[clave].forEach(code => codigosSet.add(code));
      }
    }

    return Array.from(codigosSet);
  }


  get porcentajeCumplimientoObjetivo(): number {
    const total = this.actividadesObjetivo.length;
    const hechas = this.actividadesObjetivo.filter(a => a.cumplimientoAgenda).length;
    return total ? Math.round((hechas / total) * 100) : 0;
  }

  get colorBarraCumplimiento(): string {
    const pct = this.porcentajeCumplimientoObjetivo;
    return pct < 70 ? 'red' : pct <= 90 ? 'orange' : 'green';
  }

  // Porcentaje de Mora
  get porcentajeMora(): number {
    const meta = this.cumplimientos.reduce((sum, reg) => sum + (reg.metaM ?? 0), 0);
    const recup = this.cumplimientos.reduce((sum, reg) => sum + (reg.recupM ?? 0), 0);

    this.moraMetaReal = meta;
    this.moraRecuperadoReal = recup;

    // ✅ Ahora lo limitamos al 100%
    return meta ? Math.min(100, Math.round((recup / meta) * 100)) : 0;
  }


  // Porcentaje de Fichas
  get porcentajeFichas(): number {
    const total = this.totalFichasIniciales || 0;
    const hechas = this.totalFichasCerradas || 0;
    return total ? Math.min(100, Math.round((hechas / total) * 100)) : 0;
  }

  // Porcentaje de Créditos
  get porcentajeCreditos(): number {
    const metaGpo = this.cumplimientos.reduce((sum, reg) => sum + (reg.metaGpo ?? 0), 0);
    const metaInd = this.cumplimientos.reduce((sum, reg) => sum + (reg.metaInd ?? 0), 0);
    const totalMeta = metaGpo + metaInd;

    const completadoGpo = this.cumplimientos.reduce((sum, reg) => sum + (reg.completadoGpo ?? 0), 0);
    const completadoInd = this.cumplimientos.reduce((sum, reg) => sum + (reg.completadoInd ?? 0), 0);
    const totalCompletado = completadoGpo + completadoInd;

    return totalMeta > 0 ? Math.min(100, Math.round((totalCompletado / totalMeta) * 100)) : 0;
  }


  // Porcentaje de Renovación
  get porcentajeRenovacion(): number {
    const meta = this.totalProyecIniciales || 0;
    const logrado = this.totalRenovados || 0;
    return meta ? Math.min(100, Math.round((logrado / meta) * 100)) : 0;
  }


  get colorMora(): string {
    if (this.moraRecuperadoReal > this.moraMetaReal && this.moraMetaReal > 0) {
      return '#007700';
    }

    if (this.moraRecuperadoReal === this.moraMetaReal && this.moraMetaReal > 0) {
      return 'green';
    }

    const porcentaje = this.porcentajeMora;
    if (porcentaje < 70) return 'red';
    if (porcentaje <= 90) return 'orange';

    return 'green';
  }


  get colorFichas(): string {
    const p = this.porcentajeFichas;
    return p < 70 ? '#dc3545' : p <= 90 ? '#ffc107' : '#28a745';
  }

  get colorCreditos(): string {
    const p = this.porcentajeCreditos;
    return p < 70 ? '#dc3545' : p <= 90 ? '#ffc107' : '#28a745';
  }

  get colorRenovacion(): string {
    const p = this.porcentajeRenovacion;
    return p < 70 ? '#dc3545' : p <= 90 ? '#ffc107' : '#28a745';
  }


  mostrarFormulario(tipo: FormularioTipo): void {
    this.formularioVisible = tipo;
  }

  editarRegistro(registro: CumplimientoObjetivo, tipo: FormularioTipo): void {
    console.log('Registro a editar:', registro, 'Tipo forzado:', tipo);

    // Clonamos el objeto para no mutar el array original
    this.modalData = { ...registro, tipo };

    // Ahora sí abrimos el modal
    this.modalVisible = true;
  }

  // Cerrar modal sin guardar
  cerrarModal(): void {
    this.modalVisible = false;
    this.modalData = null;
  }


  guardarDesdeModal(): void {
    if (!this.modalData?._id) return;

    this.seguimientoSvc.actualizarSeguimiento(this.modalData).subscribe({
      next: updated => {
        const idx = this.cumplimientos.findIndex(c => c._id === updated._id);
        if (idx >= 0) this.cumplimientos[idx] = updated;
        this.cerrarModal();

        // Toast de éxito
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

        Toast.fire({
          icon: 'success',
          title: 'Registro actualizado correctamente'
        });
      },
      error: err => {
        console.error('Error actualizando registro:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el registro.'
        });
      }
    });
  }

  calcularTotales(): void {
    // Calcular totales de Mora
    const totalMoraInicial = this.cumplimientos.reduce((sum, reg) => sum + (reg.moraInicial ?? 0), 0);
    const totalRecuperado = this.cumplimientos.reduce((sum, reg) => sum + (reg.recupM ?? 0), 0);

    this.totalMoraFinal = Math.abs(totalMoraInicial - totalRecuperado); // ✅ siempre positivo
    this.totalRecuperado = totalRecuperado;
    this.totalMetaMora = this.cumplimientos.reduce((sum, reg) => sum + (reg.metaM ?? 0), 0);


    // Calcular totales de Fichas
    this.totalFichasIniciales = this.cumplimientos.reduce((sum, reg) => sum + (reg.fichasCerrar || 0), 0);
    this.totalFichasCerradas = this.cumplimientos.reduce((sum, reg) => sum + (reg.fichasCerradas || 0), 0);
    this.totalFichasFaltantes = Math.max(this.totalFichasIniciales - this.totalFichasCerradas, 0);
    this.totalFichasCerradas = this.totalFichasCerradas;

    // Calcular total de Grupos/Ind nuevos
    // Sumar metas
    const totalMetaGpo = this.cumplimientos.reduce((sum, reg) => sum + (reg.metaGpo || 0), 0);
    const totalMetaInd = this.cumplimientos.reduce((sum, reg) => sum + (reg.metaInd || 0), 0);
    const totalMetas = totalMetaGpo + totalMetaInd;

    // Sumar completados
    const totalCompletadoGpo = this.cumplimientos.reduce((sum, reg) => sum + (reg.completadoGpo || 0), 0);
    const totalCompletadoInd = this.cumplimientos.reduce((sum, reg) => sum + (reg.completadoInd || 0), 0);
    const totalCompletados = totalCompletadoGpo + totalCompletadoInd;

    // Suma de créditos iniciales
    const gpoindInicial = this.cumplimientos.reduce((sum, reg) => sum + (reg.gpoindInicial || 0), 0);

    // Asignación de totales
    this.totalCreditosCompletado = totalCompletados;
    this.gpoindInicial = gpoindInicial;
    this.totalCreditosIniciales = gpoindInicial + totalCompletados;

    // (Opcional) Otros totales
    this.totalCreditosMeta = totalMetas;
    this.totalMetaGpo = totalMetaGpo;
    this.totalMetaInd = totalMetaInd;
    this.totalCompletadoGpo = totalCompletadoGpo;
    this.totalCompletadoInd = totalCompletadoInd;




    // Calcular Renovaciones
    this.totalProyecIniciales = this.cumplimientos.reduce((sum, reg) => sum + (reg.gpoindProyectado || 0), 0);
    this.totalRenovados = this.cumplimientos.reduce((sum, reg) => sum + (reg.completadosProyec || 0), 0);
    this.totalProyecFaltantes = Math.max(this.totalProyecIniciales - this.totalRenovados, 0);
    this.totalRenovados = this.totalRenovados;
  }

  recargarTablas(): void {
    this.seguimientoSvc.obtenerSeguimiento(this.coordinadorSeleccionado, this.semanaSeleccionada)
      .subscribe({
        next: (data) => {
          this.cumplimientos = data.map(reg => ({
            ...reg,
            tipo: this.inferirTipo(reg)
          }));

          this.calcularTotales();
          console.log('Datos recargados correctamente');
        },
        error: (err) => {
          console.error('Error al recargar los datos:', err);
          alert('No se pudieron recargar los datos.');
        }
      });
  }

  guardarSeguimientoFormulario(): void {
    const tipo = this.formularioVisible;

    if (!tipo || !this.semanaSeleccionada || !this.coordinadorSeleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Selecciona coordinador, semana y tipo de formulario.',
      });
      return;
    }

    const payload: any = {
      coordinador: this.coordinadorSeleccionado,
      semana: this.semanaSeleccionada,
      tipo,
      fechaRegistro: new Date().toISOString(),

      moraInicial: this.moraInicial ?? 0,
      moraFinal: this.moraFinal ?? 0,
      gpoindm: this.gpoindm ?? '',
      metaM: this.metaM ?? 0,
      recupM: this.recupM ?? 0,
      fichasCerrar: this.fichasCerrar ?? 0,
      fichasFaltantes: this.fichasFaltantes ?? 0,
      fichasCerradas: this.fichasCerradas ?? 0,
      gpoindInicial: this.gpoindInicial ?? 0,
      gpoindFinal: this.gpoindFinal ?? 0,
      metaGpo: this.metaGpo ?? 0,
      completadoGpo: this.completadoGpo ?? 0,
      metaInd: this.metaInd ?? 0,
      completadoInd: this.completadoInd ?? 0,
      gpoindProyectado: this.gpoindProyectado ?? 0,
      gpoindRenovado: this.gpoindRenovado ?? 0,
      metaProyec: this.metaProyec ?? 0,
      completadosProyec: this.completadosProyec ?? 0
    };

    this.seguimientoSvc.guardarSeguimiento(payload).subscribe({
      next: () => {
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
        Toast.fire({
          icon: 'success',
          title: 'Registro guardado correctamente'
        });
        this.resetFormulario();
      },
      error: (error) => {
        console.error('Error al guardar registro:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al guardar el registro.'
        });
      }
    });
  }


  validarLimiteSemanas(): void {
    if (this.semanasSeleccionadasParaReporte.length > 5) {
      this.semanasSeleccionadasParaReporte.pop();
      Swal.fire('Límite alcanzado', 'Solo puedes seleccionar hasta 5 semanas.', 'warning');
    }
  }

  // Filtra las semanas disponibles tras elegir coordinador
  filtrarSemanasPorCoordinador(): void {
    this.semanas = Array.from(new Set(
      this.agendas
        .filter(a => a.coordinador === this.coordinadorSeleccionado)
        .map(a => a.semana || '')
        .filter(Boolean)
    )).sort(this.sortSemanas);
    this.semanasSeleccionadasParaReporte = [];
  }

async generarReportePDF() {
  // — Validaciones —
  if (!this.semanasSeleccionadasParaReporte.length) {
    alert('Selecciona al menos una semana.');
    return;
  }
  if (this.semanasSeleccionadasParaReporte.length > 5) {
    alert('Máximo 5 semanas.');
    return;
  }
  if (!this.coordinadorSeleccionado) {
    alert('Selecciona un coordinador.');
    return;
  }

  // — 1) Datos de Objetivos —
  interface ObjRow { semana: string; objetivo: string; total: number; logrado: number; porcentaje: number; }
  const objetivos: ObjRow[] = this.semanasSeleccionadasParaReporte.map(sem => {
    const regs = this.agendas.filter(a =>
      a.coordinador === this.coordinadorSeleccionado && a.semana === sem
    );
    const objetivoText = regs[0]?.objetivo || '';
    const cods = this.obtenerCodigosDeObjetivo(objetivoText);
    const acts = regs.filter(a => a.codigo && cods.includes(a.codigo));
    const total = acts.length;
    const logrado = acts.filter(a => a.codigo === a.codigoReportado).length;
    return {
      semana: sem,
      objetivo: objetivoText,
      total,
      logrado,
      // porcentaje: total ? Math.round((logrado / total) * 100) : 0
      porcentaje: total ? Math.min(100, Math.round((logrado / total) * 100)) : 0

    };
  });

  // — 2) Iniciar PDF —
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  // Cabecera principal
  doc.setFillColor(13, 71, 161);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 50, 'F');
  doc.setFontSize(18);
  doc.setTextColor('#fff');
  doc.text('Reporte de Cumplimiento de Objetivos Semanales', 40, 32);
  doc.setFontSize(10);
  doc.setTextColor('#000');
  doc.text(`Coordinador: ${this.coordinadorSeleccionado}`, 40, 70);
  doc.text(`Semanas: ${this.semanasSeleccionadasParaReporte.join(', ')}`, 300, 70);

  // — 3) Subtítulo Objetivos —
  let cursorY = 90;
  doc.setFontSize(14);
  doc.setTextColor('#333');
  doc.text('1. Detalle de Objetivos por Semana', 40, cursorY);
  cursorY += 4;

  // Tabla Objetivos
  autoTable(doc, {
    startY: cursorY,
    head: [[
      { content: 'Semana',     styles: { fillColor: [30,144,255], textColor: '#fff' } },
      { content: 'Objetivo',   styles: { fillColor: [30,144,255], textColor: '#fff' } },
      { content: 'Act. Agendadas', styles: { fillColor: [30,144,255], textColor: '#fff' } },
      { content: 'Act. Cumplidas', styles: { fillColor: [30,144,255], textColor: '#fff' } },
      { content: '% Cumplido', styles: { fillColor: [30,144,255], textColor: '#fff' } }
    ]],
    body: objetivos.map(o => [
      o.semana,
      o.objetivo,
      o.total.toString(),
      o.logrado.toString(),
      o.porcentaje + '%'
    ]),
    margin: { left: 40, right: 40 },
    styles: { fontSize: 9, halign: 'center', cellPadding: 4 },
    theme: 'grid',
    alternateRowStyles: { fillColor: [227, 242, 253] }
  });
  cursorY = (doc as any).lastAutoTable.finalY + 30;

  // — 4) Subtítulo Metas —
  doc.setFontSize(14);
  doc.setTextColor('#333');
  doc.text('2. Cumplimiento de Metas', 40, cursorY);
  cursorY += 22;

  // — Tablas de Metas —
  const categorias = [
    {
      titulo: 'MORA',
      headers: ['Semana', 'Meta Mora', 'Recuperado', '% MORA'],
      extract: (c: any) => {
        const m = c.metaM || 0, r = c.recupM || 0;
        const pct = m ? Math.min(100, Math.round((r / m) * 100)) + '%' : '0%';
        return [m.toString(), r.toString(), pct];
      }
    },
    {
      titulo: 'CRÉDITOS',
      headers: ['Semana', 'Meta GPO', 'Cump. GPO', 'Meta IND', 'Comp. IND', '% CRÉDITOS'],
      extract: (c: any) => {
        const mg = c.metaGpo || 0, cg = c.completadoGpo || 0;
        const mi = c.metaInd || 0, ci = c.completadoInd || 0;
        const totalMeta = mg + mi, totalComp = cg + ci;
        const pct = totalMeta ? Math.min(100, Math.round((totalComp / totalMeta) * 100)) + '%' : '0%';
        return [mg.toString(), cg.toString(), mi.toString(), ci.toString(), pct];
      }
    },
    {
      titulo: 'FICHAS',
      headers: ['Semana', 'Meta por Cerrar', 'Cerradas', '% FICHAS'],
      extract: (c: any) => {
        const i = c.fichasCerrar || 0, f = c.fichasCerradas || 0;
        const pct = i ? Math.min(100, Math.round((f / i) * 100)) + '%' : '0%';
        return [i.toString(), f.toString(), pct];
      }
    },
    {
      titulo: 'RENOVACIONES',
      headers: ['Semana', 'Meta Proyectada', 'Renovados', '% RENOV'],
      extract: (c: any) => {
        const p = c.metaProyec || 0, r = c.completadosProyec || 0;
        const pct = p ? Math.min(100, Math.round((r / p) * 100)) + '%' : '0%';
        return [p.toString(), r.toString(), pct];
      }
    }
  ];

  for (const cat of categorias) {
    // Construir body
    const body: string[][] = [];
    for (const sem of this.semanasSeleccionadasParaReporte) {
      const cumpl = await lastValueFrom(
        this.seguimientoSvc.obtenerSeguimiento(this.coordinadorSeleccionado, sem)
      );
      const agreg = cumpl.reduce((acc: any, r: any) => ({
        metaM: (acc.metaM || 0) + (r.metaM || 0),
        recupM: (acc.recupM || 0) + (r.recupM || 0),
        metaGpo: (acc.metaGpo || 0) + (r.metaGpo || 0),
        completadoGpo: (acc.completadoGpo || 0) + (r.completadoGpo || 0),
        metaInd: (acc.metaInd || 0) + (r.metaInd || 0),
        completadoInd: (acc.completadoInd || 0) + (r.completadoInd || 0),
        fichasCerrar: (acc.fichasCerrar || 0) + (r.fichasCerrar || 0),
        fichasCerradas: (acc.fichasCerradas || 0) + (r.fichasCerradas || 0),
        metaProyec: (acc.metaProyec || 0) + (r.metaProyec || 0),
        completadosProyec: (acc.completadosProyec || 0) + (r.completadosProyec || 0),
      }), {});
      body.push([sem, ...cat.extract(agreg)]);
    }

    // Saltar si todos cero
    if (body.every(r => r.slice(1).every(cell => cell === '0' || cell === '0%'))) {
      continue;
    }

    // Banda de color con título
    doc.setFillColor(255, 255, 255);
    doc.rect(40, cursorY - 14, doc.internal.pageSize.getWidth() - 80, 18, 'F');
    doc.setTextColor(1, 87, 155);
    doc.setFontSize(12);
    doc.text(cat.titulo, 45, cursorY);
    doc.setTextColor('#000');
    cursorY += 15;

    // Tabla estilizada
    autoTable(doc, {
      startY: cursorY,
      head: [cat.headers.map(h => ({ content: h, styles: { fillColor: [0,102,204], textColor: '#fff' } }))],
      body,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 9, halign: 'center', cellPadding: 4 },
      alternateRowStyles: { fillColor: [227, 242, 253] },
      theme: 'grid'
    });

    cursorY = (doc as any).lastAutoTable.finalY + 25;
    if (cursorY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      cursorY = 40;
    }
  }

  // — Pie de página con numeración —
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor('#666');
    doc.text(`Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() - 100,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // — Guardar PDF —
  doc.save(`reporte_cumplimiento_${this.coordinadorSeleccionado}.pdf`);
}

private resetFormulario(): void {
  this.moraInicial = 0;
  this.moraFinal = 0;
  this.gpoindm = '';
  this.metaM = 0;
  this.recupM = 0;

  this.fichasCerrar = 0;
  this.fichasFaltantes = 0;
  this.fichasCerradas = 0;

  this.gpoindInicial = 0;
  this.gpoindFinal = 0;
  this.metaGpo = 0;
  this.completadoGpo = 0;
  this.metaInd = 0;
  this.completadoInd = 0;

  this.gpoindProyectado = 0;
  this.gpoindRenovado = 0;
  this.metaProyec = 0;
  this.completadosProyec = 0;

  // También limpias la vista de formulario
  this.formularioVisible = undefined!;
}


}





