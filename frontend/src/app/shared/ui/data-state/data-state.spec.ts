import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataState } from './data-state';

describe('DataState', () => {
  let fixture: ComponentFixture<DataState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataState] }).compileComponents();
    fixture = TestBed.createComponent(DataState);
  });

  const set = (inputs: Record<string, unknown>): HTMLElement => {
    for (const [k, v] of Object.entries(inputs)) {
      fixture.componentRef.setInput(k, v);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows only the spinner while loading', () => {
    // When
    const el = set({ loading: true, error: true, empty: true });

    // Then — loading wins
    expect(el.querySelector('.ds--loading')).toBeTruthy();
    expect(el.querySelector('.ds--error')).toBeFalsy();
    expect(el.querySelector('.ds--empty')).toBeFalsy();
  });

  it('shows the error card with a Retry button and emits retry on click', () => {
    // Given
    const el = set({ loading: false, error: true, errorText: 'Boom' });
    const emitted: number[] = [];
    fixture.componentInstance.retry.subscribe(() => emitted.push(1));

    // Then
    const retry = el.querySelector('.ds--error .ds__retry') as HTMLButtonElement;
    expect(retry).toBeTruthy();
    expect(el.textContent).toContain('Boom');

    // When
    retry.click();

    // Then
    expect(emitted).toEqual([1]);
  });

  it('shows the empty state when not loading and no error', () => {
    // When
    const el = set({ loading: false, error: false, empty: true, emptyText: 'Nothing here' });

    // Then
    expect(el.querySelector('.ds--empty')).toBeTruthy();
    expect(el.textContent).toContain('Nothing here');
  });

  it('renders nothing when there is content to show', () => {
    // When
    const el = set({ loading: false, error: false, empty: false });

    // Then
    expect(el.querySelector('.ds')).toBeFalsy();
  });
});
