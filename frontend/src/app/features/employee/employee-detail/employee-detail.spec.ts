import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeDetail } from './employee-detail';
import { EmployeeResponse, UpdateEmployeeRequest } from '../employee.types';

describe('EmployeeDetail', () => {
  let fixture: ComponentFixture<EmployeeDetail>;
  let component: EmployeeDetail;

  const employee = (overrides: Partial<EmployeeResponse> = {}): EmployeeResponse => ({
    id: { value: 7 },
    fullName: 'Jane Doe',
    email: 'jane@staff.eng',
    role: 'employee',
    jobTitle: 'Eng',
    department: 'Platform',
    level: 'senior',
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDetail]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeDetail);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('employee', employee());
    fixture.componentRef.setInput('canEdit', true);
    fixture.componentRef.setInput('canEditRole', true);
  });

  it('renders the employee fields read-only', () => {
    // When
    fixture.detectChanges();

    // Then
    const fields = fixture.nativeElement.textContent;
    expect(fields).toContain('Jane Doe');
    expect(fields).toContain('jane@staff.eng');
    expect(fields).toContain('Platform');
  });

  it('shows the edit form when canEdit is true', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.employee-detail__form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.employee-detail__readonly')).toBeFalsy();
  });

  it('shows a read-only note instead of the form when canEdit is false', () => {
    // Given
    fixture.componentRef.setInput('canEdit', false);

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.employee-detail__form')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.employee-detail__readonly')).toBeTruthy();
  });

  it('shows the role control only when canEditRole is true', () => {
    // Given — admin may change role
    fixture.componentRef.setInput('canEditRole', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#role')).toBeTruthy();

    // When — a non-admin (owner) editing their own profile
    fixture.componentRef.setInput('canEditRole', false);
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('#role')).toBeFalsy();
  });

  it('pre-fills the form with the selected employee on changes', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(component.fullName).toBe('Jane Doe');
    expect(component.level).toBe('senior');
    expect(component.role).toBe('employee');
  });

  it('re-syncs the form when the selected employee changes', () => {
    // Given
    fixture.detectChanges();
    expect(component.fullName).toBe('Jane Doe');

    // When
    fixture.componentRef.setInput('employee', employee({ fullName: 'Jane Smith', role: 'admin' }));
    fixture.detectChanges();

    // Then
    expect(component.fullName).toBe('Jane Smith');
    expect(component.role).toBe('admin');
  });

  it('emits an update with the selected role when canEditRole is true', () => {
    // Given — the form is pre-filled with the employee's current values; only
    // fullName and role are changed here, the rest are sent unchanged.
    fixture.detectChanges();
    component.fullName = 'Jane Smith';
    component.role = 'admin';
    const emitted: UpdateEmployeeRequest[] = [];
    component.updated.subscribe((req) => emitted.push(req));

    // When
    component.submit();

    // Then
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({
      fullName: 'Jane Smith',
      jobTitle: 'Eng',
      department: 'Platform',
      level: 'senior',
      role: 'admin',
      email: null
    });
  });

  it('emits an update with role null when canEditRole is false (non-admin)', () => {
    // Given — owner editing own profile, no role control
    fixture.componentRef.setInput('canEditRole', false);
    fixture.detectChanges();
    component.fullName = 'Jane Smith';
    const emitted: UpdateEmployeeRequest[] = [];
    component.updated.subscribe((req) => emitted.push(req));

    // When
    component.submit();

    // Then — role is null so the backend leaves it untouched (a non-admin change would be 403)
    expect(emitted[0].role).toBeNull();
  });

  it('does not emit when the full name is blank', () => {
    // Given
    fixture.detectChanges();
    component.fullName = '   ';
    const emitted: UpdateEmployeeRequest[] = [];
    component.updated.subscribe((req) => emitted.push(req));

    // When
    component.submit();

    // Then
    expect(emitted).toHaveLength(0);
  });

  it('emits closed when the back button is clicked', () => {
    // Given
    fixture.detectChanges();
    let count = 0;
    component.closed.subscribe(() => count++);

    // When
    component.closed.emit();

    // Then
    expect(count).toBe(1);
  });
});