import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIconComponent } from '../shared/ui/icon/app-icon.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, AppIconComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css',
})
export class NotFoundComponent {}
