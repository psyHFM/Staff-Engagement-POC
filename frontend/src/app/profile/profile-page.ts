import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ProfileStateService } from './profile-state.service';

/**
 * Rounded employee profile page (Phase 6).
 *
 * <p>Reads the employee id from the route, asks {@link ProfileStateService} to load
 * the profile, and renders the header, interactions, tasks, and portfolio sections.
 * All data flows through computed signals from the state service; the component never
 * mutates state directly.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [ProfileStateService],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage implements OnInit {
  protected readonly state = inject(ProfileStateService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.state.loadProfile(id);
    }
  }
}
