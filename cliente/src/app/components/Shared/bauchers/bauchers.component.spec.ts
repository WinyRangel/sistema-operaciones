import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BauchersComponent } from './bauchers.component';

describe('BauchersComponent', () => {
  let component: BauchersComponent;
  let fixture: ComponentFixture<BauchersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BauchersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BauchersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
