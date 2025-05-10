import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Coordinacion, Persona } from '../../../models/coordinacion';
import { CoordinacionService } from '../../../services/coordinacion.service';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Agenda } from '../../../models/agenda';
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
  isFormVisible: boolean = true;
  isTableVisible: boolean = true;
  isFormExpanded: boolean = false;
  registrarAgenda: FormGroup;
  selectedCoord: Coordinacion | null = null;
  coordinadorVisible: string = ''; // por defecto
  coordinadorSeleccionado: string = '';
  semanas: string[] = [];
  totalKm: number = 0;
  precioPorLitro: number = 0; // este valor lo tomarás desde el input

  mesSeleccionado: string = '';
  semanaSeleccionada: string = '';
  diaSeleccionado: string = '';
  chartCodigo: any;


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
      this.semanas.push(` SEMANA ${i}`);
    }
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
        next: () => console.log('Actividad registrada'),
        error: err => console.error(err)
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
    {value: 'Ninguno', texto: 'Ninguno'}
  ];
  

  //Generar reporte
  generarPDFConGrafica() {
    this.dibujarGraficaReporteadasVsNoReportadas();
  
    setTimeout(() => {
      const element = this.reportePDF.nativeElement;
  
      html2canvas(element).then(canvas => {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`reporte_${this.coordinadorVisible}.pdf`);
      });
    }, 500); // pequeño delay para esperar que la gráfica termine de renderizar
  }
  
  

  @ViewChild('reportePDF') reportePDF!: ElementRef;
  @ViewChild('graficaHoras') graficaHoras!: ElementRef;
  chart: any;
  
  dibujarGraficaReporteadasVsNoReportadas() {
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
            formatter: (value) => value,
            font: {
              weight: 'bold',
              size: 14
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
    
  }

  @ViewChild('graficaCodigo') graficaCodigo!: ElementRef<HTMLCanvasElement>;

  dibujarGraficaPorCodigo() {
    if (this.chartCodigo) this.chartCodigo.destroy();
  
    const conteoPorCodigo: { [key: string]: number } = {};
  
    this.opcionesCodigo.forEach(opcion => {
      conteoPorCodigo[opcion.texto] = 0;
    });
  
    this.agendasFiltradasPorCoordinador.forEach(a => {
      const codigo = this.opcionesCodigo.find(o => o.value === a.codigo)?.texto;
      if (codigo) conteoPorCodigo[codigo]++;
    });
  
    const etiquetas = Object.keys(conteoPorCodigo);
    const valores = Object.values(conteoPorCodigo);
  
    this.chartCodigo = new Chart(this.graficaCodigo.nativeElement.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Cantidad por código',
          data: valores,
          backgroundColor: '#2196f3'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Agendas por Código'
          },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value,
            font: {
              weight: 'bold',
              size: 12
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }
  
  
}
