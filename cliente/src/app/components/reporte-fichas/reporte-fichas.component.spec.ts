import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteFichasComponent } from './reporte-fichas.component';

describe('ReporteFichasComponent', () => {
  let component: ReporteFichasComponent;
  let fixture: ComponentFixture<ReporteFichasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReporteFichasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteFichasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
