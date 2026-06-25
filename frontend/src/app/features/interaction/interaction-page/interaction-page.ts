import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EditInteraction } from '../edit-interaction/edit-interaction';
import { InteractionList } from '../interaction-list/interaction-list';
import { InteractionStateService } from '../interaction-state.service';
import { LogInteraction } from '../log-interaction/log-interaction';
import { InteractionSummary } from '../interaction.types';
import { TaskCreateForm } from '../../task/task-create-form';

/**
 * Interaction feature landing page.
 *
 * <p>Hosts the subject selector, the log-interaction form, and the per-employee
 * interaction history. Uses the {@link InteractionStateService} for all data and
 * side effects (frontend-state.yaml).
 *
 * <p>Per-row actions (ATSE1-28, ATSE1-29):
 * <ul>
 *   <li>Edit — opens an edit modal bound to the row. Only {@code type} and
 *       {@code note} are mutable; subject, facilitator and createdAt are
 *       immutable to keep the audit trail honest.</li>
 *   <li>Create task — opens the existing {@link TaskCreateForm} modal with
 *       the interaction's id pre-populated as {@code sourceInteractionId}.</li>
 * </ul>
 */
@Component({
  selector: 'app-interaction-page',
  imports: [FormsModule, RouterLink, LogInteraction, InteractionList, EditInteraction, TaskCreateForm],
  templateUrl: './interaction-page.html',
  styleUrl: './interaction-page.scss',
  providers: [InteractionStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractionPage implements OnInit {
  protected readonly state = inject(InteractionStateService);

  /** The interaction currently being edited, or null when the modal is closed. */
  protected readonly editing = signal<InteractionSummary | null>(null);
  /** The interaction whose Create-task modal is open, or null when closed. */
  protected readonly creatingTaskFor = signal<InteractionSummary | null>(null);

  ngOnInit(): void {
    this.state.loadSubjects();

    // Pre-select the first stub subject so the page is not empty on arrival.
    const first = this.state.subjects()[0];
    if (first) {
      this.state.selectSubject(first.id);
      this.state.loadHistory();
    }
  }

  protected onSubjectSelected(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.state.selectSubject({ value });
    this.state.loadHistory();
  }

  protected onRowEdit(interaction: InteractionSummary): void {
    this.editing.set(interaction);
  }

  protected onEditClosed(): void {
    this.editing.set(null);
  }

  protected onEditSaved(): void {
    this.editing.set(null);
  }

  protected onRowCreateTask(interaction: InteractionSummary): void {
    this.creatingTaskFor.set(interaction);
  }

  protected onTaskFormClosed(): void {
    this.creatingTaskFor.set(null);
    // Refresh history so any newly created task is reflected.
    this.state.loadHistory();
  }
}