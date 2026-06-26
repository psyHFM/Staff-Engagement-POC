import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { Employee } from './employee';
import { EmployeeStateService } from './employee-state.service';
import { EmployeeResponse, Paged } from './employee.types';

@Component({ template: '', standalone: true })
class StubPage {}

describe('Employee (directory only — ATSE1-42)', () => {
  let fixture: ComponentFixture<Employee>;
  let stateMock: EmployeeStateService;
  let router: Router;

  const employees = signal<Paged<EmployeeResponse> | null>(null);
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
    currentEmail.set(null);
    isAdmin.set(false);
    created.set(null);
    updated.set(null);
    error.set(null);
    isLoading.set(false);

    stateMock = {
      loadDirectory: jest.fn(),
      clearTransient: jest.fn(),
      employees,
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
        providers: [
          provideRouter([
            { path: 'employees', component: StubPage },
            { path: 'employees/:id/profile', component: StubPage }
          ])
        ]
      })
      .overrideComponent(Employee, {
        set: { providers: [{ provide: EmployeeStateService, useValue: stateMock }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(Employee);
    router = TestBed.inject(Router);
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

  it('onSelect navigates to the employee profile page', () => {
    // Given
    const navigateSpy = jest.spyOn(router, 'navigate');

    // When
    fixture.componentInstance.onSelect(profile('bob@staff.eng', 9));

    // Then
    expect(navigateSpy).toHaveBeenCalledWith(['/employees', 9, 'profile']);
  });
});
