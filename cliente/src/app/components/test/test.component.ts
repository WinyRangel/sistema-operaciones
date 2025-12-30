import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-test',
  standalone: false,
  templateUrl: './test.component.html',
  styleUrl: './test.component.css'
})
export class TestComponent {
  // ====== SELECT SEMANAS ======
  semanas: string[] = [
    'Semana 1',
    'Semana 2',
    'Semana 3',
    'Semana 4'
  ];

  // ====== OBJETIVOS ======
  objetivosDisponibles: string[] = [
    'Seguimiento',
    'Capacitación',
    'Planeación',
    'Evaluación'
  ];

  selectedObjetivos: string[] = [];

  // ====== FORMULARIO ======
  formulario!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.formulario = this.fb.group({
      asesor: ['', Validators.required],
      fecha: ['', Validators.required],
      meta: [''],
      cumplimientoAgenda: [false],
      actividades: this.fb.array([
        this.crearActividad()
      ])
    });
  }

  // ====== FORM ARRAY ======
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
    this.actividades.removeAt(index);
  }

  // ====== OBJETIVOS ======
  onObjetivoToggle(event: any): void {
    const value = event.target.value;

    if (event.target.checked) {
      this.selectedObjetivos.push(value);
    } else {
      this.selectedObjetivos = this.selectedObjetivos.filter(o => o !== value);
    }
  }
  opcionesCodigo = [
    { value: 'R', texto: 'R | Pago', color: '#E6D85C' },
    { value: 'RP', texto: 'R/P | Pago / levantamiento de papelería', color: '#F2B366' },
    { value: 'C', texto: 'C | Cobranza', color: '#4DD0E1' },
    { value: 'VTA', texto: 'VTA | Promoción', color: '#7ED957' },
    { value: 'REC', texto: 'R/EC | Pago / Entrega / Cambio ciclo', color: '#EC4899' },
    { value: 'RER', texto: 'R/ER | Pago / Entrega / Refil', color: '#A855F7' },
    { value: 'GN', texto: 'GN | Grupos nuevos', color: '#EF4444' }
  ];
  
  onCodeChange(event: any, index: number): void {
    const control = this.actividades.at(index).get('codigo');
    const current = control?.value ? control.value.split(',') : [];

    if (event.target.checked) {
      current.push(event.target.value);
    } else {
      const i = current.indexOf(event.target.value);
      if (i > -1) current.splice(i, 1);
    }

    control?.setValue(current.join(','));
  }
}