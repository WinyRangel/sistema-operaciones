import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteAgendaComponent } from './reporte-agenda.component';

describe('ReporteAgendaComponent', () => {
  let component: ReporteAgendaComponent;
  let fixture: ComponentFixture<ReporteAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReporteAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
