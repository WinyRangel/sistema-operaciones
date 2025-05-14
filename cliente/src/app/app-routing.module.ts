import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
<<<<<<< HEAD
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';

const routes: Routes = [
  { path: 'baucher', component: BauchersComponent },
  { path: 'recorrido-agenda', component:RecorridoAgendaComponent },
  { path: '**', component: InicioComponent }
];
=======
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';

const routes: Routes = [

  { path: 'ejecutivas', component: EjecutivasComponent },
  { path: 'inicio', component: InicioComponent },
  { path: 'depositos', component: DepositosComponent },
  { path: '**', component: InicioComponent },
>>>>>>> main

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }