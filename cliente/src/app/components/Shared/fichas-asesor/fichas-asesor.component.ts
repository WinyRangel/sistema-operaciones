import { Component, OnInit } from '@angular/core';
import { FichasService } from '../../../services/fichas.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-fichas-asesor',
  standalone: false,
  templateUrl: './fichas-asesor.component.html',
  styleUrls: ['./fichas-asesor.component.css']
})
export class FichasAsesorComponent implements OnInit {
  fichas: any[] = [];
  cargando = true;
  diaSeleccionado: string = 'Todos';
  dias = ['Todos','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  busquedaCliente: string = '';
  asesorActual: string = '';
  coordinacionActual: string = '';


  constructor(
    private fichasService: FichasService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarFichas();
    
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.asesorActual = payload.usuario || ''; // 👈 aquí viene el nombre del asesor
        this.coordinacionActual = payload.coordinacion || '';
      } catch (e) {
        console.error('Error al leer token:', e);
      }
    }
  }

  cargarFichas() {
    this.cargando = true;

    this.fichasService.getAll().subscribe({ // ❌ no pasamos token
      next: (data) => {
        this.fichas = data;
        this.cargando = false;
        if (this.fichas.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No hay fichas disponibles',
            text: 'Tu coordinación no tiene fichas asignadas aún.',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      },
      error: (err) => {
        console.error('Error al obtener fichas:', err);
        this.cargando = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar fichas',
          text: err.error?.message || 'Intenta más tarde',
        });
      }
    });
  }

  toggleEstado(f: any, event: any) {
    f.estado = event.target.checked;
    f.fechahora = f.estado ? new Date() : null;
  }

  toggleTipoPago(f: any, tipo: string, event: any) {
    if (!Array.isArray(f.tipopago)) f.tipopago = [];
    if (event.target.checked) {
      if (!f.tipopago.includes(tipo)) f.tipopago.push(tipo);
    } else {
      f.tipopago = f.tipopago.filter((p: string) => p !== tipo);
    }
  }

  descargarPDF() {
    const doc = new jsPDF();
    const fichasFiltradas = this.diaSeleccionado === 'Todos'
      ? this.fichas
      : this.fichas.filter(f => f.diaAtencion?.toLowerCase() === this.diaSeleccionado.toLowerCase());

    if(fichasFiltradas.length === 0){
      Swal.fire('No hay fichas para el día seleccionado');
      return;
    }

    const columnas = ["Semana", "Cliente", "Día Atención"];
    const filas = fichasFiltradas.map(f => [f.semana, f.cliente, f.diaAtencion]);

    autoTable(doc, { head: [columnas], body: filas, theme: 'grid' });
    doc.save(`fichas_${this.diaSeleccionado}.pdf`);
  }

  guardarCambios() {
    this.fichas.forEach(f => {
      const payload: any = {
        estado: f.estado,
        fechahora: f.fechahora,
        tipopago: f.tipopago,
        cliente: f.cliente,
        semana: f.semana,
        diaAtencion: f.diaAtencion
      };

      this.fichasService.update(f._id, payload).subscribe({
        next: () => console.log(`Ficha ${f.cliente} actualizada correctamente`),
        error: (err) => console.error(`Error al actualizar ficha ${f.cliente}:`, err)
      });
    });

    Swal.fire({
      icon: "success",
      title: "Todos los cambios se guardaron correctamente",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  }

  fichasFiltradas(): any[] {
    return this.fichas.filter(f => {
      const diaFicha = f.diaAtencion?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const diaSeleccion = this.diaSeleccionado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const coincideDia = this.diaSeleccionado === 'Todos' || diaFicha === diaSeleccion;
      const coincideCliente = !this.busquedaCliente || f.cliente.toLowerCase().includes(this.busquedaCliente.toLowerCase());
      return coincideDia && coincideCliente;
    });
  }

}
