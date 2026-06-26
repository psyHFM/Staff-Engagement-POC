import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { Task } from './task';
import { Task as TaskModel, TaskId, EmployeeId } from './task.model';

describe('Task (My Tasks view)', () => {
  let httpMock: HttpTestingController;

  const taskId = (value: number): TaskId => ({ value });
  const employeeId = (value: number): EmployeeId => ({ value });

  const task = (overrides: Partial<TaskModel> = {}): TaskModel => ({
    id: taskId(1),
    subject: employeeId(7),
    title: 'Test task',
    description: 'desc',
    completed: false,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Task],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('renders the loaded tasks in a table', async () => {
    // Given — the component loads my tasks on init
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([
      task({ id: taskId(1), title: 'Write tests', description: 'BDD first' }),
      task({ id: taskId(2), title: 'Ship it', description: 'Done' })
    ]);

    // When
    fixture.detectChanges();

    // Then
    const rows = fixture.nativeElement.querySelectorAll('.task-table tbody tr');
    expect(rows).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Write tests');
    expect(fixture.nativeElement.textContent).toContain('Ship it');
    // The create-form modal is hidden until the user asks for it
    expect(fixture.nativeElement.querySelector('app-task-create-form')).toBeNull();
  });

  it('shows the empty state when there are no tasks', async () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([]);

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.task-card')).toHaveLength(0);
  });

  it('toggles a task completion through the state service', () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1), completed: false })]);
    fixture.detectChanges();

    // When — toggling the first task's checkbox
    const component = fixture.componentInstance as unknown as {
      toggleTask: (t: TaskModel) => void;
      state: { toggleCompletion: (id: number, completed: boolean) => void };
    };
    component.toggleTask(task({ id: taskId(1), completed: false }));
    const put = httpMock.expectOne('/api/v1/tasks/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ completed: true });
    put.flush(task({ id: taskId(1), completed: true }));

    // Then
    fixture.detectChanges();
    const checkbox = fixture.nativeElement.querySelector('.task-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});