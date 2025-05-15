import { ComponentFixture, TestBed } from '@angular/core/testing';

<<<<<<<< HEAD:cliente/src/app/components/Shared/layout/footer/footer.component.spec.ts
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
========
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
>>>>>>>> feature/reportefichas:cliente/src/app/components/reporte-fichas/reporte-fichas.component.spec.ts
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
