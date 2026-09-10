import { Component, computed, input, model, Signal, signal } from '@angular/core';
import { AppButtonBase, ButtonVariant } from './app-button.base';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

type ToggleBtnState = {
  type?: ButtonVariant
  state: 'on' | 'off',
  label: string;
};

@Component({
  selector: 'app-toggle-button',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './app-button.component.html',
  styleUrl: './app-button.component.scss',
  host:{
    '(click)': 'toggleState()'
  }
})
export class AppToggleButtonComponent extends AppButtonBase{
  private readonly _defaultStates = signal<ToggleBtnState[]>([
    {
      state: 'on',
      type: 'success',
      label: "On"
    },
    {
      state: 'off',
      type: 'danger',
      label: "Off"
    }
  ]);

  readonly states = input<ToggleBtnState[]>(this._defaultStates());
  readonly state = model<boolean>(false);

  override readonly variant = computed(()=> {
    return (this.currentState.type ?? this.inputVariant()) || 'primary';
  });

  override readonly label = computed(()=> {
    return this.inputLabel() || this.currentState.label;
  });

  public get currentState(){
    const state = this.state();
    const onState = { ...this._defaultStates()[0], ...this.states().find((s)=> s.state === 'on') };
    const offState = { ...this._defaultStates()[1], ...this.states().find((s)=> s.state === 'off') };
    return (state ? onState : offState) as ToggleBtnState;
  }


  toggleState(){
    this.state.set(!this.state());
  }
}
