import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CoordinacionService } from '../../services/coordinacion.service';

const SEMANAS_ANIO = 53;

export interface Actividad {
  hora: string;
  domicilio: string;
  actividad: string;
  codigo: string;
  acordeObjetivo: boolean;
  traslado: string;
  kmRecorrido: number;
}

@Component({
  selector: 'app-test',
  standalone: false,
  templateUrl: './test.component.html',
  styleUrl: './test.component.css'
})
export class TestComponent implements OnInit {
  usuario = '';
  coordinacion = '';
  rol = '';
  semanas: string[] = [];
  selectedObjetivos: string[] = [];

  // Formulario
  formulario!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private coordinacionService: CoordinacionService
  ) {
    this.generateWeeks();
  }

  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO }, (_, i) => `SEMANA ${i + 1}`);
  }

  ngOnInit(): void {
    this.usuario = this.auth.getUsuario() || '';
    this.coordinacion = this.auth.obtenerCoordinacion() || '';
    this.rol = this.auth.getRol() || '';

    this.formulario = this.fb.group({
      asesor: [{ value: this.usuario, disabled: true }],
      coordinacion: [{ value: this.coordinacion, disabled: true }],
      semana: ['', Validators.required],
      fecha: ['', Validators.required],
      objetivo: [''],
      firma: [''],
      // Mantenemos el FormArray para el formulario, pero cada actividad se guardará como documento independiente
      actividades: this.fb.array([this.crearActividad()])
    });
  }

  // ====== FORM ARRAY (solo para UI) ======
  get actividades(): FormArray {
    return this.formulario.get('actividades') as FormArray;
  }

  crearActividad(): FormGroup {
    return this.fb.group({
      hora: ['', Validators.required],
      domicilio: [''],
      actividad: [''],
      acordeObjetivo: [false],
      traslado: ['NO'],
      kmRecorrido: [0],
      codigo: ['']
    });
  }

  agregarActividad(): void {
    this.actividades.push(this.crearActividad());
  }

  eliminarActividad(index: number): void {
    if (this.actividades.length > 1) {
      this.actividades.removeAt(index);
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

  // ====== GUARDAR (Cada actividad como documento) ======
  guardarAgenda(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const raw = this.formulario.getRawValue();
    const objetivo = this.selectedObjetivos.join(',');

    // Crear un array de promesas para guardar cada actividad
    const requests = this.actividades.controls.map((actividadControl, index) => {
      const actividad = actividadControl.value;

      // Crear payload para cada actividad/documento
      const payload = {
        asesor: raw.asesor,
        coordinacion: raw.coordinacion,
        semana: raw.semana,
        fecha: raw.fecha,
        objetivo: objetivo,
        firma: raw.firma,
        // Campos de actividad individual
        hora: actividad.hora,
        domicilio: actividad.domicilio,
        actividad: actividad.actividad,
        codigo: actividad.codigo,
        acordeObjetivo: actividad.acordeObjetivo,
        traslado: actividad.traslado,
        kmRecorrido: actividad.kmRecorrido,
        // Campo opcional para coordinador
        coordinadorNombre: this.rol === 'coordinador' ? this.usuario : undefined
      };

      console.log(`Enviando actividad ${index + 1}:`, payload);
      return this.coordinacionService.guardarAgendaAsesor(payload).toPromise();
    });

    // Ejecutar todas las peticiones
    Promise.all(requests)
      .then(() => {
        alert(`¡Éxito! ${requests.length} actividad(es) guardada(s)`);
        this.resetForm();
      })
      .catch((error) => {
        console.error('Error al guardar actividades:', error);
        alert('Error al guardar una o más actividades');
      });
  }

  resetForm(): void {
    this.formulario.reset({
      asesor: this.usuario,
      coordinacion: this.coordinacion
    });
    this.actividades.clear();
    this.agregarActividad();
    this.selectedObjetivos = [];
  }

  // Opciones para código (igual que antes)
  opcionesCodigo = [
    { value: 'R', texto: 'R | Pago' },
    { value: 'RP', texto: 'R/P | Pago / levantamiento de papelería' },
    { value: 'C', texto: 'C | Cobranza' },
    { value: 'VTA', texto: 'VTA | Promoción' },
    { value: 'REC', texto: 'R/EC | Pago / Entrega / Cambio ciclo' },
    { value: 'RER', texto: 'R/ER | Pago / Entrega / Refil' },
    { value: 'GN', texto: 'GN | Grupos nuevos' }
  ];

  cancelar(): void {
    this.resetForm();
  }
}