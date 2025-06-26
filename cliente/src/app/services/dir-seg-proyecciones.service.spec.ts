import { TestBed } from '@angular/core/testing';

import { DirSegProyeccionesService } from './dir-seg-proyecciones.service';

describe('DirSegProyeccionesService', () => {
  let service: DirSegProyeccionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DirSegProyeccionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
