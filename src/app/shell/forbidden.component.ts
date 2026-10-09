import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '../shared/ui/icon/app-icon.component';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink, AppIconComponent],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.css',
})
export class ForbiddenComponent {}
