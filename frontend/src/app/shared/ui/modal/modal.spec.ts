import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Modal } from './modal';

describe('Modal', () => {
  let fixture: ComponentFixture<Modal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Modal] }).compileComponents();
    fixture = TestBed.createComponent(Modal);
  });

  const open = (title = 'Edit'): HTMLElement => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('title', title);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders nothing when closed', () => {
    // When
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.modal__dialog')).toBeFalsy();
  });

  it('exposes an accessible dialog with the title', () => {
    // When
    const el = open('Edit interaction');

    // Then
    const dialog = el.querySelector('.modal__dialog') as HTMLElement;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Edit interaction');
  });

  it('emits closed on Escape', () => {
    // Given
    open();
    const emitted: number[] = [];
    fixture.componentInstance.closed.subscribe(() => emitted.push(1));

    // When
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Then
    expect(emitted).toEqual([1]);
  });

  it('emits closed when the labelled close button is clicked', () => {
    // Given
    const el = open();
    const emitted: number[] = [];
    fixture.componentInstance.closed.subscribe(() => emitted.push(1));

    // When
    (el.querySelector('.modal__close') as HTMLButtonElement).click();

    // Then
    expect(emitted).toEqual([1]);
  });

  it('does not emit closed on Escape when already closed', () => {
    // Given
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    const emitted: number[] = [];
    fixture.componentInstance.closed.subscribe(() => emitted.push(1));

    // When
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Then
    expect(emitted).toEqual([]);
  });
});
