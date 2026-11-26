
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  afterNextRender
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { GraphEngine } from '../../services/graph-engine';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [
    MatButtonModule
  ],
  providers: [
    GraphEngine
  ],
  templateUrl: './map-canvas.html',
  styleUrl: './map-canvas.scss'
})
export class MapCanvas implements OnDestroy {

  @ViewChild('canvas', { static: true })
  private canvas!: ElementRef<HTMLDivElement>;

  readonly engine = inject(GraphEngine);

constructor() {
  afterNextRender(() => {

    this.engine.initialize(
      this.canvas.nativeElement
    );

    this.createInitialMap();

  });
}

  private createInitialMap(): void {

    const graph = this.engine.getGraph();

    graph.addNode({
      id: 'concept-1',
      shape: 'rect',
      x: 300,
      y: 80,
      width: 240,
      height: 55,
      label: 'Gestão do conhecimento',

      attrs: {
        body: {
          fill: '#dbeafe',
          stroke: '#2563eb',
          strokeWidth: 1.5,
          rx: 8,
          ry: 8
        },
        label: {
          fill: '#1e3a8a',
          fontSize: 14,
          fontWeight: 600
        }
      },

      data: {
        type: 'concept'
      }
    });

    graph.addNode({
      id: 'phrase-1',
      shape: 'rect',
      x: 370,
      y: 190,
      width: 100,
      height: 30,
      label: 'organiza',

      attrs: {
        body: {
          fill: 'transparent',
          stroke: 'none'
        },
        label: {
          fill: '#475569',
          fontSize: 13
        }
      },

      data: {
        type: 'linking_phrase'
      }
    });

    graph.addNode({
      id: 'concept-2',
      shape: 'rect',
      x: 320,
      y: 280,
      width: 200,
      height: 55,
      label: 'Informações',

      attrs: {
        body: {
          fill: '#ccfbf1',
          stroke: '#0d9488',
          strokeWidth: 1.5,
          rx: 8,
          ry: 8
        },
        label: {
          fill: '#115e59',
          fontSize: 14
        }
      },

      data: {
        type: 'concept'
      }
    });

    graph.addEdge({
      id: 'edge-1',
      source: 'concept-1',
      target: 'phrase-1',
      attrs: {
        line: {
          stroke: '#64748b',
          strokeWidth: 1.5,
          targetMarker: null
        }
      }
    });

    graph.addEdge({
      id: 'edge-2',
      source: 'phrase-1',
      target: 'concept-2',
      attrs: {
        line: {
          stroke: '#64748b',
          strokeWidth: 1.5,
          targetMarker: {
            name: 'classic',
            size: 8
          }
        }
      }
    });

    this.engine.fitContent();

    graph.cleanHistory();
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
