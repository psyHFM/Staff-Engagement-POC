import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { TaskStateService } from './task-state.service';
import { Task, CreateTaskRequest } from './task.model';

describe('TaskStateService', () => {
  let service: TaskStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaskStateService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TaskStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const task = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    subjectId: '7',
    title: 'Test task',
    description: 'desc',
    completed: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  });

  it('loads my tasks from GET /api/v1/me/tasks and exposes them via the tasks signal', () => {
    // Given
    const tasks = [task({ id: '1', title: 'First' }), task({ id: '2', title: 'Second' })];
    expect(service.tasks()).toEqual([]);

    // When
    service.loadMyTasks();
    const request = httpMock.expectOne('/api/v1/me/tasks');
    expect(request.request.method).toBe('GET');
    request.flush(tasks);

    // Then
    expect(service.tasks()).toEqual(tasks);
    expect(service.loading()).toBe(false);
  });

  it('creates a task via POST /api/v1/tasks and appends it to the tasks signal', () => {
    // Given — one existing task already loaded
    service.loadMyTasks();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: '1' })]);
    expect(service.tasks()).toHaveLength(1);

    const request2: CreateTaskRequest = {
      subjectId: '7',
      title: 'Follow up',
      description: 'Send the email',
      sourceInteractionId: '42'
    };

    // When
    service.createTask(request2);
    const post = httpMock.expectOne('/api/v1/tasks');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(request2);
    const created = task({ id: '99', title: 'Follow up' });
    post.flush(created);

    // Then
    expect(service.tasks()).toHaveLength(2);
    expect(service.tasks()[1]).toEqual(created);
  });

  it('toggles completion via PUT /api/v1/tasks/{id} and replaces only the matching task', () => {
    // Given — two tasks loaded
    service.loadMyTasks();
    httpMock.expectOne('/api/v1/me/tasks').flush([
      task({ id: '1', completed: false }),
      task({ id: '2', completed: false })
    ]);
    const other = service.tasks()[1];

    // When
    service.toggleCompletion('1', true);
    const put = httpMock.expectOne('/api/v1/tasks/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ completed: true });
    put.flush(task({ id: '1', completed: true }));

    // Then — the matching task is replaced, the other is left untouched
    expect(service.tasks()[0].completed).toBe(true);
    expect(service.tasks()[1]).toBe(other);
  });

  it('logs and clears loading when loading my tasks fails', () => {
    // Given
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(service.loading()).toBe(false);

    // When
    service.loadMyTasks();
    httpMock.expectOne('/api/v1/me/tasks').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });

    // Then
    expect(service.tasks()).toEqual([]);
    expect(service.loading()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('logs and clears loading when toggling completion fails', () => {
    // Given — a task loaded
    service.loadMyTasks();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: '1', completed: false })]);
    const before = service.tasks()[0];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    service.toggleCompletion('1', true);
    httpMock.expectOne('/api/v1/tasks/1').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });

    // Then — the task is left unchanged
    expect(service.tasks()[0]).toBe(before);
    expect(service.loading()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('leaves the tasks signal unchanged when create fails', () => {
    // Given — an existing task
    service.loadMyTasks();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: '1' })]);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    service.createTask({ subjectId: '7', title: 'x', description: 'y' });
    httpMock.expectOne('/api/v1/tasks').flush('boom', {
      status: 400,
      statusText: 'Bad Request'
    });

    // Then
    expect(service.tasks()).toHaveLength(1);
    expect(service.loading()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});