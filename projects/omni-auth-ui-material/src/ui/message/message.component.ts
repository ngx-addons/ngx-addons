import {ChangeDetectionStrategy, Component, inject, input, Type} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OMNI_AUTH_ICON_COMPONENT} from '../icon-template.token';

export type MessageType = 'info' | 'warn';

@Component({
  selector: 'omni-auth-ui-mat-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message.component.html',
  styleUrl: 'message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MessageComponent {
  readonly iconComponent = inject<Type<unknown>>(OMNI_AUTH_ICON_COMPONENT, { optional: true });
  readonly icon = input<'info' | string>();
  readonly type = input<MessageType>('info');

  get iconBasedOnType() {
    switch (this.type()) {
      case 'info':
        return 'info';
      case 'warn':
        return 'warning';
    }
  }
}
