import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { AuthState } from '../../shared/auth/auth-state';
import { isAdminToken } from '../employee/jwt-claims';
import { PortfolioStateService } from './portfolio-state.service';
import { SkillEntry, EducationEntry, ProjectEntry, LinkEntry } from './portfolio.model';

/**
 * Portfolio editor (Phase 4, ATSE1-35/ATSE1-36/ATSE1-39).
 *
 * Local UI state lives here: the employee id being viewed, the transient form
 * fields, and which forms the user has collapsed via "Save & close". The
 * portfolio data itself is global state in {@link PortfolioStateService}.
 *
 * Per-form models (ATSE1-35): each form owns a mutable plain-object model that
 * the template binds with {@code [(ngModel)]}. The model IS the source of
 * truth read by {@code addX()}; after a successful submit the model is reset
 * to its initial empty values, clearing the inputs via the same binding.
 *
 * RBAC (ATSE1-39): the backend enforces owner-or-admin on every mutating
 * call. The frontend mirrors the gate as a best-effort UI affordance —
 * non-owner non-admin viewers see a read-only banner, disabled form inputs,
 * and no remove buttons. Component handlers also short-circuit while
 * read-only (defense in depth).
 *
 * Button split (ATSE1-36): each section has a primary "Add another" button
 * that keeps the form open and clears fields, and a secondary "Save & close"
 * button that submits and collapses the form. {@code closedForms} tracks
 * which sections are collapsed; the user can reopen via the "+ Add another"
 * link.
 */
@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="portfolio-page">
      <header class="portfolio-header">
        <h1>Portfolio</h1>
        <div class="employee-picker">
          <label for="employeeId">Employee ID</label>
          <input id="employeeId" name="employeeId" [(ngModel)]="employeeId" (keyup.enter)="load()" />
          <button (click)="load()" class="btn-primary" [disabled]="state.loading()">Load</button>
        </div>
      </header>

      <div *ngIf="state.loading()" class="loading">Loading…</div>

      <div *ngIf="isReadOnly() && portfolio() as p" class="read-only-banner" role="status">
        <i class="pi pi-lock"></i>
        You can view this portfolio but only <strong>{{ p.ownerEmail || 'the owner' }}</strong>
        or an admin can edit it.
      </div>

      <ng-container *ngIf="portfolio() as p">
        <!-- Skills (the centrepiece: years + project count) -->
        <section class="card">
          <h2>Skills</h2>
          <ul class="entry-list">
            <li *ngFor="let s of p.skills">
              <strong>{{ s.skill }}</strong> — {{ s.years }} yrs, {{ s.projectCount }} projects
              <button *ngIf="!isReadOnly()" (click)="removeSkill(s)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.skills.length === 0" class="empty">No skills yet.</li>
          </ul>

          <button
            *ngIf="isClosed('skills')"
            type="button"
            class="btn-link"
            (click)="reopen('skills')"
          >+ Add another skill</button>

          <form
            *ngIf="!isClosed('skills')"
            (ngSubmit)="addSkill()"
            class="inline-form"
            #skillForm="ngForm"
          >
            <input name="skill" [(ngModel)]="skillModel.skill" placeholder="Skill (e.g. Angular)" required [disabled]="isReadOnly()" />
            <input type="number" name="years" [(ngModel)]="skillModel.years" placeholder="Years" min="0" [disabled]="isReadOnly()" />
            <input type="number" name="projectCount" [(ngModel)]="skillModel.projectCount" placeholder="Projects" min="0" [disabled]="isReadOnly()" />
            <button *ngIf="!isReadOnly()" type="submit" [disabled]="!skillForm.valid" class="btn-secondary">Add another</button>
            <button *ngIf="!isReadOnly()" type="button" [disabled]="!skillForm.valid" class="btn-secondary-outline" (click)="saveAndClose('skills')">Save &amp; close</button>
          </form>
        </section>

        <!-- Education -->
        <section class="card">
          <h2>Education</h2>
          <ul class="entry-list">
            <li *ngFor="let e of p.education">
              <strong>{{ e.institution }}</strong>
              <span *ngIf="e.qualification"> — {{ e.qualification }}</span>
              <span *ngIf="e.startYear"> ({{ e.startYear }}<span *ngIf="e.endYear">–{{ e.endYear }}</span>)</span>
              <button *ngIf="!isReadOnly()" (click)="removeEducation(e)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.education.length === 0" class="empty">No education entries.</li>
          </ul>

          <button
            *ngIf="isClosed('education')"
            type="button"
            class="btn-link"
            (click)="reopen('education')"
          >+ Add another education</button>

          <form
            *ngIf="!isClosed('education')"
            (ngSubmit)="addEducation()"
            class="inline-form"
            #eduForm="ngForm"
          >
            <input name="institution" [(ngModel)]="eduModel.institution" placeholder="Institution" required [disabled]="isReadOnly()" />
            <input name="qualification" [(ngModel)]="eduModel.qualification" placeholder="Qualification" [disabled]="isReadOnly()" />
            <input type="number" name="startYear" [(ngModel)]="eduModel.startYear" placeholder="Start year" [disabled]="isReadOnly()" />
            <input type="number" name="endYear" [(ngModel)]="eduModel.endYear" placeholder="End year" [disabled]="isReadOnly()" />
            <button *ngIf="!isReadOnly()" type="submit" [disabled]="!eduForm.valid" class="btn-secondary">Add another</button>
            <button *ngIf="!isReadOnly()" type="button" [disabled]="!eduForm.valid" class="btn-secondary-outline" (click)="saveAndClose('education')">Save &amp; close</button>
          </form>
        </section>

        <!-- Projects -->
        <section class="card">
          <h2>Projects</h2>
          <ul class="entry-list">
            <li *ngFor="let pr of p.projects">
              <strong>{{ pr.name }}</strong>
              <span *ngIf="pr.description"> — {{ pr.description }}</span>
              <button *ngIf="!isReadOnly()" (click)="removeProject(pr)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.projects.length === 0" class="empty">No projects.</li>
          </ul>

          <button
            *ngIf="isClosed('projects')"
            type="button"
            class="btn-link"
            (click)="reopen('projects')"
          >+ Add another project</button>

          <form
            *ngIf="!isClosed('projects')"
            (ngSubmit)="addProject()"
            class="inline-form"
            #projForm="ngForm"
          >
            <input name="name" [(ngModel)]="projModel.name" placeholder="Project name" required [disabled]="isReadOnly()" />
            <input name="description" [(ngModel)]="projModel.description" placeholder="Description" [disabled]="isReadOnly()" />
            <input type="number" name="startYear" [(ngModel)]="projModel.startYear" placeholder="Start year" [disabled]="isReadOnly()" />
            <input type="number" name="endYear" [(ngModel)]="projModel.endYear" placeholder="End year" [disabled]="isReadOnly()" />
            <button *ngIf="!isReadOnly()" type="submit" [disabled]="!projForm.valid" class="btn-secondary">Add another</button>
            <button *ngIf="!isReadOnly()" type="button" [disabled]="!projForm.valid" class="btn-secondary-outline" (click)="saveAndClose('projects')">Save &amp; close</button>
          </form>
        </section>

        <!-- Links -->
        <section class="card">
          <h2>Public links</h2>
          <ul class="entry-list">
            <li *ngFor="let l of p.links">
              <a *ngIf="l.label; else bareLink" [href]="l.url" target="_blank" rel="noopener">{{ l.label }}</a>
              <ng-template #bareLink><a [href]="l.url" target="_blank" rel="noopener">{{ l.url }}</a></ng-template>
              <button *ngIf="!isReadOnly()" (click)="removeLink(l)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.links.length === 0" class="empty">No links.</li>
          </ul>

          <button
            *ngIf="isClosed('links')"
            type="button"
            class="btn-link"
            (click)="reopen('links')"
          >+ Add another link</button>

          <form
            *ngIf="!isClosed('links')"
            (ngSubmit)="addLink()"
            class="inline-form"
            #linkForm="ngForm"
          >
            <input name="label" [(ngModel)]="linkModel.label" placeholder="Label (optional)" [disabled]="isReadOnly()" />
            <input name="url" [(ngModel)]="linkModel.url" placeholder="https://…" required [disabled]="isReadOnly()" />
            <button *ngIf="!isReadOnly()" type="submit" [disabled]="!linkForm.valid" class="btn-secondary">Add another</button>
            <button *ngIf="!isReadOnly()" type="button" [disabled]="!linkForm.valid" class="btn-secondary-outline" (click)="saveAndClose('links')">Save &amp; close</button>
          </form>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .portfolio-page { padding: 2rem; max-width: 900px; margin: 0 auto; }
    .portfolio-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .employee-picker { display: flex; align-items: center; gap: 0.5rem; }
    .employee-picker label { font-weight: 600; }
    .employee-picker input { padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 0.4rem; width: 7rem; }
    .card { border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem; background: white; }
    .card h2 { margin: 0 0 0.75rem; font-size: 1.2rem; }
    .entry-list { list-style: none; padding: 0; margin: 0 0 1rem; }
    .entry-list li { padding: 0.4rem 0; border-bottom: 1px solid #f3f4f6; }
    .entry-list .empty { color: #9ca3af; }
    .inline-form { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .inline-form input { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.4rem; }
    .btn-primary { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.4rem; cursor: pointer; }
    .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
    .btn-secondary { background: white; border: 1px solid #d1d5db; padding: 0.5rem 1rem; border-radius: 0.4rem; cursor: pointer; }
    .btn-secondary:disabled { color: #9ca3af; cursor: not-allowed; }
    .btn-secondary-outline { background: transparent; color: #1d4ed8; border: 1px solid #93c5fd; padding: 0.5rem 1rem; border-radius: 0.4rem; cursor: pointer; }
    .btn-secondary-outline:disabled { color: #9ca3af; border-color: #d1d5db; cursor: not-allowed; }
    .btn-link { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; margin-left: 0.5rem; }
    .btn-link[disabled] { color: #9ca3af; cursor: not-allowed; }
    .loading { text-align: center; padding: 2rem; color: #6b7280; }
    .read-only-banner { display: flex; align-items: center; gap: 0.5rem; background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1.5rem; }
  `]
})
export class Portfolio implements OnInit {
  protected readonly state = inject(PortfolioStateService);
  private readonly auth = inject(AuthState);

  /** Local UI state: which employee's portfolio is being viewed. */
  protected readonly employeeId = signal('1');

  /** Read-only view of the service's portfolio signal. */
  protected readonly portfolio = computed(() => this.state.portfolio());

  /** Sections whose form is collapsed after a "Save & close" click (ATSE1-36). */
  private readonly _closedForms = signal<Set<Section>>(new Set());
  protected readonly closedForms = computed(() => this._closedForms());

  /**
   * RBAC gate (ATSE1-39): a viewer is read-only when we have an owner email and
   * the caller is neither the owner nor an admin. Falls back to read-only when
   * {@code ownerEmail} is absent (defense in depth — the backend will still
   * reject any mutation in that case via {@code ACCESS_DENIED}).
   */
  protected readonly isReadOnly = computed(() => {
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

  // ATSE1-35: per-form local models. Two-way bound via [(ngModel)] so addX()
  // reads the latest input values; reset to initial values + resetForm() after
  // a successful submit clears the inputs.
  protected skillModel: { skill: string; years: number | null; projectCount: number | null } = {
    skill: '', years: null, projectCount: null
  };
  protected eduModel: { institution: string; qualification: string; startYear: number | null; endYear: number | null } = {
    institution: '', qualification: '', startYear: null, endYear: null
  };
  protected projModel: { name: string; description: string; startYear: number | null; endYear: number | null } = {
    name: '', description: '', startYear: null, endYear: null
  };
  protected linkModel: { label: string; url: string } = {
    label: '', url: ''
  };

  // ATSE1-35: @ViewChild on the form so we can read `form.valid` and call
  // `form.resetForm()` after submit.
  @ViewChild('skillForm') skillForm?: NgForm;
  @ViewChild('eduForm') eduForm?: NgForm;
  @ViewChild('projForm') projForm?: NgForm;
  @ViewChild('linkForm') linkForm?: NgForm;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.state.loadPortfolio(this.employeeId());
  }

  // ---- Read-only gate (ATSE1-39, defense in depth) ----

  private guard(): boolean {
    return !this.isReadOnly();
  }

  // ---- Section form visibility (ATSE1-36) ----

  protected isClosed(section: Section): boolean {
    return this._closedForms().has(section);
  }

  protected reopen(section: Section): void {
    this._closedForms.update(set => {
      const next = new Set(set);
      next.delete(section);
      return next;
    });
  }

  private closeForm(section: Section): void {
    this._closedForms.update(set => {
      const next = new Set(set);
      next.add(section);
      return next;
    });
  }

  /**
   * "Save & close" handler (ATSE1-36). Dispatches the same mutation as the
   * "Add another" button (via {@code addX()}) and then collapses the form.
   * If the underlying {@code addX()} short-circuited because of the RBAC guard
   * or an invalid form, the collapse is skipped so the user can correct.
   */
  protected saveAndClose(section: Section): void {
    if (!this.guard()) {
      return;
    }
    const ok = this.dispatch(section);
    if (ok) {
      this.closeForm(section);
    }
  }

  /**
   * Returns true if the add dispatched (and the inputs were reset); false if
   * the form was invalid or the RBAC guard blocked it. Centralises the per-
   * section dispatch so "Add another" and "Save & close" share one path.
   */
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

type Section = 'skills' | 'education' | 'projects' | 'links';
