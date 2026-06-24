import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SkillsStateService } from './skills-state.service';

/**
 * Skills search page (Phase 5 frontend).
 *
 * Local state: `searchTerm` holds the transient text in the input.
 * Global/feature state: owned by SkillsStateService.
 *
 * The component only calls `state.search(name)` and `state.clear()`; it never
 * mutates the service's private signals directly.
 */
@Component({
  selector: 'app-skills-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [SkillsStateService],
  templateUrl: './skills-page.html',
  styleUrl: './skills-page.scss'
})
export class SkillsPage {
  protected readonly state = inject(SkillsStateService);
  protected readonly searchTerm = signal('');

  onInput(value: string): void {
    this.searchTerm.set(value);
    this.state.search(value);
  }

  clear(): void {
    this.searchTerm.set('');
    this.state.clear();
  }
}
