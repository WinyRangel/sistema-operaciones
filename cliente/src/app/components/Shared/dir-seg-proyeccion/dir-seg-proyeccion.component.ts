// import { Component, OnInit } from '@angular/core';
// import * as XLSX from 'xlsx';
// import Swal from 'sweetalert2';
// import {
//   DirSegProyeccionesService,
//   CreditosProyeccionPayload,
//   CreditosProyeccion
// } from '../../../services/dir-seg-proyecciones.service';

// declare const bootstrap: any;

// interface FilaExcel {
//   fechaEntrega: string;
//   concepto: string;
//   proyectada: number;
//   colocacion: number;
//   mesArchivo: string;
//   coordinador: string;
// }

// @Component({
//   selector: 'app-dir-seg-proyeccion',
//   standalone: false,
//   templateUrl: './dir-seg-proyeccion.component.html',
//   styleUrls: ['./dir-seg-proyeccion.component.css']
// })
// export class DirSegProyeccionComponent implements OnInit {
//   // Datos guardados
//   proyecciones: CreditosProyeccion[] = [];

//   // Para agrupar en pestañas
//   proyeccionesPorCoordinador: Record<string, CreditosProyeccion[]> = {};
//   coordinadores: string[] = [];
//   activeTab = '';

//   // Preview de Excel
//   datosExcel: FilaExcel[] = [];

//   // Modelo para inserción manual
//   nuevo = {
//     coordinador: '',
//     mesArchivo: '',
//     fechaEntrega: '',
//     concepto: '',
//     proyectada: 0,
//     colocacion: 0
//   };

//   selectedMonth = '';

//   // Lista fija de meses para el dropdown
//   meses = [
//     'Enero','Febrero','Marzo','Abril','Mayo','Junio',
//     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
//   ];

//   constructor(private svc: DirSegProyeccionesService) { }

//   ngOnInit(): void {
//     this.cargarProyecciones();
//   }

//   /** 1) Carga todas las proyecciones y extrae coordinadores */
//   private cargarProyecciones(): void {
//     this.svc.getProyecciones().subscribe({
//       next: res => {
//         this.proyecciones = res;
//         this.coordinadores = Array.from(new Set(res.map(p => p.coordinador)));
//         this.agruparPorCoordinador();
//       },
//       error: () => Swal.fire('Error', 'No se pudo cargar proyecciones', 'error')
//     });
//   }

//   private agruparPorCoordinador(): void {
//     const mapa: Record<string, CreditosProyeccion[]> = {};
//     this.proyecciones.forEach(p => {
//       (mapa[p.coordinador] ||= []).push(p);
//     });
//     this.proyeccionesPorCoordinador = mapa;
//     this.activeTab = this.coordinadores[0] || '';
//   }

//   setActive(coord: string) {
//     this.activeTab = coord;
//   }

//   /** 2) Preview de Excel: ahora toma mesArchivo del nombre y coordenador de cada pestaña */
//   onFileChange(event: any): void {
//     const target: DataTransfer = <DataTransfer>event.target;
//     if (target.files.length !== 1) {
//       Swal.fire('Error', 'Solo se permite subir un archivo a la vez.', 'error');
//       return;
//     }

//     const archivo = target.files[0];
//     const nombreArchivo = archivo.name;
//     // extrae mes del nombre, e.g. "Entrega Junio" → "Junio"
//     const mesArchivo = this.extraerMesDesdeNombre(nombreArchivo);

//     const reader: FileReader = new FileReader();
//     reader.onload = (e: any) => {
//       const bstr: string = e.target.result;
//       const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
//       const filasTotales: FilaExcel[] = [];

//       // recorremos todas las pestañas
//       wb.SheetNames.forEach(sheetName => {
//         const ws: XLSX.WorkSheet = wb.Sheets[sheetName];
//         const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
//         data.slice(1).forEach((row: any[]) => {
//           filasTotales.push({
//             fechaEntrega: this.convertirFecha(row[0]),
//             concepto: row[1] || '',
//             proyectada: Number(row[2]) || 0,
//             colocacion: Number(row[3]) || 0,
//             mesArchivo,
//             coordinador: sheetName
//           });
//         });
//       });

//       this.datosExcel = filasTotales;
//     };

//     reader.readAsBinaryString(archivo);
//   }

//   private extraerMesDesdeNombre(nombre: string): string {
//     const meses = [
//       'Enero','Febrero','Marzo','Abril','Mayo','Junio',
//       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
//     ];
//     const low = nombre.toLowerCase();
//     return meses.find(m => low.includes(m.toLowerCase())) || 'Sin mes';
//   }

//   private convertirFecha(excelDate: any): string {
//     if (!excelDate || typeof excelDate !== 'number') return '';
//     const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
//     return date.toISOString().substring(0, 10);
//   }

//   /** 3) Abre modal de inserción */
//   abrirInsertModal(): void {
//     this.nuevo = {
//       coordinador: this.coordinadores[0] || '',
//       mesArchivo: this.meses[new Date().getMonth()],
//       fechaEntrega: '',
//       concepto: '',
//       proyectada: 0,
//       colocacion: 0
//     };
//     const el = document.getElementById('insertModal');
//     if (el) new bootstrap.Modal(el).show();
//   }

//   /** 4) Guarda un solo registro */
//   guardarNuevo(): void {
//     if (!this.nuevo.coordinador ||
//         !this.nuevo.mesArchivo ||
//         !this.nuevo.fechaEntrega ||
//         !this.nuevo.concepto) {
//       Swal.fire('Atención', 'Completa todos los campos', 'warning');
//       return;
//     }

//     const payload: CreditosProyeccionPayload = {
//       coordinador: this.nuevo.coordinador,
//       mesArchivo: this.nuevo.mesArchivo,
//       fechaEntrega: this.nuevo.fechaEntrega,
//       concepto: this.nuevo.concepto,
//       proyectada: this.nuevo.proyectada,
//       colocacion: this.nuevo.colocacion,
//       diferencia: this.nuevo.colocacion - this.nuevo.proyectada
//     };

//     this.svc.saveProyeccion(payload).subscribe({
//       next: () => {
//         Swal.fire('Éxito', 'Registro agregado', 'success');
//         const el = document.getElementById('insertModal');
//         if (el) (bootstrap.Modal.getInstance(el) as any).hide();
//         this.cargarProyecciones();
//       },
//       error: err => {
//         console.error('Error payload:', payload, err.error);
//         Swal.fire('Error', 'No se pudo agregar registro', 'error');
//       }
//     });
//   }

//   /** 5) Guarda todos los datos de Excel */
//   guardarDesdeModal(): void {
//     if (!this.datosExcel.length) {
//       Swal.fire('Atención', 'No hay datos para guardar', 'warning');
//       return;
//     }
//     const payloads = this.datosExcel.map(f => ({
//       coordinador: f.coordinador,
//       mesArchivo: f.mesArchivo,
//       fechaEntrega: f.fechaEntrega,
//       concepto: f.concepto,
//       proyectada: f.proyectada,
//       colocacion: f.colocacion,
//       diferencia: f.colocacion - f.proyectada
//     }));
//     this.svc.guardarProyecciones(payloads).subscribe({
//       next: () => {
//         Swal.fire('Éxito', 'Proyecciones guardadas', 'success');
//         this.datosExcel = [];
//         this.cargarProyecciones();
//       },
//       error: err => {
//         console.error('Error batch:', err.error);
//         Swal.fire('Error', 'No se pudieron guardar las proyecciones', 'error');
//       }
//     });
//   }

//   /** DESCARGAR EXCEL: todas las pestañas */
//   descargarExcel(): void {
//   if (!this.selectedMonth) {
//     Swal.fire('Atención', 'Escribe el mes que deseas exportar (por ejemplo: Junio).', 'warning');
//     return;
//   }

//   // Normalizamos el mes para comparación
//   const mesBuscado = this.selectedMonth.trim().toLowerCase();

//   // Filtramos las proyecciones por mesArchivo (ignorando mayúsculas)
//   const proyeccionesFiltradas = this.proyecciones.filter(
//     p => p.mesArchivo && p.mesArchivo.toLowerCase() === mesBuscado
//   );

//   if (proyeccionesFiltradas.length === 0) {
//     Swal.fire('Atención', `No hay registros para el mes de "${this.selectedMonth}"`, 'info');
//     return;
//   }

//   const workbook = XLSX.utils.book_new();

//   // Agrupamos por coordinador
//   const mapa: Record<string, CreditosProyeccion[]> = {};
//   proyeccionesFiltradas.forEach(p => {
//     (mapa[p.coordinador] ||= []).push(p);
//   });

//   // Creamos hojas por cada coordinador
//   Object.entries(mapa).forEach(([coordinador, datos]) => {
//     const dataExport = datos.map((p, i) => ({
//       No: i + 1,
//       Coordinador: p.coordinador,
//       'Fecha de Entrega': p.fechaEntrega?.split('T')[0] || '',
//       Concepto: p.concepto,
//       'Proyectada ($)': p.proyectada,
//       'Colocación ($)': p.colocacion,
//       'Diferencia ($)': p.diferencia,
//       Mes: p.mesArchivo
//     }));

//     const ws = XLSX.utils.json_to_sheet(dataExport);
//     const sheetName = coordinador.length <= 31 ? coordinador : coordinador.slice(0, 28) + '...';
//     XLSX.utils.book_append_sheet(workbook, ws, sheetName);
//   });

//   const fechaHoy = new Date().toISOString().slice(0, 10);
//   const nombreArchivo = `Proyecciones_${this.selectedMonth}_${fechaHoy}.xlsx`;

//   XLSX.writeFile(workbook, nombreArchivo);
// }

  //   descargarExcel(): void {
  //   if (!this.selectedMonth) {
  //     Swal.fire('Atención', 'Selecciona primero un mes.', 'warning');
  //     return;
  //   }

  //   // Filtrar todas las proyecciones guardadas por mesArchivo
  //   const todas = this.proyecciones.filter(p => p.mesArchivo === this.selectedMonth);
  //   if (todas.length === 0) {
  //     Swal.fire('Atención', `No hay datos para el mes de ${this.selectedMonth}`, 'warning');
  //     return;
  //   }

  //   const workbook = XLSX.utils.book_new();
  //   // Para cada coordinador agrupa y crea hoja
  //   const mapa: Record<string, CreditosProyeccion[]> = {};
  //   todas.forEach(p => {
  //     (mapa[p.coordinador] ||= []).push(p);
  //   });

  //   Object.entries(mapa).forEach(([coord, datos]) => {
  //     const dataExport = datos.map((p, i) => ({
  //       No: i + 1,
  //       Coordinador: p.coordinador,
  //       'Fecha de Entrega': p.fechaEntrega.split('T')[0],
  //       Concepto: p.concepto,
  //       'Proyectada ($)': p.proyectada,
  //       'Colocación ($)': p.colocacion,
  //       'Diferencia ($)': p.diferencia,
  //       Mes: p.mesArchivo
  //     }));
  //     const ws = XLSX.utils.json_to_sheet(dataExport);
  //     const name = coord.length <= 31 ? coord : coord.slice(0,28) + '...';
  //     XLSX.utils.book_append_sheet(workbook, ws, name);
  //   });

  //   const fecha = new Date().toISOString().slice(0,10);
  //   XLSX.writeFile(workbook, `Proyecciones_${this.selectedMonth}_${fecha}.xlsx`);
  // }

  // descargarExcel(): void {
  //   if (!this.coordinadores.length) {
  //     Swal.fire('Atención', 'No hay datos para exportar', 'warning');
  //     return;
  //   }

  //   const workbook = XLSX.utils.book_new();

  //   this.coordinadores.forEach(coord => {
  //     const datos = this.proyeccionesPorCoordinador[coord] || [];
  //     const dataExport = datos.map((p, i) => ({
  //       No: i + 1,
  //       'Fecha de Entrega': p.fechaEntrega?.split('T')[0] || '',
  //       Concepto: p.concepto,
  //       'Proyectada ($)': p.proyectada,
  //       'Colocación ($)': p.colocacion,
  //       'Diferencia ($)': p.diferencia
  //     }));
  //     const worksheet = XLSX.utils.json_to_sheet(dataExport);
  //     const sheetName = coord.length <= 31 ? coord : coord.substring(0, 28) + '...';
  //     XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  //   });

  //   const fecha = new Date().toISOString().slice(0, 10);
  //   const nombreArchivo = `ProyeccioneS${fecha}.xlsx`;
  //   XLSX.writeFile(workbook, nombreArchivo);
  // }

  import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  DirSegProyeccionesService,
  CreditosProyeccionPayload,
  CreditosProyeccion
} from '../../../services/dir-seg-proyecciones.service';

declare const bootstrap: any;

interface FilaExcel {
  fechaEntrega: string;
  concepto: string;
  proyectada: number;
  colocacion: number;
  mesArchivo: string;
  coordinador: string;
}

@Component({
  selector: 'app-dir-seg-proyeccion',
  standalone: false,
  templateUrl: './dir-seg-proyeccion.component.html',
  styleUrls: ['./dir-seg-proyeccion.component.css']
})
export class DirSegProyeccionComponent implements OnInit {
  // Datos guardados
  proyecciones: CreditosProyeccion[] = [];

  // Para agrupar en pestañas
  proyeccionesPorCoordinador: Record<string, CreditosProyeccion[]> = {};
  coordinadores: string[] = [];
  activeTab = '';

  // Preview de Excel
  datosExcel: FilaExcel[] = [];

  // Modelo para inserción manual
  nuevo = {
    coordinador: '',
    mesArchivo: '',
    fechaEntrega: '',
    concepto: '',
    proyectada: 0,
    colocacion: 0
  };

  // ** Nuevo: texto del input para filtrar la tabla **
  tableFilterText = '';

  // ** Nuevo: mes seleccionado en el select para descargar **
  downloadMonth = '';

  // Lista fija de meses para el dropdown
  meses = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  constructor(private svc: DirSegProyeccionesService) { }

  ngOnInit(): void {
    this.cargarProyecciones();
  }

  /** 1) Carga todas las proyecciones y extrae coordinadores */
  private cargarProyecciones(): void {
    this.svc.getProyecciones().subscribe({
      next: res => {
        this.proyecciones = res;
        this.coordinadores = Array.from(new Set(res.map(p => p.coordinador)));
        this.applyTableFilter(); // al cargar, aplicamos filtro (vacío muestra todo)
      },
      error: () => Swal.fire('Error', 'No se pudo cargar proyecciones', 'error')
    });
  }

  /** 2) Agrupa en proyeccionesPorCoordinador el array dado */
  private agruparPorCoordinador(datos: CreditosProyeccion[]): void {
    const mapa: Record<string, CreditosProyeccion[]> = {};
    datos.forEach(p => {
      (mapa[p.coordinador] ||= []).push(p);
    });
    this.proyeccionesPorCoordinador = mapa;
    if (!mapa[this.activeTab]) {
      this.activeTab = this.coordinadores[0] || '';
    }
  }

  setActive(coord: string) {
    this.activeTab = coord;
  }

  /** 3) Aplica el filtro del input a la tabla */
  applyTableFilter(): void {
    const txt = this.tableFilterText.trim().toLowerCase();
    if (!txt) {
      // sin filtro → agrupamos TODO
      this.agruparPorCoordinador(this.proyecciones);
      return;
    }
    // filtramos por mesArchivo que contenga el texto
    const filtrado = this.proyecciones.filter(p =>
      p.mesArchivo?.toLowerCase().includes(txt)
    );
    this.agruparPorCoordinador(filtrado);
  }

  /** 4) Preview de Excel: ahora toma mesArchivo del nombre y coordinador de cada pestaña */
  onFileChange(event: any): void {
    const target: DataTransfer = <DataTransfer>event.target;
    if (target.files.length !== 1) {
      Swal.fire('Error', 'Solo se permite subir un archivo a la vez.', 'error');
      return;
    }

    const archivo = target.files[0];
    const nombreArchivo = archivo.name;
    const mesArchivo = this.extraerMesDesdeNombre(nombreArchivo);

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const filasTotales: FilaExcel[] = [];

      wb.SheetNames.forEach(sheetName => {
        const ws: XLSX.WorkSheet = wb.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        data.slice(1).forEach((row: any[]) => {
          filasTotales.push({
            fechaEntrega: this.convertirFecha(row[0]),
            concepto: row[1] || '',
            proyectada: Number(row[2]) || 0,
            colocacion: Number(row[3]) || 0,
            mesArchivo,
            coordinador: sheetName
          });
        });
      });

      this.datosExcel = filasTotales;
    };

    reader.readAsBinaryString(archivo);
  }

  private extraerMesDesdeNombre(nombre: string): string {
    const meses = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ];
    const low = nombre.toLowerCase();
    return meses.find(m => low.includes(m.toLowerCase())) || 'Sin mes';
  }

  private convertirFecha(excelDate: any): string {
    if (!excelDate || typeof excelDate !== 'number') return '';
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    return date.toISOString().substring(0, 10);
  }

  /** 5) Abre modal de inserción */
  abrirInsertModal(): void {
    this.nuevo = {
      coordinador: this.coordinadores[0] || '',
      mesArchivo: this.meses[new Date().getMonth()],
      fechaEntrega: '',
      concepto: '',
      proyectada: 0,
      colocacion: 0
    };
    const el = document.getElementById('insertModal');
    if (el) new bootstrap.Modal(el).show();
  }

  /** 6) Guarda un solo registro */
  guardarNuevo(): void {
    if (!this.nuevo.coordinador ||
        !this.nuevo.mesArchivo ||
        !this.nuevo.fechaEntrega ||
        !this.nuevo.concepto) {
      Swal.fire('Atención', 'Completa todos los campos', 'warning');
      return;
    }

    const payload: CreditosProyeccionPayload = {
      coordinador: this.nuevo.coordinador,
      mesArchivo: this.nuevo.mesArchivo,
      fechaEntrega: this.nuevo.fechaEntrega,
      concepto: this.nuevo.concepto,
      proyectada: this.nuevo.proyectada,
      colocacion: this.nuevo.colocacion,
      diferencia: this.nuevo.colocacion - this.nuevo.proyectada
    };

    this.svc.saveProyeccion(payload).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Registro agregado', 'success');
        const el = document.getElementById('insertModal');
        if (el) (bootstrap.Modal.getInstance(el) as any).hide();
        this.cargarProyecciones();
      },
      error: err => {
        console.error('Error payload:', payload, err.error);
        Swal.fire('Error', 'No se pudo agregar registro', 'error');
      }
    });
  }

  /** 7) Guarda todos los datos de Excel */
  guardarDesdeModal(): void {
    if (!this.datosExcel.length) {
      Swal.fire('Atención', 'No hay datos para guardar', 'warning');
      return;
    }
    const payloads = this.datosExcel.map(f => ({
      coordinador: f.coordinador,
      mesArchivo: f.mesArchivo,
      fechaEntrega: f.fechaEntrega,
      concepto: f.concepto,
      proyectada: f.proyectada,
      colocacion: f.colocacion,
      diferencia: f.colocacion - f.proyectada
    }));
    this.svc.guardarProyecciones(payloads).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Proyecciones guardadas', 'success');
        this.datosExcel = [];
        this.cargarProyecciones();
      },
      error: err => {
        console.error('Error batch:', err.error);
        Swal.fire('Error', 'No se pudieron guardar las proyecciones', 'error');
      }
    });
  }

  /** 8) DESCARGAR EXCEL: solo mes elegido en select */
  descargarExcel(): void {
    if (!this.downloadMonth) {
      Swal.fire('Atención', 'Selecciona primero un mes para exportar.', 'warning');
      return;
    }
    const mes = this.downloadMonth.trim().toLowerCase();
    const filtradas = this.proyecciones.filter(
      p => p.mesArchivo?.toLowerCase() === mes
    );
    if (filtradas.length === 0) {
      Swal.fire('Info', `No hay datos para "${this.downloadMonth}"`, 'info');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const mapa: Record<string, CreditosProyeccion[]> = {};
    filtradas.forEach(p => (mapa[p.coordinador] ||= []).push(p));

    Object.entries(mapa).forEach(([coord, datos]) => {
      const dataExport = datos.map((p, i) => ({
        No: i + 1,
        Coordinador: p.coordinador,
        'Fecha de Entrega': p.fechaEntrega.split('T')[0],
        Concepto: p.concepto,
        'Proyectada ($)': p.proyectada,
        'Colocación ($)': p.colocacion,
        'Diferencia ($)': p.diferencia,
        Mes: p.mesArchivo
      }));
      const ws = XLSX.utils.json_to_sheet(dataExport);
      const name = coord.length <= 31 ? coord : coord.slice(0,28) + '...';
      XLSX.utils.book_append_sheet(workbook, ws, name);
    });

    const hoy = new Date().toISOString().slice(0,10);
    XLSX.writeFile(workbook, `Proyecciones_${this.downloadMonth}_${hoy}.xlsx`);
  }
}

