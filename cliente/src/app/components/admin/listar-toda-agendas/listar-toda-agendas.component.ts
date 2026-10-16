import { Component, OnInit } from '@angular/core';
import { AgendaAdminService } from '../../../services/agenda-admin.service';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SEMANAS_ANIO = 53;

export interface SubTabPersona {
  valor: string;
  label: string;
  usuario: string;
  iniciales: string;
  count: number;
  aliases: Set<string>;
}

@Component({
  selector: 'app-listar-toda-agendas',
  standalone: false,
  templateUrl: './listar-toda-agendas.component.html',
  styleUrl: './listar-toda-agendas.component.css'
})
export class ListarTodaAgendasComponent implements OnInit {
  // Lista de datos
  agendas: any[] = [];
  agendasFiltradas: any[] = [];
  cargando: boolean = false;
  enviandoCorreo: boolean = false;

  // Tabs principales
  tabActivo: 'coordinadores' | 'asesores' = 'coordinadores';

  // Roles por tab
  static readonly ROLES_ADMIN = ['mercadotecnia', 'auditoria', 'rh', 'admin', 'sup', 'adminsis'];
  static readonly ROLES_COORDINADOR = ['coordinador'];
  static readonly ROLES_ASESOR = ['asesor'];

  // Filtros
  busqueda: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  semanaSeleccionada: string = '';
  rolSeleccionado: string = '';
  // Opciones para código
  opcionesCodigo = [
    { value: 'R', texto: 'R | Recuperación' },
    { value: 'RP', texto: 'R/P | Recuperación / levantamiento de papelería' },
    { value: 'LPI', texto: 'Levantamiento papelería individuales' },
    { value: 'RPI', texto: 'Recuperación de levantaiento de papelería' },
    { value: 'C', texto: 'C | Cobranza' },
    { value: 'VTA', texto: 'VTA | Promoción' },
    { value: 'REC', texto: 'R/EC | Recuperación / Entrega / Cambio ciclo' },
    { value: 'RER', texto: 'R/ER | Recuperación / Entrega / Refil' },
    { value: 'GN', texto: 'GN | Grupos nuevos' },
    { value: 'COMIDA', texto: 'COMIDA' },
    { value: 'ASEO', texto: 'ASEO' },
    { value: 'RS', texto: 'RS | Reunión Semanal' },
    { value: 'INT', texto: 'INT | Integración' },
    { value: 'CM', texto: 'CM | Capacitación Manual' },
    { value: 'ED', texto: 'ED | Entrega Depósitos' },
    { value: 'EOP', texto: 'EOP | Entrega Operativos' },
    { value: 'R/A', texto: 'RA | Realizar Agenda y Concentrado' },
    //{ value: 'CC', texto: 'RA | Realizar Agenda y Concentrado' },
    { value: 'OTRO', texto: 'OTRO | Otro' }
  ];



  // Opciones de filtros
  semanas: string[] = [];
  todasLasSemanas: string[] = [];
  rolesDisponibles: { valor: string; label: string; color: string }[] = [
    { valor: 'mercadotecnia', label: 'Mercadotecnia', color: '#ec4899' },
    { valor: 'auditoria', label: 'Auditoría', color: '#f59e0b' },
    { valor: 'rh', label: 'Recursos Humanos', color: '#06b6d4' },
    { valor: 'admin', label: 'Administración', color: '#6366f1' },
    { valor: 'sup', label: 'Supervisión', color: '#10b981' },
    { valor: 'asesor', label: 'Asesor', color: '#B9A810' },
    { valor: 'coordinador', label: 'Coordinador', color: '#1B10B9' }
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


  // Usuarios que no pueden aparecer
  nombreOcultoTab = ''

  constructor(
    private agendaAdminService: AgendaAdminService,
    private auth: AuthService
  ) {
    this.todasLasSemanas = Array.from({ length: SEMANAS_ANIO }, (_, i) => `SEMANA ${i + 1}`);
  }

  get esAdminOSupervisor(): boolean {
    return ['admin', 'sup', 'adminsis', 'auditoria'].includes(this.rolActual);
  }

  get puedeFiltrarRol(): boolean {
    return this.esAdminOSupervisor;
  }

  get puedeFiltrarUsuario(): boolean {
    return this.esAdminOSupervisor;
  }

  // =========================================================================
  // Getters por TAB
  // =========================================================================
  get rolesDelTabActivo(): string[] {
    if (this.tabActivo === 'coordinadores') return ListarTodaAgendasComponent.ROLES_COORDINADOR;
    if (this.tabActivo === 'asesores') return ListarTodaAgendasComponent.ROLES_ASESOR;
    return [];
  }

  get rolesDisponiblesDelTab(): { valor: string; label: string; color: string }[] {
    return this.rolesDisponibles.filter(r => this.rolesDelTabActivo.includes(r.valor));
  }

  get agendasDelTab(): any[] {
    const roles = this.rolesDelTabActivo;
    return this.agendasFiltradas.filter(item => {
      const rol = (item.rol || '').toLowerCase().trim();
      return roles.includes(rol) || (this.tabActivo === 'coordinadores' && !rol);
    });
  }

  get countAdmin(): number {
    return this.agendas.filter(item => {
      const rol = (item.rol || '').toLowerCase().trim();
      return ListarTodaAgendasComponent.ROLES_ADMIN.includes(rol) || !rol;
    }).length;
  }

  get countCoordinadores(): number {
    return this.agendas.filter(item =>
      ListarTodaAgendasComponent.ROLES_COORDINADOR.includes((item.rol || '').toLowerCase().trim())
    ).length;
  }

  get countAsesores(): number {
    return this.agendas.filter(item =>
      ListarTodaAgendasComponent.ROLES_ASESOR.includes((item.rol || '').toLowerCase().trim())
    ).length;
  }

  // Paginación por tab
  get agendasPaginadasDelTab(): any[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.agendasDelTab.slice(inicio, fin);
  }

  get totalPaginasDelTab(): number {
    return Math.ceil(this.agendasDelTab.length / this.elementosPorPagina) || 1;
  }

  cambiarTab(tab: 'coordinadores' | 'asesores'): void {
    this.tabActivo = tab;
    this.paginaActual = 1;
    this.rolSeleccionado = '';
    this.usuarioSeleccionado = '';
    this.aplicarFiltros();
  }

  // =========================================================================
  // SUB-PESTAÑAS: PERSONAS DEL TAB ACTIVO (COORDINADORES O ASESORES)
  // =========================================================================
  get personasDelTabActivo(): SubTabPersona[] {
    const mapa = new Map<string, { clave: string; nombre: string; usuario: string; aliases: Set<string> }>();
    const rolesTab = this.rolesDelTabActivo;
    const esCoord = this.tabActivo === 'coordinadores';

    // 1. Extraer todas las personas únicas pertenecientes a este rol
    for (const ag of this.agendas) {
      const rol = (ag.rol || '').toLowerCase().trim();
      const coincideRol = rolesTab.includes(rol) || (esCoord && !rol);
      if (!coincideRol) continue;

      const u = (ag.usuario || '').trim();
      const n = (ag.nombre || '').trim();
      const claveU = u.toLowerCase();
      const claveN = n.toLowerCase();
      if (!claveU && !claveN) continue;

      let personaExistente: { clave: string; nombre: string; usuario: string; aliases: Set<string> } | undefined;
      for (const item of mapa.values()) {
        if ((claveU && item.aliases.has(claveU)) || (claveN && item.aliases.has(claveN))) {
          personaExistente = item;
          break;
        }
      }

      if (personaExistente) {
        if (claveU) personaExistente.aliases.add(claveU);
        if (claveN) personaExistente.aliases.add(claveN);
        if (n && n.toLowerCase() !== personaExistente.usuario.toLowerCase() && personaExistente.nombre.toLowerCase() === personaExistente.usuario.toLowerCase()) {
          personaExistente.nombre = n;
        }
        if (u && !personaExistente.usuario) {
          personaExistente.usuario = u;
        }
      } else {
        const clavePrincipal = claveU || claveN;
        const aliases = new Set<string>();
        if (claveU) aliases.add(claveU);
        if (claveN) aliases.add(claveN);
        mapa.set(clavePrincipal, {
          clave: clavePrincipal,
          nombre: n || u,
          usuario: u,
          aliases
        });
      }
    }

    // 2. Actividades que cumplen los filtros base (sin filtro de usuario)
    const baseItems = this.agendas.filter(item => this.cumpleFiltrosBase(item));

    // 3. Crear lista ordenada con conteos e iniciales
    return Array.from(mapa.values())
      .map(p => ({
        valor: p.clave,
        label: p.nombre,
        usuario: p.usuario,
        iniciales: this.obtenerIniciales(p.nombre || p.usuario),
        aliases: p.aliases,
        count: baseItems.filter(item => this.coincideUsuarioConPersona(item, p)).length
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get countTotalDelTab(): number {
    return this.agendas.filter(item => this.cumpleFiltrosBase(item)).length;
  }

  seleccionarPersona(valor: string): void {
    this.usuarioSeleccionado = valor;
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  esPersonaSeleccionada(p: SubTabPersona): boolean {
    if (!this.usuarioSeleccionado) return false;
    const uSelLower = this.usuarioSeleccionado.toLowerCase().trim();
    return p.valor === uSelLower || (p.aliases && p.aliases.has(uSelLower));
  }

  obtenerIniciales(texto: string): string {
    if (!texto) return 'U';
    const partes = texto.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return texto.substring(0, 2).toUpperCase();
  }

  coincideUsuarioConPersona(item: any, persona: { valor?: string; clave?: string; aliases?: Set<string> }): boolean {
    if (!persona) return false;
    const itemUser = (item.usuario || '').toLowerCase().trim();
    const itemNombre = (item.nombre || '').toLowerCase().trim();

    if (persona.aliases) {
      if (itemUser && persona.aliases.has(itemUser)) return true;
      if (itemNombre && persona.aliases.has(itemNombre)) return true;
    }

    const valorLower = (persona.valor || persona.clave || '').toLowerCase().trim();
    return itemUser === valorLower || itemNombre === valorLower;
  }

  coincideUsuarioConSeleccionado(item: any, uSel: string): boolean {
    if (!uSel) return true;
    const uSelLower = uSel.toLowerCase().trim();
    const itemUser = (item.usuario || '').toLowerCase().trim();
    const itemNombre = (item.nombre || '').toLowerCase().trim();

    const persona = this.personasDelTabActivo.find(p =>
      p.valor === uSelLower || (p.aliases && p.aliases.has(uSelLower))
    );

    if (persona) {
      return this.coincideUsuarioConPersona(item, persona);
    }

    return itemUser === uSelLower || itemNombre === uSelLower;
  }

  get listaUsuarios(): { valor: string; label: string }[] {
    return this.personasDelTabActivo.map(p => ({ valor: p.valor, label: p.label }));
  }

  getNombreUsuarioSeleccionado(): string {
    if (!this.usuarioSeleccionado) return '';
    const uSelLower = this.usuarioSeleccionado.toLowerCase().trim();
    const encontrado = this.personasDelTabActivo.find(p =>
      p.valor === uSelLower || (p.aliases && p.aliases.has(uSelLower))
    );
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

    // Asignar automáticamente el rango de la semana operativa actual (Viernes a Jueves)
    this.establecerFiltroSemanaActual(false);

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

    // Asegurar que la semana operativa actual esté disponible en las opciones
    const semActual = this.obtenerRangoSemanaOperativa().semanaLabel;
    if (semActual) {
      conjuntoSemanas.add(semActual);
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

    this.agendaAdminService.obtenerAllAgendas().subscribe({
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
  cumpleFiltrosBase(item: any): boolean {
    const rol = (item.rol || '').toLowerCase().trim();
    const rolesTab = this.rolesDelTabActivo;
    const esCoord = this.tabActivo === 'coordinadores';

    // 0. Pertenencia al tab activo
    const coincideRolTab = rolesTab.includes(rol) || (esCoord && !rol);
    if (!coincideRolTab) {
      return false;
    }

    // 1. Restricción por usuario si no es admin ni supervisor
    if (!this.esAdminOSupervisor) {
      const uActual = (this.usuarioActual || '').toLowerCase().trim();
      const nActual = (this.nombreActual || '').toLowerCase().trim();
      const itemUser = (item.usuario || '').toLowerCase().trim();
      const itemNombre = (item.nombre || '').toLowerCase().trim();

      const coincideUsuario = (uActual && (itemUser === uActual || itemNombre === uActual)) ||
        (nActual && (itemNombre === nActual || itemUser === nActual));
      if (!coincideUsuario) {
        return false;
      }
    }

    // 2. Filtro de búsqueda textual
    const termino = (this.busqueda || '').toLowerCase().trim();
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

    // 3. Filtro por Semana
    if (this.semanaSeleccionada && item.semana !== this.semanaSeleccionada) {
      return false;
    }

    // 4. Filtro por Rol específico
    if (this.rolSeleccionado && (item.rol || '').toLowerCase() !== this.rolSeleccionado.toLowerCase()) {
      return false;
    }

    // 5. Filtro por Rango de Fechas
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
  }

  aplicarFiltros(): void {
    const uSel = (this.usuarioSeleccionado || '').toLowerCase().trim();

    this.agendasFiltradas = this.agendas.filter(item => {
      if (!this.cumpleFiltrosBase(item)) {
        return false;
      }

      // Si hay un coordinador / asesor seleccionado en las sub-pestañas o select
      if (uSel && !this.coincideUsuarioConSeleccionado(item, uSel)) {
        return false;
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

  // =========================================================================
  // GESTIÓN DE SEMANA OPERATIVA (VIERNES A JUEVES)
  // =========================================================================
  /**
   * Calcula el rango de la semana operativa (inicia en Viernes y termina en Jueves)
   * a partir de una fecha de referencia.
   */
  obtenerRangoSemanaOperativa(fechaReferencia: Date = new Date()): {
    fechaInicio: string;
    fechaFin: string;
    numSemana: number;
    semanaLabel: string;
  } {
    const d = new Date(fechaReferencia);
    d.setHours(0, 0, 0, 0);

    // En JavaScript: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
    // Días hacia atrás para llegar al viernes de inicio de la semana operativa:
    const diasHastaViernes = (d.getDay() - 5 + 7) % 7;

    const viernes = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diasHastaViernes);
    // El final de la semana operativa es exactamente el jueves siguiente (+6 días):
    const jueves = new Date(viernes.getFullYear(), viernes.getMonth(), viernes.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, '0');
    const fechaInicio = `${viernes.getFullYear()}-${pad(viernes.getMonth() + 1)}-${pad(viernes.getDate())}`;
    const fechaFin = `${jueves.getFullYear()}-${pad(jueves.getMonth() + 1)}-${pad(jueves.getDate())}`;

    const numSemana = this.getWeekNumber(viernes);
    const semanaLabel = `SEMANA ${numSemana}`;

    return { fechaInicio, fechaFin, numSemana, semanaLabel };
  }

  /**
   * Calcula las fechas de inicio (Viernes) y fin (Jueves) dada una etiqueta de semana (ej: 'SEMANA 41')
   */
  obtenerRangoFechasPorSemana(semanaStr: string): { fechaInicio: string; fechaFin: string } | null {
    if (!semanaStr) return null;
    const numSemana = parseInt(semanaStr.replace(/\D/g, ''), 10);
    if (!numSemana) return null;

    let anio = new Date().getFullYear();
    const agendaMismaSemana = this.agendas.find(
      ag => (ag.semana || '').toUpperCase() === semanaStr.toUpperCase() && ag.fecha
    );
    if (agendaMismaSemana) {
      const fStr = typeof agendaMismaSemana.fecha === 'string'
        ? agendaMismaSemana.fecha
        : new Date(agendaMismaSemana.fecha).toISOString();
      const anioEncontrado = parseInt(fStr.substring(0, 4), 10);
      if (anioEncontrado) anio = anioEncontrado;
    }

    const firstJan = new Date(anio, 0, 1);
    const dayOfWeek = firstJan.getDay();
    const daysToFirstFriday = (5 - dayOfWeek + 7) % 7;
    const firstFriday = new Date(anio, 0, 1 + daysToFirstFriday);

    const viernes = new Date(firstFriday.getFullYear(), firstFriday.getMonth(), firstFriday.getDate() + (numSemana - 1) * 7);
    const jueves = new Date(viernes.getFullYear(), viernes.getMonth(), viernes.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, '0');
    const fechaInicio = `${viernes.getFullYear()}-${pad(viernes.getMonth() + 1)}-${pad(viernes.getDate())}`;
    const fechaFin = `${jueves.getFullYear()}-${pad(jueves.getMonth() + 1)}-${pad(jueves.getDate())}`;

    return { fechaInicio, fechaFin };
  }

  /**
   * Asigna automáticamente el rango de la semana operativa actual (Viernes a Jueves)
   */
  establecerFiltroSemanaActual(aplicar: boolean = true): void {
    const rango = this.obtenerRangoSemanaOperativa(new Date());
    this.fechaInicio = rango.fechaInicio;
    this.fechaFin = rango.fechaFin;
    //this.semanaSeleccionada = rango.semanaLabel;
    if (aplicar) {
      this.aplicarFiltros();
    }
  }

  /**
   * Al seleccionar o cambiar la fecha 'Desde', ajusta automáticamente el rango
   * a la semana operativa correspondiente (Viernes a Jueves).
   */
  onFechaInicioChange(): void {
    if (this.fechaInicio) {
      const [y, m, d] = this.fechaInicio.split('-').map(Number);
      if (y && m && d) {
        const fecha = new Date(y, m - 1, d);
        const rango = this.obtenerRangoSemanaOperativa(fecha);
        this.fechaInicio = rango.fechaInicio;
        this.fechaFin = rango.fechaFin;
        this.semanaSeleccionada = rango.semanaLabel;
      }
    }
    this.aplicarFiltros();
  }

  /**
   * Al cambiar el selector de semana, asigna automáticamente fechaInicio (Viernes) y fechaFin (Jueves).
   */
  onSemanaChange(): void {
    if (this.semanaSeleccionada) {
      const rango = this.obtenerRangoFechasPorSemana(this.semanaSeleccionada);
      if (rango) {
        this.fechaInicio = rango.fechaInicio;
        this.fechaFin = rango.fechaFin;
      }
    } else {
      this.fechaInicio = '';
      this.fechaFin = '';
    }
    this.aplicarFiltros();
  }

  establecerFiltroHoy(): void {
    const d = new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.fechaInicio = hoy;
    this.fechaFin = hoy;
    this.semanaSeleccionada = '';
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
    this.semanaSeleccionada = '';
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
    const datosExportar = this.agendasDelTab;
    if (datosExportar.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos para exportar',
        text: 'No hay actividades en la pestaña actual con los filtros seleccionados.'
      });
      return;
    }

    try {
      const dataParaExcel = datosExportar.map((item, index) => {
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
          'Descripción de la Actividad': item.actividad || 'N/A',
          'Código de Actividad': item.codigo || 'N/A'
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
        { wch: 45 },   // Actividad
        { wch: 20 }    // Código de Actividad
      ];

      const workbook: XLSX.WorkBook = {
        Sheets: { 'Actividades': worksheet },
        SheetNames: ['Actividades']
      };

      const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const d = new Date();
      const fechaHoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const nombreUsuario = this.usuarioSeleccionado ? `_${this.getNombreUsuarioSeleccionado().replace(/\s+/g, '_')}` : '';
      const nombreArchivo = `Agenda_${this.tabActivo}${nombreUsuario}_${fechaHoy}.xlsx`;

      FileSaver.saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), nombreArchivo);

      Swal.fire({
        icon: 'success',
        title: '¡Exportación exitosa!',
        text: `Se exportaron ${datosExportar.length} actividad(es) a Excel.`,
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
    const datosExportar = this.agendasDelTab;
    if (datosExportar.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos para exportar',
        text: 'No hay actividades en la pestaña actual con los filtros seleccionados.'
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

      const tituloRol = this.tabActivo === 'coordinadores' ? 'Coordinadores' : 'Asesores';
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`Reporte de Actividades Agendadas (${tituloRol})`, 30, 32);

      doc.setFontSize(10);
      doc.setTextColor(220, 230, 250);
      doc.text(`Fecha de emisión: ${fechaHoy}`, doc.internal.pageSize.width - 30, 32, { align: 'right' });

      // Subtítulo con filtros aplicados
      let filtrosAplicados = `Total: ${datosExportar.length} actividades`;
      if (this.usuarioSeleccionado) {
        filtrosAplicados += ` | Responsable: ${this.getNombreUsuarioSeleccionado()}`;
      }
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
      const tableBody = datosExportar.map((item, index) => {
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

      const nombreUsuario = this.usuarioSeleccionado ? `_${this.getNombreUsuarioSeleccionado().replace(/\s+/g, '_')}` : '';
      const nombrePDF = `Agenda_${this.tabActivo}${nombreUsuario}_${new Date().toISOString().substring(0, 10)}.pdf`;
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
      case 'asesor':
        return 'badge-role-asesor';
      case 'coordinador':
        return 'badge-role-coord';
      default:
        return 'badge-role-general';
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

}
