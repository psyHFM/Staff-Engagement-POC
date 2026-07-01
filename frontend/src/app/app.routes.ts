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
    path: 'employees',
    loadComponent: () => import('./features/employee/employee').then((m) => m.Employee),
    canActivate: [authGuard]
  },
  {
    path: 'tasks',
    loadComponent: () => import('./features/task/task').then((m) => m.Task),
    canActivate: [authGuard]
  },
  // frontend-redesign task 4.7: the standalone portfolio page is removed;
  // portfolio editing now lives on the Profile page behind Edit mode. Old
  // /portfolio deep links redirect to the user's own Profile (/profile).
  { path: 'portfolio', redirectTo: 'profile', pathMatch: 'full' },
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
  // ATSE1-48: Deep-linkable skill detail route — same component, reads :name param
  {
    path: 'skills/:name',
    loadComponent: () => import('./features/skills/skills-page').then((m) => m.SkillsPage),
    canActivate: [authGuard]
  },
  {
    path: 'employees/:id/profile',
    loadComponent: () => import('./profile/profile-page').then((m) => m.ProfilePage),
    canActivate: [authGuard]
  },
  // Self-service destination — folded into the Profile page (frontend-redesign
  // task 4.6). ProfilePage resolves the current user's id from the JWT when no
  // route id is present; identity editing happens in the page's Edit mode.
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile-page').then((m) => m.ProfilePage),
    canActivate: [authGuard]
  }
];
