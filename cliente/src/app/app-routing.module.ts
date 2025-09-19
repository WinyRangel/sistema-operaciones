import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';
import { ReporteFichasComponent } from './components/reporte-fichas/reporte-fichas.component';
import { AgendasComponent } from './components/Coordinadoras/agendas/agendas.component';
import { ReporteAgendasComponent } from './components/Coordinadoras/reporte-agendas/reporte-agendas.component';
import { ProyeccionesComponent } from './components/Shared/proyecciones/proyecciones.component';
import { SeguimientoProyeccionesComponent } from './components/Shared/seguimiento-proyecciones/seguimiento-proyecciones.component';
import { DirSegProyeccionComponent } from './components/Shared/dir-seg-proyeccion/dir-seg-proyeccion.component';
import { LegalesComponent } from './components/Shared/legales/legales.component';
import { IniciarSesionComponent } from './components/Shared/iniciar-sesion/iniciar-sesion.component';
import { AuthGuard } from './guards/auth.guard';
import { CumplimientoAgendaComponent } from './components/Shared/cumplimiento-agenda/cumplimiento-agenda.component';
import { SubirAgendaComponent } from './components/Coordinadoras/subir-agenda/subir-agenda.component';
import { MiAgendaComponent } from './components/Coordinadoras/mi-agenda/mi-agenda.component';
import { RegistrarAgendaComponent } from './components/Coordinadoras/registrar-agenda/registrar-agenda.component';
import { FichasAsesorComponent } from './components/Shared/fichas-asesor/fichas-asesor.component';
import { FichasComponent } from './components/Shared/fichas/fichas.component';


const routes: Routes = [
  { path: 'baucher', component: BauchersComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'legales', component: LegalesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'recorrido-agenda', component: RecorridoAgendaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'reporte-agendas', component: ReporteAgendasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'agendas', component: AgendasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'mi-agenda', component: MiAgendaComponent, canActivate: [AuthGuard], data: { roles: ['coordinador']} },
  { path: 'registrar-agenda', component: RegistrarAgendaComponent, canActivate: [AuthGuard], data: { roles: ['coordinador']} },
  { path: 'cumplimiento-agenda', component: CumplimientoAgendaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'registrar-agendas', component: AgendasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup', 'coordinador']} },
  { path: 'subir-agendas', component: SubirAgendaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'iniciar-sesion', component: IniciarSesionComponent},
  { path: 'ejecutivas', component: EjecutivasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'depositos', component: DepositosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'inicio', component: InicioComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup', 'coordinador', 'asesor']} },
  { path: 'reportefichas', component: ReporteFichasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'fichas-asesor', component: FichasAsesorComponent, canActivate: [AuthGuard], data: {roles: ['admin', 'sup', 'asesor']}},
  { path: 'proyecciones', component: ProyeccionesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']} },
  { path: 'seg-proyecciones', component: SeguimientoProyeccionesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup']}  },
  { path: 'dir-seg-proyeccion', component: DirSegProyeccionComponent, canActivate: [AuthGuard], data: { roles: ['admin']}},
  { path: 'fichas', component: FichasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'sup', 'coordinador']} },
  { path: '**', redirectTo: 'inicio' }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }