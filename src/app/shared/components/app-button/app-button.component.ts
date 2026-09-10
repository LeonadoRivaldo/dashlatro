import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppButtonBase } from './app-button.base';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.scss'
})
export class AppButtonComponent extends AppButtonBase {}
