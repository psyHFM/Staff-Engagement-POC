import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditInteraction } from './edit-interaction';
import { ApiClient } from '../../../shared/api/api-client';
import { AuthState } from '../../../shared/auth/auth-state';
import { InteractionStateService } from '../interaction-state.service';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { InteractionSummary } from '../interaction.types';

describe('EditInteraction', () => {
  let fixture: ComponentFixture<EditInteraction>;
  let component: EditInteraction;
  let apiClientSpy: { patch: jest.Mock };

  const interaction = (overrides: Partial<InteractionSummary> = {}): InteractionSummary => ({
    id: { value: 5 },
    type: 'check-in',
    subject: { value: 1 },
    facilitator: { value: 2 },
    note: 'original note',
    createdAt: '2026-06-25T10:00:00Z',
    ...overrides
  });

  beforeEach(async () => {
    apiClientSpy = { patch: jest.fn().mockReturnValue(of(interaction({ note: 'updated' }))) };

    await TestBed.configureTestingModule({
      imports: [EditInteraction],
      providers: [
        InteractionStateService,
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient },
        { provide: AuthState, useValue: { currentUser: signal(null) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditInteraction);
    component = fixture.componentInstance;
  });

  it('renders nothing when no interaction is being edited', () => {
    // When — default state, no @Input() editing
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.edit-interaction__overlay')).toBeNull();
  });

  it('opens the modal and pre-fills type and note from the supplied interaction', () => {
    // Given
    fixture.componentRef.setInput('editing', interaction());
    fixture.detectChanges();

    // Then — component fields are hydrated by ngOnChanges
    expect(component.type).toBe('check-in');
    expect(component.note).toBe('original note');

    // And the modal markup renders with the same values
    const select = fixture.nativeElement.querySelector('#edit-type') as HTMLSelectElement;
    const textarea = fixture.nativeElement.querySelector('#edit-note') as HTMLTextAreaElement;
    expect(select).not.toBeNull();
    expect(textarea).not.toBeNull();
    // Angular's [(ngModel)] sets the bound values after change detection runs once.
    fixture.detectChanges();
    expect(component.type).toBe('check-in');
    expect(component.note).toBe('original note');
  });

  it('emits closed and does not PATCH when Cancel is clicked', () => {
    // Given
    fixture.componentRef.setInput('editing', interaction());
    fixture.detectChanges();
    const closed = jest.fn();
    component.closed.subscribe(closed);

    // When
    (fixture.nativeElement.querySelector('.edit-interaction__btn--secondary') as HTMLButtonElement).click();

    // Then
    expect(closed).toHaveBeenCalledTimes(1);
    expect(apiClientSpy.patch).not.toHaveBeenCalled();
  });

  it('emits closed when the overlay backdrop is clicked', () => {
    // Given
    fixture.componentRef.setInput('editing', interaction());
    fixture.detectChanges();
    const closed = jest.fn();
    component.closed.subscribe(closed);
    const overlay = fixture.nativeElement.querySelector('.edit-interaction__overlay') as HTMLDivElement;

    // When — click lands on the overlay itself, not on a descendant
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: overlay });
    Object.defineProperty(event, 'currentTarget', { value: overlay });
    overlay.dispatchEvent(event);

    // Then
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit closed when the click target is inside the panel', () => {
    // Given
    fixture.componentRef.setInput('editing', interaction());
    fixture.detectChanges();
    const closed = jest.fn();
    component.closed.subscribe(closed);

    // When — click bubbles up from a descendant (panel)
    const overlay = fixture.nativeElement.querySelector('.edit-interaction__overlay') as HTMLDivElement;
    const panel = fixture.nativeElement.querySelector('.edit-interaction__panel') as HTMLDivElement;
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: panel });
    Object.defineProperty(event, 'currentTarget', { value: overlay });
    overlay.dispatchEvent(event);

    // Then
    expect(closed).not.toHaveBeenCalled();
  });

  it('does not PATCH when no interaction is being edited (defensive)', () => {
    // When — submit called with no editing
    component.submit();

    // Then
    expect(apiClientSpy.patch).not.toHaveBeenCalled();
  });

  it('PATCHes the supplied type+note and emits saved on success', () => {
    // Given
    apiClientSpy.patch.mockClear();
    apiClientSpy.patch.mockReturnValue(
      of(interaction({ note: 'updated note', type: 'mentoring' }))
    );
    fixture.componentRef.setInput('editing', interaction({ note: 'to be updated' }));
    fixture.detectChanges();
    component.type = 'mentoring';
    component.note = 'updated note';
    const saved = jest.fn();
    component.saved.subscribe(saved);

    // When
    component.submit();

    // Then — the PATCH call shape matches the controller contract
    expect(apiClientSpy.patch).toHaveBeenCalledWith(
      'interactions/5',
      { type: 'mentoring', note: 'updated note' }
    );
    // And the saved event fires with the API-confirmed summary
    expect(saved).toHaveBeenCalledTimes(1);
    expect(saved.mock.calls[0][0].type).toBe('mentoring');
    expect(saved.mock.calls[0][0].note).toBe('updated note');
  });

  it('does not close or emit saved when the PATCH fails', () => {
    // Given
    apiClientSpy.patch.mockReturnValue(throwError(() => new Error('network down')));
    fixture.componentRef.setInput('editing', interaction());
    fixture.detectChanges();
    const saved = jest.fn();
    const closed = jest.fn();
    component.saved.subscribe(saved);
    component.closed.subscribe(closed);

    // When
    component.submit();

    // Then — modal stays open so the user can retry
    expect(saved).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });

  it('emits closed when Escape is pressed on the overlay', () => {
    // Given
    fixture.componentRef.setInput('editing', interaction());
    fixture.detectChanges();
    const closed = jest.fn();
    component.closed.subscribe(closed);
    const overlay = fixture.nativeElement.querySelector('.edit-interaction__overlay') as HTMLDivElement;

    // When
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Then
    expect(closed).toHaveBeenCalledTimes(1);
  });
});