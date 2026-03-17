import {
  ComponentRef,
  Directive, effect,
  ElementRef, inject, input,
  Renderer2,
  ViewContainerRef,
} from '@angular/core';
import {MatProgressSpinner} from '@angular/material/progress-spinner';
import {DOCUMENT} from '@angular/common';

@Directive({
  selector: `[omniAuthUiMatLoadingOverlay]`,
  standalone: true,
})
export class LoaderOverlayDirective {
  #hostElement = inject(ElementRef<HTMLElement>);
  #viewContainerRef = inject(ViewContainerRef);
  #renderer = inject(Renderer2);
  #document = inject(DOCUMENT);
  readonly loading = input(false);
  #spinner?: ComponentRef<MatProgressSpinner>;

  constructor() {
    effect(() => {
      const isLoading = this.loading();

      if (isLoading) {
        this.#nativeElement.classList.add('mat-loading');
        this.#createSpinner();
      } else {
        this.#nativeElement.classList.remove('mat-loading');
        this.#destroySpinner();
      }
    });
  }

  get #nativeElement(): HTMLElement {
    return this.#hostElement.nativeElement;
  }

  #createSpinner(): void {
    if (this.#spinner) {
      return;
    }

    const wrapper = this.#document.createElement('div');
    wrapper.classList.add('loading-wrapper');

    this.#spinner = this.#viewContainerRef.createComponent(MatProgressSpinner);
    this.#spinner.instance.mode = 'indeterminate';
    this.#spinner.instance.color = 'primary';
    this.#spinner.instance.strokeWidth = 2;
    this.#spinner.instance.diameter = 21;

    wrapper.style = `
      position: absolute;
      z-index: 15;
      top: 0;
      left: 0;
      display: flex;
      align-items: start;
      padding-top: 7px;
      width: 100%;
      height: 100%;
      justify-content: center;
    }`

    wrapper.appendChild(this.#spinner.instance._elementRef.nativeElement);
    this.#renderer.appendChild(this.#nativeElement, wrapper);
  }

  #destroySpinner(): void {
    if (this.#spinner) {
      this.#spinner.destroy();
      this.#spinner = undefined;
    }
  }
}
