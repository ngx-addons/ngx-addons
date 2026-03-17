import {AfterViewInit, ChangeDetectionStrategy, Component, inject, Injector, input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgControl} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatInputModule} from '@angular/material/input';
import {ErrorStateMatcher} from '@angular/material/core';
import {HostStateMatcher} from '../error-state-matcher';

type InputValue = string | number;

@Component({
  selector: 'omni-auth-ui-mat-input',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatAutocompleteModule,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: InputComponent,
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent
  implements ControlValueAccessor, AfterViewInit {
  injector = inject(Injector);

  readonly type = input<'text' | 'email' | 'password' | 'tel' | 'url'>('text');
  readonly placeholder = input<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();

  value?: InputValue;
  disabled = false;
  errorStateMatcher = new ErrorStateMatcher();

  onChangeLocalValue(value: InputValue) {
    this.value = value;
    this.onChange?.(value);
  }

  onChange?: (_: InputValue) => void;
  onTouched?: () => void;

  ngAfterViewInit() {
    this.errorStateMatcher = HostStateMatcher.fromNgControl(
      this.injector.get(NgControl),
    );
  }

  writeValue(value: InputValue): void {
    this.value = value;
  }

  registerOnChange(fn: (_: InputValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
