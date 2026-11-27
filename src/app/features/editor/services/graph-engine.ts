
import { Injectable } from '@angular/core';
import {
  Graph,
  History,
  Selection,
  Keyboard,
  Clipboard
} from '@antv/x6';

@Injectable()
export class GraphEngine {

  private graph: Graph | null = null;

  initialize(container: HTMLElement): Graph {

    this.destroy();

    this.graph = new Graph({
      container,
      autoResize: true,

      background: {
        color: '#f8fafc'
      },

      grid: {
        visible: true,
        size: 10
      },

      panning: {
        enabled: true
      },

      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
        minScale: 0.2,
        maxScale: 3
      }
    });

    this.graph
      .use(new History({ enabled: true }))
      .use(new Selection({ enabled: true }))
      .use(new Keyboard({ enabled: true }))
      .use(new Clipboard({ enabled: true }));

    this.registerShortcuts();

    return this.graph;
  }

  getGraph(): Graph {
    if (!this.graph) {
      throw new Error('Motor gráfico não inicializado.');
    }

    return this.graph;
  }

  private registerShortcuts(): void {

    const graph = this.getGraph();

    graph.bindKey(['ctrl+z', 'meta+z'], () => {
      graph.undo();
      return false;
    });

    graph.bindKey(
      ['ctrl+shift+z', 'meta+shift+z', 'ctrl+y'],
      () => {
        graph.redo();
        return false;
      }
    );
  }

  zoomIn(): void {
    this.getGraph().zoom(0.1);
  }

  zoomOut(): void {
    this.getGraph().zoom(-0.1);
  }

  fitContent(): void {
    this.getGraph().zoomToFit({
      padding: 18,
      maxScale: 1
    });
  }

  undo(): void {
    this.getGraph().undo();
  }

  redo(): void {
    this.getGraph().redo();
  }

  destroy(): void {
    this.graph?.dispose();
    this.graph = null;
  }
}
