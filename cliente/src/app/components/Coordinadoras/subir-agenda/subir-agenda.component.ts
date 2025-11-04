import { Component } from '@angular/core';
import { Agenda } from '../../../models/agenda';
import * as XLSX from 'xlsx';
import { ActividadPipe } from '../../../pipes/actividad.pipe';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { Coordinacion } from '../../../models/coordinacion';
import Swal from 'sweetalert2';
import { saveAs } from 'file-saver';

const SEMANAS_ANIO = 31;

@Component({
  selector: 'app-subir-agenda',
  standalone: false,
  templateUrl: './subir-agenda.component.html',
  styleUrl: './subir-agenda.component.css',
  providers: [ActividadPipe]

})
export class SubirAgendaComponent {
  agendas: Agenda[] = [];
  selectedCoordinador: string = '';
  selectedObjetivos: string[] = [];
  selectedMeta: string = '';
  agendaATiempo: boolean = false;
  coordinacion: string[] = []; // Debes poblarlo en loadCoordinaciones
  coordinaciones: Coordinacion[] = [];
  semanas: string[] = [];

  filtroActividad = '';

  actividad: string = '';
  selectedWeek: string = '';

  constructor(private _coordinacionService: CoordinacionService,){
        this.generateWeeks();
  }

  excelSerialDateToJSDate(serial: number): string {
    const excelEpoch = new Date(1899, 11, 30); // Excel base date
    const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0]; // Solo la parte de la fecha (yyyy-mm-dd)
  }

  excelSerialTimeToJSTime(serial: number): string {
    const totalSeconds = Math.round(serial * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }


  ngOnInit() {
  this.loadCoordinaciones();
  const datosGuardados = localStorage.getItem('agendas');
  if (datosGuardados) {
    this.agendas = JSON.parse(datosGuardados);
  }
}

  private generateWeeks(): void {
    this.semanas = Array.from({ length: SEMANAS_ANIO },
      (_, i) => `SEMANA ${i + 22}`); //SE INICIA EN 1 PERO COMO LA SEMANA ACTUAL ES MAYOR A 20 SE PONE 20 PARA EVITAR DESPLEGAR TANTO
  }

  // Cargar datos iniciales
  private loadCoordinaciones(): void {
    this._coordinacionService.obtenerCoordinacion().subscribe(data => {
      this.coordinaciones = data;
    });
  }

      // Función para normalizar nombres de columnas
    normalizeKey(key: string): string {
      return key
        .toString()
        .trim()                 // quita espacios al inicio y final
        .toLowerCase()          // todo a minúsculas
        .normalize("NFD")       // elimina acentos
        .replace(/[\u0300-\u036f]/g, "") // remueve tildes
        .replace(/\s+/g, " ");  // reemplaza múltiples espacios por uno
    }



  onFileChange(evt: any): void {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) return;

    const file = target.files[0];
    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

      this.agendas = data.map((row: any) => {
        // 1. Crear una copia del row con claves normalizadas
        const normalizedRow: any = {};
        Object.keys(row).forEach(key => {
          normalizedRow[this.normalizeKey(key)] = row[key];
        });

        // 2. Extraer datos ahora con nombres "seguros"
        const rawFecha = normalizedRow['fecha'];
        const rawHora = normalizedRow['hora'];

        const fecha = !isNaN(rawFecha) ? this.excelSerialDateToJSDate(Number(rawFecha)) : rawFecha;
        const hora = !isNaN(rawHora) ? this.excelSerialTimeToJSTime(Number(rawHora)) : rawHora;

        return {
          semana: normalizedRow['semana'] || '',
          coordinador: normalizedRow['coordinador'] || '',
          fecha,
          objetivo: normalizedRow['objetivo'] || '',
          meta: normalizedRow['meta'] || '',
          hora,
          domicilio: normalizedRow['domicilio'] || '',
          actividad: normalizedRow['actividad'] || '',
          codigo: normalizedRow['codigo'] || '',
          codigoReportado: normalizedRow['codigo reportado'] || '',
          actividadReportada: normalizedRow['actividad reportada'] || '',
          reportado: normalizedRow['reportado']?.toString().toLowerCase() === 'true',
          horaReporte: normalizedRow['hora reporte'] || '',
          horaCierre: normalizedRow['hora cierre'] || '',
          traslado: normalizedRow['traslado'] || 'NO',
          kmRecorrido: parseFloat(normalizedRow['km recorrido']) || 0,
          cumplimientoAgenda: normalizedRow['cumplimiento agenda']?.toString().toLowerCase() === 'true',
          acordeObjetivo: normalizedRow['acorde objetivo']?.toString().toLowerCase() === 'true'
        };
      });


    };

    reader.readAsBinaryString(file);
  }


    objetivosDisponibles: string[] = [
    'Reducir mora',
    'Grupos nuevos',
    'Clientes nuevos',
    'Cierre de fichas',
    'Renovación de lo proyectado'
  ];

  onObjetivoChange(event: any) {
    const objetivo = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
      if (!this.selectedObjetivos.includes(objetivo)) {
        this.selectedObjetivos.push(objetivo);
      }
    } else {
      this.selectedObjetivos = this.selectedObjetivos.filter(o => o !== objetivo);
    }
}

    guardarAgenda() {
      this.agendas = this.agendas.map(agenda => ({
        ...agenda,
        semana: this.selectedWeek,
        coordinador: this.selectedCoordinador,
        objetivo: this.selectedObjetivos.join(', '),
        meta: this.selectedMeta,
        cumplimientoAgenda: this.agendaATiempo
      }));

      // Enviar cada agenda al backend
      this.agendas.forEach(agenda => {
        this._coordinacionService.registrarAgenda(agenda).subscribe({
          next: response => {
            console.log('Agenda registrada:', response);
          },
          error: err => {
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
          icon: "error",
          title: "Error al registrar la agenda."
        });
          }
        });
      });
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
            title: "¡Las Agendas han sido registradas con éxito!"
          });
    }

 exportarExcel() {
    // Filtrar solo los campos que quieres
    const datosFiltrados = this.agendas.map(a => ({
      fecha: this.formatearFecha(a.fecha), // ✅ formatear aquí
      hora: a.hora,
      domicilio: a.domicilio,
      actividad: a.actividad,
      codigo: a.codigo,
      traslado: a.traslado,
      kmRecorrido: a.kmRecorrido,
      acordeObjetivo: a.acordeObjetivo ? 'SI' : 'NO' // lo pasamos como texto
    }));

    // Crear hoja con los datos filtrados
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosFiltrados, {skipHeader: true});

    XLSX.utils.sheet_add_aoa(ws, [[
      "Fecha", "Hora", "Domicilio", "Actividad", "Codigo",
    "Traslado", "Km Recorrido", "Acorde Objetivo"
    ]], {origin: "A1"})

    // Crear libro y añadir hoja
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agendas');

    // Generar archivo Excel
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Descargar archivo
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'agendas.xlsx');
  }
 private formatearFecha(fecha: any): string {
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
  //Metodo para eliminar una fila
  eliminarAgenda(index: number) {
  if (confirm('¿Estás segura/o de eliminar esta fila de la agenda?')) {
    this.agendas.splice(index, 1);
  }
}


  //Metodo para limpiar tabla
  limpiarAgendas() {
  this.agendas = [];
  localStorage.removeItem('agendas');
  alert('Se ha limpiado la agenda cargada.');
}


}
