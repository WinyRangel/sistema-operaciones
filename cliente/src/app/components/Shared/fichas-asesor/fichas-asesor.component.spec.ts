import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FichasAsesorComponent } from './fichas-asesor.component';

describe('FichasAsesorComponent', () => {
  let component: FichasAsesorComponent;
  let fixture: ComponentFixture<FichasAsesorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FichasAsesorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FichasAsesorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
