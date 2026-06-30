import { Component } from '@angular/core';

import { Shell } from './shell/shell';
import { ToastComponent } from './shared/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [Shell, ToastComponent],
  templateUrl: './app.html'
})
export class App {}