import { TestBed } from '@angular/core/testing';

import { LegalesService } from './legales.service';

describe('LegalesService', () => {
  let service: LegalesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LegalesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
