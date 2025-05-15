import { TestBed } from '@angular/core/testing';

import { EjecutivasService } from './ejecutivas.service';

describe('EjecutivasService', () => {
  let service: EjecutivasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EjecutivasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
