import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../../api/api-client';
import { ApiError } from '../../api/error-envelope';
import { EmployeePicker } from './employee-picker';

describe('EmployeePicker', () => {
  let fixture: ComponentFixture<EmployeePicker>;
  let component: EmployeePicker;
  let apiClientSpy: { get: jest.Mock };

  const apiError = (status = 500): ApiError =>
    new ApiError(
      {
        timestamp: new Date().toISOString(),
        status,
        error: 'Internal Server Error',
        message: 'boom',
        path: '/api/v1/employees'
      },
      status
    );

  beforeEach(async () => {
    apiClientSpy = { get: jest.fn().mockReturnValue(of({ content: [], offset: 0, limit: 100, total: 0 })) };

    await TestBed.configureTestingModule({
      imports: [EmployeePicker],
      providers: [{ provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient }]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeePicker);
    component = fixture.componentInstance;
  });

  it('loads GET /api/v1/employees on first paint and exposes the options', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          { id: { value: 1 }, fullName: 'Admin User', email: 'admin@staff.eng', role: 'admin' },
          { id: { value: 2 }, fullName: 'Employee User', email: 'employee@staff.eng', role: 'employee' }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );

    // When
    fixture.detectChanges();

    // Then — the fetch fires once with a wide page
    expect(apiClientSpy.get).toHaveBeenCalledWith('employees', { offset: 0, limit: 100 });
    expect(component.options()).toHaveLength(2);
    expect(component.options()[0].fullName).toBe('Admin User');
    expect(component.isLoading()).toBe(false);
  });

  it('renders one <option> per employee plus the placeholder', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          { id: { value: 1 }, fullName: 'Admin User', email: 'admin@staff.eng', role: 'admin' },
          { id: { value: 2 }, fullName: 'Employee User', email: 'employee@staff.eng', role: 'employee' }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select.employee-picker__select') as HTMLSelectElement;

    // Then — 2 employees + 1 placeholder
    expect(select.options).toHaveLength(3);
    expect(select.options[0].textContent).toContain('Select an employee');
    expect(select.options[1].textContent?.trim()).toBe('Admin User');
    expect(select.options[2].textContent?.trim()).toBe('Employee User');
  });

  it('pre-selects the supplied value (numeric id) once the directory finishes loading', () => {
    // Given — a directory whose options arrive after the [value] input is bound
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          { id: { value: 1 }, fullName: 'Admin User', email: 'admin@staff.eng', role: 'admin' },
          { id: { value: 2 }, fullName: 'Employee User', email: 'employee@staff.eng', role: 'employee' }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );

    // When — value=2 supplied before the directory GET resolves
    fixture.componentRef.setInput('value', 2);
    fixture.detectChanges();
    // The first detectChanges runs ngOnInit → loadEmployees which schedules
    // the GET subscription; the synchronous `of()` resolves in the same
    // tick, then a second CD renders the options and the binding fires.
    fixture.detectChanges();
    fixture.detectChanges();

    // Then — the bound id wins: the select reflects the supplied id
    // (W1 fix: strict equality; the strict matcher kills a Stryker
    // mutant that always renders value=1 instead of the bound input)
    const select = fixture.nativeElement.querySelector('select.employee-picker__select') as HTMLSelectElement;
    expect(select.value).toBe('2');
  });

  it('shows the placeholder when value is null and the directory is empty', () => {
    // Given — empty directory
    apiClientSpy.get.mockReturnValue(
      of({ content: [], offset: 0, limit: 100, total: 0 })
    );

    // When — value is the default (null)
    fixture.detectChanges();
    fixture.detectChanges();

    // Then — placeholder (empty string value) is selected
    const select = fixture.nativeElement.querySelector('select.employee-picker__select') as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('emits valueChange with the picked id when a different option is chosen', () => {
    // Given
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          { id: { value: 1 }, fullName: 'Admin User', email: 'admin@staff.eng', role: 'admin' },
          { id: { value: 2 }, fullName: 'Employee User', email: 'employee@staff.eng', role: 'employee' }
        ],
        offset: 0,
        limit: 100,
        total: 2
      })
    );
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    component.valueChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('select.employee-picker__select') as HTMLSelectElement;

    // When — user picks "2"
    select.value = '2';
    select.dispatchEvent(new Event('change'));

    // Then
    expect(emitted).toEqual([2]);
  });

  it('emits valueChange(null) when a non-numeric option is chosen (parseInt guard)', () => {
    // Given — a directory with one valid entry + a manually injected bogus option
    apiClientSpy.get.mockReturnValue(
      of({
        content: [
          { id: { value: 1 }, fullName: 'Admin User', email: 'admin@staff.eng', role: 'admin' }
        ],
        offset: 0,
        limit: 100,
        total: 1
      })
    );
    fixture.detectChanges();
    const emitted: Array<number | null> = [];
    component.valueChange.subscribe((id) => emitted.push(id));
    const select = fixture.nativeElement.querySelector('select.employee-picker__select') as HTMLSelectElement;

    // When — pathological "NaN" selection (W7: locks the Number.isFinite guard)
    select.value = 'NaN';
    select.dispatchEvent(new Event('change'));

    // Then — the parseInt + isFinite guard coerces to null (not NaN)
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