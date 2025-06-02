import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { LegalesComponent } from './components/Shared/legales/legales.component';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';
import { ReporteFichasComponent } from './components/reporte-fichas/reporte-fichas.component';
import { CumplimientoAgendaComponent } from './components/Shared/cumplimiento-agenda/cumplimiento-agenda.component';

const routes: Routes = [
  { path: 'baucher', component: BauchersComponent },
  { path: 'legales', component: LegalesComponent },
  { path: 'recorrido-agenda', component: RecorridoAgendaComponent },
  { path: 'ejecutivas', component: EjecutivasComponent },
  { path: 'depositos', component: DepositosComponent },
  { path: 'inicio', component: InicioComponent },
  { path: 'reportefichas', component: ReporteFichasComponent },
  { path: 'cumplimientoobjetivo', component: CumplimientoAgendaComponent},
  { path: '**', component: InicioComponent }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }