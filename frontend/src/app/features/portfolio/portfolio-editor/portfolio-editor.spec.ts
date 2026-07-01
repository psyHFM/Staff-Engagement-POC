import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PortfolioEditor } from './portfolio-editor';
import { PortfolioStateService } from '../portfolio-state.service';
import { AuthState } from '../../../shared/auth/auth-state';
import { Portfolio } from '../portfolio.model';

describe('PortfolioEditor', () => {
  let fixture: ComponentFixture<PortfolioEditor>;

  let fakeState: {
    portfolio: ReturnType<typeof signal<Portfolio | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    addSkill: jest.Mock;
    removeSkill: jest.Mock;
    addEducation: jest.Mock;
    removeEducation: jest.Mock;
    addProject: jest.Mock;
    removeProject: jest.Mock;
    addLink: jest.Mock;
    removeLink: jest.Mock;
  };

  let fakeAuth: {
    currentUser: ReturnType<typeof signal<string | null>>;
    bearerToken: ReturnType<typeof signal<string | null>>;
  };

  const portfolio = (): Portfolio => ({
    employeeId: '7',
    ownerEmail: 'jane@staff.eng',
    skills: [{ id: 's1', skill: 'Angular', years: 4, projectCount: 3 }],
    education: [],
    projects: [],
    links: []
  });

  const setup = async (readOnly: boolean, owner = 'jane@staff.eng', caller: string | null = 'jane@staff.eng') => {
    fakeState = {
      portfolio: signal<Portfolio | null>({ ...portfolio(), ownerEmail: owner }),
      loading: signal(false),
      addSkill: jest.fn(),
      removeSkill: jest.fn(),
      addEducation: jest.fn(),
      removeEducation: jest.fn(),
      addProject: jest.fn(),
      removeProject: jest.fn(),
      addLink: jest.fn(),
      removeLink: jest.fn()
    };
    fakeAuth = {
      currentUser: signal<string | null>(caller),
      bearerToken: signal<string | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [PortfolioEditor],
      providers: [
        { provide: PortfolioStateService, useValue: fakeState },
        { provide: AuthState, useValue: fakeAuth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioEditor);
    fixture.componentRef.setInput('employeeId', '7');
    fixture.componentRef.setInput('readOnly', readOnly);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders portfolio entries read-only with no forms or remove buttons when readOnly', async () => {
    // When
    const el = await setup(true);

    // Then
    expect(el.textContent).toContain('Angular');
    expect(el.querySelector('.pe__form')).toBeFalsy();
    expect(el.querySelector('.pe__remove')).toBeFalsy();
  });

  it('shows add forms and remove buttons when editable', async () => {
    // When
    const el = await setup(false);

    // Then
    expect(el.querySelector('.pe__form')).toBeTruthy();
    expect(el.querySelector('.pe__remove')).toBeTruthy();
  });

  it('stays read-only for a non-owner, non-admin viewer even when readOnly=false (RBAC backstop)', async () => {
    // When — caller is not the owner and holds no admin token
    const el = await setup(false, 'someone-else@staff.eng', 'jane@staff.eng');

    // Then
    expect(el.querySelector('.pe__form')).toBeFalsy();
    expect(el.querySelector('.pe__remove')).toBeFalsy();
  });

  it('dispatches removeSkill with the employee id and entry id on Remove', async () => {
    // Given
    const el = await setup(false);

    // When
    (el.querySelector('.pe__remove') as HTMLButtonElement).click();

    // Then
    expect(fakeState.removeSkill).toHaveBeenCalledWith('7', 's1');
  });

  it('dispatches addSkill with the entered values on submit', async () => {
    // Given
    const el = await setup(false);
    const skillInput = el.querySelector('input[name="skill"]') as HTMLInputElement;
    skillInput.value = 'Rust';
    skillInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // When — submit the skills form
    (skillInput.closest('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

    // Then
    expect(fakeState.addSkill).toHaveBeenCalledWith('7', { skill: 'Rust', years: 0, projectCount: 0 });
  });
});
