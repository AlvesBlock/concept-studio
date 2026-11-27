import type { StudioDocument, StudioNode } from '../../../core/document/studio-document.model';
export type ConceptDocument = StudioDocument<{focusQuestion:string}>;
export interface PanelGroup { id:string; title:string; color:string; }
export interface PresentationSettings {
  theme:'academic'|'minimal'|'original';
  grouped:boolean;
  title:string;
  question:string;
  groups:PanelGroup[];
  assignments:Record<string,string>;
  hidden:string[];
  root:string;
}
const palette=['#2563eb','#15803d','#9333ea','#c2410c','#0e7490','#be185d'];
export function initialSettings(doc:ConceptDocument):PresentationSettings {
  const concepts=doc.nodes.filter(n=>n.type==='concept');
  const incoming=new Set(doc.edges.map(e=>e.target));
  const root=(concepts.find(n=>!incoming.has(n.id))??concepts[0])?.id??'';
  const outgoing=new Map<string,string[]>();
  for(const e of doc.edges) outgoing.set(e.source,[...(outgoing.get(e.source)??[]),e.target]);
  const byId=new Map(doc.nodes.map(n=>[n.id,n]));
  const children=[...new Set((outgoing.get(root)??[]).flatMap(id=>outgoing.get(id)??[]))].filter(id=>id!==root&&byId.get(id)?.type==='concept');
  const groups:PanelGroup[]=children.slice(0,6).map((id,i)=>({id:'g'+i,title:byId.get(id)?.label||'Grupo '+(i+1),color:palette[i]}));
  if(!groups.length) groups.push({id:'g0',title:'Conceitos',color:palette[0]});
  const assignments:Record<string,string>=Object.create(null);
  children.slice(0,6).forEach((id,i)=>{
    const queue=[id]; const seen=new Set<string>();
    while(queue.length){const next=queue.shift()!;if(next===root||seen.has(next))continue;seen.add(next);
      if(byId.get(next)?.type==='concept'&&!assignments[next])assignments[next]=groups[i].id;
      for(const dest of outgoing.get(next)??[])if(!seen.has(dest))queue.push(dest);
    }
  });
  for(const n of concepts)if(n.id!==root&&!assignments[n.id])assignments[n.id]=groups[0].id;
  return {theme:'academic',grouped:false,title:doc.title,question:doc.metadata.focusQuestion,groups,assignments,hidden:[],root};
}
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const safe=(v:string|undefined,fallback:string)=>v&&/^(#[0-9a-f]{6}|none|transparent)$/i.test(v)?v:fallback;
const lines=(value:string,max:number):string[]=>value.split('\n').flatMap(line=>{
  const result:string[]=[];let current='';
  for(const word of line.split(/\s+/)){if(current&&current.length+word.length+1>max){result.push(current);current='';}
    if(word.length>max){if(current){result.push(current);current='';}for(let i=0;i<word.length;i+=max)result.push(word.slice(i,i+max));}
    else current+=(current?' ':'')+word;
  }if(current||!result.length)result.push(current);return result;
});
interface Item {node:StudioNode;x:number;y:number;w:number;h:number;group?:PanelGroup;}
export function renderPresentation(doc:ConceptDocument,settings:PresentationSettings):{svg:string;width:number;height:number} {
  const omitted=new Set(settings.hidden);
  const nodes=doc.nodes.filter(n=>!omitted.has(n.id));
  const edges=doc.edges.filter(e=>!omitted.has(e.source)&&!omitted.has(e.target));
  // Do not render an orphan linking phrase if one side was intentionally hidden.
  const visible=nodes.filter(n=>n.type!=='linking_phrase'||(edges.some(e=>e.source===n.id)&&edges.some(e=>e.target===n.id)));
  const items=new Map<string,Item>();
  const panels:string[]=[];
  let width=960,height=480;
  if(settings.grouped){
    const groups=settings.groups.length?settings.groups:[{id:'g0',title:'Conceitos',color:palette[0]}];
    const col=310,gap=24,top=150;
    width=Math.max(960,groups.length*(col+gap)+gap);
    const root=visible.find(n=>n.id===settings.root&&n.type==='concept');
    if(root)items.set(root.id,{node:root,x:width/2-160,y:15,w:320,h:64});
    let maxBottom=top+180;
    groups.forEach((g,i)=>{
      const x=(width-groups.length*(col+gap)+gap)/2+i*(col+gap);
      let y=top+62;
      const members=visible.filter(n=>n.type==='concept'&&n.id!==root?.id&&(settings.assignments[n.id]===g.id||(!groups.some(a=>a.id===settings.assignments[n.id])&&i===0)));
      // Stable topological ordering within each column, cycles fall back to source order.
      const ordered:StudioNode[]=[];const pending=[...members];
      while(pending.length){const idx=pending.findIndex(n=>!pending.some(m=>m.id!==n.id&&edges.some(e=>e.source===m.id&&edges.some(f=>f.source===e.target&&f.target===n.id))));ordered.push(pending.splice(idx<0?0:idx,1)[0]);}
      for(const n of ordered){const h=Math.max(58,lines(n.label,27).length*20+22);items.set(n.id,{node:n,x:x+22,y,w:col-44,h,group:g});y+=h+110;}
      maxBottom=Math.max(maxBottom,y-60);
      panels.push('<rect x="'+x+'" y="'+top+'" width="'+col+'" height="PANELHEIGHT" rx="16" fill="'+safe(g.color,palette[0])+'" fill-opacity=".08" stroke="'+safe(g.color,palette[0])+'" stroke-opacity=".5"/>'+text(g.title,x+col/2,top+28,18,28,'#172033',true));
    });
    for(const n of visible.filter(n=>n.type==='linking_phrase')){
      const a=edges.filter(e=>e.target===n.id).map(e=>items.get(e.source)).filter((v):v is Item=>!!v);
      const b=edges.filter(e=>e.source===n.id).map(e=>items.get(e.target)).filter((v):v is Item=>!!v);
      if(!a.length||!b.length)continue;
      const src=a[0],dst=b[0];const w=Math.min(260,Math.max(90,n.label.length*7+20)),h=Math.max(32,lines(n.label,Math.floor(w/8)).length*16+12);
      let x=(src.x+src.w/2+dst.x+dst.w/2)/2-w/2,y=(src.y+src.h+dst.y)/2-h/2;
      if(dst.y<=src.y){x=(src.x+dst.x)/2-w/2+20;y=Math.min(src.y,dst.y)-h-12;}
      // Move labels away from existing boxes, without deleting any cross-link.
      for(let k=0;k<20&&[...items.values()].some(q=>x<q.x+q.w+5&&x+w>q.x-5&&y<q.y+q.h+5&&y+h>q.y-5);k++)x+=k%2===0?34: -68;
      items.set(n.id,{node:n,x,y,w,h});
    }
    height=maxBottom+40;
    for(let i=0;i<panels.length;i++)panels[i]=panels[i].replace('PANELHEIGHT',String(maxBottom-top));
  }else{
    const minX=Math.min(0,...visible.map(n=>n.position.x)),minY=Math.min(0,...visible.map(n=>n.position.y));
    const maxX=Math.max(0,...visible.map(n=>n.position.x+n.size.width)),maxY=Math.max(0,...visible.map(n=>n.position.y+n.size.height));
    const actualMinX=visible.length?Math.min(...visible.map(n=>n.position.x)):minX,actualMinY=visible.length?Math.min(...visible.map(n=>n.position.y)):minY;
    width=Math.max(760,maxX-actualMinX+80);height=Math.max(240,maxY-actualMinY+80);
    const dx=(width-(maxX-actualMinX))/2-actualMinX,dy=35-actualMinY;
    for(const n of visible)items.set(n.id,{node:n,x:n.position.x+dx,y:n.position.y+dy,w:n.size.width,h:n.size.height});
  }
  // Expand bounds for labels outside panels.
  const minX=Math.min(0,...[...items.values()].map(q=>q.x-15)),minY=Math.min(0,...[...items.values()].map(q=>q.y-15));
  const graphWidth=Math.max(width,...[...items.values()].map(q=>q.x+q.w+15))-minX;
  const graphHeight=Math.max(height,...[...items.values()].map(q=>q.y+q.h+15))-minY;
  width=graphWidth;
  const headingLines=lines(settings.title||'Mapa conceitual',Math.max(20,Math.floor((width-80)/17)));
  const questionLines=lines(settings.question,Math.max(20,Math.floor((width-80)/10)));
  const header=headingLines.length*36+questionLines.length*23+64;
  height=graphHeight+header;
  const background=settings.theme==='academic'?'#f8fafc':'#ffffff';
  const headerMarkup='<rect x="20" y="14" width="'+(width-40)+'" height="'+(headingLines.length*36+18)+'" rx="12" fill="#172554"/>'+text(settings.title||'Mapa conceitual',width/2,23+headingLines.length*18,30,Math.max(20,Math.floor((width-80)/17)),'#ffffff',true)+text(settings.question,width/2,headingLines.length*36+40+questionLines.length*11.5,19,Math.max(20,Math.floor((width-80)/10)),'#172033',false);
  const connectors=edges.map(e=>{
    const a=items.get(e.source),b=items.get(e.target);if(!a||!b)return '';
    const start=boundary(a,b),end=boundary(b,a);
    const mid=(start.y+end.y)/2;
    const path=settings.grouped?'M '+start.x+' '+start.y+' V '+mid+' H '+end.x+' V '+end.y:'M '+start.x+' '+start.y+' L '+end.x+' '+end.y;
    return '<path d="'+path+'" stroke="#475569" stroke-width="1.7" fill="none" '+(b.node.type==='concept'?'marker-end="url(#arrow)"':'')+'/>';
  }).join('');
  const boxes=[...items.values()].map(q=>{
    const phrase=q.node.type==='linking_phrase',root=q.node.id===settings.root&&!phrase,original=settings.theme==='original';
    const fill=phrase?(original?safe(q.node.style?.fill,background):background):original?safe(q.node.style?.fill,'#dbeafe'):settings.theme==='minimal'?'#ffffff':root?'#172554':q.group?safe(q.group.color,'#2563eb')+'22':'#dbeafe';
    const stroke=phrase?'none':original?safe(q.node.style?.stroke,'#2563eb'):q.group?safe(q.group.color,'#2563eb'):'#334155';
    const font=!settings.grouped?(q.node.style?.fontSize??14):original?(q.node.style?.fontSize??14):phrase?14:18;
    return '<rect x="'+q.x+'" y="'+q.y+'" width="'+q.w+'" height="'+q.h+'" rx="'+(phrase?4:10)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.4"/>'+text(q.node.label,q.x+q.w/2,q.y+q.h/2,font,Math.max(4,Math.floor((q.w-12)/(font*.57))),!original&&root&&settings.theme!=='minimal'?'#ffffff':'#172033',!phrase&&!original);
  }).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.ceil(width)+'" height="'+Math.ceil(height)+'" viewBox="0 0 '+width+' '+height+'"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#475569"/></marker></defs><rect width="100%" height="100%" fill="'+background+'"/>'+headerMarkup+'<g transform="translate('+(-minX)+' '+(header-minY)+')">'+panels.join('')+connectors+boxes+'</g></svg>';
  return {svg,width:Math.ceil(width),height:Math.ceil(height)};
}
function text(value:string,x:number,y:number,font:number,max:number,color:string,bold:boolean):string{
  const rows=lines(value,max),step=font*1.18;
  return '<text x="'+x+'" y="'+(y-(rows.length-1)*step/2+font*.34)+'" text-anchor="middle" font-family="Arial, sans-serif" font-size="'+font+'" font-weight="'+(bold?'bold':'normal')+'" fill="'+color+'">'+rows.map((r,i)=>'<tspan x="'+x+'" dy="'+(i?step:0)+'">'+esc(r)+'</tspan>').join('')+'</text>';
}
function boundary(a:Item,b:Item){const x=a.x+a.w/2,y=a.y+a.h/2,dx=b.x+b.w/2-x,dy=b.y+b.h/2-y,t=1/Math.max(Math.abs(dx)/(a.w/2),Math.abs(dy)/(a.h/2),.00001);return {x:x+dx*t,y:y+dy*t};}
export async function rasterize(svg:string,width:number,height:number,format:'png'|'jpeg',scale:number):Promise<Blob>{
  const ratio=Math.min(scale,8192/Math.max(width,height),Math.sqrt(32000000/(width*height)));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('SVG inválido'));img.src=url;});
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Export failed')),'image/'+format,.95));
  }finally{URL.revokeObjectURL(url);}
}
