import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  //Variables
  coordinaciones: Coordinacion[] = [];
  agendas: any[] = []; // Lista completa de agendas
  isFormVisible: boolean = true;
  registrarAgenda: FormGroup;
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = 'Ismael'; // por defecto
  coordinadorSeleccionado: string = '';
  semanas: string[] = [];
  totalKm: number = 0;
  precioPorLitro: number = 0; // este valor lo tomarás desde el input


  constructor(
    private fb: FormBuilder,
    private _coordinacionService: CoordinacionService,
    private http: HttpClient
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


  //Obtener 
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
    this._coordinacionService.obtenerAgendas().subscribe(data =>{
      this.agendas = data;
    })
    for (let i = 1; i <= 52; i++) {
      this.semanas.push(`SEMANA ${i}`);
    }
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

  //Botón para ocultar agenda
  toggleFormVisibility(): void {
    this.isFormVisible = !this.isFormVisible;
  }


  
  // : Agregar métodos para obtener
  get agendasFiltradasPorCoordinador() {
  return this.agendas.filter(agenda => agenda.coordinador === this.coordinadorVisible);
}

  //TODO: editar y eliminar agendas

  guardarCambios(agenda: any) {
    this._coordinacionService.actualizarAgenda(agenda._id, {
      codigo: agenda.codigo,
      actividadReportada: agenda.actividadReportada,
      reportado: agenda.reportado,
      horaReporte: agenda.horaReporte,
      horaCierre: agenda.horaCierre,
      semana: '',
      coordinador: '',
      hora: ''
    }).subscribe({
      next: (respuesta) => {
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 900,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
          }
        });
        Toast.fire({
          icon: "success",
          title: "Guardado correctamente."
        });
      },
      error: (error) => {
        console.error('Error al actualizar agenda:', error);
      }
    });
  }

  get totalKmRecorridos(): number {
    return this.agendasFiltradasPorCoordinador.reduce((acc, curr) => acc + (curr.kmRecorrido || 0), 0);
  }
  get litrosGasolina(): number {
    const rendimiento = 14;
    const totalKm = this.totalKmRecorridos;
    return totalKm > 0 ? +(totalKm / rendimiento).toFixed(2) : 0;
  }
  get costoTotalGasolina(): number {
    return +(this.litrosGasolina * this.precioPorLitro).toFixed(2);
  }
  
}
