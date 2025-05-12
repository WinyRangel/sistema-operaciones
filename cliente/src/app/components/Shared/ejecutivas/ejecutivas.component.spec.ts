import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EjecutivasComponent } from './ejecutivas.component';

describe('EjecutivasComponent', () => {
  let component: EjecutivasComponent;
  let fixture: ComponentFixture<EjecutivasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EjecutivasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EjecutivasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
