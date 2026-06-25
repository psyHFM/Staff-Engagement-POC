import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="employee-page">
      <h1>Employee Management</h1>
      <p>Welcome to the Employee feature (Phase 1). This is a placeholder for the full implementation.</p>
    </div>
  `,
  styles: [`
    .employee-page { padding: 2rem; }
  `]
})
export class Employee {}
