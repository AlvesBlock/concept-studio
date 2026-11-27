import type { DiagramPlugin } from '../../core/plugins/diagram-plugin';
import type { StudioDocument } from '../../core/document/studio-document.model';
export interface ConceptMapMetadata { focusQuestion: string; }
export const conceptMapPlugin: DiagramPlugin<ConceptMapMetadata> = {
  id: 'concept-map',
  createDocument(id): StudioDocument<ConceptMapMetadata> {
    return {
      schemaVersion: 1, id, type: 'concept-map', title: 'Novo mapa conceitual',
      nodes: [], edges: [], metadata: { focusQuestion: '' }
    };
  }
};
export function createConceptMapExample(): StudioDocument<ConceptMapMetadata> {
  return {
    ...conceptMapPlugin.createDocument('example'),
    title: 'Exemplo de mapa conceitual',
    metadata: { focusQuestion: 'Como os conceitos se relacionam?' },
    nodes: [
      { id: 'concept-1', type: 'concept', label: 'Conceito principal', position: { x: 300, y: 80 }, size: { width: 240, height: 55 } },
      { id: 'phrase-1', type: 'linking_phrase', label: 'relaciona-se a', position: { x: 350, y: 190 }, size: { width: 140, height: 30 } },
      { id: 'concept-2', type: 'concept', label: 'Outro conceito', position: { x: 320, y: 280 }, size: { width: 200, height: 55 } }
    ],
    edges: [
      { id: 'edge-1', source: 'concept-1', target: 'phrase-1' },
      { id: 'edge-2', source: 'phrase-1', target: 'concept-2' }
    ]
  };
}
