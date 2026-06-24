import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { PortfolioStateService } from './portfolio-state.service';
import { Portfolio, SkillEntry, EducationEntry, ProjectEntry, LinkEntry, emptyPortfolio } from './portfolio.model';

describe('PortfolioStateService', () => {
  let service: PortfolioStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PortfolioStateService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PortfolioStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const skill = (overrides: Partial<SkillEntry> = {}): SkillEntry => ({
    id: '1', skill: 'Angular', years: 5, projectCount: 9, ...overrides
  });

  /** Loads a portfolio and flushes it so the service holds it in the signal. */
  const givenLoaded = (p: Portfolio): void => {
    service.loadPortfolio(p.employeeId);
    httpMock.expectOne(`/api/v1/employees/${p.employeeId}/portfolio`).flush(p);
  };

  const flushError = (url: string): void => {
    httpMock.expectOne(url).flush('boom', { status: 500, statusText: 'Server Error' });
  };

  const base = (employeeId: string): string => `employees/${employeeId}/portfolio`;

  it('loads a portfolio from GET /api/v1/employees/{id}/portfolio and exposes it via the portfolio signal', () => {
    // Given
    const p: Portfolio = { employeeId: '1', skills: [skill()], education: [], projects: [], links: [] };
    expect(service.portfolio()).toBeNull();

    // When
    service.loadPortfolio('1');
    const request = httpMock.expectOne('/api/v1/employees/1/portfolio');
    expect(request.request.method).toBe('GET');
    request.flush(p);

    // Then
    expect(service.portfolio()).toEqual(p);
    expect(service.loading()).toBe(false);
  });

  it('adds a skill via POST /employees/{id}/portfolio/skills and appends it to the portfolio signal', () => {
    // Given — an existing portfolio with one skill
    givenLoaded({ employeeId: '1', skills: [skill({ id: '1' })], education: [], projects: [], links: [] });

    // When
    service.addSkill('1', { skill: 'Java', years: 3, projectCount: 2 });
    const post = httpMock.expectOne('/api/v1/employees/1/portfolio/skills');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ skill: 'Java', years: 3, projectCount: 2 });
    post.flush(skill({ id: '2', skill: 'Java', years: 3, projectCount: 2 }));

    // Then
    expect(service.portfolio()!.skills).toHaveLength(2);
    expect(service.portfolio()!.skills[1].skill).toBe('Java');
  });

  it('updates a skill via PUT /employees/{id}/portfolio/skills/{entryId} and replaces only the matching entry', () => {
    // Given — two skills loaded
    givenLoaded({ employeeId: '1', skills: [skill({ id: '1', skill: 'A' }), skill({ id: '2', skill: 'B' })], education: [], projects: [], links: [] });
    const before = service.portfolio()!.skills[1];

    // When
    service.updateSkill('1', { id: '1', skill: 'A-updated', years: 6, projectCount: 10 });
    const put = httpMock.expectOne('/api/v1/employees/1/portfolio/skills/1');
    expect(put.request.method).toBe('PUT');
    put.flush(skill({ id: '1', skill: 'A-updated', years: 6, projectCount: 10 }));

    // Then — the matching skill is replaced; the other is untouched
    expect(service.portfolio()!.skills[0].skill).toBe('A-updated');
    expect(service.portfolio()!.skills[1]).toBe(before);
  });

  it('removes a skill via DELETE and drops only the matching entry, leaving the others', () => {
    // Given — two skills loaded
    givenLoaded({ employeeId: '1', skills: [skill({ id: '1', skill: 'A' }), skill({ id: '2', skill: 'B' })], education: [], projects: [], links: [] });

    // When
    service.removeSkill('1', '1');
    const del = httpMock.expectOne('/api/v1/employees/1/portfolio/skills/1');
    expect(del.request.method).toBe('DELETE');
    del.flush(null);

    // Then — only skill 1 is gone; skill 2 remains
    expect(service.portfolio()!.skills).toHaveLength(1);
    expect(service.portfolio()!.skills[0].id).toBe('2');
  });

  it('adds and removes education, project, and link entries through their sub-resource endpoints', () => {
    // Given — a portfolio with one of each already loaded
    givenLoaded({
      employeeId: '1',
      skills: [],
      education: [{ id: '10', institution: 'OldUni' }, { id: '11', institution: 'KeepUni' }],
      projects: [{ id: '20', name: 'OldProj' }, { id: '21', name: 'KeepProj' }],
      links: [{ id: '30', label: 'Old', url: 'https://old' }, { id: '31', label: 'Keep', url: 'https://keep' }]
    });

    // When — add one of each
    service.addEducation('1', { institution: 'Uni', qualification: 'BSc' });
    httpMock.expectOne('/api/v1/employees/1/portfolio/education').flush({ id: '12', institution: 'Uni', qualification: 'BSc' });
    service.addProject('1', { name: 'Portal', description: 'desc' });
    httpMock.expectOne('/api/v1/employees/1/portfolio/projects').flush({ id: '22', name: 'Portal', description: 'desc' });
    service.addLink('1', { label: 'GitHub', url: 'https://gh' });
    httpMock.expectOne('/api/v1/employees/1/portfolio/links').flush({ id: '32', label: 'GitHub', url: 'https://gh' });

    // Then — each section grew by one
    expect(service.portfolio()!.education).toHaveLength(3);
    expect(service.portfolio()!.projects).toHaveLength(3);
    expect(service.portfolio()!.links).toHaveLength(3);

    // When — remove one of each (the "old" entries), keeping the others
    service.removeEducation('1', '10');
    httpMock.expectOne('/api/v1/employees/1/portfolio/education/10').flush(null);
    service.removeProject('1', '20');
    httpMock.expectOne('/api/v1/employees/1/portfolio/projects/20').flush(null);
    service.removeLink('1', '30');
    httpMock.expectOne('/api/v1/employees/1/portfolio/links/30').flush(null);

    // Then — only the targeted entry is gone; the "keep" entries survive
    expect(service.portfolio()!.education.map(e => e.id)).toEqual(['11', '12']);
    expect(service.portfolio()!.projects.map(p => p.id)).toEqual(['21', '22']);
    expect(service.portfolio()!.links.map(l => l.id)).toEqual(['31', '32']);
  });

  // ---- Error paths: each failing call must log, clear loading, and leave state unchanged ----

  const expectErrorHandling = (label: string, url: string, act: () => void, section: keyof Portfolio): void => {
    it(`${label} logs, clears loading, and leaves the ${String(section)} signal unchanged on failure`, () => {
      // Given — a portfolio with one entry in the section
      const one: Portfolio = emptyPortfolio('1');
      (one[section] as unknown[]).push({ id: '1' } as never);
      givenLoaded(one);
      const before = service.portfolio()![section] as unknown[];
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(service.loading()).toBe(false);

      // When — the operation fails
      act();
      flushError(`/api/v1/${url}`);

      // Then — logged, loading cleared, signal untouched
      expect(errorSpy).toHaveBeenCalled();
      expect(service.loading()).toBe(false);
      expect(service.portfolio()![section] as unknown[]).toBe(before);
      errorSpy.mockRestore();
    });
  };

  expectErrorHandling('loadPortfolio', 'employees/1/portfolio', () => service.loadPortfolio('1'), 'skills');
  expectErrorHandling('addSkill', 'employees/1/portfolio/skills', () => service.addSkill('1', { skill: 'X', years: 1, projectCount: 1 }), 'skills');
  expectErrorHandling('updateSkill', 'employees/1/portfolio/skills/1', () => service.updateSkill('1', { id: '1', skill: 'X', years: 1, projectCount: 1 }), 'skills');
  expectErrorHandling('removeSkill', 'employees/1/portfolio/skills/1', () => service.removeSkill('1', '1'), 'skills');
  expectErrorHandling('addEducation', 'employees/1/portfolio/education', () => service.addEducation('1', { institution: 'X' }), 'education');
  expectErrorHandling('removeEducation', 'employees/1/portfolio/education/1', () => service.removeEducation('1', '1'), 'education');
  expectErrorHandling('addProject', 'employees/1/portfolio/projects', () => service.addProject('1', { name: 'X' }), 'projects');
  expectErrorHandling('removeProject', 'employees/1/portfolio/projects/1', () => service.removeProject('1', '1'), 'projects');
  expectErrorHandling('addLink', 'employees/1/portfolio/links', () => service.addLink('1', { url: 'https://x' }), 'links');
  expectErrorHandling('removeLink', 'employees/1/portfolio/links/1', () => service.removeLink('1', '1'), 'links');
});