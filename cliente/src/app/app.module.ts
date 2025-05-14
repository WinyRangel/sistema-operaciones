import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
<<<<<<< HEAD
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { TableModule } from 'primeng/table'
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
=======
import { FormsModule } from '@angular/forms';
>>>>>>> main


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { HeaderComponent } from './components/Shared/layout/header/header.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
<<<<<<< HEAD
import { FooterComponent } from './components/Shared/layout/footer/footer.component';
import { BaucherPipe } from './pipes/baucher.pipe';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { ReporteAgendaComponent } from './components/Coordinadoras/reporte-agenda/reporte-agenda.component';
=======
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';
>>>>>>> main

@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    HeaderComponent,
<<<<<<< HEAD
    FooterComponent,
    BaucherPipe,
    RecorridoAgendaComponent,
    ReporteAgendaComponent
=======
    EjecutivasComponent
    DepositosComponent,
>>>>>>> main
  ],
  
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxDatatableModule,
<<<<<<< HEAD
    TableModule,
    FormsModule,
    BaseChartDirective
    
  ],
  providers: [
    provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        
  ],
=======
    FormsModule,
   ],
  
  providers: [],
>>>>>>> main
  bootstrap: [AppComponent]
})
export class AppModule { }
