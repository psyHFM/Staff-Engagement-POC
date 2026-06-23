import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Phase 0 stub route — proves the lazy-loaded, append-one-line-per-feature
 * routing convention (ROADMAP §3). Real feature modules (Employee, Interaction,
 * Task, Portfolio, Skills) replace this in Phases 1–5.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dashboard">
      <h1>Dashboard</h1>
      <p>Staff Engagement POC — Phase 0 foundation is live.</p>
      <p class="dashboard__hint">Feature modules arrive in Phases 1–5.</p>
    </section>
  `,
  styles: `
    :host { display: block; padding: 1.5rem; }
    .dashboard__hint { color: #6b7280; }
  `
})
export class Dashboard {}