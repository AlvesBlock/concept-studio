
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
import { isConceptDocument } from '../../services/concept-document-validation';
import { academicExample } from '../../services/academic-example';
import { PresentationPanel } from '../presentation-panel/presentation-panel';
import { arrangeNodes } from '../../services/automatic-layout';
import type { Node } from '@antv/x6';
import { createConceptMapExample } from '../../../../diagram-types/concept-map/concept-map.plugin';
import { MatButtonModule } from '@angular/material/button';
import { GraphEngine } from '../../services/graph-engine';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [
    MatButtonModule, PresentationPanel
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
  readonly handle = signal<{x:number;y:number}|null>(null);
  readonly dragLine = signal<{x1:number;y1:number;x2:number;y2:number}|null>(null);
  private dragSource: string | null = null;
  readonly savedMaps = signal<{id:string;title:string}[]>([]);
  private nextEditId: string | null = null;
  private editingId: string | null = null;
  readonly selectedType = signal('');
  @ViewChild('inlineInput') set inlineInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input) queueMicrotask(() => { input.nativeElement.focus(); input.nativeElement.select(); });
  }
  readonly presentation = signal<StudioDocument<{focusQuestion:string}> | null>(null);
  openAcademicExample(): void {
    if (!window.confirm('Abrir exemplo acadêmico? Salve o mapa atual antes de continuar.')) return;
    this.loadDocument({...academicExample(),id:crypto.randomUUID()});
  }
  openPresentation(): void {
    this.finishInline(true);
    this.presentation.set(this.snapshot());
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
    this.refreshSavedMaps();

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
    for (const event of ['node:change:position', 'node:change:size', 'scale', 'translate', 'resize', 'history:change'] as const) {
      graph.on(event, () => this.refreshHandle());
    }
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
      this.handle.set(null);
    });
    graph.on('cell:removed', ({ cell }) => {
      if (this.selectedId() === cell.id) {
        this.selectedId.set(null);
        this.selectedText.set('');
        this.selectedType.set('');
        this.handle.set(null);
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
    this.refreshHandle();
  }

  addElement(type: 'concept' | 'linking_phrase', x?: number, y?: number, edit = true): Node {
    const graph = this.engine.getGraph();
    const phrase = type === 'linking_phrase';
    const width = phrase ? 140 : 180;
    const height = phrase ? 30 : 50;
    const bounds = this.canvas.nativeElement.getBoundingClientRect();
    const center = graph.clientToLocal(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    const offset = (this.nextId++ % 5) * 24;
    const node = graph.addNode({
      id: crypto.randomUUID(),
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
    const text = value.trim();
    if (!text) return;
    this.applyLabel(cell, text);
    this.selectedText.set(text);
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
    const graph = this.engine.getGraph();
    const count = graph.getEdges().filter(e => e.getSourceCellId() === source.id).length;
    const offset = count === 0 ? 0 : Math.ceil(count / 2) * 230 * (count % 2 ? 1 : -1);
    this.createProposition(source, undefined, box.x + box.width / 2 + offset, box.y + box.height + 150);
  }

  private createProposition(source: Node, target?: Node, x?: number, y?: number): void {
    const graph = this.engine.getGraph();
    const a = source.getBBox();
    const tx = x ?? (target ? (target.getBBox().x + target.getBBox().width / 2) : (a.x + a.width / 2));
    const ty = y ?? (target ? (target.getBBox().y + target.getBBox().height / 2) : a.y + a.height + 150);
    let phrase!: Node;
    graph.batchUpdate('create-proposition', () => {
      const destination = target ?? this.addElement('concept', tx, ty, false);
      this.nextEditId = target ? null : destination.id;
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
    this.handle.set(null);
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
    this.nextEditId = null;
    this.handle.set(null);
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
      this.applyLabel(cell, this.draftText().trim() || String(cell.attr('label/text') ?? ''));
      if (this.selectedId() === id) this.selectNode(cell);
    }
    if (!commit) this.nextEditId = null;
  }

  confirmInline(): void {
    const next = this.nextEditId;
    this.nextEditId = null;
    this.finishInline(true);
    const node = next ? this.engine.getGraph().getCellById(next) : null;
    if (node?.isNode()) queueMicrotask(() => this.beginEdit(node));
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
      this.applyLabel(cell, String(cell.attr('label/text') ?? ''));
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
        label: String(node.attr('label/text') ?? node.getProp('label') ?? ''),
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
    this.finishInline(true);
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'concept-studio.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private applyLabel(node: Node, value: string): void {
    const graph = this.engine.getGraph();
    const size = Number(node.attr('label/fontSize')) || 14;
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) ctx.font = size + 'px Arial';
    const width = Math.max(node.getData()?.type === 'linking_phrase' ? 65 : 110,
      Math.ceil(Math.max(...value.split('\n').map(line => ctx?.measureText(line).width ?? line.length * size * .6)) + 30));
    graph.batchUpdate('edit-label', () => {
      node.attr('label/text', value);
      node.resize(width, Math.max(node.getData()?.type === 'linking_phrase' ? 30 : 44, value.split('\n').length * size * 1.4 + 16));
    });
    this.refreshHandle();
  }

  private refreshHandle(): void {
    const id = this.selectedId();
    if (!id) { this.handle.set(null); return; }
    const cell = this.engine.getGraph().getCellById(id);
    if (!cell?.isNode()) { this.handle.set(null); return; }
    const b = cell.getBBox(), host = this.canvas.nativeElement.getBoundingClientRect();
    const pt = this.engine.getGraph().localToClient(b.x + b.width / 2, b.y + b.height);
    this.handle.set({x: pt.x - host.left, y: pt.y - host.top + 10});
  }

  startLink(event: PointerEvent): void {
    if (event.button !== 0 || !this.selectedId()) return;
    event.preventDefault(); event.stopPropagation();
    const h = this.handle();
    if (!h) return;
    this.finishInline(true);
    this.nextEditId = null;
    this.dragSource = this.selectedId();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragLine.set({x1:h.x,y1:h.y,x2:h.x,y2:h.y});
  }

  moveLink(event: PointerEvent): void {
    const line = this.dragLine();
    if (!line) return;
    const host = this.canvas.nativeElement.getBoundingClientRect();
    this.dragLine.set({...line,x2:event.clientX-host.left,y2:event.clientY-host.top});
  }

  cancelLink(): void { this.dragSource = null; this.dragLine.set(null); }

  endLink(event: PointerEvent): void {
    const id = this.dragSource, line = this.dragLine();
    this.cancelLink();
    if (!id || !line) return;
    const host = this.canvas.nativeElement.getBoundingClientRect();
    if (Math.hypot(event.clientX-host.left-line.x1,event.clientY-host.top-line.y1)<12 ||
        event.clientX<host.left || event.clientX>host.right || event.clientY<host.top || event.clientY>host.bottom) return;
    const graph = this.engine.getGraph(), source = graph.getCellById(id);
    if (!source?.isNode()) return;
    const pt = graph.clientToLocal(event.clientX,event.clientY);
    const target = graph.getNodes().reverse().find(n => {
      const b = n.getBBox();
      return pt.x >= b.x && pt.x <= b.x+b.width && pt.y >= b.y && pt.y <= b.y+b.height;
    });
    if (target?.id === source.id) return;
    if (target) {
      this.connectionSource = source.id; this.mode.set('connect'); this.connectNode(target);
      if (this.mode() === 'connect') { this.connectionSource = null; this.mode.set('select'); }
    } else if (source.getData()?.type === 'concept') {
      this.createProposition(source, undefined, pt.x, pt.y);
    } else {
      let destination!: Node;
      graph.batchUpdate('extend-phrase', () => {
        destination = this.addElement('concept', pt.x, pt.y, false);
        graph.addEdge({source:source.id,target:destination.id,attrs:{line:{stroke:'#64748b',targetMarker:{name:'classic',size:8}}}});
      });
      this.beginEdit(destination);
    }
  }

  private refreshSavedMaps(): void {
    try {
      const maps = this.readSaved();
      this.savedMaps.set(Object.values(maps).map(m => ({id:m.id,title:m.title})));
    } catch { this.message.set('Armazenamento local indisponível.'); }
  }

  private readSaved(): Record<string, StudioDocument<{focusQuestion:string}>> {
    return JSON.parse(localStorage.getItem('concept-studio.documents.v1') ?? '{}');
  }

  saveLocal(): void {
    this.finishInline(true);
    try {
      const maps = this.readSaved();
      const doc = this.snapshot();
      maps[doc.id] = doc;
      localStorage.setItem('concept-studio.documents.v1', JSON.stringify(maps));
      this.refreshSavedMaps();
      this.message.set('Mapa salvo neste navegador.');
    } catch { this.message.set('Falha ao salvar. Exporte o JSON para não perder o mapa.'); }
  }

  openLocal(id: string): void {
    if (!id) return;
    try {
      const doc = this.readSaved()[id];
      if (!doc || !window.confirm('Abrir mapa salvo? Alterações não salvas serão descartadas.')) return;
      this.loadDocument(doc);
    } catch { this.message.set('Não foi possível abrir o mapa.'); }
  }

  private loadDocument(doc: StudioDocument<{focusQuestion:string}>): void {
    const graph = this.engine.getGraph();
    this.finishInline(false);
    this.cancelLink();
    this.connectionSource = null;
    this.mode.set('select');
    this.selectedId.set(null); this.selectedType.set(''); this.selectedText.set(''); this.handle.set(null);
    graph.clearCells();
    for (const node of doc.nodes) {
      const phrase = node.type === 'linking_phrase';
      graph.addNode({id:node.id,shape:'rect',...node.position,...node.size,label:node.label,
        attrs:{body:{fill:node.style?.fill ?? (phrase?'transparent':'#dbeafe'),
          stroke:node.style?.stroke ?? (phrase?'none':'#2563eb'),rx:8,ry:8},
          label:{fill:'#1e293b',fontSize:node.style?.fontSize ?? 14}},data:{type:node.type}});
    }
    for (const edge of doc.edges) graph.addEdge({...edge,attrs:{line:{stroke:'#64748b',targetMarker:
      doc.nodes.find(n=>n.id===edge.target)?.type==='linking_phrase'?null:{name:'classic',size:8}}}});
    this.documentId = doc.id;
    this.title.set(doc.title); this.focusQuestion.set(doc.metadata.focusQuestion);
    graph.cleanHistory(); this.engine.fitContent();
    this.message.set('Mapa aberto.');
  }

  async importJson(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement, file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('large');
      const doc: unknown = JSON.parse(await file.text());
      if (!isConceptDocument(doc)) throw new Error('invalid');
      if (!window.confirm('Importar mapa? Alterações não salvas serão descartadas.')) return;
      this.loadDocument({...doc,id:crypto.randomUUID()});
    } catch { this.message.set('Arquivo JSON inválido ou incompatível.'); }
  }

  ngOnDestroy(): void {
    this.ready.set(false);
    this.engine.destroy();
  }
}
