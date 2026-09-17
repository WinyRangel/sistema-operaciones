import { TestBed } from '@angular/core/testing';

import { AgendaAdminService } from './agenda-admin.service';

describe('AgendaAdminService', () => {
  let service: AgendaAdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgendaAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
