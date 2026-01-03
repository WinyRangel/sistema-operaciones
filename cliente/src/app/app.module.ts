import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX'; // 🇲🇽 español México

registerLocaleData(localeEs);

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { TableModule } from 'primeng/table'
import { NgOptimizedImage } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { HeaderComponent } from './components/Shared/layout/header/header.component';
import { LegalesComponent } from './components/Shared/legales/legales.component';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
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
import { AgendasComponent } from './components/Coordinadoras/agendas/agendas.component';
import { ReporteAgendasComponent } from './components/Coordinadoras/reporte-agendas/reporte-agendas.component';

import { IniciarSesionComponent } from './components/Shared/iniciar-sesion/iniciar-sesion.component';

import { ProyeccionesComponent } from './components/Shared/proyecciones/proyecciones.component';
import { SeguimientoProyeccionesComponent } from './components/Shared/seguimiento-proyecciones/seguimiento-proyecciones.component';
import { DirSegProyeccionComponent } from './components/Shared/dir-seg-proyeccion/dir-seg-proyeccion.component';
import { CumplimientoAgendaComponent } from './components/Shared/cumplimiento-agenda/cumplimiento-agenda.component';
import { SubirAgendaComponent } from './components/Coordinadoras/subir-agenda/subir-agenda.component';
import { ActividadPipe } from './pipes/actividad.pipe';
import { MiAgendaComponent } from './components/Coordinadoras/mi-agenda/mi-agenda.component';
import { TokenInterceptor } from './interceptors/token.interceptor';
import { RegistrarAgendaComponent } from './components/Coordinadoras/registrar-agenda/registrar-agenda.component';
import { FichasAsesorComponent } from './components/Shared/fichas-asesor/fichas-asesor.component';
import { TestComponent } from './components/registrar-agenda-asesor/test.component';
import { TestAgendaComponent } from './components/test-agenda/test-agenda.component';
import { TruncatePipe } from './pipes/truncate.pipe';

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
    FechaFormatPipe,
    AgendasComponent,
    ReporteAgendasComponent,
    ProyeccionesComponent,
    SeguimientoProyeccionesComponent,
    DirSegProyeccionComponent,
    LegalesComponent,
    IniciarSesionComponent,
    CumplimientoAgendaComponent,
    SubirAgendaComponent,
    ActividadPipe,
    MiAgendaComponent,
    RegistrarAgendaComponent,
    FichasAsesorComponent,
    TestComponent,
    TestAgendaComponent,
    TruncatePipe
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
    DatePickerModule,
    ScrollingModule,
    ButtonModule,
    CommonModule

  ],
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({ /* options */ }),
    {
      provide: LOCALE_ID,
      useValue: 'es-MX'
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    }

  ],
  bootstrap: [AppComponent]
})
export class AppModule { }