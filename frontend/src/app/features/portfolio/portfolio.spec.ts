import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';

import { Portfolio } from './portfolio';
import { Portfolio as PortfolioModel, emptyPortfolio } from './portfolio.model';

type ComponentApi = {
  addSkill: () => void;
  removeSkill: (s: { id: string }) => void;
  addEducation: () => void;
  removeEducation: (e: { id: string }) => void;
  addProject: () => void;
  removeProject: (p: { id: string }) => void;
  addLink: () => void;
  removeLink: (l: { id: string }) => void;
  skillModel: { skill: string; years: number | null; projectCount: number | null };
  eduModel: { institution: string; qualification: string; startYear: number | null; endYear: number | null };
  projModel: { name: string; description: string; startYear: number | null; endYear: number | null };
  linkModel: { label: string; url: string };
};

describe('Portfolio (editor) — ATSE1-35', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Portfolio],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Creates the component and flushes the ngOnInit GET with an empty portfolio. */
  const mount = (): { fixture: ReturnType<typeof TestBed.createComponent<Portfolio>>; api: ComponentApi } => {
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush(emptyPortfolio('1'));
    fixture.detectChanges();
    return { fixture, api: fixture.componentInstance as unknown as ComponentApi };
  };

  it('loads the portfolio for the default employee on init and renders its skills', () => {
    // Given — the component loads employee 1's portfolio on init
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    const portfolio: PortfolioModel = {
      employeeId: '1',
      skills: [{ id: '1', skill: 'Angular', years: 5, projectCount: 9 }],
      education: [{ id: '2', institution: 'Uni' }],
      projects: [{ id: '3', name: 'Portal' }],
      links: [{ id: '4', url: 'https://gh' }]
    };
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush(portfolio);

    // When
    fixture.detectChanges();

    // Then — each section is rendered
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Angular');
    expect(text).toContain('5 yrs');
    expect(text).toContain('Uni');
    expect(text).toContain('Portal');
    expect(text).toContain('https://gh');
  });

  it('shows the empty placeholders when the portfolio has no entries', () => {
    // Given
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush(emptyPortfolio('1'));

    // When
    fixture.detectChanges();

    // Then
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No skills yet.');
    expect(text).toContain('No education entries.');
  });

  // ---- Form → entry mapping (component-owned logic; dispatched to the state service) ----

  it('addSkill maps the skill model to {skill, years, projectCount}, coercing blanks to 0', () => {
    // Given — populate the per-form model directly
    const { fixture, api } = mount();
    api.skillModel.skill = 'Java';
    api.skillModel.years = 3;
    api.skillModel.projectCount = 2;
    fixture.detectChanges();

    // When
    api.addSkill();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/skills');

    // Then
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ skill: 'Java', years: 3, projectCount: 2 });
  });

  it('addSkill sends 0 for null years and projectCount', () => {
    // Given — numbers left null
    const { fixture, api } = mount();
    api.skillModel.skill = 'Rust';
    api.skillModel.years = null;
    api.skillModel.projectCount = null;
    fixture.detectChanges();

    // When
    api.addSkill();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/skills');

    // Then — null coerces to 0
    expect(post.request.body).toEqual({ skill: 'Rust', years: 0, projectCount: 0 });
  });

  it('addSkill resets the form model and clears the inputs after a successful submit', () => {
    // Given — populate, submit, then assert the model + DOM inputs are reset
    const { fixture, api } = mount();
    api.skillModel.skill = 'Go';
    api.skillModel.years = 2;
    api.skillModel.projectCount = 1;
    fixture.detectChanges();

    // When
    api.addSkill();
    httpMock.expectOne('/api/v1/employees/1/portfolio/skills');
    fixture.detectChanges();

    // Then — the model is reset to the empty initial values
    expect(api.skillModel.skill).toBe('');
    expect(api.skillModel.years).toBeNull();
    expect(api.skillModel.projectCount).toBeNull();

    // And the DOM inputs reflect those values
    const skillForm = fixture.debugElement.query(By.directive(NgForm));
    const inputs = skillForm.queryAll(By.css('input'));
    expect((inputs[0].nativeElement as HTMLInputElement).value).toBe('');
    expect((inputs[1].nativeElement as HTMLInputElement).value).toBe('');
    expect((inputs[2].nativeElement as HTMLInputElement).value).toBe('');
  });

  it('addSkill is a no-op when the form is invalid (missing required skill)', () => {
    // Given — skill left blank; required validator fails
    const { fixture, api } = mount();
    api.skillModel.years = 2;
    fixture.detectChanges();

    // When
    api.addSkill();

    // Then — no POST issued
    httpMock.expectNone('/api/v1/employees/1/portfolio/skills');
  });

  it('addEducation maps the model, dropping blank optional fields to undefined', () => {
    // Given — only the required institution is set
    const { fixture, api } = mount();
    api.eduModel.institution = 'Uni';
    api.eduModel.qualification = '';
    api.eduModel.startYear = null;
    api.eduModel.endYear = null;
    fixture.detectChanges();

    // When
    api.addEducation();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/education');

    // Then — blank qualification → undefined; null years → undefined
    expect(post.request.body).toEqual({ institution: 'Uni', qualification: undefined, startYear: undefined, endYear: undefined });
  });

  it('addEducation passes through numeric years and an optional qualification', () => {
    // Given
    const { fixture, api } = mount();
    api.eduModel.institution = 'Uni';
    api.eduModel.qualification = 'BSc';
    api.eduModel.startYear = 2018;
    api.eduModel.endYear = 2021;
    fixture.detectChanges();

    // When
    api.addEducation();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/education');

    // Then
    expect(post.request.body).toEqual({ institution: 'Uni', qualification: 'BSc', startYear: 2018, endYear: 2021 });
  });

  it('addProject maps name/description/years, dropping a blank description to undefined', () => {
    // Given
    const { fixture, api } = mount();
    api.projModel.name = 'Portal';
    api.projModel.description = '';
    api.projModel.startYear = 2020;
    api.projModel.endYear = null;
    fixture.detectChanges();

    // When
    api.addProject();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/projects');

    // Then
    expect(post.request.body).toEqual({ name: 'Portal', description: undefined, startYear: 2020, endYear: undefined });
  });

  it('addLink maps label/url, dropping a blank label to undefined', () => {
    // Given
    const { fixture, api } = mount();
    api.linkModel.label = '';
    api.linkModel.url = 'https://gh';
    fixture.detectChanges();

    // When
    api.addLink();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/links');

    // Then — blank label → undefined; url always sent
    expect(post.request.body).toEqual({ label: undefined, url: 'https://gh' });
  });

  it('addLink passes through a non-blank label', () => {
    // Given
    const { fixture, api } = mount();
    api.linkModel.label = 'GitHub';
    api.linkModel.url = 'https://gh';
    fixture.detectChanges();

    // When
    api.addLink();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/links');

    // Then
    expect(post.request.body).toEqual({ label: 'GitHub', url: 'https://gh' });
  });

  it('addLink is a no-op when url is blank (required field missing)', () => {
    // Given
    const { fixture, api } = mount();
    api.linkModel.label = 'GitHub';
    api.linkModel.url = '';
    fixture.detectChanges();

    // When
    api.addLink();

    // Then — no POST issued (form invalid because url is required)
    httpMock.expectNone('/api/v1/employees/1/portfolio/links');
  });

  // ---- Remove dispatch (DELETE to the correct sub-resource URL) ----

  it('removeSkill dispatches DELETE /skills/{id}', () => {
    // Given
    const { api } = mount();

    // When
    api.removeSkill({ id: '7' });
    const del = httpMock.expectOne('/api/v1/employees/1/portfolio/skills/7');

    // Then
    expect(del.request.method).toBe('DELETE');
  });

  it('removeEducation dispatches DELETE /education/{id}', () => {
    const { api } = mount();
    api.removeEducation({ id: '8' });
    expect(httpMock.expectOne('/api/v1/employees/1/portfolio/education/8').request.method).toBe('DELETE');
  });

  it('removeProject dispatches DELETE /projects/{id}', () => {
    const { api } = mount();
    api.removeProject({ id: '9' });
    expect(httpMock.expectOne('/api/v1/employees/1/portfolio/projects/9').request.method).toBe('DELETE');
  });

  it('removeLink dispatches DELETE /links/{id}', () => {
    const { api } = mount();
    api.removeLink({ id: '10' });
    expect(httpMock.expectOne('/api/v1/employees/1/portfolio/links/10').request.method).toBe('DELETE');
  });
});