import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';

const routes: Routes = [
  { path: 'baucher', component: BauchersComponent },
  { path: 'recorrido-agenda', component:RecorridoAgendaComponent },
  { path: '**', component: InicioComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
