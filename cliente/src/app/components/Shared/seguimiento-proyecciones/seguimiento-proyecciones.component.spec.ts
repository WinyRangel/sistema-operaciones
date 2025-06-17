import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguimientoProyeccionesComponent } from './seguimiento-proyecciones.component';

describe('SeguimientoProyeccionesComponent', () => {
  let component: SeguimientoProyeccionesComponent;
  let fixture: ComponentFixture<SeguimientoProyeccionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SeguimientoProyeccionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeguimientoProyeccionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
