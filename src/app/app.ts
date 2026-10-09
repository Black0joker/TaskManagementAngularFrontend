import { Component } from '@angular/core';
import { ShellComponent } from './shell/shell.component';

@Component({
  imports: [ShellComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
