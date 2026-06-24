import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

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

  it('seeds the sourceInteractionId from the interaction context on init', () => {
    // Given — the form is opened from an interaction context
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.componentRef.setInput('interactionId', '42');

    // When
    fixture.detectChanges();

    // Then
    const component = fixture.componentInstance as unknown as {
      request: { sourceInteractionId?: string };
    };
    expect(component.request.sourceInteractionId).toBe('42');
  });

  it('leaves sourceInteractionId unset when created standalone', () => {
    // Given / When
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();

    // Then
    const component = fixture.componentInstance as unknown as {
      request: { title: string; description: string; subjectId: string; sourceInteractionId?: string };
    };
    expect(component.request.sourceInteractionId).toBeUndefined();
    expect(component.request.title).toBe('');
    expect(component.request.description).toBe('');
    expect(component.request.subjectId).toBe('');
  });

  it('does not seed sourceInteractionId from a falsy (empty) interaction context', () => {
    // Given — an empty interaction id is falsy and should be ignored
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.componentRef.setInput('interactionId', '');
    fixture.detectChanges();

    // Then
    const component = fixture.componentInstance as unknown as {
      request: { sourceInteractionId?: string };
    };
    expect(component.request.sourceInteractionId).toBeUndefined();
  });

  it('submits the request through the state service and emits close', () => {
    // Given
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    const component = fixture.componentInstance as unknown as {
      request: { subjectId: string; title: string; description: string };
      close: { emit: (v?: void) => void };
    };
    component.request.subjectId = '7';
    component.request.title = 'Follow up';
    component.request.description = 'Send the email';
    let closed = false;
    component.close.emit = () => (closed = true);

    // When
    (fixture.componentInstance as unknown as { submit: () => void }).submit();
    const post = httpMock.expectOne('/api/v1/tasks');
    expect(post.request.method).toBe('POST');
    expect(post.request.body.title).toBe('Follow up');
    post.flush({});

    // Then
    expect(closed).toBe(true);
  });

  it('emits close when the form is dismissed', () => {
    // Given
    const fixture = TestBed.createComponent(TaskCreateForm);
    fixture.detectChanges();
    let closed = false;
    (fixture.componentInstance as unknown as { close: { emit: (v?: void) => void } }).close.emit =
      () => (closed = true);

    // When
    (fixture.componentInstance as unknown as { closeForm: () => void }).closeForm();

    // Then
    expect(closed).toBe(true);
  });
});