import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Employee } from './employee';
import { EmployeeStateService } from './employee-state.service';
import { EmployeeResponse, Paged, UpdateEmployeeRequest } from './employee.types';

describe('Employee (directory only — ATSE1-27)', () => {
  let fixture: ComponentFixture<Employee>;
  let stateMock: EmployeeStateService;

  const employees = signal<Paged<EmployeeResponse> | null>(null);
  const selectedEmployee = signal<EmployeeResponse | null>(null);
  const created = signal(null);
  const updated = signal(null);
  const error = signal(null);
  const isLoading = signal(false);
  const isAdmin = signal(false);
  const currentEmail = signal<string | null>(null);

  const profile = (email: string, id: number): EmployeeResponse => ({
    id: { value: id },
    fullName: 'Jane Doe',
    email,
    role: 'employee'
  });

  beforeEach(async () => {
    employees.set(null);
    selectedEmployee.set(null);
    currentEmail.set(null);
    isAdmin.set(false);

    stateMock = {
      loadDirectory: jest.fn(),
      selectEmployee: jest.fn(),
      clearSelection: jest.fn(),
      updateEmployee: jest.fn().mockReturnValue(of({})),
      clearTransient: jest.fn(),
      employees,
      selectedEmployee,
      created,
      updated,
      error,
      isLoading,
      isAdmin,
      currentEmail
    } as unknown as EmployeeStateService;

    await TestBed
      .configureTestingModule({
        imports: [Employee],
        providers: [provideRouter([])]
      })
      .overrideComponent(Employee, {
        set: { providers: [{ provide: EmployeeStateService, useValue: stateMock }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(Employee);
  });

  it('loads the directory on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(stateMock.loadDirectory).toHaveBeenCalledWith(0, 20, 'createdAt,desc');
  });

  it('reloads the directory on a page request with the current sort', () => {
    // Given
    fixture.detectChanges();
    (stateMock.loadDirectory as jest.Mock).mockClear();

    // When
    fixture.componentInstance.onPageRequested({ offset: 20, limit: 20 });

    // Then
    expect(stateMock.loadDirectory).toHaveBeenCalledWith(20, 20, 'createdAt,desc');
  });

  it('updates the sort and reloads from the first page on a sort change', () => {
    // Given
    fixture.detectChanges();
    (stateMock.loadDirectory as jest.Mock).mockClear();

    // When
    fixture.componentInstance.onSortRequested('fullName,asc');

    // Then
    expect(stateMock.loadDirectory).toHaveBeenCalledWith(0, 20, 'fullName,asc');
  });

  it('onUpdateSelected forwards the update for the selected directory row', () => {
    // Given
    selectedEmployee.set(profile('bob@staff.eng', 9));
    const request: UpdateEmployeeRequest = { fullName: 'Bob', email: null };

    // When
    fixture.componentInstance.onUpdateSelected(request);

    // Then
    expect(stateMock.updateEmployee).toHaveBeenCalledWith({ value: 9 }, request);
  });

  it('onUpdateSelected does nothing when no row is selected', () => {
    // When
    fixture.componentInstance.onUpdateSelected({ fullName: 'X', email: null });

    // Then
    expect(stateMock.updateEmployee).not.toHaveBeenCalled();
  });

  it('onClose clears the directory selection', () => {
    // When
    fixture.componentInstance.onClose();

    // Then
    expect(stateMock.clearSelection).toHaveBeenCalled();
  });

  it('canEditSelected is true for an admin regardless of ownership', () => {
    // Given
    isAdmin.set(true);
    selectedEmployee.set(profile('bob@staff.eng', 9));
    currentEmail.set('someone-else@staff.eng');

    // Then
    expect(fixture.componentInstance.canEditSelected()).toBe(true);
  });

  it('canEditSelected is true for a non-admin editing their own profile', () => {
    // Given
    isAdmin.set(false);
    selectedEmployee.set(profile('jane@staff.eng', 7));
    currentEmail.set('jane@staff.eng');

    // Then
    expect(fixture.componentInstance.canEditSelected()).toBe(true);
  });

  it('canEditSelected is false for a non-admin viewing another profile', () => {
    // Given
    isAdmin.set(false);
    selectedEmployee.set(profile('jane@staff.eng', 7));
    currentEmail.set('someone-else@staff.eng');

    // Then
    expect(fixture.componentInstance.canEditSelected()).toBe(false);
  });

  it('canEditRoleSelected mirrors the admin flag', () => {
    // Given
    isAdmin.set(true);
    expect(fixture.componentInstance.canEditRoleSelected()).toBe(true);

    isAdmin.set(false);
    expect(fixture.componentInstance.canEditRoleSelected()).toBe(false);
  });
});