import { describe,it,expect } from 'vitest';
import { isConceptDocument } from './concept-document-validation';
import { createConceptMapExample } from '../../../diagram-types/concept-map/concept-map.plugin';
describe('concept document validation',()=>{
 it('accepts example',()=>expect(isConceptDocument(createConceptMapExample())).toBe(true));
 it('rejects dangling edges',()=>{const d=createConceptMapExample();d.edges[0].target='missing';expect(isConceptDocument(d)).toBe(false)});
 it('rejects direct concept edges',()=>{const d=createConceptMapExample();d.edges[0].target='concept-2';expect(isConceptDocument(d)).toBe(false)});
});
