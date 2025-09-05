import {
  NgDocNavbarComponent,
  NgDocRootComponent,
  NgDocSidebarComponent,
  NgDocThemeToggleComponent,
} from '@ng-doc/app';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { preventInitialChildAnimations } from '@ng-doc/ui-kit';
import { NgOptimizedImage } from '@angular/common';
import { NgDocThemeService } from '@ng-doc/app/services/theme';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  animations: [preventInitialChildAnimations],
  imports: [
    RouterOutlet,
    NgDocRootComponent,
    NgDocNavbarComponent,
    NgDocSidebarComponent,
    NgDocThemeToggleComponent,
    NgOptimizedImage,
  ],
  providers: [
    NgDocThemeService
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
