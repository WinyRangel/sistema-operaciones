import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CumplimientoAgendaComponent } from './cumplimiento-agenda.component';

describe('CumplimientoAgendaComponent', () => {
  let component: CumplimientoAgendaComponent;
  let fixture: ComponentFixture<CumplimientoAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CumplimientoAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CumplimientoAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
