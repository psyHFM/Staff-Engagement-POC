import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

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
  skillFormModel: { skill: string; years: string; projectCount: string };
  eduFormModel: { institution: string; qualification: string; startYear: string; endYear: string };
  projFormModel: { name: string; description: string; startYear: string; endYear: string };
  linkFormModel: { label: string; url: string };
};

describe('Portfolio (editor)', () => {
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
  const mount = (): ComponentApi => {
    const fixture = TestBed.createComponent(Portfolio);
    fixture.detectChanges();
    httpMock.expectOne('/api/v1/employees/1/portfolio').flush(emptyPortfolio('1'));
    fixture.detectChanges();
    return fixture.componentInstance as unknown as ComponentApi;
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

  it('addSkill maps the skill form to {skill, years, projectCount}, coercing blanks to 0', () => {
    // Given
    const c = mount();
    c.skillFormModel.skill = 'Java';
    c.skillFormModel.years = '3';
    c.skillFormModel.projectCount = '2';

    // When
    c.addSkill();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/skills');

    // Then
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ skill: 'Java', years: 3, projectCount: 2 });
  });

  it('addSkill sends 0 for empty/NaN years and projectCount', () => {
    // Given — years left blank, projectCount non-numeric
    const c = mount();
    c.skillFormModel.skill = 'Rust';
    c.skillFormModel.years = '';
    c.skillFormModel.projectCount = 'abc';

    // When
    c.addSkill();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/skills');

    // Then — blanks/NaN coerce to 0 via num() ?? 0
    expect(post.request.body).toEqual({ skill: 'Rust', years: 0, projectCount: 0 });
  });

  it('addEducation maps the form, dropping blank optional fields to undefined', () => {
    // Given — only the required institution is set
    const c = mount();
    c.eduFormModel.institution = 'Uni';
    c.eduFormModel.qualification = '';
    c.eduFormModel.startYear = '';
    c.eduFormModel.endYear = '';

    // When
    c.addEducation();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/education');

    // Then — blank qualification → undefined; blank years → undefined
    expect(post.request.body).toEqual({ institution: 'Uni', qualification: undefined, startYear: undefined, endYear: undefined });
  });

  it('addEducation passes through numeric years and an optional qualification', () => {
    // Given
    const c = mount();
    c.eduFormModel.institution = 'Uni';
    c.eduFormModel.qualification = 'BSc';
    c.eduFormModel.startYear = '2018';
    c.eduFormModel.endYear = '2021';

    // When
    c.addEducation();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/education');

    // Then
    expect(post.request.body).toEqual({ institution: 'Uni', qualification: 'BSc', startYear: 2018, endYear: 2021 });
  });

  it('addProject maps name/description/years, dropping a blank description to undefined', () => {
    // Given
    const c = mount();
    c.projFormModel.name = 'Portal';
    c.projFormModel.description = '';
    c.projFormModel.startYear = '2020';
    c.projFormModel.endYear = '';

    // When
    c.addProject();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/projects');

    // Then
    expect(post.request.body).toEqual({ name: 'Portal', description: undefined, startYear: 2020, endYear: undefined });
  });

  it('addLink maps label/url, dropping a blank label to undefined', () => {
    // Given
    const c = mount();
    c.linkFormModel.label = '';
    c.linkFormModel.url = 'https://gh';

    // When
    c.addLink();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/links');

    // Then — blank label → undefined; url always sent
    expect(post.request.body).toEqual({ label: undefined, url: 'https://gh' });
  });

  it('addLink passes through a non-blank label', () => {
    // Given
    const c = mount();
    c.linkFormModel.label = 'GitHub';
    c.linkFormModel.url = 'https://gh';

    // When
    c.addLink();
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/links');

    // Then
    expect(post.request.body).toEqual({ label: 'GitHub', url: 'https://gh' });
  });

  // ---- Remove dispatch (DELETE to the correct sub-resource URL) ----

  it('removeSkill dispatches DELETE /skills/{id}', () => {
    // Given
    const c = mount();

    // When
    c.removeSkill({ id: '7' });
    const del = httpMock.expectOne('/api/v1/employees/1/portfolio/skills/7');

    // Then
    expect(del.request.method).toBe('DELETE');
  });

  it('removeEducation dispatches DELETE /education/{id}', () => {
    const c = mount();
    c.removeEducation({ id: '8' });
    expect(httpMock.expectOne('/api/v1/employees/1/portfolio/education/8').request.method).toBe('DELETE');
  });

  it('removeProject dispatches DELETE /projects/{id}', () => {
    const c = mount();
    c.removeProject({ id: '9' });
    expect(httpMock.expectOne('/api/v1/employees/1/portfolio/projects/9').request.method).toBe('DELETE');
  });

  it('removeLink dispatches DELETE /links/{id}', () => {
    const c = mount();
    c.removeLink({ id: '10' });
    expect(httpMock.expectOne('/api/v1/employees/1/portfolio/links/10').request.method).toBe('DELETE');
  });
});