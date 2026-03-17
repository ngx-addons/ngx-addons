import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Type,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { LoaderOverlayDirective } from '../loader/loader-overlay.directive';
import { OMNI_AUTH_ICON_COMPONENT } from '../icon-template.token';

@Component({
  selector: 'omni-auth-ui-mat-button',
  standalone: true,
  imports: [CommonModule, MatButton, LoaderOverlayDirective],
  templateUrl: './button.component.html',
  styleUrl: 'button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.disabled]': 'disabled()' },
})
export class ButtonComponent {
  readonly iconComponent = inject<Type<unknown>>(OMNI_AUTH_ICON_COMPONENT, { optional: true });
  readonly buttonType = input<'submit' | 'reset' | 'button'>('button');
  readonly type = input<'primary' | 'secondary'>('primary');
  readonly icon = input<string>();
  readonly iconOnly = input(false);
  readonly loading = input(false);
  readonly disabled = input(false);
}
