import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NgForm } from '@angular/forms';

import { AuthState } from '../../shared/auth/auth-state';
import { Portfolio } from './portfolio';
import { Portfolio as PortfolioModel, emptyPortfolio } from './portfolio.model';

type ComponentApi = {
  addSkill: () => boolean;
  removeSkill: (s: { id: string }) => void;
  addEducation: () => boolean;
  removeEducation: (e: { id: string }) => void;
  addProject: () => boolean;
  removeProject: (p: { id: string }) => void;
  addLink: () => boolean;
  removeLink: (l: { id: string }) => void;
  isReadOnly: () => boolean;
  saveAndClose: (section: 'skills' | 'education' | 'projects' | 'links') => void;
  reopen: (section: 'skills' | 'education' | 'projects' | 'links') => void;
  isClosed: (section: 'skills' | 'education' | 'projects' | 'links') => boolean;
  skillModel: { skill: string; years: number | null; projectCount: number | null };
  eduModel: { institution: string; qualification: string; startYear: number | null; endYear: number | null };
  projModel: { name: string; description: string; startYear: number | null; endYear: number | null };
  linkModel: { label: string; url: string };
};

const OWNER_EMAIL = 'owner@staff.eng';
const OTHER_EMAIL = 'other@staff.eng';

/**
 * Build a non-admin bearer JWT — payload encoded as base64url — so the
 * `isAdminToken` helper returns `false` and the owner check is exercised.
 * (The token does not need to be valid for the HttpTestingController; it
 * only feeds the JWT claim helper.)
 */
const nonAdminToken = `header.${btoa(JSON.stringify({ sub: OTHER_EMAIL, roles: ['EMPLOYEE'] }))}.signature`;

describe('Portfolio (editor)', () => {
  let httpMock: HttpTestingController;

  const configureAuth = (overrides: Partial<{ currentUser: string | null; bearerToken: string | null }> = {}) => {
    const authSpy = {
      // Default: the caller is the owner of the test portfolio, so the RBAC
      // guard is satisfied. Individual tests override this to exercise the
      // non-owner / no-auth / admin paths.
      currentUser: jest.fn(() => overrides.currentUser ?? OWNER_EMAIL),
      bearerToken: jest.fn(() => overrides.bearerToken ?? null)
    };
    TestBed.configureTestingModule({
      imports: [Portfolio],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthState, useValue: authSpy as unknown as AuthState }
      ]
    });
    return authSpy;
  };

  beforeEach(() => {
    configureAuth();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /**
   * Creates the component and flushes the ngOnInit GET with a portfolio whose
   * {@code ownerEmail} matches the supplied caller (defaults to OWNER_EMAIL).
   * The component reads the response and re-renders.
   */
  const mount = (ownerEmail: string | undefined = OWNER_EMAIL): { fixture: ReturnType<typeof TestBed.createComponent<Portfolio>>; api: ComponentApi } => {
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    const portfolio: PortfolioModel = { ...emptyPortfolio('1'), ownerEmail };
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush(portfolio);
    fixture.detectChanges();
    return { fixture, api: fixture.componentInstance as unknown as ComponentApi };
  };

  it('loads the portfolio for the default employee on init and renders its skills', () => {
    // Given — the component loads employee 1's portfolio on init
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    const portfolio: PortfolioModel = {
      employeeId: '1',
      ownerEmail: OWNER_EMAIL,
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
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush({ ...emptyPortfolio('1'), ownerEmail: OWNER_EMAIL });

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

  // ---- ATSE1-39: owner-or-admin RBAC gate ----

  it('isReadOnly is false when the caller is the owner', () => {
    TestBed.resetTestingModule();
    configureAuth({ currentUser: OWNER_EMAIL });
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush({ ...emptyPortfolio('1'), ownerEmail: OWNER_EMAIL });
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as ComponentApi).isReadOnly()).toBe(false);
  });

  it('isReadOnly is true for a non-owner non-admin viewer and renders the read-only banner', () => {
    TestBed.resetTestingModule();
    configureAuth({ currentUser: OTHER_EMAIL, bearerToken: nonAdminToken });
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush({ ...emptyPortfolio('1'), ownerEmail: OWNER_EMAIL });
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as ComponentApi).isReadOnly()).toBe(true);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('only');
    expect(text).toContain(OWNER_EMAIL);
    expect(text).toContain('or an admin can edit it');
  });

  it('isReadOnly is true when the payload omits ownerEmail (defense in depth)', () => {
    // Given — explicitly drop the ownerEmail field by serializing through JSON
    // (mirrors what the backend would do if the field is absent).
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush(JSON.parse(JSON.stringify(emptyPortfolio('1'))));
    fixture.detectChanges();

    // Then
    expect((fixture.componentInstance as unknown as ComponentApi).isReadOnly()).toBe(true);
  });

  it('isReadOnly is false when the caller has the ADMIN role', () => {
    TestBed.resetTestingModule();
    const adminToken = `header.${btoa(JSON.stringify({ sub: 'admin@staff.eng', roles: ['ADMIN'] }))}.signature`;
    configureAuth({ currentUser: 'admin@staff.eng', bearerToken: adminToken });
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush({ ...emptyPortfolio('1'), ownerEmail: OWNER_EMAIL });
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as ComponentApi).isReadOnly()).toBe(false);
  });

  it('non-owner non-admin cannot dispatch a POST through addSkill', () => {
    TestBed.resetTestingModule();
    configureAuth({ currentUser: OTHER_EMAIL, bearerToken: nonAdminToken });
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush({ ...emptyPortfolio('1'), ownerEmail: OWNER_EMAIL });
    fixture.detectChanges();

    const c = fixture.componentInstance as unknown as ComponentApi;
    c.skillModel.skill = 'Java';
    c.skillModel.years = 3;
    c.skillModel.projectCount = 1;

    c.addSkill();

    // No POST request should be issued — the guard blocks it.
    httpMock.expectNone('/api/v1/employees/1/portfolio/skills');
  });

  // ---- ATSE1-36: "Save & close" button collapses the form ----

  it('Save & close dispatches the same POST as Add another and hides the form', () => {
    // Given
    const { fixture, api } = mount();
    api.skillModel.skill = 'TypeScript';
    api.skillModel.years = 4;
    api.skillModel.projectCount = 2;
    fixture.detectChanges();

    // When — Save & close on the skills section
    api.saveAndClose('skills');

    // Then — same POST goes out
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/skills');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ skill: 'TypeScript', years: 4, projectCount: 2 });

    // And no further HTTP traffic is pending — httpMock.verify() (afterEach) will catch
    // any leaked requests.
  });

  it('Save & close marks the section closed so the form is hidden until reopened', () => {
    // Given
    const { fixture, api } = mount();
    api.skillModel.skill = 'TypeScript';
    api.skillModel.years = 4;
    api.skillModel.projectCount = 2;
    fixture.detectChanges();

    // When
    api.saveAndClose('skills');
    httpMock.expectOne('/api/v1/employees/1/portfolio/skills').flush({ id: '1', skill: 'TypeScript', years: 4, projectCount: 2 });
    fixture.detectChanges();

    // Then
    expect(api.isClosed('skills')).toBe(true);
  });

  it('Save & close is a no-op when the viewer is read-only', () => {
    TestBed.resetTestingModule();
    configureAuth({ currentUser: OTHER_EMAIL, bearerToken: nonAdminToken });
    httpMock = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush({ ...emptyPortfolio('1'), ownerEmail: OWNER_EMAIL });
    fixture.detectChanges();

    const c = fixture.componentInstance as unknown as ComponentApi;
    c.linkModel.url = 'https://example.com';

    c.saveAndClose('links');

    httpMock.expectNone('/api/v1/employees/1/portfolio/links');
    expect(c.isClosed('links')).toBe(false);
  });
});
