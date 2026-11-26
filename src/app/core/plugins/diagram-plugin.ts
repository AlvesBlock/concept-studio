import type { StudioDocument } from '../document/studio-document.model';
export interface DiagramPlugin<T = unknown> {
  readonly id: string;
  createDocument(id: string): StudioDocument<T>;
}
export class PluginRegistry {
  private readonly plugins = new Map<string, DiagramPlugin>();
  register(plugin: DiagramPlugin): void {
    if (this.plugins.has(plugin.id)) throw new Error('Duplicate diagram type: ' + plugin.id);
    this.plugins.set(plugin.id, plugin);
  }
  get(id: string): DiagramPlugin | undefined {
    return this.plugins.get(id);
  }
  list(): DiagramPlugin[] {
    return [...this.plugins.values()];
  }
}
