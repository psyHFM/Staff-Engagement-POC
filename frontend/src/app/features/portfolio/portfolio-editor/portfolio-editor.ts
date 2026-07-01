import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { AuthState } from '../../../shared/auth/auth-state';
import { isAdminToken } from '../../employee/jwt-claims';
import { PortfolioStateService } from '../portfolio-state.service';
import { SkillEntry, EducationEntry, ProjectEntry, LinkEntry } from '../portfolio.model';

type Section = 'skills' | 'education' | 'projects' | 'links';

/**
 * Reusable portfolio editor (frontend-redesign §5.4, task 4.1).
 *
 * <p>Extracted from the former standalone {@code features/portfolio/portfolio.ts}
 * so the Profile page can host it in both View mode ({@code readOnly=true}) and
 * Edit mode ({@code readOnly=false}). The employee is supplied by the host via
 * {@link employeeId}; there is no "Employee ID" picker here.
 *
 * <p>The component is a pure consumer/mutator of the shared
 * {@link PortfolioStateService} signal — the host loads the portfolio; this
 * component reads it and dispatches add/remove mutations keyed by
 * {@link employeeId}. RBAC {@link rbacReadOnly} remains as a backstop: even when
 * the host passes {@code readOnly=false}, a non-owner/non-admin viewer stays
 * read-only.
 */
@Component({
  selector: 'app-portfolio-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio-editor.html',
  styleUrl: './portfolio-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PortfolioEditor {
  protected readonly state = inject(PortfolioStateService);
  private readonly auth = inject(AuthState);

  /** The employee whose portfolio is edited. Supplied by the host. */
  readonly employeeId = input.required<string>();

  /** When true the editor renders read-only (View mode). */
  readonly readOnly = input<boolean>(false);

  /** Read-only view of the service's portfolio signal. */
  protected readonly portfolio = computed(() => this.state.portfolio());

  /**
   * RBAC backstop (ATSE1-39): a viewer is read-only when we have an owner email
   * and the caller is neither the owner nor an admin. Falls back to read-only
   * when {@code ownerEmail} is absent (the backend rejects mutations anyway).
   */
  protected readonly rbacReadOnly = computed(() => {
    const owner = this.portfolio()?.ownerEmail;
    if (!owner) {
      return true;
    }
    const caller = this.auth.currentUser();
    if (caller && caller === owner) {
      return false;
    }
    return !isAdminToken(this.auth.bearerToken());
  });

  /** Effective read-only = host request OR the RBAC backstop. */
  protected readonly isReadOnly = computed(() => this.readOnly() || this.rbacReadOnly());

  /** Sections whose form is collapsed after a "Save & close" click. */
  private readonly _closedForms = signal<Set<Section>>(new Set());
  protected readonly closedForms = computed(() => this._closedForms());

  protected skillModel: { skill: string; years: number | null; projectCount: number | null } = {
    skill: '', years: null, projectCount: null
  };
  protected eduModel: { institution: string; qualification: string; startYear: number | null; endYear: number | null } = {
    institution: '', qualification: '', startYear: null, endYear: null
  };
  protected projModel: { name: string; description: string; startYear: number | null; endYear: number | null } = {
    name: '', description: '', startYear: null, endYear: null
  };
  protected linkModel: { label: string; url: string } = { label: '', url: '' };

  @ViewChild('skillForm') skillForm?: NgForm;
  @ViewChild('eduForm') eduForm?: NgForm;
  @ViewChild('projForm') projForm?: NgForm;
  @ViewChild('linkForm') linkForm?: NgForm;

  private guard(): boolean {
    return !this.isReadOnly();
  }

  // ---- Section form visibility ----

  protected isClosed(section: Section): boolean {
    return this._closedForms().has(section);
  }

  protected reopen(section: Section): void {
    this._closedForms.update((set) => {
      const next = new Set(set);
      next.delete(section);
      return next;
    });
  }

  private closeForm(section: Section): void {
    this._closedForms.update((set) => {
      const next = new Set(set);
      next.add(section);
      return next;
    });
  }

  protected saveAndClose(section: Section): void {
    if (!this.guard()) {
      return;
    }
    if (this.dispatch(section)) {
      this.closeForm(section);
    }
  }

  private dispatch(section: Section): boolean {
    if (!this.guard()) {
      return false;
    }
    switch (section) {
      case 'skills': return this.addSkill();
      case 'education': return this.addEducation();
      case 'projects': return this.addProject();
      case 'links': return this.addLink();
    }
  }

  // ---- Skills ----

  addSkill(): boolean {
    if (!this.guard()) return false;
    const form = this.skillForm;
    const m = this.skillModel;
    if (!form || !form.valid || m.skill.trim().length === 0) {
      return false;
    }
    this.state.addSkill(this.employeeId(), {
      skill: m.skill,
      years: m.years ?? 0,
      projectCount: m.projectCount ?? 0
    });
    this.skillModel = { skill: '', years: null, projectCount: null };
    form.resetForm();
    return true;
  }

  removeSkill(s: SkillEntry): void {
    if (!this.guard()) return;
    this.state.removeSkill(this.employeeId(), s.id);
  }

  // ---- Education ----

  addEducation(): boolean {
    if (!this.guard()) return false;
    const form = this.eduForm;
    if (!form || !form.valid) {
      return false;
    }
    const m = this.eduModel;
    this.state.addEducation(this.employeeId(), {
      institution: m.institution,
      qualification: m.qualification || undefined,
      startYear: m.startYear ?? undefined,
      endYear: m.endYear ?? undefined
    });
    this.eduModel = { institution: '', qualification: '', startYear: null, endYear: null };
    form.resetForm();
    return true;
  }

  removeEducation(e: EducationEntry): void {
    if (!this.guard()) return;
    this.state.removeEducation(this.employeeId(), e.id);
  }

  // ---- Projects ----

  addProject(): boolean {
    if (!this.guard()) return false;
    const form = this.projForm;
    if (!form || !form.valid) {
      return false;
    }
    const m = this.projModel;
    this.state.addProject(this.employeeId(), {
      name: m.name,
      description: m.description || undefined,
      startYear: m.startYear ?? undefined,
      endYear: m.endYear ?? undefined
    });
    this.projModel = { name: '', description: '', startYear: null, endYear: null };
    form.resetForm();
    return true;
  }

  removeProject(pr: ProjectEntry): void {
    if (!this.guard()) return;
    this.state.removeProject(this.employeeId(), pr.id);
  }

  // ---- Links ----

  addLink(): boolean {
    if (!this.guard()) return false;
    const form = this.linkForm;
    const m = this.linkModel;
    if (!form || !form.valid || m.url.trim().length === 0) {
      return false;
    }
    this.state.addLink(this.employeeId(), { label: m.label || undefined, url: m.url });
    this.linkModel = { label: '', url: '' };
    form.resetForm();
    return true;
  }

  removeLink(l: LinkEntry): void {
    if (!this.guard()) return;
    this.state.removeLink(this.employeeId(), l.id);
  }
}
