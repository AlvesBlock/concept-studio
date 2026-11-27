import type { StudioDocument } from '../../../core/document/studio-document.model';
const obj = (v: unknown): v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length <= 10000;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e7;
const color = (v: unknown) => typeof v === 'string' && /^(#[0-9a-f]{6}|none|transparent)$/i.test(v);
export function isConceptDocument(v: unknown): v is StudioDocument<{focusQuestion:string}> {
  if (!obj(v) || v['schemaVersion'] !== 1 || v['type'] !== 'concept-map' || !str(v['id']) || !str(v['title'])) return false;
  const meta=v['metadata'], nodes=v['nodes'], edges=v['edges'];
  if (!obj(meta) || !str(meta['focusQuestion']) || !Array.isArray(nodes) || !Array.isArray(edges) || nodes.length>3000 || edges.length>10000) return false;
  const ids=new Map<string,string>();
  for (const n of nodes) {
    if (!obj(n) || !str(n['id']) || !n['id'] || ids.has(n['id']) || !str(n['label']) || (n['type']!=='concept' && n['type']!=='linking_phrase')) return false;
    const p=n['position'],s=n['size'],style=n['style'];
    if (!obj(p)||!num(p['x'])||!num(p['y'])||!obj(s)||!num(s['width'])||!num(s['height'])||s['width']<=0||s['height']<=0) return false;
    if (style!==undefined && (!obj(style)||!color(style['fill'])||!color(style['stroke'])||!num(style['fontSize'])||style['fontSize']<8||style['fontSize']>48)) return false;
    ids.set(n['id'],n['type']);
  }
  const pairs=new Set<string>();
  for (const e of edges) {
    if (!obj(e)||!str(e['id'])||!e['id']||ids.has(e['id'])||!str(e['source'])||!str(e['target'])||!ids.has(e['source'])||!ids.has(e['target'])||ids.get(e['source'])===ids.get(e['target'])) return false;
    const pair=JSON.stringify([e['source'],e['target']]); if(pairs.has(pair))return false;
    pairs.add(pair); ids.set(e['id'],'edge');
  }
  return edges.every(e=>ids.get(e.source)!=='edge' && ids.get(e.target)!=='edge');
}
