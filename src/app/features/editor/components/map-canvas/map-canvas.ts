
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  afterNextRender
} from '@angular/core';

import type { Node } from '@antv/x6';
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
  readonly focusQuestion = signal(this.example.metadata.focusQuestion);
  readonly ready = signal(false);
  readonly mode = signal<'select' | 'connect'>('select');
  readonly message = signal('Duplo clique no canvas para criar um conceito.');
  readonly selectedId = signal<string | null>(null);
  readonly selectedText = signal('');
  private connectionSource: string | null = null;
  private nextId = 0;

constructor() {
  afterNextRender(() => {

    this.engine.initialize(
      this.canvas.nativeElement
    );

    this.createInitialMap();
    this.registerInteractions();
    this.ready.set(true);

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

  private registerInteractions(): void {
    const graph = this.engine.getGraph();
    graph.on('blank:dblclick', ({ x, y }) => {
      if (this.mode() === 'select') this.addElement('concept', x, y);
    });
    graph.on('node:click', ({ node }) => {
      if (this.mode() === 'connect') {
        this.connectNode(node);
      } else {
        this.selectNode(node);
      }
    });
    graph.on('node:dblclick', ({ node }) => {
      if (this.mode() !== 'select') return;
      this.selectNode(node);
      const value = window.prompt('Editar texto', this.selectedText());
      if (value !== null) this.updateText(value);
    });
    graph.on('blank:click', () => {
      this.selectedId.set(null);
      this.selectedText.set('');
    });
    graph.on('cell:removed', ({ cell }) => {
      if (this.selectedId() === cell.id) {
        this.selectedId.set(null);
        this.selectedText.set('');
      }
    });
  }

  private selectNode(node: Node): void {
    this.selectedId.set(node.id);
    this.selectedText.set(String(node.attr('label/text') ?? ''));
  }

  addElement(type: 'concept' | 'linking_phrase', x?: number, y?: number): void {
    const graph = this.engine.getGraph();
    const phrase = type === 'linking_phrase';
    const width = phrase ? 140 : 180;
    const height = phrase ? 30 : 50;
    const bounds = this.canvas.nativeElement.getBoundingClientRect();
    const center = graph.clientToLocal(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    const offset = (this.nextId % 5) * 24;
    const node = graph.addNode({
      id: 'user-node-' + (++this.nextId),
      shape: 'rect', x: (x ?? center.x + offset) - width / 2,
      y: (y ?? center.y + offset) - height / 2, width, height,
      label: phrase ? 'relaciona-se a' : 'Novo conceito',
      attrs: {
        body: { fill: phrase ? 'transparent' : '#dbeafe', stroke: phrase ? 'none' : '#2563eb', rx: 8, ry: 8 },
        label: { fill: '#1e293b', fontSize: 14 }
      },
      data: { type }
    });
    this.selectNode(node);
  }

  updateText(value: string): void {
    const id = this.selectedId();
    if (!id) return;
    const cell = this.engine.getGraph().getCellById(id);
    if (!cell?.isNode()) return;
    cell.attr('label/text', value);
    this.selectedText.set(value);
  }

  toggleConnection(): void {
    this.connectionSource = null;
    this.mode.update(mode => mode === 'select' ? 'connect' : 'select');
    this.message.set(this.mode() === 'connect' ? 'Selecione a origem da conexão.' : 'Modo seleção.');
  }

  private connectNode(node: Node): void {
    const graph = this.engine.getGraph();
    if (!this.connectionSource) {
      this.connectionSource = node.id;
      this.message.set('Selecione o destino da conexão.');
      return;
    }
    const source = graph.getCellById(this.connectionSource);
    if (!source?.isNode() || source.id === node.id || source.getData()?.type === node.getData()?.type) {
      this.message.set('Conecte um conceito a uma expressão de ligação, ou vice-versa.');
      return;
    }
    if (graph.getEdges().some(edge => edge.getSourceCellId() === source.id && edge.getTargetCellId() === node.id)) {
      this.message.set('Essa conexão já existe.');
      return;
    }
    graph.addEdge({ source: source.id, target: node.id,
      attrs: { line: { stroke: '#64748b', strokeWidth: 1.5,
        targetMarker: node.getData()?.type === 'linking_phrase' ? null : { name: 'classic', size: 8 } } }
    });
    this.toggleConnection();
  }

  deleteSelection(): void {
    const graph = this.engine.getGraph();
    const selected = graph.getSelectedCells();
    const id = this.selectedId();
    const cell = id ? graph.getCellById(id) : null;
    graph.removeCells(selected.length ? selected : cell ? [cell] : []);
    this.selectedId.set(null);
    this.selectedText.set('');
  }

  newDocument(): void {
    if (!window.confirm('Criar um mapa vazio? As alterações atuais serão descartadas.')) return;
    const graph = this.engine.getGraph();
    graph.clearCells();
    graph.cleanHistory();
    this.focusQuestion.set('');
    this.selectedId.set(null);
    this.selectedText.set('');
    this.connectionSource = null;
    this.mode.set('select');
    this.message.set('Duplo clique no canvas para criar um conceito.');
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
