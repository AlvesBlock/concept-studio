
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  afterNextRender
} from '@angular/core';

import { createConceptMapExample } from '../../../../diagram-types/concept-map/concept-map.plugin';
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
  readonly example = createConceptMapExample();

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
    for (const node of this.example.nodes) {
      const phrase = node.type === 'linking_phrase';
      graph.addNode({
        id: node.id, shape: 'rect', ...node.position, ...node.size,
        label: node.label,
        attrs: {
          body: { fill: phrase ? 'transparent' : '#dbeafe', stroke: phrase ? 'none' : '#2563eb', rx: 8, ry: 8 },
          label: { fill: '#1e293b', fontSize: 14 }
        },
        data: { type: node.type }
      });
    }
    for (const edge of this.example.edges) {
      const target = this.example.nodes.find(node => node.id === edge.target);
      graph.addEdge({
        ...edge,
        attrs: { line: { stroke: '#64748b', strokeWidth: 1.5,
          targetMarker: target?.type === 'linking_phrase' ? null : { name: 'classic', size: 8 } } }
      });
    }
    this.engine.fitContent();
    graph.cleanHistory();
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
