import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { InteractionDetailModal } from './interaction-detail-modal';
import { InteractionStateService } from '../interaction-state.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { Badge } from '../../../shared/ui/badge/badge';
import { InteractionSummary, EmployeeId, InteractionId } from '../interaction.types';

describe('InteractionDetailModal', () => {
  let component: InteractionDetailModal;
  let fixture: ComponentFixture<InteractionDetailModal>;
  let mockStateService: Partial<InteractionStateService>;

  const employee = (value: number): EmployeeId => ({ value });
  const interaction = (overrides: Partial<InteractionSummary> = {}): InteractionSummary => ({
    id: { value: 1 } as InteractionId,
    type: 'check-in',
    subject: employee(1),
    facilitator: employee(2),
    facilitatorName: 'Test Facilitator',
    subjectText: 'Test subject',
    interactionListNote: 'Short note',
    note: 'Full note content',
    createdAt: new Date().toISOString(),
    ...overrides
  });

  beforeEach(async () => {
    mockStateService = {
      selectedInteractionForModal: signal(null),
      openInteractionDetail: jest.fn(),
      closeInteractionDetail: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        InteractionDetailModal,
        Modal,
        Badge
      ],
      providers: [
        { provide: InteractionStateService, useValue: mockStateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionDetailModal);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have modalOpen return boolean based on selectedInteractionForModal', () => {
    // Given
    const testInteraction = interaction();
    mockStateService.selectedInteractionForModal = signal(testInteraction);
    TestBed.compileComponents();
    fixture = TestBed.createComponent(InteractionDetailModal);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Then
    expect(component.modalOpen()).toBe(true);
  });

  it('should return null for interaction when no interaction is selected', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(component.interaction()).toBeNull();
  });

  it('should return the selected interaction when one is selected', () => {
    // Given
    const testInteraction = interaction({ id: { value: 42 } });
    mockStateService.selectedInteractionForModal = signal(testInteraction);
    TestBed.compileComponents();
    fixture = TestBed.createComponent(InteractionDetailModal);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Then
    expect(component.interaction()?.id.value).toBe(42);
  });

  it('should call closeInteractionDetail when closeModal is called', () => {
    // When
    component.closeModal();

    // Then
    expect(mockStateService.closeInteractionDetail).toHaveBeenCalled();
  });

  describe('template rendering', () => {
    it('should not render modal content when no interaction is selected', () => {
      // When
      fixture.detectChanges();

      // Then
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.interaction-detail')).toBeNull();
    });

    it('should render modal backdrop when interaction is selected', () => {
      // Given
      const testInteraction = interaction();
      mockStateService.selectedInteractionForModal = signal(testInteraction);
      TestBed.compileComponents();
      fixture = TestBed.createComponent(InteractionDetailModal);
      component = fixture.componentInstance;
      fixture.detectChanges();

      // Then
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.modal__backdrop')).toBeTruthy();
      expect(compiled.querySelector('.interaction-detail')).toBeTruthy();
    });
  });
});
