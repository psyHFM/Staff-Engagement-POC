import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { EmployeeList, PageRequest } from './employee-list';
import { EmployeeResponse, Paged } from '../employee.types';

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let component: EmployeeList;

  const employee = (id: number): EmployeeResponse => ({
    id: { value: id },
    fullName: `Jane ${id}`,
    email: `jane${id}@staff.eng`,
    role: 'employee',
    jobTitle: 'Eng',
    department: 'Platform',
    level: 'senior'
  });

  const page = (overrides: Partial<Paged<EmployeeResponse>> = {}): Paged<EmployeeResponse> => ({
    content: [employee(1), employee(2)],
    offset: 0,
    limit: 20,
    total: 2,
    ...overrides
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('directory', page());
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('sort', 'createdAt,desc');
  });

  it('renders the employee rows', () => {
    // When
    fixture.detectChanges();

    // Then
    const items = fixture.nativeElement.querySelectorAll('.employee-list__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Jane 1');
  });

  it('shows an empty state when there are no employees', () => {
    // Given
    fixture.componentRef.setInput('directory', { content: [], offset: 0, limit: 20, total: 0 });

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.employee-list__empty')).toBeTruthy();
  });

  it('disables the Previous button on the first page', () => {
    // When
    fixture.detectChanges();

    // Then
    const previousBtn = fixture.nativeElement.querySelectorAll('.employee-list__page-btn')[0];
    expect(previousBtn.disabled).toBe(true);
  });

  it('disables the Next button on the last page', () => {
    // Given
    fixture.componentRef.setInput('directory', page({ offset: 0, limit: 20, total: 2 }));

    // When
    fixture.detectChanges();

    // Then
    const nextBtn = fixture.nativeElement.querySelectorAll('.employee-list__page-btn')[1];
    expect(nextBtn.disabled).toBe(true);
  });

  it('emits a page request when Next is clicked', () => {
    // Given
    fixture.componentRef.setInput('directory', page({ offset: 0, limit: 20, total: 50 }));
    fixture.detectChanges();
    const emitted: PageRequest[] = [];
    component.pageRequested.subscribe((req) => emitted.push(req));

    // When
    component.next();

    // Then
    expect(emitted).toEqual([{ offset: 20, limit: 20 }]);
  });

  it('emits a page request when Previous is clicked', () => {
    // Given
    fixture.componentRef.setInput('directory', page({ offset: 20, limit: 20, total: 50 }));
    fixture.detectChanges();
    const emitted: PageRequest[] = [];
    component.pageRequested.subscribe((req) => emitted.push(req));

    // When
    component.previous();

    // Then
    expect(emitted).toEqual([{ offset: 0, limit: 20 }]);
  });

  it('emits a sort request when the sort dropdown changes', () => {
    // Given
    const emitted: string[] = [];
    component.sortRequested.subscribe((sort) => emitted.push(sort));

    // When
    component.onSortChange({ target: { value: 'fullName,asc' } } as unknown as Event);

    // Then
    expect(emitted).toEqual(['fullName,asc']);
  });

  it('renders a Profile link for each employee', () => {
    // When
    fixture.detectChanges();

    // Then
    const links = fixture.nativeElement.querySelectorAll('.employee-list__profile');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/employees/1/profile');
    expect(links[0].textContent).toContain('Profile');
  });

  it('emits the selected employee when a row is clicked', () => {
    // Given
    const emitted: EmployeeResponse[] = [];
    component.selected.subscribe((e) => emitted.push(e));

    // When
    component.selected.emit(employee(1));

    // Then
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id.value).toBe(1);
  });
});