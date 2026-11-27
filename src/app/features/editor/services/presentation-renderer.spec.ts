import { describe,it,expect } from 'vitest';
import { initialSettings,renderPresentation } from './presentation-renderer';
import { createConceptMapExample } from '../../../diagram-types/concept-map/concept-map.plugin';
describe('presentation renderer',()=>{
 it('exports full document and escapes text',()=>{const d=createConceptMapExample();d.title='<script>alert(1)</script>';const s=initialSettings(d);const result=renderPresentation(d,s);expect(result.svg).toContain('&lt;script&gt;');expect(result.svg).not.toContain('<script>');expect(result.svg).toContain('marker-end');expect(result.width).toBeGreaterThan(0);});
 it('groups without changing source',()=>{const d=createConceptMapExample();const before=JSON.stringify(d);const s=initialSettings(d);s.grouped=true;const result=renderPresentation(d,s);expect(result.svg).toContain('Conceito principal');expect(JSON.stringify(d)).toBe(before);});
 it('hides concepts and orphan phrases only in presentation',()=>{const d=createConceptMapExample();const s=initialSettings(d);s.hidden=['concept-2'];const result=renderPresentation(d,s);expect(result.svg).not.toContain('Outro conceito');expect(result.svg).not.toContain('relaciona-se a');expect(d.nodes.length).toBe(3);});
});
