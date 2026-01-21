import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData, CommonModule, NgOptimizedImage } from '@angular/common';
import localeEs from '@angular/common/locales/es-MX';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

import { NgxDatatableModule } from '@swimlane/ngx-datatable';

// PrimeNG Modules
import { providePrimeNG } from 'primeng/config';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { DividerModule } from 'primeng/divider';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { HeaderComponent } from './components/Shared/layout/header/header.component';
import { LegalesComponent } from './components/Shared/legales/legales.component';
import { FooterComponent } from './components/Shared/layout/footer/footer.component';
import { BaucherPipe } from './pipes/baucher.pipe';
import { RecorridoAgendaComponent } from './components/Coordinadoras/recorrido-agenda/recorrido-agenda.component';
import { EjecutivasComponent } from './components/Shared/ejecutivas/ejecutivas.component';
import { DepositosComponent } from './components/Shared/depositos/depositos.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { ReporteFichasComponent } from './components/reporte-fichas/reporte-fichas.component';
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
import { FichasAsesorComponent } from './components/Shared/fichas-asesor/fichas-asesor.component';
import { TestComponent } from './components/registrar-agenda-asesor/test.component';
import { TestAgendaComponent } from './components/test-agenda/test-agenda.component';
import { TruncatePipe } from './pipes/truncate.pipe';

registerLocaleData(localeEs);

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    }
  }
});
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
    IniciarSesionComponent,
    CumplimientoAgendaComponent,
    SubirAgendaComponent,
    ActividadPipe,
    MiAgendaComponent,
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
    CommonModule,
    CardModule,
    CheckboxModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    SelectButtonModule,
    MessageModule,
    DividerModule
  ],
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          prefix: 'p',
          darkModeSelector: 'false',
          cssLayer: false
        }
      }
    }),
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


