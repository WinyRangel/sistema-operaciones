import { Component, OnInit } from '@angular/core';
import { Coordinacion, Persona } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Agenda } from '../../../models/agenda';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-recorrido-agenda',
  standalone: false,
  templateUrl: './recorrido-agenda.component.html',
  styleUrls: ['./recorrido-agenda.component.css']
})
export class RecorridoAgendaComponent implements OnInit {
  coordinaciones: Coordinacion[] = [];
  isFormVisible: boolean = true;
  registrarAgenda: FormGroup;
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = 'Ismael'; // por defecto
  coordinadorSeleccionado: string = '';
  semanas: string[] = [];



  mostrarIsmael = false;
  mostrarFernanda = false;
  mostrarMartha = false;
  mostrarMayra = false;
  mostrarMagda = false;
  mostrarVictor = false;
  mostrarJimena = false;


  
  constructor(
    private fb: FormBuilder,
    private _coordinacionService: CoordinacionService
  ) {
    this.registrarAgenda = this.fb.group({
      coordinador: [''],
      semana: ['', Validators.required],
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      domicilio: [''],
      actividad: [''],
      codigo: [''],
      traslado: ['', Validators.required],
      kmRecorrido: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this._coordinacionService.obtenerCoordinacion().subscribe(data => {
      this.coordinaciones = data;
      this.registrarAgenda.get('kmRecorrido')?.disable();

      this.registrarAgenda.get('traslado')?.valueChanges.subscribe(value => {
        const kmControl = this.registrarAgenda.get('kmRecorrido');
        if (value === 'SI') {
          kmControl?.enable();
        } else {
          kmControl?.disable();
          kmControl?.reset();
        }
      });
    });
    for (let i = 1; i <= 52; i++) {
      this.semanas.push(`SEMANA ${i}`);
    }
  }

  private ocultarTodos(): void {
    this.mostrarIsmael = false;
    this.mostrarFernanda = false;
    this.mostrarJimena = false;
    this.mostrarMagda = false;
    this.mostrarMayra = false;
    this.mostrarVictor = false;
    this.mostrarMartha = false;
  }

  mostrarDiv(nombre: string): void {
    this.coordinadorVisible = nombre;
    this.registrarAgenda.get('coordinador')?.setValue(nombre);
  }
  

  RegistrarAgenda(): void {
    if (this.registrarAgenda.invalid) {
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      });
      Toast.fire({
        icon: "error",
        title: "Error en el formulario"
      });
      console.log('Formulario inválido', this.RegistrarAgenda);
      return;
    }

    const AGENDA: Agenda = {
      coordinador: this.registrarAgenda.get('coordinador')?.value,
      semana: this.registrarAgenda.get('semana')?.value,
      fecha: this.registrarAgenda.get('fecha')?.value,
      hora: this.registrarAgenda.get('hora')?.value,
      domicilio: this.registrarAgenda.get('domicilio')?.value,
      actividad: this.registrarAgenda.get('actividad')?.value,
      codigo: this.registrarAgenda.get('codigo')?.value,
      traslado: this.registrarAgenda.get('traslado')?.value,
      kmRecorrido: this.registrarAgenda.get('kmRecorrido')?.value
    };

    this._coordinacionService.registrarAgenda(AGENDA).subscribe({
      next: () => {
        const Toast = Swal.mixin({
          icon: 'error',
          title: 'Registro de Agenda Guardado Correctamente',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true
        });
        this.registrarAgenda.reset();
      },
      error: err => {
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
          }
        });
        Toast.fire({
          icon: "error",
          title: "Hubo un problema al guardar la agenda"
        });
      }
    });
  }

  seleccionarCoordinador(coord: Coordinacion | null): void {
    this.selectedCoord = coord;

    if (coord?.coordinador?.[0]?.nombre) {
      this.registrarAgenda.get('coordinador')?.setValue(coord.coordinador[0].nombre);
    } else {
      this.registrarAgenda.get('coordinador')?.setValue('');
    }
  }

  toggleFormVisibility(): void {
    this.isFormVisible = !this.isFormVisible;
  }

  // : Agregar métodos para obtener
  
  //TODO: editar y eliminar agendas
}
