import { describe, it, expect } from 'vitest';
import { PluginRegistry } from './diagram-plugin';
import { conceptMapPlugin, createConceptMapExample } from '../../diagram-types/concept-map/concept-map.plugin';
describe('PluginRegistry', () => {
  it('registers a diagram and creates a fresh empty document', () => {
    const registry = new PluginRegistry();
    registry.register(conceptMapPlugin);
    const document = registry.get('concept-map')!.createDocument('test');
    expect(document.nodes).toEqual([]);
    expect(document.type).toBe('concept-map');
    expect(() => registry.register(conceptMapPlugin)).toThrow();
  });
  it('creates an example with valid edge endpoints', () => {
    const document = createConceptMapExample();
    const ids = new Set(document.nodes.map(node => node.id));
    expect(document.edges.every(edge => ids.has(edge.source) && ids.has(edge.target))).toBe(true);
  });
});
