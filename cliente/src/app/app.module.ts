import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { TableModule } from 'primeng/table'
import { NgOptimizedImage } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { HeaderComponent } from './components/Shared/layout/header/header.component';
import { LegalesComponent } from './components/Shared/legales/legales.component';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FooterComponent } from './components/Shared/layout/footer/footer.component';
import { BaucherPipe } from './pipes/baucher.pipe';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';

import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { ReporteFichasComponent } from './components/reporte-fichas/reporte-fichas.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';
import { FechaFormatPipe } from './pipes/fecha-format.pipe';


@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    HeaderComponent,
    LegalesComponent,
    FooterComponent,
    BaucherPipe,
    BauchersComponent,
    RecorridoAgendaComponent,
    EjecutivasComponent,
    DepositosComponent,
    ReporteFichasComponent,
    FechaFormatPipe
  ],
  
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxDatatableModule,
    TagModule,
    ToggleButtonModule,
    TableModule,
    FormsModule,
    NgOptimizedImage,
    DatePickerModule

  ],
    providers: [
        provideAnimationsAsync(),
        providePrimeNG({ /* options */ })
    ], 
  bootstrap: [AppComponent]
})
export class AppModule { }
