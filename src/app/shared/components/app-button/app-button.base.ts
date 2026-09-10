import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'neutral';
export type ButtonSize = 'xs' | 'sm' | 'md';

@Directive()
export abstract class AppButtonBase {
  readonly inputLabel = input('', { alias: 'label' });
  readonly inputVariant = input<ButtonVariant | undefined>('primary', { alias: 'variant' });
  readonly inputSize = input<ButtonSize>('md', { alias: 'size' });
  readonly inputType = input<'button' | 'submit' | 'reset'>('button', { alias: 'type' });
  readonly inputDisabled = input(false, { alias: 'disabled' });
  readonly inputFullWidth = input(false, { alias: 'fullWidth' });
  readonly inputLowEmphasis = input(false, { alias: 'lowEmphasis' });

  readonly label = computed(() => this.inputLabel());
  readonly variant = computed<ButtonVariant>(() => this.inputVariant() ?? 'primary');
  readonly size = computed<ButtonSize>(() => this.inputSize());
  readonly type = computed<'button' | 'submit' | 'reset'>(() => this.inputType());
  readonly disabled = computed(() => this.inputDisabled());
  readonly fullWidth = computed(() => this.inputFullWidth());
  readonly lowEmphasis = computed(() => this.inputLowEmphasis());
}