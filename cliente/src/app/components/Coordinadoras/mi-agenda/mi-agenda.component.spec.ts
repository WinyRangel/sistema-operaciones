import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiAgendaComponent } from './mi-agenda.component';

describe('MiAgendaComponent', () => {
  let component: MiAgendaComponent;
  let fixture: ComponentFixture<MiAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MiAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
