import { Component, OnInit } from '@angular/core';
import { Baucher } from '../../../models/baucher';
import { PagosService } from '../../../services/pagos.service';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion, Persona } from '../../../models/coordinacion';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-bauchers',
  standalone: false,
  templateUrl: './bauchers.component.html',
  styleUrl: './bauchers.component.css'
})
export class BauchersComponent implements OnInit{
  listarBauchers: any[] = []; // Cambiado a any[] para incluir la coordinación.
  coordinaciones: Coordinacion[] = [];  // Asegúrate de que coordinaciones sea de tipo Coordinacion[]
  baucherForm: FormGroup;
  ejecutivasFiltradas: Persona[] = [];

  constructor(
    private fb: FormBuilder,
    private _pagosService: PagosService,
    private _coordinacionService: CoordinacionService) {
      this.baucherForm = this.fb.group({
        coordinacion: ['', Validators.required],
        ejecutiva: ['', Validators.required],
        fechaBaucher: [''],
        fechaReporte: [''],
        grupo: [''],
        concepto: [''],
        titular: ['']
      });      
    }
  
    filtrarEjecutivas() {
      const coord: Coordinacion = this.baucherForm.get('coordinacion')?.value;
      if (coord) {
        this.ejecutivasFiltradas = coord.ejecutivas;
        this.baucherForm.get('ejecutiva')?.setValue(null); // Resetea si ya había una ejecutiva seleccionada
      } else {
        this.ejecutivasFiltradas = [];
      }
    }
    ngOnInit(): void {
      this.obtenerBauchers();
      this._coordinacionService.obtenerCoordinacion().subscribe(data => {
        this.coordinaciones = data;
      });
    }

    obtenerNombresEjecutivas(coordinacionInput: Coordinacion | string): string {
      let coordinacion: Coordinacion | undefined;
    
      if (typeof coordinacionInput === 'string') {
        coordinacion = this.coordinaciones.find(c => c.nombre === coordinacionInput);
      } else {
        coordinacion = coordinacionInput;
      }
    
      return coordinacion ? coordinacion.ejecutivas.map(e => e.nombre).join(', ') : '—';
    }
    
    agregarBaucher(): void {
      if (this.baucherForm.valid) {
        const coordinacionSeleccionada: Coordinacion = this.baucherForm.get('coordinacion')?.value;
        const ejecutivaSeleccionada: Persona = this.baucherForm.get('ejecutiva')?.value;
    
        const BAUCHER: Baucher = {
          coordinacion: coordinacionSeleccionada._id,  // Solo el id de la coordinación
          ejecutiva: ejecutivaSeleccionada.nombre,     // Solo el nombre de la ejecutiva
          fechaBaucher: this.baucherForm.get('fechaBaucher')?.value,
          fechaReporte: this.baucherForm.get('fechaReporte')?.value,
          grupo: this.baucherForm.get('grupo')?.value,
          concepto: this.baucherForm.get('concepto')?.value,
          titular: this.baucherForm.get('titular')?.value,
        };
    
        this._pagosService.agregarBaucher(BAUCHER).subscribe(
          (response) => {
            const Toast = Swal.mixin({
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true,
              didOpen: (toast) => {
                toast.onmouseenter = Swal.stopTimer;
                toast.onmouseleave = Swal.resumeTimer;
              }
            });
            Toast.fire({
              icon: "success",
              title: "Guardado exitosamente"
            });
            this._pagosService.agregarBaucher(BAUCHER).subscribe(
              (response) => {
                Toast.fire({ icon: "success", title: "Guardado exitosamente" });
                this.obtenerBauchers();
              },
              (error) => {
                Toast.fire({ icon: "error", title: "Ocurrió un error" });
              }
            );

          },
        );
      }
    }
    
    


  obtenerBauchers() {
    this._pagosService.obtenerBauchers().subscribe(data => {
      console.log(data);
      this.listarBauchers = data.map(baucher => {
        // Busca el nombre de la coordinación en base al _id de la coordinación.
        const coordinacion = this.coordinaciones.find(co => co._id === baucher.coordinacion);
        return {
          ...baucher,
          coordinacionNombre: coordinacion ? coordinacion.nombre : 'Desconocida'
        };
      });
    }, error => {
      console.log(error);
    });
  }
}