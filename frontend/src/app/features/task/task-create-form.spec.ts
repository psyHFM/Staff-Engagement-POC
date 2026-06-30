import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { TaskCreateForm } from './task-create-form';

describe('TaskCreateForm', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskCreateForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Flush the EmployeePicker's GET /api/v1/employees request that fires on first paint. */
  function flushPicker(directory: unknown[] = []): void {
    const req = httpMock.expectOne((r) => r.url === '/api/v1/employees');
    expect(req.request.method).toBe('GET');
    req.flush({ content: directory, offset: 0, limit: 100, total: directory.length });
  }

  /** Flush the InteractionPicker's GET /api/v1/employees/{id}/interactions request that fires on first paint. */
  function flushInteractionPicker(directory: unknown[] = [], employeeId: number = 1): void {
    const req = httpMock.expectOne((r) => r.url === `/api/v1/employees/${employeeId}/interactions`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: directory, offset: 0, limit: 100, total: directory.length });
  }

  it('seeds the sourceInteractionId from the interaction context on init', () => {
    // Given — the form is opened from an interaction context
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.componentRef.setInput('interactionId', '42');

    // When
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);

    // Then
    const component = fixture.componentInstance as unknown as {
      request: { sourceInteractionId?: number };
    };
    expect(component.request.sourceInteractionId).toBe(42);
  });

  it('leaves sourceInteractionId unset when created standalone', () => {
    // Given / When
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);

    // Then
    const component = fixture.componentInstance as unknown as {
      request: { title: string; description: string; subjectId: number; sourceInteractionId?: number };
    };
    expect(component.request.sourceInteractionId).toBeUndefined();
    expect(component.request.title).toBe('');
    expect(component.request.description).toBe('');
    expect(component.request.subjectId).toBe(0);
  });

  it('does not seed sourceInteractionId from a falsy (empty) interaction context', () => {
    // Given — an empty interaction id is falsy and should be ignored
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.componentRef.setInput('interactionId', '');
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);

    // Then
    const component = fixture.componentInstance as unknown as {
      request: { sourceInteractionId?: number };
    };
    expect(component.request.sourceInteractionId).toBeUndefined();
  });

  it('mounts the EmployeePicker and forwards the chosen id to request.subjectId', () => {
    // Given
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    flushPicker([
      { id: { value: 1 }, fullName: 'Admin User', email: 'admin@staff.eng', role: 'admin' },
      { id: { value: 2 }, fullName: 'Employee User', email: 'employee@staff.eng', role: 'employee' }
    ]);
    flushInteractionPicker([], 1);
    const picker = fixture.nativeElement.querySelector('app-employee-picker');
    expect(picker).not.toBeNull();
    const component = fixture.componentInstance as unknown as {
      request: { subjectId: number };
      onSubjectChange: (id: number | null) => void;
    };

    // When — the picker fires valueChange(2)
    component.onSubjectChange(2);

    // Then — the request carries a numeric subjectId
    expect(component.request.subjectId).toBe(2);
  });

  it('treats a null picker value as subjectId 0 (no selection)', () => {
    // Given
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker();
    const component = fixture.componentInstance as unknown as {
      request: { subjectId: number };
      onSubjectChange: (id: number | null) => void;
    };
    component.onSubjectChange(null);

    // Then
    expect(component.request.subjectId).toBe(0);
  });

  it('submits the request through the state service with a numeric subjectId', () => {
    // Given
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);
    const component = fixture.componentInstance as unknown as {
      request: { subjectId: number; title: string; description: string };
      formClosed: { emit: (v?: void) => void };
    };
    component.request.subjectId = 7;
    component.request.title = 'Follow up';
    component.request.description = 'Send the email';
    let closed = false;
    component.formClosed.emit = () => (closed = true);

    // When
    (fixture.componentInstance as unknown as { submit: () => void }).submit();

    // Then — the POST hits the backend with a numeric body
    const post = httpMock.expectOne('/api/v1/tasks');
    expect(post.request.method).toBe('POST');
    expect(post.request.body.title).toBe('Follow up');
    expect(post.request.body.description).toBe('Send the email'); // W3: locks description
    expect(post.request.body.subjectId).toBe(7);
    expect(typeof post.request.body.subjectId).toBe('number');
    post.flush({});

    expect(closed).toBe(true);
  });

  it('forwards sourceInteractionId to the POST body when seeded from an interaction context', () => {
    // Given — interactionId='42' was seeded (W4: combined with spec 6's POST assertion)
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.componentRef.setInput('interactionId', '42');
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);
    const component = fixture.componentInstance as unknown as {
      request: { subjectId: number; title: string; description: string; sourceInteractionId?: number };
      formClosed: { emit: (v?: void) => void };
    };
    component.request.subjectId = 7;
    component.request.title = 'Follow up from interaction';
    component.request.description = 'Send the email';
    component.formClosed.emit = () => undefined;

    // When
    (fixture.componentInstance as unknown as { submit: () => void }).submit();

    // Then — the seeded interaction id is in the POST body as a number
    const post = httpMock.expectOne('/api/v1/tasks');
    expect(post.request.body.sourceInteractionId).toBe(42);
    post.flush({});
  });

  it('resets subjectId on a fresh remount after submit (form lifecycle)', () => {
    // Given — first mount, picker bridges an id, submit closes the form
    const firstFixture = TestBed.createComponent(TaskCreateForm);
    firstFixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);
    const firstComponent = firstFixture.componentInstance as unknown as {
      request: { subjectId: number };
      submit: () => void;
      formClosed: { emit: (v?: void) => void };
    };
    firstComponent.request.subjectId = 7;
    firstComponent.formClosed.emit = () => undefined;
    firstComponent.submit();
    httpMock.expectOne('/api/v1/tasks').flush({});

    // When — a fresh form is mounted (W5: lifecycle reset)
    const secondFixture = TestBed.createComponent(TaskCreateForm);
    secondFixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);
    const secondComponent = secondFixture.componentInstance as unknown as {
      request: { subjectId: number };
    };

    // Then — the new fixture starts blank (subjectId 0)
    expect(secondComponent.request.subjectId).toBe(0);
  });

  it('emits close when the form is dismissed', () => {
    // Given
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    flushPicker();
    flushInteractionPicker([], 1);
    let closed = false;
    (fixture.componentInstance as unknown as { formClosed: { emit: (v?: void) => void } }).formClosed.emit =
      () => (closed = true);

    // When
    (fixture.componentInstance as unknown as { closeForm: () => void }).closeForm();

    // Then
    expect(closed).toBe(true);
  });
});