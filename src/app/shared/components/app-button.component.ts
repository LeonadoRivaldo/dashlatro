import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'neutral';
type ButtonSize = 'xs' | 'sm' | 'md';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.scss'
})
export class AppButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() lowEmphasis = false;
}
