import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';
import { ReporteFichasComponent } from './components/reporte-fichas/reporte-fichas.component';
import { CumplimientoAgendaComponent } from './components/Shared/cumplimiento-agenda/cumplimiento-agenda.component';
import { AgendasComponent } from './components/Coordinadoras/agendas/agendas.component';
import { ReporteAgendasComponent } from './components/Coordinadoras/reporte-agendas/reporte-agendas.component';
import { ProyeccionesComponent } from './components/Shared/proyecciones/proyecciones.component';
import { SeguimientoProyeccionesComponent } from './components/Shared/seguimiento-proyecciones/seguimiento-proyecciones.component';
import { DirSegProyeccionComponent } from './components/Shared/dir-seg-proyeccion/dir-seg-proyeccion.component';
import { LegalesComponent } from './components/Shared/legales/legales.component';

const routes: Routes = [
  { path: 'baucher', component: BauchersComponent },
  { path: 'recorrido-agenda', component: RecorridoAgendaComponent },
  { path: 'reporte-agendas', component: ReporteAgendasComponent },
  { path: 'agendas', component: AgendasComponent },
  { path: 'ejecutivas', component: EjecutivasComponent },
  { path: 'depositos', component: DepositosComponent },
  { path: 'inicio', component: InicioComponent },
  { path: 'reportefichas', component: ReporteFichasComponent },
  { path: 'cumplimientoobjetivo', component: CumplimientoAgendaComponent},
  { path: 'proyecciones', component: ProyeccionesComponent },
  { path: 'seg-proyecciones', component: SeguimientoProyeccionesComponent },
  { path: 'dir-seg-proyeccion', component: DirSegProyeccionComponent},
  { path: 'legales', component: LegalesComponent},
  { path: '**', component: InicioComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }