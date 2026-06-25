import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { YourDetailsPage } from './your-details-page';
import { YourDetailsStateService } from './your-details-state.service';
import { AUTH_STORAGE, AuthStorage } from '../shared/auth/auth-storage';
import { EmployeeResponse, UpdateEmployeeRequest } from '../features/employee/employee.types';

/**
 * The /profile page hosts the current user's self-service create/edit form
 * (ATSE1-32). This spec exercises:
 *   - create-form vs detail-form rendering, driven by the state
 *   - that init triggers a loadCurrent() call
 *   - that an update event forwards to state.update(id, ...) — but only
 *     when a profile is already loaded.
 */
describe('YourDetailsPage (ATSE1-32)', () => {
  let fixture: ComponentFixture<YourDetailsPage>;
  let page: YourDetailsPage;
  let stateMock: {
    profile: ReturnType<typeof signal<EmployeeResponse | null>>;
    notFound: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<unknown>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    isAdmin: ReturnType<typeof signal<boolean>>;
    loadCurrent: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    stateMock = {
      profile: signal<EmployeeResponse | null>(null),
      notFound: signal(false),
      error: signal(null),
      isLoading: signal(false),
      isAdmin: signal(false),
      loadCurrent: jest.fn(),
      create: jest.fn().mockReturnValue(of(null)),
      update: jest.fn().mockReturnValue(of(null))
    };

    const storage: AuthStorage = {
      read: () => null,
      write: () => {
        /* no-op */
      },
      remove: () => {
        /* no-op */
      }
    };

    await TestBed.configureTestingModule({
      imports: [YourDetailsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_STORAGE, useValue: storage }
      ]
    })
      .overrideComponent(YourDetailsPage, {
        set: { providers: [{ provide: YourDetailsStateService, useValue: stateMock }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(YourDetailsPage);
    page = fixture.componentInstance;
  });

  it('renders the create form when the state says "no record yet"', () => {
    // Given
    stateMock.notFound.set(true);
    stateMock.profile.set(null);
    fixture.detectChanges();

    // Then
    const create = fixture.nativeElement.querySelector('app-employee-create-form');
    const detail = fixture.nativeElement.querySelector('app-employee-detail');
    expect(create).toBeTruthy();
    expect(detail).toBeNull();
  });

  it('renders the detail form when a profile is loaded', () => {
    // Given
    stateMock.profile.set({
      id: { value: 7 },
      fullName: 'Jane Doe',
      email: 'jane@staff.eng',
      role: 'employee'
    });
    stateMock.notFound.set(false);
    fixture.detectChanges();

    // Then
    const detail = fixture.nativeElement.querySelector('app-employee-detail');
    const create = fixture.nativeElement.querySelector('app-employee-create-form');
    expect(detail).toBeTruthy();
    expect(create).toBeNull();
  });

  it('calls state.loadCurrent on init', () => {
    // Given — beforeEach hasn't run detectChanges yet
    // When
    fixture.detectChanges();

    // Then — ngOnInit fires the load
    expect(stateMock.loadCurrent).toHaveBeenCalled();
  });

  it('forwards an update event to state.update when a profile is loaded', () => {
    // Given
    stateMock.profile.set({
      id: { value: 9 },
      fullName: 'Bob',
      email: 'bob@staff.eng',
      role: 'employee'
    });
    fixture.detectChanges();
    const request: UpdateEmployeeRequest = { fullName: 'Bob Jr.', email: null };

    // When
    page.onUpdated(request);

    // Then
    expect(stateMock.update).toHaveBeenCalledWith(9, request);
  });

  it('does not forward an update when no profile is loaded', () => {
    // Given — no profile
    stateMock.profile.set(null);
    fixture.detectChanges();

    // When
    page.onUpdated({ fullName: 'X', email: null });

    // Then
    expect(stateMock.update).not.toHaveBeenCalled();
  });
});