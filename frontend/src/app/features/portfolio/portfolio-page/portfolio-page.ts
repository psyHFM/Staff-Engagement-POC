import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthState } from '../../../shared/auth/auth-state';
import { PortfolioEditor } from '../portfolio-editor/portfolio-editor';
import { PortfolioStateService } from '../portfolio-state.service';

/**
 * Self-service portfolio page (ATSE1-80).
 *
 * <p>Always shows the signed-in user's own portfolio and nothing else. The current
 * user's employee id is read from the JWT claim via {@link AuthState#currentEmployeeId}
 * and the portfolio is loaded for that user only. There is no search bar, no employee
 * picker, and no route parameter — a non-authenticated user cannot reach this page
 * because it sits behind {@code authGuard}.
 *
 * <p>The hosted {@link PortfolioEditor} is passed {@code readOnly=false} because the
 * page by definition belongs to the current user; the editor's RBAC backstop
 * (ATSE1-79) remains as a defence-in-depth check.
 */
@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PortfolioEditor],
  templateUrl: './portfolio-page.html',
  styleUrl: './portfolio-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioPage implements OnInit {
  private readonly auth = inject(AuthState);
  protected readonly state = inject(PortfolioStateService);

  /** The signed-in user's employee id as a string, or null if the JWT carries none. */
  protected readonly employeeId = computed(() => {
    const id = this.auth.currentEmployeeId();
    return id != null ? String(id) : null;
  });

  ngOnInit(): void {
    const id = this.employeeId();
    if (id) {
      this.state.loadPortfolio(id);
    }
  }
}
