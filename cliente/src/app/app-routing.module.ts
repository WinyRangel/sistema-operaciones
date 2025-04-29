import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';

const routes: Routes = [
  { path: 'baucher', component: BauchersComponent },
  { path: 'ejecutivas', component: EjecutivasComponent },
  { path: 'inicio', component: InicioComponent },
  { path: '', redirectTo: 'ejecutivas', pathMatch: 'full' }, // Redirección a ejecutivas
  { path: '**', redirectTo: 'ejecutivas' } // Redirige cualquier ruta no encontrada a ejecutivas
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }