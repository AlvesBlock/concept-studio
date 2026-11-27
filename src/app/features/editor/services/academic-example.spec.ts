import {describe,it,expect} from 'vitest';
import {academicExample} from './academic-example';
import {isConceptDocument} from './concept-document-validation';
describe('academic example',()=>{it('is a valid map with 18 propositions',()=>{const d=academicExample();expect(isConceptDocument(d)).toBe(true);expect(d.edges.length).toBe(36);});});
