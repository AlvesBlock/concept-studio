import ELK from 'elkjs/lib/elk.bundled.js';
import type { StudioDocument } from '../../../core/document/studio-document.model';
export async function arrangeNodes(document: StudioDocument<unknown>, direction: 'DOWN' | 'RIGHT'): Promise<Record<string, { x: number; y: number }>> {
  if (!document.nodes.length) return {};
  const elk = new ELK();
  const result = await elk.layout({
    id: 'root', layoutOptions: { 'elk.algorithm': 'layered', 'elk.direction': direction,
      'elk.spacing.nodeNode': '45', 'elk.layered.spacing.nodeNodeBetweenLayers': '65' },
    children: document.nodes.map(node => ({ id: node.id, ...node.size })),
    edges: document.edges.map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] }))
  });
  return Object.fromEntries((result.children ?? []).map(node => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
}
