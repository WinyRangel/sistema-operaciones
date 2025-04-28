import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { TableModule } from 'primeng/table'


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BauchersComponent } from './components/Shared/bauchers/bauchers.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { HeaderComponent } from './components/Shared/layout/header/header.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FooterComponent } from './components/Shared/layout/footer/footer.component';

@NgModule({
  declarations: [
    AppComponent,
    BauchersComponent,
    InicioComponent,
    HeaderComponent,
    FooterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxDatatableModule,
    TableModule,
    
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
