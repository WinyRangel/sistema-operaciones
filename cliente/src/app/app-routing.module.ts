import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';

const routes: Routes = [

  { path: 'ejecutivas', component: EjecutivasComponent },
  { path: 'inicio', component: InicioComponent },
  { path: '', redirectTo: 'ejecutivas', pathMatch: 'full' },
  { path: '**', redirectTo: 'ejecutivas' } 
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }