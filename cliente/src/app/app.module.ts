import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { TableModule } from 'primeng/table'
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { HeaderComponent } from './components/Shared/layout/header/header.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FooterComponent } from './components/Shared/layout/footer/footer.component';
import { BaucherPipe } from './pipes/baucher.pipe';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { ReporteAgendaComponent } from './components/Coordinadoras/reporte-agenda/reporte-agenda.component';

@NgModule({
  declarations: [
    AppComponent,
    BauchersComponent,
    InicioComponent,
    HeaderComponent,
    FooterComponent,
    BaucherPipe,
    RecorridoAgendaComponent,
    ReporteAgendaComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxDatatableModule,
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
  bootstrap: [AppComponent]
})
export class AppModule { }
