import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ObjetivosService } from '../../../services/objetivos.service';
import { CumpObjetivoService } from '../../../services/cump-objetivo.service';

import { Agenda } from '../../../models/agenda';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CumplimientoObjetivo } from '../../../models/cump-objetivo';

type FormularioTipo = 'mora' | 'creditos' | 'fichas' | 'renovacion';

interface FilasFormulario {
  mora: { grupo: string; meta: string; recup: string }[];
  creditos: { meta: string; completado: string }[];
  fichas: { meta: string; completado: string }[];
  renovacion: { meta: string; completado: string }[];

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
  // Propiedades para el Modal
  modalVisible = false;
  modalData: CumplimientoObjetivo | null = null;

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

  /** ¿Mostrar tabla Renovaciones? */
  get showRenovaciones(): boolean {
    return !!this.cumplimientos?.some(r =>
      r.gpoindProyectado! > 0 ||
      r.gpoindRenovado! > 0 ||
      r.metaProyec! > 0 ||
      r.completadosProyec! > 0
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
    const lower = obj.toLowerCase();
    return Object.entries(this.codigoObjetivoMap)
      .filter(([clave]) => lower.includes(clave))
      .flatMap(([, arr]) => arr);
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

  // Guardar cambios desde el modal
// guardarDesdeModal(): void {
//   if (!this.modalData?._id) return;

//   this.seguimientoSvc.actualizarSeguimiento(this.modalData).subscribe({
//     next: updated => {
//       const idx = this.cumplimientos.findIndex(c => c._id === updated._id);
//       if (idx >= 0) this.cumplimientos[idx] = updated;
//       this.cerrarModal();
//     },
//     error: err => {
//       console.error('Error actualizando registro:', err);
//       alert('No se pudo actualizar el registro.');
//     }
//   });
// }
guardarDesdeModal(): void {
  if (!this.modalData?._id) return;

  this.seguimientoSvc.actualizarSeguimiento(this.modalData).subscribe({
    next: updated => {
      const idx = this.cumplimientos.findIndex(c => c._id === updated._id);
      if (idx >= 0) this.cumplimientos[idx] = updated;
      this.cerrarModal();
    },
    error: err => {
      console.error('Error actualizando registro:', err);
      alert('No se pudo actualizar el registro.');
    }
  });
}



  guardarSeguimientoFormulario(): void {
    const tipo = this.formularioVisible;

    if (!tipo || !this.semanaSeleccionada || !this.coordinadorSeleccionado) {
      alert('Selecciona coordinador, semana y tipo de formulario.');
      return;
    }

    // 1) Payload base con todos los campos del modelo, inicializados en null o 0
    const payload: any = {
      coordinador: this.coordinadorSeleccionado,
      semana: this.semanaSeleccionada,
      tipo,
      fechaRegistro: new Date().toISOString(),

      // Campos Mora
      moraInicial: this.moraInicial ?? 0,
      moraFinal: this.moraFinal ?? 0,

      // Campos Meta Mora (grupo/ind)
      gpoindm: this.gpoindm ?? '',
      metaM: this.metaM ?? 0,
      recupM: this.recupM ?? 0,

      // Campos Fichas
      fichasCerrar: this.fichasCerrar ?? 0,
      fichasFaltantes: this.fichasFaltantes ?? 0,
      fichasCerradas: this.fichasCerradas ?? 0,

      // Campos Créditos / GPO/IND Nuevos
      gpoindInicial: this.gpoindInicial ?? 0,
      gpoindFinal: this.gpoindFinal ?? 0,
      metaGpo: this.metaGpo ?? 0,
      completadoGpo: this.completadoGpo ?? 0,
      metaInd: this.metaInd ?? 0,
      completadoInd: this.completadoInd ?? 0,

      // Campos Renovaciones
      gpoindProyectado: this.gpoindProyectado ?? 0,
      gpoindRenovado: this.gpoindRenovado ?? 0,
      metaProyec: this.metaProyec ?? 0,
      completadosProyec: this.completadosProyec ?? 0
    };

    this.seguimientoSvc.guardarSeguimiento(payload).subscribe({
      next: () => alert('Seguimiento guardado correctamente'),
      error: (error) => {
        console.error('Error guardando seguimiento:', error);
        alert('Error al guardar el seguimiento. Revisa la consola para más detalles.');
      }
    });
  }

  generarReportePDF() {
    if (!this.semanasSeleccionadasParaReporte.length) {
      alert('Selecciona al menos una semana.');
      return;
    }
    if (this.semanasSeleccionadasParaReporte.length > 5) {
      alert('Máximo 5 semanas.');
      return;
    }

    // Construir datos agregados: { coordinador, semana, total, logrado, porcentaje }
    interface DataRow { coordinador: string; semana: string; total: number; logrado: number; porcentaje: number; }
    const dataPDF: DataRow[] = [];

    this.coordinadores.forEach(coord => {
      this.semanasSeleccionadasParaReporte.forEach(sem => {
        const registros = this.agendas.filter(a => a.coordinador === coord && a.semana === sem);
        if (!registros.length) {
          dataPDF.push({ coordinador: coord, semana: sem, total: 0, logrado: 0, porcentaje: 0 });
          return;
        }
        const objetivoText = registros[0].objetivo || '';
        const cods = this.obtenerCodigosDeObjetivo(objetivoText);
        const actividades = registros.filter(a => a.codigo && cods.includes(a.codigo));
        const total = actividades.length;
        const logrado = actividades.filter(a => a.codigo?.trim() === a.codigoReportado?.trim()).length;
        const porcentaje = total ? Math.round((logrado / total) * 100) : 0;
        dataPDF.push({ coordinador: coord, semana: sem, total, logrado, porcentaje });
      });
    });

    // Generar PDF
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    doc.setFontSize(14);
    doc.text('Reporte de Cumplimiento de Objetivos', 40, 40);
    let cursorY = 60;

    // Agrupar por coordinador
    const grupos = this.coordinadores.map(coord => ({
      nombre: coord,
      filas: dataPDF.filter(d => d.coordinador === coord)
    })).filter(g => g.filas.length);

    grupos.forEach(grupo => {
      doc.setFontSize(12);
      doc.text(`Coordinador: ${grupo.nombre}`, 40, cursorY);
      cursorY += 20;

      const headers = ['Semana', 'Logrado', 'Total', '% Cumplimiento'];
      const rows = grupo.filas.map(item => [item.semana, item.logrado.toString(), item.total.toString(), item.porcentaje + '%']);

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: cursorY,
        margin: { left: 40, right: 40 },
        styles: { fontSize: 10 },
        theme: 'grid'
      });

      // Actualizar cursorY después de la tabla
      cursorY = (doc as any).lastAutoTable.finalY + 30;
      // Saltar a nueva página si se acerca al final
      if (cursorY > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        cursorY = 40;
      }
    });

    doc.save('reporte_cumplimiento.pdf');
  }

}



