import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-agenda-form',
  standalone: false,
  templateUrl: './agenda-form.component.html',
  styleUrl: './agenda-form.component.css'
})
export class AgendaFormComponent {
 @Input() coordinaciones: any[] = [];
  @Input() domicilios: string[] = [];
  @Output() onRegister = new EventEmitter<FormGroup>();

  form!: FormGroup;
  semanas: string[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      coordinador: [''],
      semana: ['', Validators.required],
      fecha: ['', Validators.required],
      objetivo: [''],
      cumplimientoAgenda: [false],
      actividades: this.fb.array([this.crearActividad()])
    });
    this.semanas = Array.from({ length: 52 }, (_, i) => `SEMANA ${i + 1}`);
  }

  get actividades() { return this.form.get('actividades') as FormArray; }
  crearActividad() { return this.fb.group({ hora: ['', Validators.required], horaFin: ['', Validators.required], domicilio: [''], actividad: [''], codigo: [''], traslado: ['', Validators.required], kmRecorrido: [''] }); }

  agregarActividad() { this.actividades.push(this.crearActividad()); }
  eliminarActividad(i: number) { this.actividades.removeAt(i); }

  submit() {
    if (this.form.valid) {
      this.onRegister.emit(this.form);
      this.form.reset();
      this.actividades.clear();
      this.agregarActividad();
    }
  }
}
