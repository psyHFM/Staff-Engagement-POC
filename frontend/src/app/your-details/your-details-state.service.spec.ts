import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { YourDetailsStateService } from './your-details-state.service';
import { AuthState } from '../shared/auth/auth-state';
import { AUTH_STORAGE, AuthStorage } from '../shared/auth/auth-storage';
import { CreateEmployeeRequest, EmployeeResponse, UpdateEmployeeRequest } from '../features/employee/employee.types';

/**
 * Unit specs for the YourDetailsStateService (ATSE1-32).
 *
 * <p>The page spec only asserts that the service is invoked; the actual
 * signal-update behaviour, the four branches of {@link loadCurrent}, and
 * the create / update happy + error paths live here.
 */
describe('YourDetailsStateService (ATSE1-32)', () => {
  let service: YourDetailsStateService;
  let auth: AuthState;
  let httpMock: HttpTestingController;
  let storage: AuthStorage;

  const profile = (email: string, id: number): EmployeeResponse => ({
    id: { value: id },
    fullName: 'Jane Doe',
    email,
    role: 'employee'
  });

  beforeEach(() => {
    storage = createInMemoryStorage();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AUTH_STORAGE, useValue: storage }]
    });
    auth = TestBed.inject(AuthState);
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.runInInjectionContext(() => new YourDetailsStateService());
  });

  afterEach(() => httpMock.verify());

  // ---- loadCurrent: four branches -----------------------------------

  it('loadCurrent sets notFound when the JWT subject is missing', () => {
    // Given — no token in storage
    expect(auth.currentUserSubject()).toBeNull();

    // When
    service.loadCurrent();

    // Then — no HTTP request is issued and the page should show the create form
    expect(service.profile()).toBeNull();
    expect(service.notFound()).toBe(true);
    expect(service.error()).toBeNull();
    httpMock.expectNone(() => true);
  });

  it('loadCurrent populates profile when the directory has a matching email', async () => {
    // Given — a token whose sub resolves to jane@staff.eng
    seedAuth('jane@staff.eng');

    // When
    service.loadCurrent();

    // Then — the GET fires, returns a page containing Jane, and the signal updates
    const req = httpMock.expectOne((r) => r.url === '/api/v1/employees');
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.get('limit')).toBe('200');
    req.flush({ content: [profile('bob@staff.eng', 9), profile('jane@staff.eng', 7)], total: 2 });

    await waitFor(() => service.profile() !== null);
    expect(service.profile()?.email).toBe('jane@staff.eng');
    expect(service.profile()?.id.value).toBe(7);
    expect(service.notFound()).toBe(false);
    expect(service.isLoading()).toBe(false);
  });

  it('loadCurrent sets notFound when the directory has no matching email', async () => {
    // Given
    seedAuth('ghost@staff.eng');

    // When
    service.loadCurrent();

    // Then
    const req = httpMock.expectOne((r) => r.url === '/api/v1/employees');
    req.flush({ content: [profile('bob@staff.eng', 9)], total: 1 });

    await waitFor(() => service.notFound());
    expect(service.profile()).toBeNull();
    expect(service.notFound()).toBe(true);
  });

  it('loadCurrent surfaces an error when the directory call fails', async () => {
    // Given
    seedAuth('jane@staff.eng');

    // When
    service.loadCurrent();

    // Then — the error signal captures the ApiError and notFound stays false
    const req = httpMock.expectOne((r) => r.url === '/api/v1/employees');
    req.flush({ message: 'Boom', status: 500, error: 'Server Error', timestamp: '', path: '' }, { status: 500, statusText: 'Server Error' });

    await waitFor(() => service.error() !== null);
    expect(service.profile()).toBeNull();
    expect(service.notFound()).toBe(false);
    const err = service.error() as unknown as { envelope?: { status?: number; message?: string } };
    expect(err?.envelope?.message).toBe('Boom');
    expect(err?.envelope?.status).toBe(500);
    expect(service.isLoading()).toBe(false);
  });

  // ---- create ---------------------------------------------------------

  it('create posts the request, populates profile, and clears notFound', async () => {
    // Given — drive into the "no record yet" branch first
    storage.write('staff-engagement.auth.jwt', '');
    storage.write('staff-engagement.auth.username', '');
    (auth as unknown as { token: ReturnType<typeof signal<string | null>> }).token.set(null);
    (auth as unknown as { username: ReturnType<typeof signal<string | null>> }).username.set(null);
    service.loadCurrent();
    expect(service.notFound()).toBe(true);

    // Seed the auth token now so the page could resolve after create
    storage.write('staff-engagement.auth.jwt', mintToken('jane@staff.eng'));
    storage.write('staff-engagement.auth.username', 'jane');
    (auth as unknown as { token: ReturnType<typeof signal<string | null>> }).token.set(
      storage.read('staff-engagement.auth.jwt')
    );
    (auth as unknown as { username: ReturnType<typeof signal<string | null>> }).username.set(
      storage.read('staff-engagement.auth.username')
    );

    const request: CreateEmployeeRequest = {
      fullName: 'Jane',
      jobTitle: null,
      department: null,
      level: null
    };

    // When
    firstValueFrom(service.create(request));

    // Then — POST /api/v1/employees fires, the response populates profile, notFound clears
    const req = httpMock.expectOne('/api/v1/employees');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(profile('jane@staff.eng', 7));

    await waitFor(() => service.profile() !== null);
    expect(service.profile()?.email).toBe('jane@staff.eng');
    expect(service.notFound()).toBe(false);
  });

  it('create captures the error and leaves profile null on failure', async () => {
    // Given — start in the notFound state so we can assert the post-failure state
    storage.write('staff-engagement.auth.jwt', '');
    storage.write('staff-engagement.auth.username', '');
    (auth as unknown as { token: ReturnType<typeof signal<string | null>> }).token.set(null);
    (auth as unknown as { username: ReturnType<typeof signal<string | null>> }).username.set(null);
    service.loadCurrent();
    expect(service.notFound()).toBe(true);

    const request: CreateEmployeeRequest = {
      fullName: 'Jane',
      jobTitle: null,
      department: null,
      level: null
    };

    // When
    firstValueFrom(service.create(request)).catch(() => {
      /* expected — error envelope is rethrown */
    });

    // Then
    const req = httpMock.expectOne('/api/v1/employees');
    req.flush({ message: 'Forbidden', status: 403, error: 'Forbidden', timestamp: '', path: '' }, { status: 403, statusText: 'Forbidden' });

    await waitFor(() => service.error() !== null);
    const err = service.error() as unknown as { envelope?: { status?: number; message?: string }; httpStatus?: number; message?: string };
    expect(service.profile()).toBeNull();
    expect(err?.envelope?.status ?? err?.httpStatus).toBe(403);
    expect(err?.envelope?.message ?? err?.message).toBe('Forbidden');
  });

  // ---- update ---------------------------------------------------------

  it('update puts the request, refreshes profile, and clears the previous error', async () => {
    // Given — start with a loaded profile
    seedAuth('jane@staff.eng');
    service.loadCurrent();
    httpMock.expectOne((r) => r.url === '/api/v1/employees').flush({
      content: [profile('jane@staff.eng', 7)],
      total: 1
    });
    await waitFor(() => service.profile() !== null);

    const request: UpdateEmployeeRequest = { fullName: 'Jane Smith', email: null };

    // When
    firstValueFrom(service.update(7, request));

    // Then — PUT fires with the right URL and body, profile signal updates
    const req = httpMock.expectOne('/api/v1/employees/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(request);
    req.flush({ ...profile('jane@staff.eng', 7), fullName: 'Jane Smith' });

    await waitFor(() => service.profile()?.fullName === 'Jane Smith');
    expect(service.profile()?.fullName).toBe('Jane Smith');
    expect(service.error()).toBeNull();
  });

  it('update captures the error and leaves profile unchanged on failure', async () => {
    // Given
    seedAuth('jane@staff.eng');
    service.loadCurrent();
    httpMock.expectOne((r) => r.url === '/api/v1/employees').flush({
      content: [profile('jane@staff.eng', 7)],
      total: 1
    });
    await waitFor(() => service.profile() !== null);
    const originalName = service.profile()?.fullName;

    const request: UpdateEmployeeRequest = { fullName: 'Should Fail', email: null };

    // When
    firstValueFrom(service.update(7, request)).catch(() => {
      /* expected */
    });

    // Then
    const req = httpMock.expectOne('/api/v1/employees/7');
    req.flush({ message: 'Conflict', status: 409, error: 'Conflict', timestamp: '', path: '' }, { status: 409, statusText: 'Conflict' });

    await waitFor(() => service.error() !== null);
    expect(service.profile()?.fullName).toBe(originalName);
    const err = service.error() as unknown as { envelope?: { status?: number } };
    expect(err?.envelope?.status).toBe(409);
  });

  // ---- isAdmin -------------------------------------------------------

  it('isAdmin reflects the JWT role claim', () => {
    // Given — admin token
    storage.write('staff-engagement.auth.jwt', mintToken('admin@staff.eng', ['ADMIN']));
    storage.write('staff-engagement.auth.username', 'admin@staff.eng');
    (auth as unknown as { token: ReturnType<typeof signal<string | null>> }).token.set(
      storage.read('staff-engagement.auth.jwt')
    );

    // Then
    expect(service.isAdmin()).toBe(true);

    // When — non-admin token
    storage.write('staff-engagement.auth.jwt', mintToken('jane@staff.eng', ['EMPLOYEE']));
    (auth as unknown as { token: ReturnType<typeof signal<string | null>> }).token.set(
      storage.read('staff-engagement.auth.jwt')
    );

    // Then
    expect(service.isAdmin()).toBe(false);
  });

  // ---- helpers --------------------------------------------------------

  function seedAuth(sub: string): void {
    storage.write('staff-engagement.auth.jwt', mintToken(sub));
    storage.write('staff-engagement.auth.username', sub);
    (auth as unknown as { token: ReturnType<typeof signal<string | null>> }).token.set(
      storage.read('staff-engagement.auth.jwt')
    );
    (auth as unknown as { username: ReturnType<typeof signal<string | null>> }).username.set(
      storage.read('staff-engagement.auth.username')
    );
  }
});

function createInMemoryStorage(): AuthStorage {
  const map = new Map<string, string>();
  return {
    read: (key) => (map.has(key) ? (map.get(key) as string) : null),
    write: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    }
  };
}

function mintToken(sub: string, roles: string[] = ['EMPLOYEE']): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub, roles }));
  return `${header}.${payload}.sig`;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}