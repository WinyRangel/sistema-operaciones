import { Component, OnInit } from '@angular/core';
import { Baucher } from '../../../models/baucher';
import { PagosService } from '../../../services/pagos.service';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion, Persona } from '../../../models/coordinacion';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { BaucherPipe } from '../../../pipes/baucher.pipe';


@Component({
  selector: 'app-bauchers',
  standalone: false,
  templateUrl: './bauchers.component.html',
  styleUrl: './bauchers.component.css',
  providers: [BaucherPipe]

})
export class BauchersComponent implements OnInit{


  getPages(): any {
  throw new Error('Method not implemented.');
  }
  listarBauchers: any[] = []; // Cambiado a any[] para incluir la coordinación.
  filtrarBaucher = '';
  coordinaciones: Coordinacion[] = [];  // Asegúrate de que coordinaciones sea de tipo Coordinacion[]
  baucherForm: FormGroup;
  personasFiltradas: Persona[] = [];
  fechaFiltro: string = ''; // formato 'YYYY-MM-DD'
  bauchersTemporales: Baucher[] = [];


  currentPage: number = 1;
  itemsPerPage: number = 25; // número de bauchers por página
  /**EDITAR*/
  // Añade estas nuevas propiedades
  editingBaucherId: string | null = null;
  isEditing = false;


  constructor(
    private fb: FormBuilder,
    private _pagosService: PagosService,
    private _coordinacionService: CoordinacionService, 
    private baucherPipe: BaucherPipe) {
      this.baucherForm = this.fb.group({
        coordinacion: ['', Validators.required],
        ejecutiva: ['', Validators.required],
        vouchers: this.fb.array([this.crearVouchers()])
      });      
    }

    get filteredBauchers() {
      let bauchersFiltrados = this.baucherPipe.transform(this.listarBauchers, this.filtrarBaucher);

      if (this.fechaFiltro) {
        bauchersFiltrados = bauchersFiltrados.filter(baucher => {
          const fechaCreacion = new Date(baucher.fechaCreacion).toISOString().slice(0, 10);
          return fechaCreacion === this.fechaFiltro;
        });
      }

      return bauchersFiltrados;
    }

    get paginatedBauchers() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredBauchers.slice(start, end);
    }

    cambiarPagina(pagina: number) {
      this.currentPage = pagina;
    }
  
    get totalPages() {
      return Math.ceil(this.listarBauchers.length / this.itemsPerPage);
    }
    changePage(page: number) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    }
      

  filtrarPorFecha() {
  this.currentPage = 1;
}

    filtrarPersonas() {
      const coord: Coordinacion = this.baucherForm.get('coordinacion')?.value;
      if (coord) {
        this.personasFiltradas = [
          ...(coord.ejecutivas || []).map(e => ({ ...e, tipo: 'Ejecutiva' })),
          ...(coord.coordinador || []).map(c => ({ ...c, tipo: 'Coordinador' }))
        ];
        
        this.baucherForm.get('ejecutiva')?.setValue(null); // Resetea la selección
      } else {
        this.personasFiltradas = [];
      }
    }

    

    ngOnInit(): void {
      this.obtenerBauchers();
      this._coordinacionService.obtenerCoordinacion().subscribe(data => {
        this.coordinaciones = data;
      });
    }
    crearVouchers(): FormGroup {
      return this.fb.group({
        fechaBaucher: ['', Validators.required],
        fechaReporte: [''],
        grupo: [''],
        concepto: ['', Validators.required],
        titular: ['', Validators.required]
      });
    }

    get vouchers(): FormArray {
      return this.baucherForm.get('vouchers') as FormArray;
    }

    agregarVoucher(): void {
      this.vouchers.push(this.crearVouchers());
    }

  eliminarVoucher(index: number): void {
    this.vouchers.removeAt(index);
  }
    // Modifica el método cargarBaucher
  cargarBaucherParaEditar(baucher: any) {
    this.isEditing = true;
    this.editingBaucherId = baucher._id;
    
    const coordinacionCompleta = this.coordinaciones.find(
      c => c._id === baucher.coordinacion
    );
    
    const persona = this.personasFiltradas.find(
      p => p.nombre === (baucher.ejecutiva || baucher.coordinador)
    );

    this.baucherForm.patchValue({
      coordinacion: baucher.coordinacion,
      ejecutiva: baucher.ejecutiva,
      fechaBaucher: this.formatDateForInput(baucher.fechaBaucher),
      fechaReporte: this.formatDateForInput(baucher.fechaReporte),
      grupo: baucher.grupo,
      concepto: baucher.concepto,
      titular: baucher.titular
    });
    
    this.filtrarPersonas();
  }

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  // Modifica el método agregarBaucher
  async agregarBaucher(): Promise<void> {
    if (this.baucherForm.valid) {
      try {
        const formValue = this.baucherForm.value;
        const coordinacionSeleccionada = formValue.coordinacion;
        const ejecutivaSeleccionada = formValue.ejecutiva;

        for (const voucher of formValue.vouchers) {
          const baucherData: Baucher = {
            coordinacion: coordinacionSeleccionada._id,
            ejecutiva: ejecutivaSeleccionada?.nombre,
            coordinador: ejecutivaSeleccionada?.tipo === 'Coordinador' ? ejecutivaSeleccionada.nombre : undefined,
            fechaBaucher: voucher.fechaBaucher,
            fechaReporte: voucher.fechaReporte,
            grupo: voucher.grupo,
            concepto: voucher.concepto,
            titular: voucher.titular
          };

          if (this.editingBaucherId) {
            await this.actualizarBaucher(baucherData);
          } else {
            await this.crearNuevoBaucher(baucherData);
          }
        }


        this.resetForm();
        this.obtenerBauchers();
      } catch (error) {
        this.mostrarError();
      }
    }
  }




  private async crearNuevoBaucher(baucherData: Baucher) {
    await this._pagosService.agregarBaucher(baucherData).toPromise();
    this.mostrarExito('Guardado exitosamente');
    this.vouchers.push(this.crearVouchers())
  }

  private async actualizarBaucher(baucherData: Baucher) {
    if (!this.editingBaucherId) return;
    
    await this._pagosService.actualizarBaucher(this.editingBaucherId, baucherData).toPromise();
    this.mostrarExito('Actualizado exitosamente');
  }

resetForm(mantenerCabecera = true): void {
  const coord = this.baucherForm.get('coordinacion')?.value;
  const ejecutiva = this.baucherForm.get('ejecutiva')?.value;

  this.baucherForm.reset();

  if (mantenerCabecera) {
    this.baucherForm.patchValue({
      coordinacion: coord,
      ejecutiva: ejecutiva
    });
  }
}


  private mostrarExito(mensaje: string) {
    Swal.fire({
      icon: 'success',
      title: mensaje,
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true
    });
  }

  private mostrarError() {
    Swal.fire({
      icon: 'error',
      title: 'Error en la operación',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true
    });
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

  eliminarBaucher(id: any) {
    Swal.fire({
      title: "¿Estás seguro de querer eliminar este registro?",
      text: "Esta acción no puede ser revertida",
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, estoy seguro."
    }).then((result) => {
      if (result.isConfirmed) {
        // Si el usuario confirma, entonces llama a eliminarUsuario
        this._pagosService.eliminarBaucher(id).subscribe(
          data => {
            Swal.fire({
              title: "Eliminado",
              text: "Esta agenda ha sido eliminado.",
              icon: "success"
            });
            // Llama a obtenerUsuarios1 después de eliminar exitosamente
            this.obtenerBauchers();
          },
          error => {
            console.log(error);
          }
        );
      }
    });
  }
  

exportarExcel(): void {
  const headers = [
    'Coordinación', 'Responsable', 'Fecha Pago', 'Hora Pago',
    'Fecha Reporte', 'Hora Reporte', 'Diferencia',
    'Grupo', 'Concepto', 'Observaciones'
  ];

  const body = this.filteredBauchers.map(b => ([
    b.coordinacion?.municipio,
    b.ejecutiva || b.coordinador,
    this.formatearFecha(b.fechaBaucher),
    this.formatearHora(b.fechaBaucher),
    this.formatearFecha(b.fechaReporte),
    this.formatearHora(b.fechaReporte),
    b.diasDiferencia,
    b.grupo,
    b.concepto,
    b.titular
  ]));

  const data = [headers, ...body];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Aplicar estilos condicionales a la columna "Diferencia" (índice 6)
  const diferenciaCol = 6;
  body.forEach((row, i) => {
    const rowIndex = i + 2; // +2 porque AOA incluye encabezado y Excel es 1-indexed
    const cellRef = XLSX.utils.encode_cell({ c: diferenciaCol, r: rowIndex - 1 });
    const dias = row[diferenciaCol];

    let fillColor = '';
    if (dias > 3) fillColor = 'FFDC3545'; // rojo (danger)
    else if (dias > 1) fillColor = 'FFFFC107'; // amarillo (warning)
    else fillColor = 'FF198754'; // verde (success)

    if (!worksheet[cellRef]) return;

    worksheet[cellRef].s = {
      fill: {
        fgColor: { rgb: fillColor }
      },
      font: {
        color: { rgb: 'FFFFFFFF' },
        bold: true
      },
      alignment: {
        horizontal: 'center'
      }
    };
  });

  // Crear el libro
  const workbook: XLSX.WorkBook = {
    Sheets: { 'Bauchers': worksheet },
    SheetNames: ['Bauchers']
  };

  // Guardar
  const excelBuffer: any = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true
  });
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  FileSaver.saveAs(blob, 'bauchers_condicional.xlsx');
}



  formatearFecha(fecha: string | Date): string {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  formatearHora(fecha: string | Date): string {
    const f = new Date(fecha);
    return f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
}