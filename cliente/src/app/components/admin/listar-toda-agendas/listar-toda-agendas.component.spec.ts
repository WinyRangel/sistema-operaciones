import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarTodaAgendasComponent } from './listar-toda-agendas.component';

describe('ListarTodaAgendasComponent', () => {
  let component: ListarTodaAgendasComponent;
  let fixture: ComponentFixture<ListarTodaAgendasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ListarTodaAgendasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarTodaAgendasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
