import { Component, OnInit } from '@angular/core';
import { Legales } from '../../../models/legales';
import { LegalesService } from '../../../services/legales.service';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion } from '../../../models/coordinacion';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-legales',
  standalone: false,
  templateUrl: './legales.component.html',
  styleUrls: ['./legales.component.css']
})

export class LegalesComponent implements OnInit {

  coordinacion: string[] = [];
  _id?: string; 
  coordinacionSeleccionada: string = '';
  gpoind: string = '';
  fechaReportada: string = '';
  fechaEntrega: string = '';
  registro: boolean = false;

  legales: any[] = []; 

  constructor(
    private coordinacionService: CoordinacionService,
    private legalesService: LegalesService 
  ) { }

  ngOnInit(): void {
    this.obtenerCoordinaciones();
    this.obtenerLegales(); 
  }

  obtenerCoordinaciones(): void {
    this.coordinacionService.obtenerCoordinacion().subscribe({
      next: (data: Coordinacion[]) => {
        this.coordinacion = data.map(c => c.nombre); 
      },
      error: (err) => {
        console.error('Error al obtener coordinaciones:', err);
      }
    });
  }


  // Función para obtener los datos legales
  // obtenerLegales(): void {
  //   this.legalesService.obtenerLegales().subscribe({
  //     next: (data: Legales[]) => {
  //       console.log('Datos legales recibidos:', data);
  //       this.legales = data.map(legal => ({
  //         ...legal,
  //         fechaReportada: this.fechaReportada,
  //         fechaEntrega: this.fechaEntrega,
  //       }));
  //     },
  //     error: (error) => {
  //       console.error('Error al obtener legales:', error);
  //     }
  //   });
  // }

  obtenerLegales(): void {
    this.legalesService.obtenerLegales().subscribe({
      next: (data: Legales[]) => {
        console.log('Datos legales recibidos:', data);
        this.legales = data;
      },
      error: (error) => {
        console.error('Error al obtener legales:', error);
      }
    });
  }



  getSeverity(registro: boolean): 'success' | 'warn' {
    return registro ? 'success' : 'warn';
  }

  legalEditando: Legales | null = null; 

  // Función para iniciar la edición
  editarLegal(legal: Legales): void {
    this.legalEditando = { ...legal };
    this.coordinacionSeleccionada = legal.coordinacion ?? '';
    this.gpoind = legal.gpoind ?? '';
    this.fechaReportada = legal.fechaReportada ? legal.fechaReportada.substring(0, 10) : '';
    this.fechaEntrega = legal.fechaEntrega ? legal.fechaEntrega.substring(0, 10) : '';
    // this.fechaReportada = legal.fechaReportada ?? '';
    // this.fechaEntrega = legal.fechaEntrega || ''; 
    this.registro = legal.registro ?? false;
  }

  
  guardarLegal(): void {
    const legal: Legales = {
      coordinacion: this.coordinacionSeleccionada,
      gpoind: this.gpoind,
      fechaReportada: this.fechaReportada,
      fechaEntrega: this.fechaEntrega,
      registro: this.registro,
      _id: ''
    };

  if (this.legalEditando) {
    // Actualizar existente
    this.legalesService.actualizarLegal(this.legalEditando._id!, legal).subscribe({
      next: () => {
        const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        }
      });
      Toast.fire({
        icon: "success",
        title: "Registro actualizado correctamente"
      });

        this.legalEditando = null;
        this.limpiarFormulario();
        this.obtenerLegales();
      },
      error: () => Swal.fire('Error', 'No se pudo actualizar', 'error')
    });
    } else {
      // Crear nuevo
      this.legalesService.agregarLegales(legal).subscribe({
        next: () => {
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
      
          Toast.fire({
            icon: 'success',
            title: 'Registro guardado correctamente'
          });

          this.limpiarFormulario();
          this.obtenerLegales();
        },
        error: () => Swal.fire('Error', 'Revisa los campos vacios', 'error')
      });
    }
  }


  // Limpia los campos del formulario
  limpiarFormulario(): void {
    this.coordinacionSeleccionada = '';
    this.gpoind = '';
    this.fechaReportada = '';
    this.fechaEntrega = '';
    this.registro = true;
  }



  onSubmit(): void {
    const nuevoRegistro = {
      coordinacion: this.coordinacionSeleccionada,
      gpoind: this.gpoind,
      fechaReportada: this.fechaReportada,
      fechaEntrega: this.fechaEntrega,
      registro: this.registro
    };

    this.coordinacionSeleccionada = '';
    this.gpoind = '';
    this.fechaReportada = '';
    this.fechaEntrega = '';
    this.registro = true;
  }

  eliminarRegistro(index: number, id?: string): void {
    if (!id) {
      Swal.fire('Error', 'ID inválido para eliminar el registro', 'error');
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás recuperar este registro',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.legales.splice(index, 1);

        this.legalesService.eliminarLegal(id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Registro eliminado correctamente', 'success');
            this.obtenerLegales();
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

}
