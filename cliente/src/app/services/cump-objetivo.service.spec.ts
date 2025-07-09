import { TestBed } from '@angular/core/testing';

import { CumpObjetivoService } from './cump-objetivo.service';

describe('CumpObjetivoService', () => {
  let service: CumpObjetivoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CumpObjetivoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
