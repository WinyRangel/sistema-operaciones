import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendaChartsComponent } from './agenda-charts.component';

describe('AgendaChartsComponent', () => {
  let component: AgendaChartsComponent;
  let fixture: ComponentFixture<AgendaChartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AgendaChartsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgendaChartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
