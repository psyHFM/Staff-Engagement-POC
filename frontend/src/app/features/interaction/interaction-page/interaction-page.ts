import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InteractionList } from '../interaction-list/interaction-list';
import { InteractionStateService } from '../interaction-state.service';
import { LogInteraction } from '../log-interaction/log-interaction';

/**
 * Interaction feature landing page.
 *
 * <p>Hosts the subject selector, the log-interaction form, and the per-employee
 * interaction history. Uses the {@link InteractionStateService} for all data and
 * side effects (frontend-state.yaml).
 */
@Component({
  selector: 'app-interaction-page',
  imports: [FormsModule, RouterLink, LogInteraction, InteractionList],
  templateUrl: './interaction-page.html',
  styleUrl: './interaction-page.scss',
  providers: [InteractionStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InteractionPage implements OnInit {
  protected readonly state = inject(InteractionStateService);

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
}
