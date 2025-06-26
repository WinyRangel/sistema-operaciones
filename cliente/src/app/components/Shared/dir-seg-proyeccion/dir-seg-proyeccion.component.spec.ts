import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirSegProyeccionComponent } from './dir-seg-proyeccion.component';

describe('DirSegProyeccionComponent', () => {
  let component: DirSegProyeccionComponent;
  let fixture: ComponentFixture<DirSegProyeccionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DirSegProyeccionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DirSegProyeccionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
