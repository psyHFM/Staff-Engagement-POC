import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { InteractionPage } from './interaction-page';
import { InteractionStateService } from '../interaction-state.service';
import { InteractionSummary } from '../interaction.types';
import { AUTH_STORAGE, AuthStorage } from '../../../shared/auth/auth-storage';

describe('InteractionPage', () => {
  let fixture: ComponentFixture<InteractionPage>;
  let stateMock: InteractionStateService;

  const subjects = signal([
    { id: { value: 1 }, fullName: 'Admin User' },
    { id: { value: 2 }, fullName: 'Employee User' }
  ]);
  const subject = signal({ value: 1 });
  const history = signal(null);
  const created = signal(null);
  const error = signal(null);
  const isLoading = signal(false);

  const buildInteraction = (overrides: Partial<InteractionSummary> = {}): InteractionSummary => ({
    id: { value: 7 },
    type: 'check-in',
    subject: { value: 1 },
    facilitator: { value: 2 },
    note: 'note',
    createdAt: '2026-06-25T10:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    // In-memory AuthStorage — see auth-state.spec.ts for the same pattern.
    const storage: AuthStorage = {
      read: () => null,
      write: () => {
        /* no-op */
      },
      remove: () => {
        /* no-op */
      }
    };

    stateMock = {
      loadSubjects: jest.fn(),
      selectSubject: jest.fn(),
      loadHistory: jest.fn(),
      clearTransient: jest.fn(),
      createInteraction: jest.fn(),
      updateInteraction: jest.fn(),
      defaultFacilitator: () => ({ value: 2 }),
      subjects,
      subject,
      history,
      created,
      error,
      isLoading
    } as unknown as InteractionStateService;

    await TestBed
      .configureTestingModule({
        imports: [InteractionPage],
        providers: [provideRouter([]), { provide: AUTH_STORAGE, useValue: storage }]
      })
      .overrideComponent(InteractionPage, {
        set: { providers: [{ provide: InteractionStateService, useValue: stateMock }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(InteractionPage);
  });

  it('loads subjects and pre-selects the first employee on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(stateMock.loadSubjects).toHaveBeenCalled();
    expect(stateMock.selectSubject).toHaveBeenCalledWith({ value: 1 });
    expect(stateMock.loadHistory).toHaveBeenCalled();
  });

  it('selects a new subject and reloads history when the dropdown changes', () => {
    // Given
    fixture.detectChanges();

    // When
    fixture.componentInstance.onSubjectSelected({ target: { value: '2' } } as unknown as Event);

    // Then
    expect(stateMock.selectSubject).toHaveBeenCalledWith({ value: 2 });
    expect(stateMock.loadHistory).toHaveBeenCalledTimes(2);
  });

  it('renders error and success banners from state signals', () => {
    // Given
    error.set({
      timestamp: '',
      status: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong',
      path: ''
    });

    // When
    fixture.detectChanges();

    // Then
    const errorBanner = fixture.nativeElement.querySelector('.interaction-page__error');
    expect(errorBanner.textContent).toContain('Something went wrong');
  });

  // ---- ATSE1-28 / ATSE1-29 — row actions ---------------------------

  it('opens the edit modal when a row emits rowEdit', () => {
    // Given
    fixture.detectChanges();
    const target = buildInteraction();

    // When
    fixture.componentInstance.onRowEdit(target);

    // Then
    expect(fixture.componentInstance.editing()).toEqual(target);
  });

  it('closes the edit modal and clears the editing signal on close', () => {
    // Given
    fixture.componentInstance.editing.set(buildInteraction());
    (stateMock.loadHistory as jest.Mock).mockClear();

    // When
    fixture.componentInstance.onEditClosed();

    // Then — modal closes; we do NOT reload history on cancel
    expect(fixture.componentInstance.editing()).toBeNull();
    expect(stateMock.loadHistory).not.toHaveBeenCalled();
  });

  it('closes the edit modal and clears the editing signal on save', () => {
    // Given
    fixture.componentInstance.editing.set(buildInteraction());
    (stateMock.loadHistory as jest.Mock).mockClear();

    // When
    fixture.componentInstance.onEditSaved();

    // Then — modal closes; the save's own subscriber chain refreshes
    // history (state.updateInteraction taps loadHistory on success).
    expect(fixture.componentInstance.editing()).toBeNull();
    expect(stateMock.loadHistory).not.toHaveBeenCalled();
  });

  it('opens the create-task modal when a row emits createTask', () => {
    // Given
    fixture.detectChanges();
    const target = buildInteraction();

    // When
    fixture.componentInstance.onRowCreateTask(target);

    // Then
    expect(fixture.componentInstance.creatingTaskFor()).toEqual(target);
  });

  it('closes the create-task modal and refreshes history on form close', () => {
    // Given
    fixture.componentInstance.creatingTaskFor.set(buildInteraction());
    (stateMock.loadHistory as jest.Mock).mockClear();

    // When
    fixture.componentInstance.onTaskFormClosed();

    // Then
    expect(fixture.componentInstance.creatingTaskFor()).toBeNull();
    expect(stateMock.loadHistory).toHaveBeenCalled();
  });
});
