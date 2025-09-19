import { Component } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion } from '../../../models/coordinacion';
import { Agenda, Domicilio } from '../../../models/agenda';
import Swal from 'sweetalert2';
import { horaLaboralValidator } from '../agendas/agendas.component';
import { AuthService } from '../../../services/auth.service';

// Constantes para evitar "magic numbers/strings"
const RENDIMIENTO_POR_DEFECTO = 13;
const SEMANAS_ANIO = 52;
@Component({
  selector: 'app-registrar-agenda',
  standalone: false,
  templateUrl: './registrar-agenda.component.html',
  styleUrl: './registrar-agenda.component.css'
})
export class RegistrarAgendaComponent {
// En tu componente RecorridoAgendaComponent
  coordinacion: string[] = []; // Debes poblarlo en loadCoordinaciones


  //Variables para agenda
  registrarAgenda: FormGroup;
  coordinaciones: Coordinacion[] = [];
  agendas: any[] = []; // Lista completa de agendas

  //
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = ''; // por defecto
  coordinadorSeleccionado: string = '';
  //
  selectedObjetivos: string[] = [];
  semanas: string[] = [];
  totalKm: number = 0;
  precioPorLitro: number = 0;
  domicilios: string[] = ["NA"];
  rendimientosCoordinadores: { [nombre: string]: number } = {};
  selectedCode: string[] = [];


    meses: string[] = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  constructor(
    private fb: FormBuilder,
    private _coordinacionService: CoordinacionService,
    private authService: AuthService) {
    this.registrarAgenda = this.initForm();
    this.generateWeeks();
    codigo: this.fb.array([]) // almacenará un array de valores seleccionados

  }

  fixUTCDateToLocal(dateStr: string): Date {
    const date = new Date(dateStr);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }


  ngOnInit(): void {
    this.loadCoordinaciones();
    this.loadDomicilios();
    // this.setupFormListeners();
     this._coordinacionService.obtenerCoordinacion().subscribe(data => {
        this.coordinaciones = data;
      });

  }


  private initForm(): FormGroup {
    const coordinadorLogueado = this.authService.getUsuario();

    return this.fb.group({
      coordinador: [coordinadorLogueado || '', Validators.required],
      semana: ['', Validators.required],
      fecha: ['', Validators.required],
      objetivo: [''],
      meta: [''],
      cumplimientoAgenda: [false],
      actividades: this.fb.array([this.crearActividad()])
    });
  }




  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO },
      (_, i) => `SEMANA ${i + 1}`);
  }

  // Cargar datos iniciales
  private loadCoordinaciones(): void {
    this._coordinacionService.obtenerCoordinacion().subscribe(data => {
      this.coordinaciones = data;
      this.setRendimientos(data);
    });
  }


  private loadDomicilios(): void {
    this._coordinacionService.getDomicilios().subscribe((res: Domicilio[]) => {
      this.domicilios = res.map(d => d.nombre);
    });
  }

  private setRendimientos(coordinaciones: Coordinacion[]): void {
    this.rendimientosCoordinadores = coordinaciones.reduce((acc, coord) => {
      acc[coord.coordinador] = coord.rendimiento ?? RENDIMIENTO_POR_DEFECTO;
      return acc;
    }, {} as { [nombre: string]: number });
  }


  // Configurar listeners del formulario
  // private setupFormListeners(): void {
  //   this.registrarAgenda.get('traslado')?.valueChanges.subscribe(value => {
  //     const kmControl = this.registrarAgenda.get('kmRecorrido');
  //     value === 'SI' ? kmControl?.enable() : kmControl?.disable();
  //   });
  // }

  crearActividad(): FormGroup {
    return this.fb.group({
      hora: ['', [Validators.required, horaLaboralValidator]],
      domicilio: [''],
      actividad: [''],
      codigo: [''],
      acordeObjetivo: [false],
      traslado: ['', Validators.required],
      // kmRecorrido: ['']
    });

  }


  get actividades(): FormArray {
    return this.registrarAgenda.get('actividades') as FormArray;
  }

  agregarActividad(): void {
    this.actividades.push(this.crearActividad());
  }

  eliminarActividad(index: number): void {
    this.actividades.removeAt(index);
  }

  // CRUD operations
  RegistrarAgenda(): void {
    if (this.registrarAgenda.invalid) {
      this.showToast('error', 'Por favor, revisa los campos obligatorios del formulario.');
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Deseas registrar esta(s) actividad(es)?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.saveAgenda();
      }
    });
  }

  private saveAgenda(): void {
    const datos = this.registrarAgenda.value;
    const requests = this.actividades.value.map((actividad: any) => {
      const agenda: Agenda = {
        coordinador: datos.coordinador,
        semana: datos.semana,
        fecha: datos.fecha,
        objetivo: datos.objetivo,
        meta: datos.meta,
        cumplimientoAgenda: datos.cumplimientoAgenda,
        ...actividad
      };

      return this._coordinacionService.registrarAgenda(agenda);
    });

    Promise.all(requests.map((req: { toPromise: () => any; }) => req.toPromise()))
      .then(() => {
        this.showToast('success', 'Actividades registradas con éxito');
        this.refrescarAgendas();
        this.actividades.clear();
        this.actividades.push(this.crearActividad());
      })
      .catch(error => {
        console.error('Error al registrar agenda:', error);
        this.showToast('error', 'Error al registrar las actividades');
      });
  }


  seleccionarCoordinador(coord: Coordinacion | null): void {
    this.selectedCoord = coord;

    if (coord?.coordinador) {
      this.registrarAgenda.get('coordinador')?.setValue(coord.coordinador);
    } else {
      this.registrarAgenda.get('coordinador')?.setValue('');
    }
  }


  refrescarAgendas(): void {
    this._coordinacionService.obtenerAgendas().subscribe(data => {
      this.agendas = data.map((agenda: { fecha: string; }) => ({
        ...agenda,
        fecha: this.fixUTCDateToLocal(agenda.fecha)
      }));
    });
  }


    opcionesCodigo = [
      { value: 'AG', texto: 'AG | Aseo General', color: '#fdff9dff' },
      { value: 'GA', texto: 'GA | Gestión Administrativa', color: '#d7ff60ff' },
      { value: 'C', texto: 'C | Cobranza', color: '#00ff9dff' },
      { value: 'D', texto: 'D | Domiciliar', color: '#bcfff5ff' },
      { value: 'Dep', texto: 'Dep | Depósitar', color: '#b300ffff' },
      { value: 'E', texto: 'E | Entregas', color: '#00ffe5ff' },
      { value: 'GN', texto: 'GN | Grupo Nuevo', color: '#79afffff' },
      { value: 'INT', texto: 'INT | Integración', color: '#00d9ffff' },
      { value: 'R', texto: 'R | Pago', color: '#ff006fff' },
      { value: 'R/A', texto: 'R/A | Realizando Agendas', color: '#75a8ffff' },
      { value: 'RM', texto: 'RM | Reunión Mensual', color: '#ff0400ff' },
      { value: 'RS', texto: 'RS | Reunión Semanal', color: '#4dff00ff' },
      { value: 'VTA', texto: 'VTA | Promoción', color: '#00ddffff' },
      { value: 'Sup', texto: 'Sup | Supervisión', color: '#00c8ffff' },
      { value: 'S/Renov', texto: 'S/Renov | Sup.Renovación', color: '#2d00a0ff' },
      { value: 'Sin Codigo', texto: 'Sin código', color: '#ff93d9ff' },
      { value: '', texto: 'Actividades sin código', color: '#ffacccff' }
    ];


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

    onCodeChange(event: any, index: number) {
      const codigo = event.target.value;
      const isChecked = event.target.checked;
      const actividad = this.actividades.at(index);

      let selected = actividad.get('codigo')?.value ? actividad.get('codigo')?.value.split(',') : [];

      if (isChecked) {
        if (!selected.includes(codigo)) {
          selected.push(codigo);
        }
      } else {
        selected = selected.filter((c: string) => c !== codigo);
      }

      actividad.get('codigo')?.setValue(selected.join(','));
    }

      objetivosDisponibles: string[] = [
        'Reducir mora',
        'Grupos nuevos',
        'Clientes nuevos',
        'Cierre de fichas',
        'Renovación de lo proyectado'
      ];

        onObjetivoToggle(event: any) {
          const objetivo = event.target.value;
          const isChecked = event.target.checked;

          if (isChecked) {
            if (!this.selectedObjetivos.includes(objetivo)) {
              this.selectedObjetivos.push(objetivo);
            }
          } else {
            this.selectedObjetivos = this.selectedObjetivos.filter(o => o !== objetivo);
          }

          // ✅ Si quieres guardar en el form como string separado por comas
          this.registrarAgenda.get('objetivo')?.setValue(this.selectedObjetivos.join(','));
        }

}
