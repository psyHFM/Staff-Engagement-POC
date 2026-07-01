import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthState } from '../../shared/auth/auth-state';
import { ProfileStateService } from '../../profile/profile-state.service';
import { SkillsStateService } from '../skills/skills-state.service';
import { Badge } from '../../shared/ui/badge/badge';
import { DataState } from '../../shared/ui/data-state/data-state';

/**
 * Dashboard landing page (frontend-redesign Phase D).
 *
 * <p>Greeting header + a responsive widget grid. Cards read from existing
 * feature state services so there are no backend changes:
 * <ul>
 *   <li>My open tasks / Recent interactions — from the rounded profile of the
 *       logged-in user ({@link ProfileStateService}), one fetch feeds both.</li>
 *   <li>Top skills — the org-wide popular grid ({@link SkillsStateService}).</li>
 *   <li>Quick actions — static deep links.</li>
 * </ul>
 * Each data card surfaces the standard loading / empty / error+retry states.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, Badge, DataState],
  providers: [ProfileStateService, SkillsStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthState);
  protected readonly profile = inject(ProfileStateService);
  protected readonly skills = inject(SkillsStateService);

  /** The current user's employee id (string), or null when unknown. */
  private readonly myId = computed(() => {
    const id = this.auth.currentEmployeeId();
    return id != null ? String(id) : null;
  });

  /** Deep link to the current user's own profile in edit mode ("Edit my portfolio"). */
  protected readonly myProfileLink = computed(() => {
    const id = this.auth.currentEmployeeId();
    return id != null ? ['/employees', id, 'profile'] : ['/profile'];
  });

  /** Display first name derived from the JWT username (email local-part). */
  protected readonly firstName = computed(() => {
    const user = this.auth.currentUser() ?? '';
    const local = user.split('@')[0].split(/[.\s]/)[0];
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'there';
  });

  protected readonly today = new Date();

  // ---- Tasks + interactions (from the rounded profile) --------------------
  protected readonly profileLoading = computed(() => this.profile.isLoading());
  protected readonly profileErrored = computed(() => this.profile.error() != null);
  protected readonly openTasks = computed(() =>
    (this.profile.profile()?.tasks ?? []).filter((t) => !t.completed)
  );
  protected readonly recentInteractions = computed(() =>
    (this.profile.profile()?.interactions ?? []).slice(0, 5)
  );

  // ---- Popular skills -----------------------------------------------------
  protected readonly skillsLoading = computed(() => this.skills.isLoading());
  protected readonly skillsErrored = computed(() => this.skills.error() != null);
  protected readonly popularSkills = computed(() => (this.skills.popular() ?? []).slice(0, 5));

  ngOnInit(): void {
    this.reloadProfile();
    this.skills.loadPopular();
  }

  protected reloadProfile(): void {
    const id = this.myId();
    if (id) {
      this.profile.loadProfile(id);
    }
  }

  protected reloadSkills(): void {
    this.skills.loadPopular();
  }
}
