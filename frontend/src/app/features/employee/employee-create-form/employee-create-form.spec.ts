import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeCreateForm } from './employee-create-form';

describe('EmployeeCreateForm (parent-driven)', () => {
  let fixture: ComponentFixture<EmployeeCreateForm>;
  let component: EmployeeCreateForm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeCreateForm]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeCreateForm);
    component = fixture.componentInstance;
  });

  it('initialises the form blank on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(component.fullName).toBe('');
    expect(component.jobTitle).toBe('');
    expect(component.department).toBe('');
    expect(component.level).toBeNull();
  });

  it('emits a create request with the trimmed values on submit (no email, no role)', () => {
    // Given
    fixture.detectChanges();
    const createSpy = jest.fn();
    component.create.subscribe(createSpy);

    component.fullName = 'Jane Doe';
    component.jobTitle = 'Eng';
    component.department = 'Platform';
    component.level = 'senior';

    // When
    component.submit();

    // Then — no email, no role in the payload (server-side binding + self-promotion guard)
    expect(createSpy).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      jobTitle: 'Eng',
      department: 'Platform',
      level: 'senior'
    });
  });

  it('does not emit when the full name is blank', () => {
    // Given
    fixture.detectChanges();
    const createSpy = jest.fn();
    component.create.subscribe(createSpy);

    component.fullName = '   ';

    // When
    component.submit();

    // Then
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('emits null for the optional fields when left blank', () => {
    // Given
    fixture.detectChanges();
    const createSpy = jest.fn();
    component.create.subscribe(createSpy);

    component.fullName = 'Jane Doe';

    // When
    component.submit();

    // Then
    expect(createSpy).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      jobTitle: null,
      department: null,
      level: null
    });
  });

  it('respects the submitting flag — disabled button blocks submit', () => {
    // Given — the parent set submitting=true (request in-flight)
    component.submitting = true;
    fixture.detectChanges();
    component.fullName = 'Jane Doe';
    const button = fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement;

    // Then — the button is disabled (the parent owns the click-while-pending guard)
    expect(button.disabled).toBe(true);
  });
});