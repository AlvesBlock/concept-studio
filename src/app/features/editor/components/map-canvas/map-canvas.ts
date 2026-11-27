
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
  private editingId: string | null = null;
  readonly selectedType = signal('');
  @ViewChild('inlineInput') set inlineInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input) queueMicrotask(() => { input.nativeElement.focus(); input.nativeElement.select(); });
  }
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
      if (this.mode() === 'connect' && this.connectionSource) {
        const source = graph.getCellById(this.connectionSource);
        if (source?.isNode() && source.getData()?.type === 'concept') {
          this.createProposition(source, undefined, x, y);
          return;
        }
      }
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
      this.beginEdit(node);
    });
    graph.on('blank:click', () => {
      if (this.mode() === 'connect') return;
      this.selectedId.set(null);
      this.selectedText.set('');
      this.selectedType.set('');
    });
    graph.on('cell:removed', ({ cell }) => {
      if (this.selectedId() === cell.id) {
        this.selectedId.set(null);
        this.selectedText.set('');
        this.selectedType.set('');
      }
      if (this.connectionSource === cell.id) this.toggleConnection();
    });
  }

  private beginEdit(node: Node): void {
      const graph = this.engine.getGraph();
      this.selectNode(node);
      this.editingId = node.id;
      const box = node.getBBox();
      const point = graph.localToClient(box.x, box.y);
      const host = this.canvas.nativeElement.getBoundingClientRect();
      const end = graph.localToClient(box.x + box.width, box.y);
      this.editPosition.set({ x: point.x - host.left, y: point.y - host.top,
        width: Math.max(120, end.x - point.x) });
      this.draftText.set(this.selectedText());
      this.inlineEdit.set(true);
  }

  private selectNode(node: Node): void {
    this.selectedId.set(node.id);
    this.selectedType.set(String(node.getData()?.type ?? ''));
    this.selectedText.set(String(node.attr('label/text') ?? node.getProp('label') ?? ''));
    this.fill.set(this.readColor(node.attr('body/fill'), '#ffffff'));
    this.stroke.set(this.readColor(node.attr('body/stroke'), '#2563eb'));
    this.fontSize.set(Number(node.attr('label/fontSize')) || 14);
  }

  addElement(type: 'concept' | 'linking_phrase', x?: number, y?: number, edit = true): Node {
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
    if (edit) this.beginEdit(node);
    return node;
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
      this.selectNode(node);
      this.message.set('Clique no conceito de destino ou dê duplo clique no espaço vazio para criar uma proposição.');
      return;
    }
    const source = graph.getCellById(this.connectionSource);
    if (source?.isNode() && source.id !== node.id && source.getData()?.type === 'concept' && node.getData()?.type === 'concept') {
      this.createProposition(source, node);
      return;
    }
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

  expandConcept(): void {
    const id = this.selectedId();
    const source = id ? this.engine.getGraph().getCellById(id) : null;
    if (!source?.isNode() || source.getData()?.type !== 'concept') return;
    const box = source.getBBox();
    this.createProposition(source, undefined, box.x + box.width / 2, box.y + box.height + 150);
  }

  private createProposition(source: Node, target?: Node, x?: number, y?: number): void {
    const graph = this.engine.getGraph();
    const a = source.getBBox();
    const tx = x ?? (target ? (target.getBBox().x + target.getBBox().width / 2) : (a.x + a.width / 2));
    const ty = y ?? (target ? (target.getBBox().y + target.getBBox().height / 2) : a.y + a.height + 150);
    let phrase!: Node;
    graph.batchUpdate('create-proposition', () => {
      const destination = target ?? this.addElement('concept', tx, ty, false);
      phrase = this.addElement('linking_phrase', ((a.x + a.width / 2) + tx) / 2, ((a.y + a.height / 2) + ty) / 2, false);
      graph.addEdge({ source: source.id, target: phrase.id,
        attrs: { line: { stroke: '#64748b', targetMarker: null } } });
      graph.addEdge({ source: phrase.id, target: destination.id,
        attrs: { line: { stroke: '#64748b', targetMarker: { name: 'classic', size: 8 } } } });
    });
    this.connectionSource = null;
    this.mode.set('select');
    this.message.set('Digite a expressão de ligação; depois edite o conceito de destino.');
    this.beginEdit(phrase);
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
    const id = this.editingId;
    this.editingId = null;
    const cell = id ? this.engine.getGraph().getCellById(id) : null;
    if (commit && cell?.isNode()) {
      cell.attr('label/text', this.draftText().trim() || this.selectedText());
      if (this.selectedId() === id) this.selectNode(cell);
    }
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
