import { Routes } from '@angular/router';

import { authGuard } from './shared/auth/auth.guard';

/**
 * Application routes.
 *
 * Convention (ROADMAP §3): each feature is a single lazy-loaded line. New
 * features append exactly one entry below — never edit existing lines.
 *
 *   { path: 'employees', loadComponent: () => import('./features/employee/employee').then(m => m.Employee), canActivate: [authGuard] },
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', loadComponent: () => import('./shell/login').then((m) => m.Login) },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard]
  },
  {
    path: 'tasks',
    loadComponent: () => import('./features/task/task').then((m) => m.Task),
    canActivate: [authGuard]
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./features/portfolio/portfolio').then((m) => m.Portfolio),
    canActivate: [authGuard]
  },
  {
    path: 'interactions',
    loadComponent: () => import('./features/interaction/interaction-page/interaction-page').then((m) => m.InteractionPage),
    canActivate: [authGuard]
  },
  {
    path: 'skills',
    loadComponent: () => import('./features/skills/skills-page').then((m) => m.SkillsPage),
    canActivate: [authGuard]
  },
  {
    path: 'employees',
    loadComponent: () => import('./features/employee/employee').then((m) => m.Employee),
    canActivate: [authGuard]
  }
  // Phase 1: employees
  // Phase 2: interactions
  // Phase 3: tasks
  // Phase 4: portfolio
  // Phase 5: skills
];
