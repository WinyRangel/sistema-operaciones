import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestAgendaComponent } from './test-agenda.component';

describe('TestAgendaComponent', () => {
  let component: TestAgendaComponent;
  let fixture: ComponentFixture<TestAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
