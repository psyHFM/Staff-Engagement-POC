import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { SkillsStateService } from './skills-state.service';
import { SkillSortOption } from './skills.types';

/**
 * Skills search page (Phase 5 frontend, ATSE1-40 / ATSE1-43).
 *
 * Local state: `searchTerm` holds the transient text in the input.
 * Global/feature state: owned by SkillsStateService (search results, popular grid,
 * persisted sort option).
 *
 * The component only calls `state.search(name)`, `state.loadPopular()`,
 * `state.setSortOption(...)`, and `state.clear()`; it never mutates the service's
 * private signals directly.
 */
@Component({
  selector: 'app-skills-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [SkillsStateService],
  templateUrl: './skills-page.html',
  styleUrl: './skills-page.scss'
})
export class SkillsPage implements OnInit {
  protected readonly state = inject(SkillsStateService);
  protected readonly searchTerm = signal('');
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    // ATSE1-40: pre-populate the browseable grid so the page shows tiles even
    // before the user types. A blank search leaves `results()` as null.
    this.state.loadPopular();

    // ATSE1-48: Read :name param from route for deep-link support (/skills/Angular)
    this.route.params.subscribe((params) => {
      const skillName = params['name'];
      if (skillName) {
        this.searchTerm.set(skillName);
        this.state.search(skillName);
      }
    });
  }

  onInput(value: string): void {
    this.searchTerm.set(value);
    this.state.search(value);
  }

  /**
   * Tile click on the popular grid (ATSE1-48): navigate to the deep-linked
   * detail view for that skill. The same component renders the detail panel
   * when a :name route param is present.
   */
  onTileClick(skill: string): void {
    this.router.navigate(['/skills', skill]);
  }

  /**
   * Search result row click (ATSE1-48): navigate to the deep-linked detail view.
   */
  onResultClick(skill: string): void {
    this.router.navigate(['/skills', skill]);
  }

  /**
   * Sort dropdown change (ATSE1-43). Updates the persisted sort option and, if
   * there is an active query, re-runs the search so the new ordering takes
   * effect immediately. The popular grid order is fixed by the backend and
   * unaffected by this control.
   */
  onSortChange(value: SkillSortOption): void {
    this.state.setSortOption(value);
    if (this.searchTerm().trim().length > 0) {
      this.state.search(this.searchTerm());
    }
  }

  clear(): void {
    this.searchTerm.set('');
    this.state.clear();
    // Re-fetch the grid so clearing the search returns the user to the tile view.
    this.state.loadPopular();
  }
}