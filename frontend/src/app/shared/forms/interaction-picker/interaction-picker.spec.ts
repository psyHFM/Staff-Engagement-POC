import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../../api/api-client';
import { ApiError } from '../../api/error-envelope';
import { InteractionPicker } from './interaction-picker';

describe('InteractionPicker', () => {
  let fixture: ComponentFixture<InteractionPicker>;
  let component: InteractionPicker;
  let apiClientSpy: { get: jest.Mock };

  const apiError = (status = 500): ApiError =>
    new ApiError(
      {
        timestamp: new Date().toISOString(),
        status,
        error: 'Internal Server Error',
        message: 'boom',
        path: '/api/v1/interactions'
      },
      status
    );

  beforeEach(async () => {
    apiClientSpy = { get: jest.fn().mockReturnValue(of({ content: [], offset: 0, limit: 100, total: 0 })) };

    await TestBed.configureTestingModule({
      imports: [InteractionPicker],
      providers: [{ provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient }]
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionPicker);
    component = fixture.componentInstance;
  });

  it('loads GET /api/v1/interactions on first paint and exposes the options', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Regular check-in',
            createdAt: '2026-06-25T10:00:00Z'
          },
          {
            id: { value: 2 },
            type: 'mentoring',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Career development discussion',
            createdAt: '2026-06-26T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );

    // When
    fixture.detectChanges();

    // Then — the fetch fires once with a wide page
    expect(apiClientSpy.get).toHaveBeenCalledWith('interactions', { offset: 0, limit: 100 });
    expect(component.options()).toHaveLength(2);
    expect(component.options()[0].note).toBe('Regular check-in');
    expect(component.isLoading()).toBe(false);
  });

  it('loads filtered interactions when subjectId is provided', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Check-in for employee 2',
            createdAt: '2026-06-25T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 1
      })
    );

    // When — subjectId=2 supplied before the directory GET resolves
    fixture.componentRef.setInput('subjectId', 2);
    fixture.detectChanges();

    // Then — fetches filtered endpoint
    expect(apiClientSpy.get).toHaveBeenCalledWith('employees/2/interactions', { offset: 0, limit: 100 });
  });

  it('renders one <option> per interaction plus the placeholder', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Regular check-in',
            createdAt: '2026-06-25T10:00:00Z'
          },
          {
            id: { value: 2 },
            type: 'mentoring',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Career development discussion',
            createdAt: '2026-06-26T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;

    // Then — 2 interactions + 1 placeholder
    expect(select.options).toHaveLength(3);
    expect(select.options[0].textContent).toContain('Select an interaction');
    expect(select.options[1].textContent?.trim()).toContain('Admin User');
    expect(select.options[2].textContent?.trim()).toContain('Career development');
  });

  it('truncates long notes to 60 chars with ellipsis in the option text', () => {
    // Given — a note longer than 60 characters
    const longNote = 'A'.repeat(80);
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: longNote,
            createdAt: '2026-06-25T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 1
      })
    );
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;

    // Then — note is truncated at 60 chars with ellipsis
    expect(select.options[1].textContent?.trim()).toBe(`Admin User — ${longNote.substring(0, 60)}…`);
  });

  it('pre-selects the supplied value (numeric id) once the directory finishes loading', () => {
    // Given — a directory whose options arrive after the [value] input is bound
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Check-in',
            createdAt: '2026-06-25T10:00:00Z'
          },
          {
            id: { value: 2 },
            type: 'mentoring',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Mentoring',
            createdAt: '2026-06-26T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );

    // When — value=2 supplied before the directory GET resolves
    fixture.componentRef.setInput('value', 2);
    fixture.detectChanges();
    fixture.detectChanges();
    fixture.detectChanges();

    // Then — the bound id wins
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;
    expect(select.value).toBe('2');
  });

  it('emits valueChange with the picked id when a different option is chosen', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Check-in',
            createdAt: '2026-06-25T10:00:00Z'
          },
          {
            id: { value: 2 },
            type: 'mentoring',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Mentoring',
            createdAt: '2026-06-26T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    component.valueChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;

    // When — user picks "2"
    select.value = '2';
    select.dispatchEvent(new Event('change'));

    // Then
    expect(emitted).toEqual([2]);
  });

  it('emits valueChange(null) when a non-numeric option is chosen (parseInt guard)', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Check-in',
            createdAt: '2026-06-25T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 1
      })
    );
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    component.valueChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;

    // When — pathological "NaN" selection
    select.value = 'NaN';
    select.dispatchEvent(new Event('change'));

    // Then — the parseInt + isFinite guard coerces to null
    expect(emitted).toEqual([null]);
  });

  it('emits subjectIdChange with the interaction\'s subject when an interaction is picked', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 3 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Check-in',
            createdAt: '2026-06-25T10:00:00Z'
          },
          {
            id: { value: 2 },
            type: 'mentoring',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Mentoring',
            createdAt: '2026-06-26T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    component.subjectIdChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;

    // When — user picks "2" (subject=2)
    select.value = '2';
    select.dispatchEvent(new Event('change'));

    // Then — the subject id of the selected interaction is emitted
    expect(emitted).toEqual([2]);
  });

  it('emits subjectIdChange(null) when cleared', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          {
            id: { value: 1 },
            type: 'check-in',
            subject: { value: 2 },
            facilitator: { value: 1 },
            facilitatorName: 'Admin User',
            note: 'Check-in',
            createdAt: '2026-06-25T10:00:00Z'
          }
        ],
        offset: 0,
        limit: 100,
        total: 1
      })
    );
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    component.subjectIdChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('select.interaction-picker__select') as HTMLSelectElement;

    // When — user selects the placeholder (empty)
    select.value = '';
    select.dispatchEvent(new Event('change'));

    // Then
    expect(emitted).toEqual([null]);
  });

  it('surfaces directory failures via the error signal and keeps isLoading false', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError(503)));

    // When
    fixture.detectChanges();

    // Then
    expect(component.error()).toEqual(apiError(503));
    expect(component.isLoading()).toBe(false);
    expect(component.options()).toEqual([]);
  });
});
