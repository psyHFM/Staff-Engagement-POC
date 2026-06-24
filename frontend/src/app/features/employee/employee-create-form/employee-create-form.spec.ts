import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { EmployeeCreateForm } from './employee-create-form';
import { EmployeeStateService } from '../employee-state.service';

describe('EmployeeCreateForm', () => {
  let fixture: ComponentFixture<EmployeeCreateForm>;
  let component: EmployeeCreateForm;
  let stateMock: EmployeeStateService;

  beforeEach(async () => {
    stateMock = {
      createEmployee: jest.fn()
    } as unknown as EmployeeStateService;
    (stateMock.createEmployee as jest.Mock).mockReturnValue(
      of({
        id: { value: 42 },
        fullName: 'Jane Doe',
        email: 'jane@staff.eng',
        role: 'employee'
      })
    );

    await TestBed.configureTestingModule({
      imports: [EmployeeCreateForm],
      providers: [{ provide: EmployeeStateService, useValue: stateMock }]
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

  it('submits the create request (no email, no role) and emits created on success', () => {
    // Given
    fixture.detectChanges();
    const createdSpy = jest.fn();
    component.created.subscribe(createdSpy);

    component.fullName = 'Jane Doe';
    component.jobTitle = 'Eng';
    component.department = 'Platform';
    component.level = 'senior';

    // When
    component.submit();

    // Then — email and role are NOT part of the self-service create body
    expect(stateMock.createEmployee).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      jobTitle: 'Eng',
      department: 'Platform',
      level: 'senior'
    });
    expect(createdSpy).toHaveBeenCalled();
  });

  it('resets the form after a successful submit', () => {
    // Given
    fixture.detectChanges();
    component.fullName = 'Jane Doe';
    component.level = 'senior';

    // When
    component.submit();

    // Then
    expect(component.fullName).toBe('');
    expect(component.level).toBeNull();
  });

  it('does not submit when the full name is blank', () => {
    // Given
    fixture.detectChanges();
    component.fullName = '   ';

    // When
    component.submit();

    // Then
    expect(stateMock.createEmployee).not.toHaveBeenCalled();
  });

  it('sends null for the optional fields when left blank', () => {
    // Given
    fixture.detectChanges();
    component.fullName = 'Jane Doe';

    // When
    component.submit();

    // Then
    expect(stateMock.createEmployee).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      jobTitle: null,
      department: null,
      level: null
    });
  });
});