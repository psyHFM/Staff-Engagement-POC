import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { PortfolioStateService } from './portfolio-state.service';
import { SkillEntry, EducationEntry, ProjectEntry, LinkEntry } from './portfolio.model';

/**
 * Portfolio editor (Phase 4). Local UI state (the employee id being viewed and the
 * add-entry form fields) lives here as signals; the portfolio data itself is global
 * state in {@link PortfolioStateService}. Components dispatch to the service and read
 * the `portfolio` computed signal — never mutate the service's signal directly.
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

      <ng-container *ngIf="portfolio() as p">
        <!-- Skills (the centrepiece: years + project count) -->
        <section class="card">
          <h2>Skills</h2>
          <ul class="entry-list">
            <li *ngFor="let s of p.skills">
              <strong>{{ s.skill }}</strong> — {{ s.years }} yrs, {{ s.projectCount }} projects
              <button (click)="removeSkill(s)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.skills.length === 0" class="empty">No skills yet.</li>
          </ul>
          <form (ngSubmit)="addSkill()" class="inline-form" #skillForm="ngForm">
            <input name="skill" [(ngModel)]="skillModel.skill" placeholder="Skill (e.g. Angular)" required />
            <input type="number" name="years" [(ngModel)]="skillModel.years" placeholder="Years" min="0" />
            <input type="number" name="projectCount" [(ngModel)]="skillModel.projectCount" placeholder="Projects" min="0" />
            <button type="submit" [disabled]="!skillForm.valid" class="btn-secondary">Add skill</button>
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
              <button (click)="removeEducation(e)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.education.length === 0" class="empty">No education entries.</li>
          </ul>
          <form (ngSubmit)="addEducation()" class="inline-form" #eduForm="ngForm">
            <input name="institution" [(ngModel)]="eduModel.institution" placeholder="Institution" required />
            <input name="qualification" [(ngModel)]="eduModel.qualification" placeholder="Qualification" />
            <input type="number" name="startYear" [(ngModel)]="eduModel.startYear" placeholder="Start year" />
            <input type="number" name="endYear" [(ngModel)]="eduModel.endYear" placeholder="End year" />
            <button type="submit" [disabled]="!eduForm.valid" class="btn-secondary">Add education</button>
          </form>
        </section>

        <!-- Projects -->
        <section class="card">
          <h2>Projects</h2>
          <ul class="entry-list">
            <li *ngFor="let pr of p.projects">
              <strong>{{ pr.name }}</strong>
              <span *ngIf="pr.description"> — {{ pr.description }}</span>
              <button (click)="removeProject(pr)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.projects.length === 0" class="empty">No projects.</li>
          </ul>
          <form (ngSubmit)="addProject()" class="inline-form" #projForm="ngForm">
            <input name="name" [(ngModel)]="projModel.name" placeholder="Project name" required />
            <input name="description" [(ngModel)]="projModel.description" placeholder="Description" />
            <input type="number" name="startYear" [(ngModel)]="projModel.startYear" placeholder="Start year" />
            <input type="number" name="endYear" [(ngModel)]="projModel.endYear" placeholder="End year" />
            <button type="submit" [disabled]="!projForm.valid" class="btn-secondary">Add project</button>
          </form>
        </section>

        <!-- Links -->
        <section class="card">
          <h2>Public links</h2>
          <ul class="entry-list">
            <li *ngFor="let l of p.links">
              <a *ngIf="l.label; else bareLink" [href]="l.url" target="_blank" rel="noopener">{{ l.label }}</a>
              <ng-template #bareLink><a [href]="l.url" target="_blank" rel="noopener">{{ l.url }}</a></ng-template>
              <button (click)="removeLink(l)" class="btn-link">remove</button>
            </li>
            <li *ngIf="p.links.length === 0" class="empty">No links.</li>
          </ul>
          <form (ngSubmit)="addLink()" class="inline-form" #linkForm="ngForm">
            <input name="label" [(ngModel)]="linkModel.label" placeholder="Label (optional)" />
            <input name="url" [(ngModel)]="linkModel.url" placeholder="https://…" required />
            <button type="submit" [disabled]="!linkForm.valid" class="btn-secondary">Add link</button>
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
    .btn-link { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; margin-left: 0.5rem; }
    .loading { text-align: center; padding: 2rem; color: #6b7280; }
  `]
})
export class Portfolio implements OnInit {
  protected readonly state = inject(PortfolioStateService);

  /** Local UI state: which employee's portfolio is being viewed. */
  protected readonly employeeId = signal('1');

  /** Read-only view of the service's portfolio signal. */
  protected readonly portfolio = computed(() => this.state.portfolio());

  // ATSE1-35: per-form local models. The original code declared
  // skillFormModel/eduFormModel/projFormModel/linkFormModel fields but
  // never bound the template inputs to them (the inputs used bare
  // `ngModel` with no two-way binding), so submit was always a no-op.
  // Each form now owns a signal-backed model; the template uses
  // `[(ngModel)]="<model>.<field>"`, so the model IS the source of
  // truth read by addX(). After a successful submit the model is
  // reset to its initial empty values, which clears the inputs via
  // the same two-way binding.
  protected skillModel: { skill: string; years: number | null; projectCount: number | null } = {
    skill: '',
    years: null,
    projectCount: null
  };
  protected eduModel: { institution: string; qualification: string; startYear: number | null; endYear: number | null } = {
    institution: '',
    qualification: '',
    startYear: null,
    endYear: null
  };
  protected projModel: { name: string; description: string; startYear: number | null; endYear: number | null } = {
    name: '',
    description: '',
    startYear: null,
    endYear: null
  };
  protected linkModel: { label: string; url: string } = {
    label: '',
    url: ''
  };

  // ATSE1-35: @ViewChild on the form so we can read `form.valid` and
  // call `form.resetForm()` after submit.
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

  addSkill(): void {
    const m = this.skillModel;
    if (!this.skillForm || !this.isSkillValid(m)) {
      return;
    }
    this.state.addSkill(this.employeeId(), {
      skill: m.skill,
      years: m.years ?? 0,
      projectCount: m.projectCount ?? 0
    });
    this.skillModel = { skill: '', years: null, projectCount: null };
    this.skillForm.resetForm();
  }

  /** Mirrors the `required` attribute on the skill name input. */
  private isSkillValid(m: { skill: string }): boolean {
    return m.skill.trim().length > 0;
  }

  removeSkill(s: SkillEntry): void {
    this.state.removeSkill(this.employeeId(), s.id);
  }

  addEducation(): void {
    const form = this.eduForm;
    if (!form || !form.valid) {
      return;
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
  }

  removeEducation(e: EducationEntry): void {
    this.state.removeEducation(this.employeeId(), e.id);
  }

  addProject(): void {
    const form = this.projForm;
    if (!form || !form.valid) {
      return;
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
  }

  removeProject(pr: ProjectEntry): void {
    this.state.removeProject(this.employeeId(), pr.id);
  }

  addLink(): void {
    const m = this.linkModel;
    if (!this.linkForm || !this.isLinkValid(m)) {
      return;
    }
    this.state.addLink(this.employeeId(), { label: m.label || undefined, url: m.url });
    this.linkModel = { label: '', url: '' };
    this.linkForm.resetForm();
  }

  /** Mirrors the `required` attribute on the link url input. */
  private isLinkValid(m: { url: string }): boolean {
    return m.url.trim().length > 0;
  }

  removeLink(l: LinkEntry): void {
    this.state.removeLink(this.employeeId(), l.id);
  }
}