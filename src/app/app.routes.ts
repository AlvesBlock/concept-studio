
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'editor',
    pathMatch: 'full'
  },
  {
    path: 'editor',
    loadComponent: () =>
      import(
        './features/editor/components/map-canvas/map-canvas'
      ).then(m => m.MapCanvas)
  },
  {
    path: '**',
    redirectTo: 'editor'
  }
];
