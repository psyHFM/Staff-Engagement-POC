import {
  Directive,
  ElementRef,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';

/**
 * ClickOutside directive (ATSE1-52).
 *
 * Emits an event when the user clicks outside the host element.
 * Useful for closing dropdowns, modals, and popovers.
 *
 * Usage:
 * ```html
 * <div (clickOutside)="closeMenu()">
 *   Dropdown content
 * </div>
 * ```
 */
@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);

  @Output()
  clickOutside = new EventEmitter<void>();

  private clickListener: ((event: MouseEvent) => void) | null = null;

  ngOnInit(): void {
    this.clickListener = this.onDocumentClick.bind(this);
    document.addEventListener('click', this.clickListener, false);
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener, false);
      this.clickListener = null;
    }
  }

  private onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    const isInside = this.elementRef.nativeElement.contains(target);

    if (!isInside) {
      this.clickOutside.emit();
    }
  }
}
