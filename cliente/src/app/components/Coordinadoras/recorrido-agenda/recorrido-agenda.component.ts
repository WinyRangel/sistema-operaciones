import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Coordinacion, Persona } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Agenda, Domicilio } from '../../../models/agenda';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

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
  isFormVisible: boolean = false;
  isTableVisible: boolean = true;
  isFormExpanded: boolean = false;
  registrarAgenda: FormGroup;
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = 'Ismael'; // por defecto
  coordinadorSeleccionado: string = '';
  semanas: string[] = [];
  totalKm: number = 0;
  precioPorLitro: number = 0; // este valor lo tomarás desde el input
  domicilios: string[] = [];

  //HORAS
  horasAgenda: number = 0;
  horasTrabajo: number = 0;

  //variables para filtrar 
  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';
  //Variables de las graficas
  chart: any;
  chartCodigo: any;
  mostrarContenedorGraficas: boolean = false;


      constructor(
        private fb: FormBuilder,
        private _coordinacionService: CoordinacionService,
        private http: HttpClient
      ) {
        this.registrarAgenda = this.fb.group({
          coordinador: [''],
          semana: ['', Validators.required],
          fecha: ['', Validators.required],
          cumplimientoAgenda: [false],
          actividades: this.fb.array([this.crearActividad()]),
        });
      }

      fixUTCDateToLocal(dateStr: string): Date {
        const date = new Date(dateStr);
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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
        this._coordinacionService.obtenerAgendas().subscribe(response => {
          this.agendas = response.map((agenda: any) => ({
           ...agenda,
          fecha: this.fixUTCDateToLocal(agenda.fecha)
          }));
        })
        for (let i = 1; i <= 52; i++) {
          this.semanas.push(` SEMANA ${i}`);
        }
          this._coordinacionService.getDomicilios().subscribe((res: Domicilio[]) => {
            this.domicilios = res.map(d => d.nombre); // 🔑 extraer solo el campo nombre
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
      } else{
        const datos = this.registrarAgenda.value;
        console.log('¿Cumplimiento?', datos.cumplimientoAgenda); // true o false
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
          title: "Actividad registrada con éxito"
        });
      
      }
      const actividades = this.actividades.value;
      actividades.forEach((actividad: any) => {
        const AGENDA: Agenda = {
          coordinador: this.registrarAgenda.get('coordinador')?.value,
          semana: this.registrarAgenda.get('semana')?.value,
          fecha: this.registrarAgenda.get('fecha')?.value,
          cumplimientoAgenda: this.registrarAgenda.get('cumplimientoAgenda')?.value,
          hora: actividad.hora,
          domicilio: actividad.domicilio,
          actividad: actividad.actividad,
          codigo: actividad.codigo,
          traslado: actividad.traslado,
          kmRecorrido: actividad.kmRecorrido
        };
        this._coordinacionService.registrarAgenda(AGENDA).subscribe({
          next: () => {
                console.log('Actividad registrada');
                this.agendasFiltradasPorCoordinador.push(AGENDA);
          }
        });
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
      refrescarAgendas() {
        this.obtenerAgendas(); // vuelve a pedir los datos al backend
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
          
              return (
                agenda.coordinador === this.coordinadorVisible &&
                (!this.mesSeleccionado || mes.toLowerCase() === this.mesSeleccionado.toLowerCase()) &&
                (!this.semanaSeleccionada || agenda.semana === this.semanaSeleccionada) &&
                (!this.diaSeleccionado || dia.toLowerCase() === this.diaSeleccionado.toLowerCase())
              );
            });
          }
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
      {value: 'R', texto: 'Pago'},
      {value: 'R/P', texto: 'Pago/Levantamiento de Papeleria'},
      {value: 'C', texto: 'Cobranza'},
      {value: 'VTA', texto: 'Promoción'},
      {value: 'R/EC', texto: 'Pago/Entrega/Cambio de Ciclo'},
      {value: 'R/ER', texto: 'Pago/Entrega/Refill'},
      {value: 'GN', texto: 'Grupo Nuevo'},
      {value: 'Sup', texto: 'Supervisión'},
      {value: 'Aten', texto: 'Atenciones'},
      {value: 'E', texto: 'Desembolso o Entregas'},
      {value: 'R/A', texto: 'Realizando Agendas'},
      {value: 'D', texto: 'Domiciliar'},
      {value: 'Sin Codigo', texto: 'Sin codigo'}
      ];
    @ViewChild('graficaCodigo') graficaCodigo!: ElementRef<HTMLCanvasElement>;

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
          
    @ViewChild('reportePDF') reportePDF!: ElementRef;
    @ViewChild('graficaHoras') graficaHoras!: ElementRef;
    dibujarGraficaReporteadasVsNoReportadas() {
    if (!this.mostrarContenedorGraficas) return;
    
    if (this.chart) this.chart.destroy();

    const total = this.agendasFiltradasPorCoordinador.length;
    const reportadas = this.agendasFiltradasPorCoordinador.filter(a => a.reportado === true).length;
    const noReportadas = total - reportadas;

    this.chart = new Chart(this.graficaHoras.nativeElement.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Reportadas', 'No Reportadas'],
        datasets: [{
          label: 'Horas',
          data: [reportadas, noReportadas],
          backgroundColor: ['#4caf50', '#f44336']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Horas Reportadas vs No Reportadas'
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value, context) => {
              // Forzamos a tratar los datos como número, filtrando nulos o no numéricos
              const rawData = context.chart.data.datasets[0].data;
              const total = (rawData as number[])
                .filter((v): v is number => typeof v === 'number')
                .reduce((a, b) => a + b, 0);

              if (total === 0) return '0 (0%)';

              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

      // Modifica o agrega este método
    mostrarGraficas() {
      this.mostrarContenedorGraficas = true;
      this.dibujarGraficaPorCodigo();
      this.dibujarGraficaReporteadasVsNoReportadas();
    }
    //Generar reporte

    generarPDFConGrafica() {

Swal.fire({
  title: 'Generando PDF...',
  text: 'Por favor espere',
  allowOutsideClick: false,
  allowEscapeKey: false,
  didOpen: () => {
    Swal.showLoading;
    
  }
});

setTimeout(() => {
  const element = this.reportePDF.nativeElement;

  html2canvas(element).then(canvas => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.text(`Coordinador: ${this.coordinadorVisible}`, 10, 10);
    pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 18);

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`reporte_${this.coordinadorVisible}.pdf`);

    // Cerrar el spinner
    Swal.close();

    // Mensaje de éxito opcional
    Swal.fire({
      icon: 'success',
      title: 'PDF generado',
      text: 'El archivo fue guardado correctamente.',
      timer: 2000,
      showConfirmButton: false
    });
  });
}, 500); // Delay para esperar a que se renderice correctamente la gráfica
    }
}
