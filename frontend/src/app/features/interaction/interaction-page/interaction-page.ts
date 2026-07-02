import { ChangeDetectionStrategy, Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthState } from '../../../shared/auth/auth-state';
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
  private readonly auth = inject(AuthState);

  /** The interaction currently being edited, or null when the modal is closed. */
  protected readonly editing = signal<InteractionSummary | null>(null);
  /** The interaction whose Create-task modal is open, or null when closed. */
  protected readonly creatingTaskFor = signal<InteractionSummary | null>(null);

  /** Track whether we've already pre-selected a subject to avoid re-triggering. */
  private readonly preSelected = signal<boolean>(false);

  constructor() {
    // Set up effect to automatically select the logged-in user's subject when subjects become available
    effect(() => {
      const subjects = this.state.subjects();
      const preSelected = this.preSelected();
      const currentEmployeeId = this.auth.currentEmployeeId();

      if (subjects.length > 0 && !preSelected && currentEmployeeId != null) {
        // Find the logged-in user in the subjects list and select them
        const mySubject = subjects.find(s => s.id.value === currentEmployeeId);
        if (mySubject) {
          this.preSelected.set(true);
          this.state.selectSubject(mySubject.id);
          this.state.loadHistory();
          this.state.loadArchivedHistory();
        }
      }
    });
  }

  ngOnInit(): void {
    // Load subjects first
    this.state.loadSubjects();
  }

  protected onSubjectSelected(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.state.selectSubject({ value });
    this.state.loadHistory();
    this.state.loadArchivedHistory();
  }

  protected loadAllHistory(): void {
    this.state.loadHistory();
    this.state.loadArchivedHistory();
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
    this.state.loadArchivedHistory();
  }

  protected onArchive(interaction: InteractionSummary): void {
    // No confirmation needed - archive is reversible
    this.state.archiveInteraction(interaction.id.value.toString());
    // Reload both active and archived lists to reflect the toggle
    this.state.loadHistory();
    this.state.loadArchivedHistory();
  }

  protected onDelete(interaction: InteractionSummary): void {
    if (!confirm(
      'Are you sure you want to delete this interaction?\n\n' +
      'If the other party hasn\'t deleted it, they will still see it.\n' +
      'This action cannot be undone for you.'
    )) {
      return;
    }
    this.state.deleteInteraction(interaction.id.value.toString());
    // Reload both lists
    this.state.loadHistory();
    this.state.loadArchivedHistory();
  }
}