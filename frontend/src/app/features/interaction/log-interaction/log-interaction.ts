import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InteractionStateService } from '../interaction-state.service';
import { EmployeeId, EmployeeOption, InteractionType, INTERACTION_TYPES } from '../interaction.types';

/**
 * Form for logging a new interaction.
 *
 * <p>Inputs: current subject and full subject list. The facilitator defaults to
 * the logged-in user (resolved by {@link InteractionStateService#defaultFacilitator})
 * but is overridable. On submit the form delegates creation to the state service.
 */
@Component({
  selector: 'app-log-interaction',
  imports: [FormsModule],
  templateUrl: './log-interaction.html',
  styleUrl: './log-interaction.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogInteraction implements OnInit {
  @Input({ required: true }) subject: EmployeeId | null = null;
  @Input({ required: true }) subjects: EmployeeOption[] = [];
  @Output() logged = new EventEmitter<void>();

  private readonly state = inject(InteractionStateService);

  protected readonly types = INTERACTION_TYPES;

  protected type: InteractionType = 'check-in';
  protected subjectId: number | null = null;
  protected subjectText = '';
  protected facilitatorId: number | null = null;
  protected note = '';

  ngOnInit(): void {
    this.resetForm();
  }

  protected submit(): void {
    if (!this.subjectId || !this.facilitatorId) {
      return;
    }
    const requestSubject: EmployeeId = { value: this.subjectId };
    const facilitator: EmployeeId = { value: this.facilitatorId };
    this.state.createInteraction(this.type, requestSubject, facilitator, this.subjectText, this.note).subscribe({
      next: () => {
        this.resetForm();
        this.logged.emit();
      }
    });
  }

  private resetForm(): void {
    this.type = 'check-in';
    this.subjectId = this.subject?.value ?? (this.subjects[0]?.id.value ?? null);
    this.subjectText = '';
    this.facilitatorId = this.state.defaultFacilitator().value;
    this.note = '';
  }
}
