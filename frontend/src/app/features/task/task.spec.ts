import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { Task } from './task';
import { Task as TaskModel, TaskId, EmployeeId, TaskItem } from './task.model';

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

  const item = (overrides: Partial<TaskItem> = {}): TaskItem => ({
    id: '10',
    taskId: '1',
    ordinal: 0,
    title: 'Sub-task',
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
    const rows = fixture.nativeElement.querySelectorAll('.task-row');
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
    expect(fixture.nativeElement.querySelectorAll('.task-row')).toHaveLength(0);
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

  it('WHEN the user clicks a task card THEN it expands and loads sub-tasks', () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    // When — clicking the card main area
    const row = fixture.nativeElement.querySelector('.task-row');
    row.click();
    const get = httpMock.expectOne('/api/v1/tasks/1');
    expect(get.request.method).toBe('GET');
    get.flush({ base: task({ id: '1' }), items: [item({ id: '10', title: 'Write tests' })] });
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.task-items')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.task-items__row')).toHaveLength(1);
  });

  it('WHEN the user edits a task title/description THEN PUT /tasks/{id} fires and the list updates', () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1), title: 'Before', description: 'Old' })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      startEdit: (t: TaskModel, event: MouseEvent) => void;
      saveEdit: (t: TaskModel, event: MouseEvent) => void;
      editTitle: string;
      editDescription: string;
    };
    const editButton = fixture.nativeElement.querySelector('.task-open-btn');
    editButton.click();
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: taskId(1) }), items: [] });

    component.editTitle = 'After';
    component.editDescription = 'New body';
    component.saveEdit(task({ id: taskId(1), title: 'Before', description: 'Old' }), new MouseEvent('click'));

    const put = httpMock.expectOne('/api/v1/tasks/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ title: 'After', description: 'New body' });
    put.flush(task({ id: taskId(1), title: 'After', description: 'New body' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('After');
    expect(fixture.nativeElement.textContent).toContain('New body');
  });

  it('WHEN the user edits a sub-task title THEN PATCH /items/{itemId} fires with the new title', () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
      startItemEdit: (i: TaskItem) => void;
      saveItemEdit: (t: TaskModel, i: TaskItem, event: Event) => void;
      editItemTitle: string;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: taskId(1) }),
      items: [item({ id: '10', title: 'Old item' })]
    });
    fixture.detectChanges();

    component.startItemEdit(item({ id: '10', title: 'Old item' }));
    component.editItemTitle = 'Updated item';
    component.saveItemEdit(
      task({ id: taskId(1) }),
      item({ id: '10', title: 'Old item' }),
      new Event('submit')
    );

    const patch = httpMock.expectOne('/api/v1/tasks/1/items/10');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ title: 'Updated item' });
    patch.flush(item({ id: '10', title: 'Updated item' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Updated item');
  });

  it('WHEN the user adds a sub-task from the modal THEN POST /tasks/{id}/items fires and the item renders', () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    const component = fixture.componentInstance as unknown as {
      selectedTask: () => TaskModel | null;
      addItem: (t: TaskModel) => void;
      newItemTitle: string;
    };
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    // When — open the modal via the row pencil button
    const openButton = fixture.nativeElement.querySelector('.task-open-btn');
    openButton.click();
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: taskId(1) }), items: [] });
    fixture.detectChanges();

    // The modal is open and the selected task is available
    expect(fixture.nativeElement.querySelector('.task-detail-modal')).toBeTruthy();
    const selected = component.selectedTask();
    expect(selected).toBeTruthy();

    // Add a sub-task using the modal's selected task
    component.newItemTitle = 'New sub-task from modal';
    component.addItem(selected!);

    // Then — the correct POST is sent
    const post = httpMock.expectOne('/api/v1/tasks/1/items');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ title: 'New sub-task from modal' });

    // Simulate the backend response and keep the modal open
    post.flush(item({ id: '20', taskId: '1', ordinal: 0, title: 'New sub-task from modal' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.task-items__row')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('New sub-task from modal');
    expect(fixture.nativeElement.querySelector('.task-detail-modal')).toBeTruthy();
    expect(component.newItemTitle).toBe('');
  });

  // --- §8.8 — sub-tasks (ATSE1-34) -----------------------------------------

  it('WHEN the user expands a card THEN GET /api/v1/tasks/{id} fires once and the items render', () => {
    // Given
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    // No items rendered yet — the card is collapsed by default.
    expect(fixture.nativeElement.querySelector('.task-items')).toBeNull();

    // When — clicking the sub-tasks toggle on the first card
    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    const get = httpMock.expectOne('/api/v1/tasks/1');
    expect(get.request.method).toBe('GET');
    get.flush({ base: task({ id: '1' }), items: [item({ id: '10', title: 'Write tests' })] });
    fixture.detectChanges();

    // Then
    const rendered = fixture.nativeElement.querySelectorAll('.task-items__row');
    expect(rendered).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Write tests');
  });

  it('WHEN the same card is expanded twice THEN GET /api/v1/tasks/{id} fires only once', () => {
    // Given — card already expanded and items loaded
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: taskId(1) }), items: [] });
    fixture.detectChanges();

    // When — collapse and re-expand the same card
    component.toggleExpand(task({ id: taskId(1) }));
    fixture.detectChanges();
    component.toggleExpand(task({ id: taskId(1) }));

    // Then — no second GET fires
    httpMock.expectNone('/api/v1/tasks/1');
  });

  it('WHEN a sub-task checkbox is toggled THEN PATCH /api/v1/tasks/{taskId}/items/{itemId} fires with { completed } and the row reflects the change', () => {
    // Given — expanded card with one item
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
      toggleItem: (t: TaskModel, i: TaskItem, completed: boolean) => void;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: taskId(1) }),
      items: [item({ id: '10', completed: false })]
    });
    fixture.detectChanges();

    // When — checking the sub-task box
    component.toggleItem(task({ id: taskId(1) }), item({ id: '10' }), true);
    const patch = httpMock.expectOne('/api/v1/tasks/1/items/10');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ completed: true });
    patch.flush(item({ id: '10', completed: true }));
    fixture.detectChanges();

    // Then — the row renders with the strikethrough class
    const title = fixture.nativeElement.querySelector('.task-items__title');
    expect(title.classList.contains('completed')).toBe(true);
  });

  it('WHEN the trash icon is clicked on a sub-task THEN DELETE /api/v1/tasks/{taskId}/items/{itemId} fires and the row disappears', () => {
    // Given — expanded card with two items
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
      removeItem: (t: TaskModel, i: TaskItem) => void;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: taskId(1) }),
      items: [item({ id: '10' }), item({ id: '11', ordinal: 1, title: 'Other' })]
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.task-items__row')).toHaveLength(2);

    // When — clicking trash on item 10
    component.removeItem(task({ id: taskId(1) }), item({ id: '10' }));
    const del = httpMock.expectOne('/api/v1/tasks/1/items/10');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelectorAll('.task-items__row')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('[data-item-id="10"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-item-id="11"]')).toBeTruthy();
  });

  it('WHEN the user submits the inline add form with a non-blank title THEN POST /items fires with { title } and the form resets', () => {
    // Given — expanded card with one item already
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
      addItem: (t: TaskModel) => void;
      newItemTitle: string;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: taskId(1) }),
      items: [item({ id: '10' })]
    });
    fixture.detectChanges();

    // When — typing into the bound model and calling addItem
    component.newItemTitle = 'Write tests';
    component.addItem(task({ id: taskId(1) }));
    const post = httpMock.expectOne('/api/v1/tasks/1/items');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ title: 'Write tests' });
    post.flush(item({ id: '12', ordinal: 1, title: 'Write tests' }));
    fixture.detectChanges();

    // Then — the new item appears and the input model is reset
    expect(fixture.nativeElement.querySelectorAll('.task-items__row')).toHaveLength(2);
    expect(component.newItemTitle).toBe('');
  });

  it('WHEN the user clicks down-arrow on the first of two items THEN PUT /items/reorder fires with the swapped id order', () => {
    // Given — expanded card with two items
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
      moveItem: (t: TaskModel, i: TaskItem, delta: -1 | 1) => void;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({
      base: task({ id: taskId(1) }),
      items: [item({ id: '10' }), item({ id: '11', ordinal: 1, title: 'Other' })]
    });
    fixture.detectChanges();

    // When — clicking down on item 10
    component.moveItem(task({ id: taskId(1) }), item({ id: '10' }), +1);
    const put = httpMock.expectOne('/api/v1/tasks/1/items/reorder');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(['11', '10']);
    put.flush([item({ id: '11', ordinal: 0 }), item({ id: '10', ordinal: 1 })]);
    fixture.detectChanges();

    // Then — the DOM order reflects the swap
    const rows = fixture.nativeElement.querySelectorAll('.task-items__row');
    expect(rows[0]!.getAttribute('data-item-id')).toBe('11');
    expect(rows[1]!.getAttribute('data-item-id')).toBe('10');
  });

  it('WHEN a task has zero items THEN the empty-state placeholder is visible', () => {
    // Given — expanded card with no items
    const fixture = TestBed.createComponent(Task);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/me/tasks').flush([task({ id: taskId(1) })]);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      toggleExpand: (t: TaskModel) => void;
    };
    component.toggleExpand(task({ id: taskId(1) }));
    httpMock.expectOne('/api/v1/tasks/1').flush({ base: task({ id: taskId(1) }), items: [] });
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.task-items__empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.task-items__empty')!.textContent)
      .toContain('No sub-tasks yet.');
    expect(fixture.nativeElement.querySelectorAll('.task-items__row')).toHaveLength(0);
  });
});
