import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractionList, PageRequest } from './interaction-list';
import { InteractionSummary, Paged } from '../interaction.types';

describe('InteractionList', () => {
  let fixture: ComponentFixture<InteractionList>;
  let component: InteractionList;

  const interaction = (id: number, overrides: Partial<InteractionSummary> = {}): InteractionSummary => ({
    id: { value: id },
    type: 'check-in',
    subject: { value: 1 },
    facilitator: { value: 2 },
    note: `Note ${id}`,
    createdAt: '2026-06-25T10:00:00Z',
    ...overrides
  });

  const page = (overrides: Partial<Paged<InteractionSummary>> = {}): Paged<InteractionSummary> => ({
    content: [interaction(1), interaction(2)],
    offset: 0,
    limit: 20,
    total: 2,
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InteractionList]
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('history', page());
    fixture.componentRef.setInput('loading', false);
  });

  it('renders the interaction rows', () => {
    // When
    fixture.detectChanges();

    // Then
    const items = fixture.nativeElement.querySelectorAll('.interaction-list__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Note 1');
  });

  it('shows an empty state when there are no interactions', () => {
    // Given
    fixture.componentRef.setInput('history', { content: [], offset: 0, limit: 20, total: 0 });

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.interaction-list__empty')).not.toBeNull();
  });

  it('disables the Previous button on the first page', () => {
    // When
    fixture.detectChanges();

    // Then
    const previousBtn = fixture.nativeElement.querySelectorAll('.interaction-list__page-btn')[0];
    expect(previousBtn.disabled).toBe(true);
  });

  it('disables the Next button on the last page', () => {
    // Given
    fixture.componentRef.setInput('history', page({ offset: 0, limit: 20, total: 2 }));

    // When
    fixture.detectChanges();

    // Then
    const nextBtn = fixture.nativeElement.querySelectorAll('.interaction-list__page-btn')[1];
    expect(nextBtn.disabled).toBe(true);
  });

  it('emits a page request when Next is clicked', () => {
    // Given
    fixture.componentRef.setInput('history', page({ offset: 0, limit: 20, total: 50 }));
    fixture.detectChanges();
    const emitted: PageRequest[] = [];
    component.pageRequested.subscribe((req) => emitted.push(req));

    // When
    component.next();

    // Then
    expect(emitted).toEqual([{ offset: 20, limit: 20 }]);
  });

  it('emits a page request when Previous is clicked', () => {
    // Given
    fixture.componentRef.setInput('history', page({ offset: 20, limit: 20, total: 50 }));
    fixture.detectChanges();
    const emitted: PageRequest[] = [];
    component.pageRequested.subscribe((req) => emitted.push(req));

    // When
    component.previous();

    // Then
    expect(emitted).toEqual([{ offset: 0, limit: 20 }]);
  });

  // ---- ATSE1-28 / ATSE1-29 — row actions ----------------------------

  it('renders an Edit and Create task button for every row', () => {
    // When
    fixture.detectChanges();

    // Then
    const editButtons = fixture.nativeElement.querySelectorAll('.interaction-list__action-btn:not(.interaction-list__action-btn--secondary)');
    const createTaskButtons = fixture.nativeElement.querySelectorAll('.interaction-list__action-btn--secondary');
    expect(editButtons.length).toBe(2);
    expect(createTaskButtons.length).toBe(2);
    expect(editButtons[0].getAttribute('aria-label')).toBe('Edit interaction 1');
    expect(createTaskButtons[1].getAttribute('aria-label')).toBe('Create task from interaction 2');
  });

  it('emits rowEdit with the full interaction when an Edit button is clicked', () => {
    // Given
    fixture.detectChanges();
    const emitted: InteractionSummary[] = [];
    component.rowEdit.subscribe((item) => emitted.push(item));
    const editButton = fixture.nativeElement.querySelector(
      '.interaction-list__action-btn:not(.interaction-list__action-btn--secondary)'
    ) as HTMLButtonElement;

    // When
    editButton.click();

    // Then
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toEqual({ value: 1 });
    expect(emitted[0].note).toBe('Note 1');
  });

  it('emits createTask with the full interaction when a Create-task button is clicked', () => {
    // Given
    fixture.detectChanges();
    const emitted: InteractionSummary[] = [];
    component.createTask.subscribe((item) => emitted.push(item));
    const createTaskButton = fixture.nativeElement.querySelector(
      '.interaction-list__action-btn--secondary'
    ) as HTMLButtonElement;

    // When
    createTaskButton.click();

    // Then
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toEqual({ value: 1 });
    expect(emitted[0].note).toBe('Note 1');
  });

  it('onEdit only emits the supplied interaction and not others', () => {
    // Given
    const target = interaction(2);
    const emitted: InteractionSummary[] = [];
    component.rowEdit.subscribe((item) => emitted.push(item));

    // When
    component.onEdit(target);

    // Then
    expect(emitted).toEqual([target]);
  });

  it('onCreateTask only emits the supplied interaction and not others', () => {
    // Given
    const target = interaction(2);
    const emitted: InteractionSummary[] = [];
    component.createTask.subscribe((item) => emitted.push(item));

    // When
    component.onCreateTask(target);

    // Then
    expect(emitted).toEqual([target]);
  });

  // ---- ATSE1-82 — rowViewDetail for detail modal ----------------------------

  it('emits rowViewDetail when onViewDetail is called', () => {
    // Given
    const target = interaction(1);
    const emitted: InteractionSummary[] = [];
    component.rowViewDetail.subscribe((item) => emitted.push(item));

    // When
    component.onViewDetail(target);

    // Then
    expect(emitted).toEqual([target]);
  });

  it('onViewDetail only emits the supplied interaction', () => {
    // Given
    const target = interaction(2);
    const emitted: InteractionSummary[] = [];
    component.rowViewDetail.subscribe((item) => emitted.push(item));

    // When
    component.onViewDetail(target);

    // Then
    expect(emitted).toEqual([target]);
  });

  it('onActionsClick stops event propagation', () => {
    // Given
    const mockEvent = { stopPropagation: jest.fn() } as unknown as Event;

    // When
    component.onActionsClick(mockEvent);

    // Then
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('renders clickable rows with hover state', () => {
    // When
    fixture.detectChanges();

    // Then
    const items = fixture.nativeElement.querySelectorAll('.interaction-list__item--clickable');
    expect(items.length).toBe(2);
  });
});
