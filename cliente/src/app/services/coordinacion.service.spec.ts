import { TestBed } from '@angular/core/testing';

import { CoordinacionService } from './coordinacion.service';

describe('CoordinacionService', () => {
  let service: CoordinacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CoordinacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
