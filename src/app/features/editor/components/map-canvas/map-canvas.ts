
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  afterNextRender
} from '@angular/core';

import type { StudioDocument } from '../../../../core/document/studio-document.model';
import { arrangeNodes } from '../../services/automatic-layout';
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
  readonly title = signal('Mapa sem título');
  readonly layoutBusy = signal(false);
  readonly fill = signal('#dbeafe');
  readonly stroke = signal('#2563eb');
  readonly fontSize = signal(14);
  readonly inlineEdit = signal(false);
  readonly draftText = signal('');
  readonly editPosition = signal({ x: 0, y: 0, width: 180 });
  private documentId = 'example';

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
      const box = node.getBBox();
      const point = graph.localToClient(box.x, box.y);
      const host = this.canvas.nativeElement.getBoundingClientRect();
      const end = graph.localToClient(box.x + box.width, box.y);
      this.editPosition.set({ x: point.x - host.left, y: point.y - host.top,
        width: Math.max(120, end.x - point.x) });
      this.draftText.set(this.selectedText());
      this.inlineEdit.set(true);
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
    this.fill.set(this.readColor(node.attr('body/fill'), '#ffffff'));
    this.stroke.set(this.readColor(node.attr('body/stroke'), '#2563eb'));
    this.fontSize.set(Number(node.attr('label/fontSize')) || 14);
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
    this.title.set('Mapa sem título');
    this.documentId = crypto.randomUUID();
    this.inlineEdit.set(false);
    this.selectedId.set(null);
    this.selectedText.set('');
    this.connectionSource = null;
    this.mode.set('select');
    this.message.set('Duplo clique no canvas para criar um conceito.');
  }

  private readColor(value: unknown, fallback: string): string {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  }

  finishInline(commit: boolean): void {
    if (!this.inlineEdit()) return;
    this.inlineEdit.set(false);
    if (commit) this.updateText(this.draftText());
  }

  setStyle(path: 'body/fill' | 'body/stroke' | 'label/fontSize', value: string | number): void {
    const id = this.selectedId();
    const cell = id ? this.engine.getGraph().getCellById(id) : null;
    if (!cell?.isNode()) return;
    if (path === 'label/fontSize') {
      const size = Number(value);
      if (!Number.isFinite(size) || size < 8 || size > 48) return;
      cell.attr(path, size);
      this.fontSize.set(size);
    } else {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return;
      cell.attr(path, value);
      if (path === 'body/fill') this.fill.set(value); else this.stroke.set(value);
    }
  }

  snapshot(): StudioDocument<{ focusQuestion: string }> {
    const graph = this.engine.getGraph();
    return {
      schemaVersion: 1, id: this.documentId, type: 'concept-map',
      title: this.title(), metadata: { focusQuestion: this.focusQuestion() },
      nodes: graph.getNodes().map(node => ({
        id: node.id, type: String(node.getData()?.type ?? 'concept'),
        label: String(node.attr('label/text') ?? ''),
        position: node.position(), size: node.size(),
        style: { fill: String(node.attr('body/fill') ?? 'transparent'),
          stroke: String(node.attr('body/stroke') ?? 'none'),
          fontSize: Number(node.attr('label/fontSize')) || 14 }
      })),
      edges: graph.getEdges().map(edge => ({
        id: edge.id, source: edge.getSourceCellId() ?? '', target: edge.getTargetCellId() ?? ''
      }))
    };
  }

  async organize(direction: 'DOWN' | 'RIGHT'): Promise<void> {
    if (this.layoutBusy()) return;
    this.layoutBusy.set(true);
    try {
      const graph = this.engine.getGraph();
      const before = this.snapshot();
      const positions = await arrangeNodes(before, direction);
      if (!this.ready() || JSON.stringify(this.snapshot()) !== JSON.stringify(before)) {
        this.message.set('O mapa mudou durante a organização. Tente novamente.');
        return;
      }
      graph.batchUpdate('automatic-layout', () => {
        for (const [id, position] of Object.entries(positions)) {
          const cell = graph.getCellById(id);
          if (cell?.isNode()) cell.position(position.x, position.y);
        }
      });
      this.engine.fitContent();
      this.message.set('Organização aplicada.');
    } catch {
      this.message.set('Não foi possível organizar o mapa.');
    } finally {
      this.layoutBusy.set(false);
    }
  }

  exportJson(): void {
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'concept-studio.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  ngOnDestroy(): void {
    this.ready.set(false);
    this.engine.destroy();
  }
}
