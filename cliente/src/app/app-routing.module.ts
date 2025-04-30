import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';

const routes: Routes = [
  { path: 'depositos', component: DepositosComponent },
  { path: '**', component: InicioComponent },

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
