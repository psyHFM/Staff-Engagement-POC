import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LogInteraction } from './log-interaction';
import { InteractionStateService } from '../interaction-state.service';

describe('LogInteraction', () => {
  let fixture: ComponentFixture<LogInteraction>;
  let component: LogInteraction;
  let stateMock: InteractionStateService;

  const subjects = [
    { id: { value: 1 }, fullName: 'Admin User' },
    { id: { value: 2 }, fullName: 'Employee User' }
  ];

  beforeEach(async () => {
    stateMock = {
      createInteraction: jest.fn(),
      defaultFacilitator: () => ({ value: 2 })
    } as unknown as InteractionStateService;
    (stateMock.createInteraction as jest.Mock).mockReturnValue(of({
      id: { value: 1 },
      type: 'check-in',
      subject: { value: 1 },
      facilitator: { value: 2 },
      note: ''
    }));

    await TestBed.configureTestingModule({
      imports: [LogInteraction],
      providers: [{ provide: InteractionStateService, useValue: stateMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(LogInteraction);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('subject', { value: 1 });
    fixture.componentRef.setInput('subjects', subjects);
  });

  it('initialises the form with the passed subject and default facilitator', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(component.subjectId).toBe(1);
    expect(component.facilitatorId).toBe(2);
    expect(component.type).toBe('check-in');
  });

  it('submits the interaction and emits logged on success', () => {
    // Given
    fixture.detectChanges();
    const loggedSpy = jest.fn();
    component.logged.subscribe(loggedSpy);

    component.type = 'mentoring';
    component.subjectText = 'Mentoring session';
    component.note = '';

    // When
    component.submit();

    // Then
    expect(stateMock.createInteraction).toHaveBeenCalledWith(
      'mentoring',
      { value: 1 },
      { value: 2 },
      'Mentoring session',
      ''
    );
    expect(loggedSpy).toHaveBeenCalled();
  });

  it('resets the form after a successful submit', () => {
    // Given
    fixture.detectChanges();
    component.type = 'performance';
    component.subjectText = 'Performance review';
    component.note = 'Some note';

    // When
    component.submit();

    // Then
    expect(component.type).toBe('check-in');
    expect(component.subjectText).toBe('');
    expect(component.note).toBe('');
  });

  it('does not submit when subject or facilitator is missing', () => {
    // Given
    fixture.detectChanges();
    component.subjectId = null;
    component.facilitatorId = null;

    // When
    component.submit();

    // Then
    expect(stateMock.createInteraction).not.toHaveBeenCalled();
  });
});
