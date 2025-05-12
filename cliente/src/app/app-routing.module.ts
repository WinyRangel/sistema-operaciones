import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { ReporteFichasComponent } from './components/reporte-fichas/reporte-fichas.component';

const routes: Routes = [
  { path: 'reportefichas', component: ReporteFichasComponent},
  { path: '**', component: InicioComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
