import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AgendaAdminService } from '../../../services/agenda-admin.service';
import Swal from 'sweetalert2';

const SEMANAS_ANIO = 53;

export interface Actividad {
  hora: string;
  domicilio: string;
  actividad: string;
}

@Component({
  selector: 'app-registrar-agenda-admin',
  standalone: false,
  templateUrl: './registrar-agenda.component.html',
  styleUrl: './registrar-agenda.component.css'
})
export class RegistrarAgendaAdminComponent implements OnInit {
  usuario = '';
  nombre = '';
  coordinacion = '';
  fechaActual = new Date();

  get asesorNombre(): string {
    return this.nombre || this.usuario;
  }

  rol = '';
  semanas: string[] = [];
  selectedObjetivos: string[] = [];

  // Formulario
  formulario!: FormGroup;

  // Configuración de SweetAlert
  private swalConfig = {
    success: {
      title: '¡Éxito!',
      icon: 'success' as const,
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'Aceptar'
    },
    error: {
      title: 'Error',
      icon: 'error' as const,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Entendido'
    },
    warning: {
      title: 'Advertencia',
      icon: 'warning' as const,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Entendido'
    },
    info: {
      title: 'Información',
      icon: 'info' as const,
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'Aceptar'
    }
  };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private agendaAdminService: AgendaAdminService
  ) {
    this.generateWeeks();
  }

  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO }, (_, i) => `SEMANA ${i + 1}`);
  }

  private updateSemana(fechaStr: string): void {
    const fecha = new Date(fechaStr);
    // Ajustar zona horaria sumando los minutos de offset
    const fechaAjustada = new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);
    const numeroSemana = this.getWeekNumber(fechaAjustada);
    const semanaStr = `SEMANA ${numeroSemana}`;

    // Verificar si la semana existe en el array, si no, seleccionarla de todos modos o manejarlo
    if (this.semanas.includes(semanaStr)) {
      this.formulario.get('semana')?.setValue(semanaStr);
    }
  }

  private getWeekNumber(d: Date): number {
    const year = d.getFullYear();
    const firstJan = new Date(year, 0, 1);
    const dayOfWeek = firstJan.getDay(); // 0 (Sun) to 6 (Sat)

    // El primer viernes del año
    // Si Jan 1 es Viernes (5), daysToFirstFriday es 0.
    const daysToFirstFriday = (5 - dayOfWeek + 7) % 7;
    const firstFriday = new Date(year, 0, 1 + daysToFirstFriday);
    firstFriday.setHours(0, 0, 0, 0);

    // Copia de la fecha para comparar solo fecha sin hora
    const targetDate = new Date(d.getTime());
    targetDate.setHours(0, 0, 0, 0);

    // Si la fecha es anterior al primer viernes del año, pertenece a la última semana del año anterior
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

  private obtenerNombreDeUsuario(): string {
    // 1. Intentar desde método getNombre del servicio de autenticación
    const nombreAuth = this.auth.getNombre?.();
    if (nombreAuth) return nombreAuth;

    // 2. Intentar decodificar el payload del token JWT
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.nombre) {
          return payload.nombre;
        }
      } catch (e) {}
    }

    // 3. Revisar si está guardado directamente en localStorage como 'nombre'
    const localNombre = localStorage.getItem('nombre');
    if (localNombre) return localNombre;

    // 4. Revisar si 'usuario' o 'user' en localStorage es un objeto JSON con campo 'nombre'
    try {
      const rawUser = localStorage.getItem('usuario') || localStorage.getItem('user');
      if (rawUser && (rawUser.startsWith('{') || rawUser.startsWith('['))) {
        const parsed = JSON.parse(rawUser);
        if (parsed && parsed.nombre) {
          return parsed.nombre;
        }
      }
    } catch (e) {}

    return '';
  }

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario() || '';
    this.nombre = this.obtenerNombreDeUsuario();
    this.coordinacion = this.auth.obtenerCoordinacion() || '';
    this.rol = this.auth.getRol() || '';

    this.formulario = this.fb.group({
      asesor: [{ value: this.asesorNombre, disabled: true }],
      coordinacion: [{ value: this.coordinacion, disabled: true }],
      semana: [{ value: '', disabled: true }, Validators.required],
      fecha: ['', Validators.required],
      objetivo: [''],
      firma: [''],
      actividades: this.fb.array([this.crearActividad()])
    });

    // Suscribirse a cambios en la fecha para actualizar la semana
    this.formulario.get('fecha')?.valueChanges.subscribe(fecha => {
      if (fecha) {
        this.updateSemana(fecha);
      }
    });

    // Establecer fecha actual local por defecto
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.formulario.patchValue({ fecha: today });
  }

  // ====== FORM ARRAY ======
  get actividades(): FormArray {
    return this.formulario.get('actividades') as FormArray;
  }

  crearActividad(horaInicial: string = '08:00'): FormGroup {
    return this.fb.group({
      hora: [horaInicial, [Validators.required, horaLaboralValidator]],
      domicilio: [''],
      actividad: [''],
      acordeObjetivo: [false],
      traslado: ['NO'],
      kmRecorrido: [0],
      codigo: ['']
    });
  }

  agregarActividad(): void {
    let proximaHora = '08:00';
    if (this.actividades.length > 0) {
      const ultimaActividad = this.actividades.at(this.actividades.length - 1);
      const ultimaHora = ultimaActividad.get('hora')?.value;
      if (ultimaHora && typeof ultimaHora === 'string' && ultimaHora.includes(':')) {
        const [hh, mm] = ultimaHora.split(':').map(Number);
        const sigH = (hh || 8) + 1;
        if (sigH >= 8 && sigH <= 19) {
          proximaHora = `${sigH.toString().padStart(2, '0')}:${(mm || 0).toString().padStart(2, '0')}`;
        }
      }
    }
    this.actividades.push(this.crearActividad(proximaHora));
  }

  eliminarActividad(index: number): void {
    if (this.actividades.length > 1) {
      this.actividades.removeAt(index);
    } else {
      this.showWarning('No se puede eliminar', 'Debe existir al menos una actividad en la agenda');
    }
  }

  // ====== OBJETIVOS ======
  objetivosDisponibles: string[] = [
    'Reducir mora',
    'Clientes nuevos',
    'Cierre de fichas',
    'Grupos nuevos',
    'Renovación de lo proyectado'
  ];

  onObjetivoToggle(event: any): void {
    const value = event.target.value;
    if (event.target.checked) {
      this.selectedObjetivos.push(value);
    } else {
      this.selectedObjetivos = this.selectedObjetivos.filter(o => o !== value);
    }
  }

  // ====== MÉTODOS SWEETALERT ======
  private showError(title: string, message: string): Promise<any> {
    return Swal.fire({
      ...this.swalConfig.error,
      title,
      text: message
    });
  }

  private showSuccess(title: string, message: string): Promise<any> {
    return Swal.fire({
      ...this.swalConfig.success,
      title,
      text: message
    });
  }

  private showWarning(title: string, message: string): Promise<any> {
    return Swal.fire({
      ...this.swalConfig.warning,
      title,
      text: message
    });
  }

  private showInfo(title: string, message: string): Promise<any> {
    return Swal.fire({
      ...this.swalConfig.info,
      title,
      text: message
    });
  }

  private showConfirm(title: string, text: string): Promise<any> {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    });
  }

  // ====== VALIDACIÓN DE FORMULARIO ======
  private validarFormulario(): boolean {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();

      // Obtener campos inválidos
      const invalidFields = this.getInvalidFields();

      if (invalidFields.length > 0) {
        const message = `Por favor completa los siguientes campos requeridos:\n\n${invalidFields.join('\n')}`;
        this.showError('Campos incompletos', message);
      } else {
        this.showError('Formulario incompleto', 'Por favor completa todos los campos requeridos');
      }

      return false;
    }
    // Validar que todas las actividades tengan hora
    const actividadesInvalidas = this.actividades.controls
      .filter((act, index) => !act.get('hora')?.valid)
      .map((_, index) => `Actividad ${index + 1}`);

    if (actividadesInvalidas.length > 0) {
      const message = `Las siguientes actividades no tienen hora especificada:\n\n${actividadesInvalidas.join('\n')}`;
      this.showError('Horas incompletas', message);
      return false;
    }

    return true;
  }

  private getInvalidFields(): string[] {
    const invalidFields: string[] = [];

    // Validar campos principales
    const mainFields = [
      { name: 'semana', label: 'Semana' },
      { name: 'fecha', label: 'Fecha' }
    ];

    mainFields.forEach(field => {
      if (this.formulario.get(field.name)?.invalid) {
        invalidFields.push(`• ${field.label}`);
      }
    });

    return invalidFields;
  }

  // ====== GUARDAR AGENDA ======
  async guardarAgenda(): Promise<void> {
    if (!this.validarFormulario()) {
      return;
    }

    const confirm = await this.showConfirm(
      'Confirmar guardado',
      `¿Estás seguro de guardar ${this.actividades.length} actividad(es)?`
    );

    if (!confirm.isConfirmed) {
      return;
    }

    const raw = this.formulario.getRawValue();
    const objetivo = this.selectedObjetivos.join(', ');

    try {
      // Mostrar loader
      Swal.fire({
        title: 'Guardando...',
        text: 'Por favor espera mientras se guardan las actividades',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Crear array de promesas
      const requests = this.actividades.controls.map((actividadControl, index) => {
        const actividad = actividadControl.value;

        const payload = {
          usuario: this.usuario || this.asesorNombre,
          nombre: this.asesorNombre,
          rol: this.rol,
          semana: raw.semana,
          fecha: raw.fecha,
          hora: actividad.hora,
          domicilio: actividad.domicilio,
          actividad: actividad.actividad
        };

        return this.agendaAdminService.registrarAgenda(payload).toPromise();
      });

      // Ejecutar todas las peticiones
      const results = await Promise.all(requests);

      // Cerrar loader
      Swal.close();

      await this.showSuccess(
        '¡Guardado exitoso!',
        `Se guardaron ${results.length} actividad(es) correctamente`
      );

      this.resetForm();

    } catch (error: any) {
      Swal.close();

      console.error('Error al guardar actividades:', error);

      let errorMessage = 'Ocurrió un error al guardar las actividades';

      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      await this.showError(
        'Error al guardar',
        errorMessage
      );
    }
  }

  resetForm(): void {
    this.formulario.reset({
      asesor: this.asesorNombre,
      coordinacion: this.coordinacion
    });
    this.actividades.clear();
    this.agregarActividad();
    this.selectedObjetivos = [];
  }

  async cancelar(): Promise<void> {
    const confirm = await this.showConfirm(
      'Confirmar cancelación',
      '¿Estás seguro de cancelar? Se perderán todos los datos no guardados.'
    );

    if (confirm.isConfirmed) {
      this.resetForm();
      await this.showInfo('Formulario cancelado', 'El formulario ha sido restablecido');
    }
  }


  // Para formatear la hora
  getHoraFormateada(hora: string): string {
    if (!hora) return '--:--';
    return hora.substring(0, 5);
  }

  // Para calcular horas totales aproximadas o rango
  calcularTotalHoras(): number {
    return this.actividades.length;
  }

  getRangoHorario(): string {
    const horas = this.actividades.controls
      .map(c => c.get('hora')?.value)
      .filter(h => !!h && typeof h === 'string' && h.includes(':'))
      .sort();

    if (horas.length === 0) return 'Sin horario';
    if (horas.length === 1) return `A las ${horas[0]}`;
    return `${horas[0]} a ${horas[horas.length - 1]}`;
  }

  duplicarActividad(index: number): void {
    const act = this.actividades.at(index).value;
    let proximaHora = '08:00';
    if (act.hora && typeof act.hora === 'string' && act.hora.includes(':')) {
      const [hh, mm] = act.hora.split(':').map(Number);
      const sigH = (hh || 8) + 1;
      if (sigH >= 8 && sigH <= 19) {
        proximaHora = `${sigH.toString().padStart(2, '0')}:${(mm || 0).toString().padStart(2, '0')}`;
      }
    }
    const nueva = this.crearActividad(proximaHora);
    nueva.patchValue({
      domicilio: act.domicilio || '',
      actividad: act.actividad || '',
      codigo: act.codigo || ''
    });
    this.actividades.push(nueva);
  }


  // Para limpiar el formulario
  limpiarFormulario(): void {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Se eliminarán todas las actividades registradas y se limpiará el formulario. ¡Esta acción es irreversible!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, limpiar todo",
      cancelButtonText: "Cancelar"
    }).then((result) => {
      if (result.isConfirmed) {
        this.resetForm();
        Swal.fire({
          title: "¡Limpiado!",
          text: "El formulario ha sido restablecido correctamente.",
          icon: "success"
        });
      }
    });
  }
}

export function horaLaboralValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;

  const horaSeleccionada = control.value; // formato "HH:mm"
  const [hora, minuto] = horaSeleccionada.split(':').map(Number);
  const totalMinutos = hora * 60 + minuto;

  const inicio = 8 * 60;    // 8:00 am en minutos
  const fin = 19 * 60;      // 7:00 pm en minutos

  if (totalMinutos < inicio || totalMinutos > fin) {
    return { horaInvalida: true };
  }

  return null;
}