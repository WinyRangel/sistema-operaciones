import { Component, OnInit } from '@angular/core';
import { Coordinacion } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Agenda, Domicilio } from '../../../models/agenda';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ViewChild, ElementRef } from '@angular/core';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';



// Constantes para evitar "magic numbers/strings"
const RENDIMIENTO_POR_DEFECTO = 13;
const DELAY_PDF_GENERATION = 500;
const SEMANAS_ANIO = 52;

@Component({
  selector: 'app-recorrido-agenda',
  standalone: false,
  templateUrl: './recorrido-agenda.component.html',
  styleUrls: ['./recorrido-agenda.component.css'],
})


export class RecorridoAgendaComponent implements OnInit {

  // ViewChilds
  @ViewChild('graficaCodigo') graficaCodigo!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reportePDF') reportePDF!: ElementRef;
  @ViewChild('graficaHoras') graficaHoras!: ElementRef;

    //Variables para agenda
    registrarAgenda: FormGroup;
    coordinaciones: Coordinacion[] = [];
    agendas: any[] = []; // Lista completa de agendas

    //
    selectedCoord: Coordinacion | null = null;
    coordinadorVisible: string = ''; // por defecto
    coordinadorSeleccionado: string = '';
    semanas: string[] = [];
    totalKm: number = 0;
    precioPorLitro: number = 0; 
    domicilios: string[] = ["NA"];
    rendimientosCoordinadores: { [nombre: string]: number } = {};

    meses: string[] = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    
    //Visibilidad del formulario
    isFormVisible: boolean = false;
    isTableVisible: boolean = true;
    isFormExpanded: boolean = false;

    //horas de trabajo para métricas del mes
    horasAgenda: number = 0;
    horasTrabajo: number = 0;

    //variables para filtrar por mes, dia y año
    mesSeleccionado: string = '';
    semanaSeleccionada: string = '';
    diaSeleccionado: string = '';
    
    //Variables de las graficas
    chart: any;
    chartCodigo: any;
    mostrarContenedorGraficas: boolean = false;


  constructor(
    private fb: FormBuilder, private _coordinacionService: CoordinacionService){
    this.registrarAgenda = this.initForm();
    this.generateWeeks();
      }

      
    fixUTCDateToLocal(dateStr: string): Date {
      const date = new Date(dateStr);
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

    ngOnInit(): void {
    this.loadCoordinaciones();
    this.loadAgendas();
    this.loadDomicilios();
    this.setupFormListeners();
    }

    private initForm(): FormGroup {
      return this.fb.group({
        coordinador: [''],
        semana: ['', Validators.required],
        fecha: ['', Validators.required],
        objetivo: [''],
        cumplimientoAgenda: [false],
        actividades: this.fb.array([this.crearActividad()])
      });
    }

    resetForm() {
        const swalWithBootstrapButtons = Swal.mixin({
          customClass: {
            confirmButton: "btn btn-success",
            cancelButton: "btn btn-danger"
          },
          buttonsStyling: false
        });
        swalWithBootstrapButtons.fire({
          title: "¿Estás seguro de realizar está acción?",
          text: "No podrás revertir esto",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Si, limpiar formulario.",
          cancelButtonText: "No, Cancelar.",
          reverseButtons: true
        }).then((result) => {
          if (result.isConfirmed) {
            swalWithBootstrapButtons.fire({
              title: "¡Formulario limpio!",
              text: "El fórmulario ha sido limpiado.",
              icon: "success"
            });
              this.actividades.reset();
              this.registrarAgenda
          } else if (
            /* Read more about handling dismissals below */
            result.dismiss === Swal.DismissReason.cancel
          ) {
            swalWithBootstrapButtons.fire({
              title: "Cancelado",
              text: "El fórmulario no se ha limpiado.",
              icon: "error"
            });
          }
        });
  }

    private generateWeeks(): void {
      this.semanas = Array.from({length: SEMANAS_ANIO},
         (_, i) => `SEMANA ${i + 1}`);
    }

    // Cargar datos iniciales
    private loadCoordinaciones(): void {
      this._coordinacionService.obtenerCoordinacion().subscribe(data => {
        this.coordinaciones = data;
        this.setRendimientos(data);
      });
    }

    private loadAgendas(): void {
      this._coordinacionService.obtenerAgendas().subscribe(response => {
        this.agendas = response.map((agenda: { fecha: string; }) => ({
          ...agenda,
          fecha: this.fixUTCDateToLocal(agenda.fecha)
        }));
      });
    }

    private loadDomicilios(): void {
      this._coordinacionService.getDomicilios().subscribe((res: Domicilio[]) => {
        this.domicilios = res.map(d => d.nombre);
      });
    }

    private setRendimientos(coordinaciones: Coordinacion[]): void {
      coordinaciones.forEach(coord => {
        coord.coordinador.forEach((c: any) => {
          this.rendimientosCoordinadores[c.nombre] = c.rendimiento ?? RENDIMIENTO_POR_DEFECTO;
        });
      });
    }

    // Configurar listeners del formulario
    private setupFormListeners(): void {
      this.registrarAgenda.get('traslado')?.valueChanges.subscribe(value => {
        const kmControl = this.registrarAgenda.get('kmRecorrido');
        value === 'SI' ? kmControl?.enable() : kmControl?.disable();
      });
    }

    mostrarDiv(nombre: string): void {
      this.coordinadorVisible = nombre;
      this.registrarAgenda.get('coordinador')?.setValue(nombre);
    }
      
    crearActividad(): FormGroup {
      return this.fb.group({
        hora: ['', Validators.required],
        domicilio: [''],
        actividad: [''],
        codigo: [''],
        traslado: ['', Validators.required],
        kmRecorrido: ['']
      });
      
    }     
  

    get actividades(): FormArray {
      return this.registrarAgenda.get('actividades') as FormArray;
    }
    
    agregarActividad(): void {
      this.actividades.push(this.crearActividad());
    }
  
    eliminarActividad(index: number): void {
      this.actividades.removeAt(index);
    }

    // Registro de agenda
    RegistrarAgenda(): void {
      if (this.registrarAgenda.invalid) {
        this.showToast('error', 'Por favor, revisa los campos obligatorios del formulario.');
        return;
      }

      Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Deseas registrar esta(s) actividad(es)?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, registrar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.saveAgenda();
        }
      });
    }

    private saveAgenda(): void {
      const datos = this.registrarAgenda.value;
      const actividades = this.actividades.value;

      actividades.forEach((actividad: any) => {
        const agenda: Agenda = {
          coordinador: datos.coordinador,
          semana: datos.semana,
          fecha: datos.fecha,
          objetivo: datos.objetivo,
          cumplimientoAgenda: datos.cumplimientoAgenda,
          hora: actividad.hora,
          domicilio: actividad.domicilio,
          actividad: actividad.actividad,
          codigo: actividad.codigo,
          traslado: actividad.traslado,
          kmRecorrido: actividad.kmRecorrido
        };

        this._coordinacionService.registrarAgenda(agenda).subscribe({
          next: () => {
            this.showToast('success', 'Actividad registrada con éxito');
            this.refrescarAgendas();
          },
          error: (error) => {
            console.error('Error al registrar agenda:', error);
            this.showToast('error', 'Error al registrar la actividad');
          }
        });
      });
    }

      // Operaciones CRUD
    eliminarRegistro(id: string): void {
      Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción no puede ser revertida",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, eliminar"
      }).then((result) => {
        if (result.isConfirmed) {
          this._coordinacionService.eliminarAgenda(id).subscribe({
            next: () => {
              this.showToast('success', 'Agenda eliminada correctamente');
              this.refrescarAgendas();
            },
            error: (error) => {
              console.error('Error al eliminar agenda:', error);
              this.showToast('error', 'Error al eliminar la agenda');
            }
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


    refrescarAgendas(): void {
        this._coordinacionService.obtenerAgendas().subscribe(data => {
          this.agendas = data.map((agenda: { fecha: string; }) => ({
        ...agenda,
        fecha: this.fixUTCDateToLocal(agenda.fecha)
      }));
    });
  }
      

    obtenerAgendas() {
      this._coordinacionService.obtenerAgendas().subscribe(data => {
        this.agendas = data;
      });
    }

    //Botón para ocultar agenda
    toggleFormVisibility() {
    this.isFormVisible = !this.isFormVisible;
    }

    toggleTableVisibility() {
    this.isTableVisible = !this.isTableVisible;
    }

    toggleFormSize() {
    this.isFormExpanded = !this.isFormExpanded;
    }

    // : Agregar métodos para obtener
    get agendasFiltradasPorCoordinador() {
      return this.agendas.filter(agenda => {
        const fecha = new Date(agenda.fecha);
        const mes = fecha.toLocaleString('es-MX', { month: 'long' });
        const dia = fecha.toLocaleString('es-MX', { weekday: 'long' });

        const semana = agenda.semana?.trim(); // Elimina espacios al inicio y final

        return (
          agenda.coordinador === this.coordinadorVisible &&
          (!this.mesSeleccionado || mes.toLowerCase() === this.mesSeleccionado.toLowerCase()) &&
          (!this.semanaSeleccionada || semana === this.semanaSeleccionada) &&
          (!this.diaSeleccionado || dia.toLowerCase() === this.diaSeleccionado.toLowerCase())
        );
      });
    }

    aplicarFiltros(): void {
      // Actualizar métricas y gráficos si es necesario
      if (this.mostrarContenedorGraficas) {
        this.dibujarGraficaPorCodigo();
        this.dibujarGraficaReporteadasVsNoReportadas();
      }
    }

    // Método para limpiar filtros
    limpiarFiltros(): void {
      this.mesSeleccionado = '';
      this.semanaSeleccionada = '';
      this.diaSeleccionado = '';
      this.aplicarFiltros();
    }


    guardarCambios(agenda: Agenda): void {
      if (!agenda._id) return;

      this._coordinacionService.actualizarAgenda(agenda._id, {
        domicilio: agenda.domicilio,
        actividad: agenda.actividad,
        hora: agenda.hora,
        codigo: agenda.codigo,
        actividadReportada: agenda.actividadReportada,
        reportado: agenda.reportado,
        horaReporte: agenda.horaReporte,
        horaCierre: agenda.horaCierre,
        kmRecorrido: agenda.kmRecorrido
        
      }).subscribe({
        next: () => this.showToast('success', 'Cambios guardados correctamente'),
        error: (error) => {
          console.error('Error al actualizar agenda:', error);
          this.showToast('error', 'Error al guardar cambios');
        }
      });
    }

    get totalKmRecorridos(): number {
    return this.agendasFiltradasPorCoordinador.
      reduce((acc, curr) => acc + (curr.kmRecorrido || 0), 0).toFixed(2);
    }

    get litrosGasolina(): number {
    const nombreCoordinador = this.registrarAgenda.get('coordinador')?.value;
    const rendimiento = this.rendimientosCoordinadores[nombreCoordinador] ?? RENDIMIENTO_POR_DEFECTO;
    return this.totalKmRecorridos > 0 
      ? parseFloat((this.totalKmRecorridos / rendimiento).toFixed(2))
      : 0;
  }

      
      get costoTotalGasolina(): number {
      return +(this.litrosGasolina * this.precioPorLitro).toFixed(2);
      }

      get horasAgendadas(): number {
        return this.agendasFiltradasPorCoordinador.filter(a => a.hora).length;
      }

      get horasReportadas(): number {
        return this.agendasFiltradasPorCoordinador.filter(
          a => a.horaReporte && a.reportado === true
        ).length;
      }

      get horasEntregas(): number{
        return this.agendasFiltradasPorCoordinador.filter(
          a => a.hora && a.codigo === 'E'
        ).length;
      }

      get horasEntregasReportadas(): number {
        return this.agendasFiltradasPorCoordinador.filter(
          a => a.horaReporte && a.reportado === true && a.codigo === 'E'
        ).length;
      }

       get horasEntregasNoReportadas(): number {
        return((this.horasEntregas) - (this.horasEntregasReportadas) )
      }

      get horasProductividad(): number {
        return this.horasTrabajo > 0
          ? parseFloat(((this.horasAgendadas / this.horasTrabajo)).toFixed(2))
          : 0;
      }

      opcionesCodigo = [
      {value: 'R', texto: 'R | Pago'},
      {value: 'R/P', texto: 'R/P | Pago/Levantamiento de Papeleria'},
      {value: 'C', texto: 'C | Cobranza'},
      {value: 'VTA', texto: 'VTA | Promoción'},
      {value: 'R/EC', texto: 'R/EC | Pago/Entrega/Cambio de Ciclo'},
      {value: 'R/ER', texto: 'R/ER | Pago/Entrega/Refill'},
      {value: 'GN', texto: 'GN | Grupo Nuevo'},
      {value: 'Sup', texto: 'Sup | Supervisión'},
      {value: 'Aten', texto: 'Aten | Atenciones'},
      {value: 'E', texto: 'E | Desembolso o Entregas'},
      {value: 'R/A', texto: 'R/A | Realizando Agendas'},
      {value: 'D', texto: 'D | Domiciliar'},
      {value: 'Sin Codigo', texto: 'Sin codigo'},
      {value: '', texto: ''}
      ];

   // Gráficos
    mostrarGraficas(): void {
      this.mostrarContenedorGraficas = true;
      setTimeout(() => {
        this.dibujarGraficaPorCodigo();
        this.dibujarGraficaReporteadasVsNoReportadas();
      }, 100);
    }

    dibujarGraficaPorCodigo() {
        if (!this.mostrarContenedorGraficas) return;
        
        if (this.chartCodigo) this.chartCodigo.destroy();

        const codigosTexto = this.opcionesCodigo.map(o => o.texto);
        const conteoReportadas: { [key: string]: number } = {};
        const conteoNoReportadas: { [key: string]: number } = {};

        codigosTexto.forEach(texto => {
          conteoReportadas[texto] = 0;
          conteoNoReportadas[texto] = 0;
        });

        this.agendasFiltradasPorCoordinador.forEach(a => {
          const codigoTexto = this.opcionesCodigo.find(o => o.value === a.codigo)?.texto;
          
          if (!codigoTexto) return;

          if (a.reportado) {
            conteoReportadas[codigoTexto]++;
          } else {
            conteoNoReportadas[codigoTexto]++;
          }
          
  });

  const etiquetas = codigosTexto;
  const datosReportadas = etiquetas.map(et => conteoReportadas[et]);
  const datosNoReportadas = etiquetas.map(et => conteoNoReportadas[et]);

  this.chartCodigo = new Chart(this.graficaCodigo.nativeElement.getContext('2d')!, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Reportadas',
          data: datosReportadas,
          backgroundColor: '#4caf50'
        },
        {
          label: 'No Reportadas',
          data: datosNoReportadas,
          backgroundColor: '#f44336'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: {
          display: true,
          text: 'Agendas por Código (Reportadas vs No Reportadas)'
        },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (value) => value,
          
          font: {
            weight: 'bold',
            size: 10
            
          }
          
          
        }
      }
    },
    plugins: [ChartDataLabels]
  });
    }
          
    dibujarGraficaReporteadasVsNoReportadas() {
      if (!this.mostrarContenedorGraficas) return;

      if (this.chart) this.chart.destroy();

      const total = this.agendasFiltradasPorCoordinador.length;
      const reportadas = this.agendasFiltradasPorCoordinador.filter(a => a.reportado === true).length;
      const noReportadas = total - reportadas;

        this.chart = new Chart(this.graficaHoras.nativeElement.getContext('2d'), {
          type: 'pie',
          data: {
            labels: ['Reportadas', 'No Reportadas'],
            datasets: [{
              data: [reportadas, noReportadas],
              backgroundColor: ['#4caf50', '#f44336']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: 'bottom'
              },
              title: {
                display: true,
                text: 'Horas Reportadas vs No Reportadas'
              },
              datalabels: {
                formatter: (value, context) => {
                  const rawData = context.chart.data.datasets[0].data;
                  const total = (rawData as number[])
                    .filter((v): v is number => typeof v === 'number')
                    .reduce((a, b) => a + b, 0);

                  if (total === 0) return '0 (0%)';

                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${value} (${percentage}%)`;
                },
                color: '#fff'
              }
            }
          },
          plugins: [ChartDataLabels]
        });
      }

  // Generación de PDF
      generarPDFConGrafica(): void {
        Swal.fire({
          title: 'Generando PDF...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(Swal.getDenyButton())
        });

        setTimeout(() => {
          const element = this.reportePDF.nativeElement;

          html2canvas(element).then(canvas => {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.text(`Reporte de ${this.coordinadorVisible}`, 10, 10);
            pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight - 20);
            pdf.save(`reporte_${this.coordinadorVisible}.pdf`);

            Swal.close();
            this.showToast('success', 'PDF generado correctamente');
          }).catch(error => {
            console.error('Error al generar PDF:', error);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
          });
        }, DELAY_PDF_GENERATION);
      }
         // Helper para notificaciones
      private showToast(icon: 'success' | 'error', title: string): void {
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

        Toast.fire({ icon, title });
      }
}