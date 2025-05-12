import { TestBed } from '@angular/core/testing';

import { DepositosService } from './depositos.service';

describe('DepositosService', () => {
  let service: DepositosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DepositosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
