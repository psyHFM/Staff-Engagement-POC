import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { TaskStateService } from './task-state.service';
import { Task, CreateTaskRequest, TaskId, EmployeeId, TaskItem } from './task.model';

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

  const taskId = (value: number): TaskId => ({ value });
  const employeeId = (value: number): EmployeeId => ({ value });

  const task = (overrides: Partial<Task> = {}): Task => ({
    id: taskId(1),
    subject: employeeId(7),
    title: 'Test task',
    description: 'desc',
    completed: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  });

  const item = (overrides: Partial<TaskItem> = {}): TaskItem => ({
    id: '10',
    taskId: '1',
    ordinal: 0,
    title: 'Sub-task',
    completed: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  });

  it('loads my tasks from GET /api/v1/me/tasks and exposes them via the tasks signal', () => {
    // Given
    const tasks = [task({ id: taskId(1), title: 'First' }), task({ id: taskId(2), title: 'Second' })];
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
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    expect(service.tasks()).toHaveLength(1);

    const request2: CreateTaskRequest = {
      subjectId: 7,
      title: 'Follow up',
      description: 'Send the email',
      sourceInteractionId: 42
    };

    // When
    service.createTask(request2);
    const post = httpMock.expectOne('/api/v1/tasks');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(request2);
    const created = task({ id: taskId(99), title: 'Follow up' });
    post.flush(created);

    // Then
    expect(service.tasks()).toHaveLength(2);
    expect(service.tasks()[1]).toEqual(created);
  });

  it('toggles completion via PUT /api/v1/tasks/{id} and replaces only the matching task', () => {
    // Given — two tasks loaded
    service.loadMyTasks();
    httpMock.expectOne('/api/v1/me/tasks').flush([
      task({ id: taskId(1), completed: false }),
      task({ id: taskId(2), completed: false })
    ]);
    const other = service.tasks()[1];

    // When
    service.toggleCompletion(1, true);
    const put = httpMock.expectOne('/api/v1/tasks/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ completed: true });
    put.flush(task({ id: taskId(1), completed: true }));

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
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1), completed: false })]);
    const before = service.tasks()[0];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    service.toggleCompletion(1, true);
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
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    service.createTask({ subjectId: 7, title: 'x', description: 'y' });
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

  // --- §8.8 — sub-items (ATSE1-34) -----------------------------------------

  it('loads sub-items via GET /api/v1/tasks/{id} and stores them under the taskId key', () => {
    // Given — no items loaded yet
    expect(service.itemsByTaskId().has('1')).toBe(false);

    // When
    service.loadTaskItems('1');
    const get = httpMock.expectOne('/api/v1/tasks/1');
    expect(get.request.method).toBe('GET');
    get.flush({ base: task({ id: '1' }), items: [item({ id: '10' })] });

    // Then
    expect(service.itemsByTaskId().has('1')).toBe(true);
    expect(service.itemsFor('1')()).toEqual([item({ id: '10' })]);
    expect(service.loading()).toBe(false);
  });

  it('keeps an empty map entry when GET /api/v1/tasks/{id} returns an empty items list (so re-expanding is a no-op)', () => {
    // When — load returns no items
    service.loadTaskItems('1');
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: '1' }), items: [] });

    // Then — the entry is preserved as an empty array (NOT deleted) so the
    // component's lazy-load guard can short-circuit a subsequent re-fetch.
    expect(service.itemsByTaskId().has('1')).toBe(true);
    expect(service.itemsFor('1')()).toEqual([]);
  });

  it('adds a sub-item via POST /api/v1/tasks/{taskId}/items and appends it to the map entry', () => {
    // Given — items already loaded
    service.loadTaskItems('1');
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: '1' }), items: [item({ id: '10' })] });

    // When
    service.addTaskItem('1', 'Write tests');
    const post = httpMock.expectOne('/api/v1/tasks/1/items');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ title: 'Write tests' });
    post.flush(item({ id: '12', ordinal: 1, title: 'Write tests' }));

    // Then
    const stored = service.itemsFor('1')();
    expect(stored).toHaveLength(2);
    expect(stored[1]).toEqual(item({ id: '12', ordinal: 1, title: 'Write tests' }));
  });

  it('patches a sub-item via PATCH /api/v1/tasks/{taskId}/items/{itemId} and replaces the matching item', () => {
    // Given — two items
    service.loadTaskItems('1');
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: '1' }),
      items: [item({ id: '10' }), item({ id: '11', ordinal: 1, title: 'Other' })]
    });

    // When
    service.patchTaskItem('1', '11', { completed: true });
    const patch = httpMock.expectOne('/api/v1/tasks/1/items/11');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ completed: true });
    patch.flush(item({ id: '11', ordinal: 1, title: 'Other', completed: true }));

    // Then — only item 11 is replaced, item 10 is untouched
    const stored = service.itemsFor('1')();
    expect(stored).toHaveLength(2);
    expect(stored[0]).toEqual(item({ id: '10' }));
    expect(stored[1]).toEqual(item({ id: '11', ordinal: 1, title: 'Other', completed: true }));
  });

  it('removes a sub-item via DELETE /api/v1/tasks/{taskId}/items/{itemId} and drops it from the map', () => {
    // Given
    service.loadTaskItems('1');
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: '1' }),
      items: [item({ id: '10' }), item({ id: '11', ordinal: 1 })]
    });

    // When
    service.removeTaskItem('1', '10');
    const del = httpMock.expectOne('/api/v1/tasks/1/items/10');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);

    // Then
    const stored = service.itemsFor('1')();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe('11');
  });

  it('reorders sub-items via PUT /api/v1/tasks/{taskId}/items/reorder and replaces the map entry with the response', () => {
    // Given
    service.loadTaskItems('1');
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: '1' }),
      items: [item({ id: '10' }), item({ id: '11', ordinal: 1 })]
    });

    // When
    service.reorderTaskItems('1', ['11', '10']);
    const put = httpMock.expectOne('/api/v1/tasks/1/items/reorder');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(['11', '10']);
    put.flush([
      item({ id: '11', ordinal: 0 }),
      item({ id: '10', ordinal: 1 })
    ]);

    // Then
    const stored = service.itemsFor('1')();
    expect(stored.map(i => i.id)).toEqual(['11', '10']);
  });

  it('logs and leaves the items map unchanged when a sub-item request fails', () => {
    // Given — items loaded
    service.loadTaskItems('1');
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: '1' }), items: [item({ id: '10' })] });
    const before = service.itemsFor('1')();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When — add fails
    service.addTaskItem('1', 'boom');
    httpMock.expectOne('/api/v1/tasks/1/items').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });

    // Then — the map entry is unchanged
    expect(service.itemsFor('1')()).toEqual(before);
    expect(service.loading()).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});